"""API endpoint discovery module.

Discovers API endpoints by:
1. Checking common API paths (REST conventions, framework defaults)
2. Parsing robots.txt and sitemap.xml for API references
3. Extracting API endpoints from JavaScript files
4. Probing for OpenAPI/Swagger documentation
"""

import re
import time
from typing import Any

import httpx

from scanner.config import config
from scanner.logger import logger
from scanner.models import Asset, BaseModule, Finding, ModuleResult, Severity, VulnCategory

# Common API base paths to probe
API_BASE_PATHS = [
    "/api", "/api/v1", "/api/v2", "/api/v3",
    "/rest", "/rest/v1", "/rest/v2",
    "/graphql", "/graphiql",
    "/v1", "/v2", "/v3",
    "/api-docs", "/swagger", "/openapi",
    "/health", "/healthz", "/ready", "/status",
    "/_api", "/web-api", "/public-api",
]

# OpenAPI / Swagger documentation paths
OPENAPI_PATHS = [
    "/swagger.json", "/swagger.yaml",
    "/openapi.json", "/openapi.yaml",
    "/api-docs", "/api-docs.json",
    "/swagger-ui.html", "/swagger-ui/",
    "/docs", "/redoc",
    "/v1/swagger.json", "/v2/swagger.json", "/v3/swagger.json",
    "/api/swagger.json", "/api/openapi.json",
    "/.well-known/openapi.json",
]

# Common REST resource paths
REST_RESOURCE_PATHS = [
    "/users", "/accounts", "/auth", "/login", "/register",
    "/products", "/items", "/orders", "/payments",
    "/posts", "/articles", "/comments", "/categories",
    "/search", "/upload", "/files", "/images",
    "/settings", "/config", "/admin",
    "/notifications", "/messages", "/events",
    "/tokens", "/sessions", "/keys",
    "/webhooks", "/callbacks", "/integrations",
]

# GraphQL introspection query
GRAPHQL_INTROSPECTION = '{"query":"{ __schema { types { name } } }"}'

# Regex patterns to find API URLs in JavaScript
JS_API_PATTERNS = [
    r'["\'](/api/[^"\'?\s]+)["\']',
    r'["\'](/v[123]/[^"\'?\s]+)["\']',
    r'["\'](/rest/[^"\'?\s]+)["\']',
    r'fetch\(["\']([^"\']+/api[^"\']*)["\']',
    r'axios\.[a-z]+\(["\']([^"\']+)["\']',
    r'\.get\(["\'](/[^"\']+)["\']',
    r'\.post\(["\'](/[^"\']+)["\']',
    r'\.put\(["\'](/[^"\']+)["\']',
    r'\.delete\(["\'](/[^"\']+)["\']',
    r'baseURL:\s*["\']([^"\']+)["\']',
    r'endpoint:\s*["\']([^"\']+)["\']',
]


class ApiDiscovery(BaseModule):
    """Discovers API endpoints through probing and source analysis."""

    @property
    def name(self) -> str:
        return "api_discovery"

    @property
    def description(self) -> str:
        return "API endpoint discovery — probes common paths, parses docs, and extracts from JS"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        discovered_assets: list[dict] = opts.get("discovered_assets", [])
        log = logger.bind(target=target)
        log.info("Starting API endpoint discovery")

        base_url = target if target.startswith("http") else f"https://{target}"
        discovered_endpoints: set[str] = set()

        async with httpx.AsyncClient(
            timeout=config.http_timeout,
            follow_redirects=True,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:

            # 1. Probe common API base paths
            for path in API_BASE_PATHS:
                url = f"{base_url}{path}"
                try:
                    resp = await client.get(url)
                    if resp.status_code < 404:
                        content_type = resp.headers.get("content-type", "")
                        is_api = (
                            "json" in content_type
                            or "xml" in content_type
                            or resp.status_code in (200, 201, 401, 403)
                        )
                        if is_api:
                            discovered_endpoints.add(path)
                            assets.append(Asset(
                                type="API_ENDPOINT",
                                value=url,
                                metadata={
                                    "status_code": resp.status_code,
                                    "content_type": content_type,
                                    "method": "GET",
                                },
                            ))
                except Exception:
                    pass

            raw_output["api_base_paths"] = len(discovered_endpoints)

            # 2. Check OpenAPI/Swagger docs
            openapi_found: list[str] = []
            for path in OPENAPI_PATHS:
                url = f"{base_url}{path}"
                try:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        body = resp.text[:5000]
                        if any(kw in body.lower() for kw in [
                            "swagger", "openapi", "paths", "definitions",
                            "components", "info", "servers",
                        ]):
                            openapi_found.append(path)
                            assets.append(Asset(
                                type="API_ENDPOINT",
                                value=url,
                                metadata={
                                    "type": "openapi_docs",
                                    "status_code": 200,
                                },
                            ))

                            # Extract paths from the spec
                            paths_in_spec = re.findall(
                                r'"(/[^"]+)":\s*\{', body
                            )
                            for spec_path in paths_in_spec[:50]:
                                full = f"{base_url}{spec_path}"
                                if full not in discovered_endpoints:
                                    discovered_endpoints.add(full)
                                    assets.append(Asset(
                                        type="API_ENDPOINT",
                                        value=full,
                                        metadata={"source": "openapi_spec"},
                                    ))
                except Exception:
                    pass

            raw_output["openapi_docs"] = openapi_found

            if openapi_found:
                findings.append(Finding(
                    title="OpenAPI/Swagger Documentation Exposed",
                    severity=Severity.LOW,
                    category=VulnCategory.INFO_DISCLOSURE,
                    description=(
                        f"API documentation is publicly accessible at: "
                        f"{', '.join(openapi_found)}. "
                        "This reveals the full API surface and may aid attackers."
                    ),
                    solution=(
                        "Restrict access to API documentation in production. "
                        "Use authentication or IP whitelisting."
                    ),
                    affected_component=f"{base_url}{openapi_found[0]}",
                    evidence=f"Found OpenAPI/Swagger docs at: {', '.join(openapi_found)}",
                    references=[
                        "https://owasp.org/www-project-api-security/",
                    ],
                ))

            # 3. Probe REST resource paths under discovered API bases
            api_bases = [p for p in discovered_endpoints if any(
                p.startswith(b) for b in ["/api", "/rest", "/v1", "/v2", "/v3"]
            )] or ["/api"]

            for api_base in api_bases[:3]:
                for resource in REST_RESOURCE_PATHS:
                    url = f"{base_url}{api_base}{resource}"
                    try:
                        resp = await client.get(url)
                        if resp.status_code in (200, 201, 401, 403):
                            ct = resp.headers.get("content-type", "")
                            if "json" in ct or "xml" in ct or resp.status_code in (401, 403):
                                key = f"{api_base}{resource}"
                                if key not in discovered_endpoints:
                                    discovered_endpoints.add(key)
                                    assets.append(Asset(
                                        type="API_ENDPOINT",
                                        value=url,
                                        metadata={
                                            "status_code": resp.status_code,
                                            "content_type": ct,
                                            "api_base": api_base,
                                        },
                                    ))
                    except Exception:
                        pass

            raw_output["rest_endpoints"] = len(discovered_endpoints)

            # 4. Check for GraphQL
            for gql_path in ["/graphql", "/graphiql", "/api/graphql"]:
                url = f"{base_url}{gql_path}"
                try:
                    resp = await client.post(
                        url,
                        content=GRAPHQL_INTROSPECTION,
                        headers={"Content-Type": "application/json"},
                    )
                    if resp.status_code == 200 and "__schema" in resp.text:
                        assets.append(Asset(
                            type="API_ENDPOINT",
                            value=url,
                            metadata={"type": "graphql", "introspection": True},
                        ))
                        findings.append(Finding(
                            title="GraphQL Introspection Enabled",
                            severity=Severity.MEDIUM,
                            category=VulnCategory.INFO_DISCLOSURE,
                            description=(
                                f"GraphQL introspection is enabled at {url}. "
                                "This reveals the entire schema including types, "
                                "queries, mutations, and subscriptions."
                            ),
                            solution=(
                                "Disable introspection in production. "
                                "Use query depth limiting and complexity analysis."
                            ),
                            affected_component=url,
                            evidence="Introspection query returned __schema data.",
                            references=[
                                "https://owasp.org/www-project-api-security/",
                            ],
                        ))
                        break
                except Exception:
                    pass

            raw_output["graphql_found"] = any(
                a.metadata.get("type") == "graphql" for a in assets
            )

            # 5. Extract API URLs from JavaScript files
            js_assets = [
                a for a in discovered_assets
                if a.get("type") == "ENDPOINT"
                and any(a.get("value", "").endswith(ext) for ext in [".js", ".mjs", ".jsx"])
            ]

            js_endpoints: set[str] = set()
            for js_asset in js_assets[:15]:
                js_url = js_asset.get("value", "")
                if not js_url.startswith("http"):
                    js_url = f"{base_url}{js_url}"
                try:
                    resp = await client.get(js_url)
                    if resp.status_code == 200:
                        for pattern in JS_API_PATTERNS:
                            matches = re.findall(pattern, resp.text)
                            for match in matches:
                                if match.startswith("/"):
                                    full_url = f"{base_url}{match}"
                                else:
                                    full_url = match
                                if full_url not in js_endpoints:
                                    js_endpoints.add(full_url)
                                    assets.append(Asset(
                                        type="API_ENDPOINT",
                                        value=full_url,
                                        metadata={
                                            "source": "javascript",
                                            "source_file": js_url,
                                        },
                                    ))
                except Exception:
                    pass

            raw_output["js_extracted_endpoints"] = len(js_endpoints)

            # 6. Parse robots.txt for API paths
            try:
                resp = await client.get(f"{base_url}/robots.txt")
                if resp.status_code == 200:
                    for line in resp.text.splitlines():
                        line = line.strip()
                        if line.lower().startswith(("disallow:", "allow:")):
                            path = line.split(":", 1)[1].strip()
                            if any(kw in path.lower() for kw in [
                                "api", "graphql", "rest", "v1", "v2", "admin",
                            ]):
                                full_url = f"{base_url}{path}"
                                assets.append(Asset(
                                    type="API_ENDPOINT",
                                    value=full_url,
                                    metadata={"source": "robots.txt"},
                                ))
            except Exception:
                pass

        log.info(
            "API discovery completed",
            endpoints=len(assets),
            findings=len(findings),
        )

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )
