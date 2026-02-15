"""Web crawler module for HTTP endpoint discovery."""

import asyncio
import time
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from scanner.config import config
from scanner.logger import logger
from scanner.models import (
    Asset,
    BaseModule,
    Finding,
    ModuleResult,
    Severity,
    VulnCategory,
)


class WebCrawler(BaseModule):
    """Discovers HTTP endpoints and checks for common web vulnerabilities."""

    @property
    def name(self) -> str:
        return "web_crawler"

    @property
    def description(self) -> str:
        return "Crawls web applications to discover endpoints and check security headers"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        max_pages = opts.get("max_pages", 50)
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        log = logger.bind(target=target)
        log.info("Starting web crawl")

        # Determine base URL
        base_url = target if target.startswith("http") else f"https://{target}"
        parsed = urlparse(base_url)
        base_domain = parsed.netloc or parsed.path

        visited: set[str] = set()
        to_visit: list[str] = [base_url]
        headers_checked = False

        async with httpx.AsyncClient(
            timeout=config.http_timeout,
            follow_redirects=True,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:
            while to_visit and len(visited) < max_pages:
                url = to_visit.pop(0)
                if url in visited:
                    continue
                visited.add(url)

                try:
                    response = await client.get(url)

                    # Record endpoint as asset
                    assets.append(
                        Asset(
                            type="ENDPOINT",
                            value=url,
                            metadata={
                                "status_code": response.status_code,
                                "content_type": response.headers.get("content-type", ""),
                                "content_length": len(response.content),
                            },
                        )
                    )

                    # Check security headers (once on the root page)
                    if not headers_checked:
                        headers_checked = True
                        self._check_security_headers(
                            url, dict(response.headers), findings
                        )
                        raw_output["response_headers"] = dict(response.headers)

                    # Parse links from HTML
                    content_type = response.headers.get("content-type", "")
                    if "text/html" in content_type:
                        soup = BeautifulSoup(response.text, "lxml")

                        for tag in soup.find_all(["a", "link", "script", "img", "form"]):
                            href = tag.get("href") or tag.get("src") or tag.get("action")
                            if not href:
                                continue

                            full_url = urljoin(url, href)
                            full_parsed = urlparse(full_url)

                            # Only follow same-domain links
                            if (
                                full_parsed.netloc == base_domain
                                and full_url not in visited
                                and full_parsed.scheme in ("http", "https")
                            ):
                                to_visit.append(full_url.split("#")[0].split("?")[0])

                except httpx.TimeoutException:
                    errors.append(f"Timeout accessing {url}")
                except Exception as e:
                    errors.append(f"Error crawling {url}: {e}")

        # Check common sensitive paths
        sensitive_paths = [
            "/.env", "/.git/config", "/robots.txt", "/sitemap.xml",
            "/.well-known/security.txt", "/wp-admin/", "/admin/",
            "/phpinfo.php", "/.htaccess", "/server-status",
            "/api/docs", "/swagger.json", "/graphql",
        ]

        async with httpx.AsyncClient(
            timeout=5,
            follow_redirects=False,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:
            for path in sensitive_paths:
                try:
                    url = f"{base_url}{path}"
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        assets.append(
                            Asset(
                                type="ENDPOINT",
                                value=url,
                                metadata={"status_code": 200, "sensitive": True},
                            )
                        )

                        critical_paths = ["/.env", "/.git/config", "/phpinfo.php"]
                        if path in critical_paths:
                            findings.append(
                                Finding(
                                    title=f"Sensitive File Exposed: {path}",
                                    severity=Severity.HIGH,
                                    category=VulnCategory.SENSITIVE_FILE,
                                    description=f"Sensitive file accessible at {url}",
                                    solution=f"Restrict access to {path} via web server configuration.",
                                    affected_component=url,
                                )
                            )
                except Exception:
                    pass

        log.info("Web crawl completed", pages=len(visited), endpoints=len(assets))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    def _check_security_headers(
        self, url: str, headers: dict[str, str], findings: list[Finding]
    ) -> None:
        """Check for missing security headers."""
        lower_headers = {k.lower(): v for k, v in headers.items()}

        required_headers = {
            "strict-transport-security": (
                "Missing HSTS Header",
                Severity.MEDIUM,
                "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' header.",
            ),
            "x-content-type-options": (
                "Missing X-Content-Type-Options Header",
                Severity.LOW,
                "Add 'X-Content-Type-Options: nosniff' header.",
            ),
            "x-frame-options": (
                "Missing X-Frame-Options Header",
                Severity.MEDIUM,
                "Add 'X-Frame-Options: DENY' or 'SAMEORIGIN' header.",
            ),
            "content-security-policy": (
                "Missing Content-Security-Policy Header",
                Severity.MEDIUM,
                "Implement a Content-Security-Policy header to mitigate XSS attacks.",
            ),
            "x-xss-protection": (
                "Missing X-XSS-Protection Header",
                Severity.LOW,
                "Add 'X-XSS-Protection: 1; mode=block' header.",
            ),
        }

        for header, (title, severity, solution) in required_headers.items():
            if header not in lower_headers:
                findings.append(
                    Finding(
                        title=title,
                        severity=severity,
                        category=VulnCategory.SECURITY_HEADERS,
                        description=f"The security header '{header}' is missing on {url}.",
                        solution=solution,
                        affected_component=url,
                    )
                )

        # Check for information disclosure in Server header
        server = lower_headers.get("server", "")
        if server and any(v in server.lower() for v in ["apache/", "nginx/", "iis/"]):
            findings.append(
                Finding(
                    title="Server Version Disclosure",
                    severity=Severity.LOW,
                    category=VulnCategory.INFO_DISCLOSURE,
                    description=f"Server header reveals version: {server}",
                    solution="Configure the web server to hide version information.",
                    affected_component=url,
                )
            )
