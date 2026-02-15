"""API Security scanner module — IDOR, broken auth, rate limiting, data exposure.

Checks for:
1. IDOR (Insecure Direct Object Reference) — parameter manipulation
2. Broken Authentication — unauthenticated access to protected endpoints
3. Rate Limiting — absence of throttling on critical endpoints
4. Data Exposure — sensitive data in API responses
"""

import asyncio
import re
import time
from typing import Any

import httpx

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

# ── IDOR payloads ─────────────────────────────────────────────────────────

IDOR_PATHS = [
    "/api/users/{id}",
    "/api/v1/users/{id}",
    "/api/accounts/{id}",
    "/api/orders/{id}",
    "/api/invoices/{id}",
    "/api/profile/{id}",
    "/api/documents/{id}",
    "/api/files/{id}",
    "/api/settings/{id}",
    "/users/{id}",
    "/v1/users/{id}",
    "/v2/users/{id}",
]

IDOR_IDS = ["1", "2", "100", "999", "0", "admin"]

# ── Broken auth paths ────────────────────────────────────────────────────

PROTECTED_PATHS = [
    "/api/users",
    "/api/users/me",
    "/api/admin",
    "/api/admin/users",
    "/api/admin/settings",
    "/api/v1/users",
    "/api/v1/admin",
    "/api/settings",
    "/api/billing",
    "/api/organizations",
    "/api/reports",
    "/api/scans",
    "/admin",
    "/admin/dashboard",
    "/admin/users",
    "/dashboard",
    "/api/vulnerabilities",
    "/api/targets",
    "/api/notifications",
    "/api/webhooks",
    "/api/api-keys",
]

# ── Rate limit test paths ────────────────────────────────────────────────

RATE_LIMIT_PATHS = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/login",
    "/auth/login",
    "/api/v1/auth/login",
]

# ── Data exposure patterns ────────────────────────────────────────────────

SENSITIVE_PATTERNS = [
    (r'"password"\s*:\s*"[^"]+"', "Password in response"),
    (r'"secret"\s*:\s*"[^"]+"', "Secret key in response"),
    (r'"api_key"\s*:\s*"[^"]+"', "API key in response"),
    (r'"apiKey"\s*:\s*"[^"]+"', "API key in response"),
    (r'"token"\s*:\s*"eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*"', "JWT token in response"),
    (r'"access_token"\s*:\s*"[^"]+"', "Access token in response"),
    (r'"private_key"\s*:\s*"[^"]+"', "Private key in response"),
    (r'"ssn"\s*:\s*"\d{3}-?\d{2}-?\d{4}"', "SSN in response"),
    (r'"credit_card"\s*:\s*"\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}"', "Credit card in response"),
    (r'"creditCard"\s*:\s*"\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}"', "Credit card in response"),
    (r'"aws_access_key_id"\s*:\s*"AKIA[A-Z0-9]{16}"', "AWS access key in response"),
    (r'"database_url"\s*:\s*"[^"]+"', "Database URL in response"),
    (r'"connectionString"\s*:\s*"[^"]+"', "Connection string in response"),
    (r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', "Private key in response"),
    (r'"stripe_sk_"\s*:\s*"sk_live_[A-Za-z0-9]+"', "Stripe secret key in response"),
]

# Headers that indicate sensitive data handling issues
MISSING_SECURITY_HEADERS_API = [
    "x-content-type-options",
    "cache-control",
]

# Paths to check for data exposure
DATA_EXPOSURE_PATHS = [
    "/api/users",
    "/api/users/me",
    "/api/v1/users",
    "/api/accounts",
    "/api/admin/users",
    "/api/organizations",
    "/api/settings",
    "/api/config",
    "/api/env",
    "/api/debug",
    "/api/status",
    "/api/info",
    "/actuator",
    "/actuator/env",
    "/actuator/health",
    "/.env",
    "/config.json",
    "/api/v1/config",
]


class ApiSecurity(BaseModule):
    """API security checks — IDOR, broken auth, rate limiting, data exposure."""

    @property
    def name(self) -> str:
        return "api_security"

    @property
    def description(self) -> str:
        return "API security testing — IDOR, broken auth, rate limiting, data exposure"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        discovered_assets: list[dict] = opts.get("discovered_assets", [])
        log = logger.bind(target=target)
        log.info("Starting API security checks")

        base_url = target if target.startswith("http") else f"https://{target}"

        async with httpx.AsyncClient(
            timeout=config.http_timeout,
            follow_redirects=False,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:
            # 1. IDOR detection
            idor_findings = await self._check_idor(base_url, client)
            findings.extend(idor_findings)
            raw_output["idor"] = len(idor_findings)

            # 2. Broken authentication
            auth_findings = await self._check_broken_auth(base_url, client)
            findings.extend(auth_findings)
            raw_output["broken_auth"] = len(auth_findings)

            # 3. Rate limiting
            rate_findings = await self._check_rate_limiting(base_url, client)
            findings.extend(rate_findings)
            raw_output["rate_limiting"] = len(rate_findings)

            # 4. Data exposure
            exposure_findings = await self._check_data_exposure(base_url, client)
            findings.extend(exposure_findings)
            raw_output["data_exposure"] = len(exposure_findings)

        log.info("API security checks completed", findings=len(findings))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    # ── IDOR Detection ───────────────────────────────────────────────────────

    async def _check_idor(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        """
        Test for IDOR by accessing resources with different IDs without auth.
        A positive is when sequential IDs return different valid data.
        """
        findings: list[Finding] = []
        found_idor = False

        for path_template in IDOR_PATHS:
            if found_idor:
                break

            responses: dict[str, int] = {}
            data_samples: dict[str, str] = {}

            for test_id in IDOR_IDS:
                path = path_template.replace("{id}", test_id)
                url = f"{base_url}{path}"
                try:
                    resp = await client.get(url)
                    responses[test_id] = resp.status_code
                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "")
                        if "json" in ct:
                            data_samples[test_id] = resp.text[:500]
                except Exception:
                    pass

            # IDOR indicator: multiple different IDs returning 200 with different data
            ok_ids = [k for k, v in responses.items() if v == 200]
            if len(ok_ids) >= 2:
                # Verify they return different data (not same default/error)
                unique_bodies = set(data_samples.get(k, "") for k in ok_ids)
                if len(unique_bodies) >= 2:
                    found_idor = True
                    findings.append(
                        Finding(
                            title="Potential IDOR — Direct Object Reference",
                            severity=Severity.HIGH,
                            category=VulnCategory.IDOR,
                            description=(
                                f"Multiple user/resource IDs returned different data at "
                                f"{path_template} without authentication. This indicates "
                                f"the application may allow unauthorized access to other "
                                f"users' data by manipulating object IDs."
                            ),
                            solution=(
                                "Implement proper authorization checks: verify the "
                                "authenticated user owns the requested resource. "
                                "Use UUIDs instead of sequential IDs. "
                                "Apply access control at the data layer."
                            ),
                            affected_component=f"{base_url}{path_template}",
                            evidence=(
                                f"IDs tested: {ok_ids}\n"
                                f"All returned HTTP 200 with different response bodies."
                            ),
                            references=[
                                "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References",
                                "https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html",
                            ],
                        )
                    )

            # Also check: unauthenticated access returning 200 (should be 401/403)
            if not found_idor:
                for test_id in IDOR_IDS[:2]:
                    status = responses.get(test_id)
                    if status == 200:
                        findings.append(
                            Finding(
                                title="Unauthenticated Object Access",
                                severity=Severity.MEDIUM,
                                category=VulnCategory.IDOR,
                                description=(
                                    f"Resource at {path_template.replace('{id}', test_id)} "
                                    f"returned HTTP 200 without authentication. Protected "
                                    f"resources should require authentication."
                                ),
                                solution=(
                                    "Require authentication for all resource endpoints. "
                                    "Return 401 Unauthorized for unauthenticated requests."
                                ),
                                affected_component=f"{base_url}{path_template}",
                                evidence=f"ID {test_id} → HTTP {status}",
                                references=[
                                    "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/",
                                ],
                            )
                        )
                        found_idor = True
                        break

        return findings

    # ── Broken Authentication ────────────────────────────────────────────────

    async def _check_broken_auth(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        """Check for endpoints accessible without authentication."""
        findings: list[Finding] = []
        vulnerable_paths: list[str] = []

        for path in PROTECTED_PATHS:
            url = f"{base_url}{path}"
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    ct = resp.headers.get("content-type", "")
                    body = resp.text[:2000]

                    # Skip generic HTML pages / redirects
                    if "text/html" in ct and "<title>" in body.lower():
                        # Check if it's an SPA that always returns 200
                        if "login" in body.lower() or "sign in" in body.lower():
                            continue

                    # JSON response with actual data = auth bypass
                    if "json" in ct and len(body) > 50:
                        vulnerable_paths.append(path)

                    # Admin panels without auth
                    if "/admin" in path and resp.status_code == 200:
                        if "login" not in body.lower():
                            vulnerable_paths.append(path)

            except Exception:
                pass

        if vulnerable_paths:
            findings.append(
                Finding(
                    title="Broken Authentication — Unprotected Endpoints",
                    severity=Severity.HIGH,
                    category=VulnCategory.OTHER,
                    description=(
                        f"The following endpoints returned data without authentication: "
                        f"{', '.join(vulnerable_paths[:10])}. "
                        f"These endpoints should require valid credentials."
                    ),
                    solution=(
                        "Implement authentication middleware on all API routes. "
                        "Use JWT or session-based authentication. "
                        "Return 401 for unauthenticated requests to protected resources."
                    ),
                    affected_component=f"{base_url}{vulnerable_paths[0]}",
                    evidence=f"Unprotected endpoints: {', '.join(vulnerable_paths[:10])}",
                    references=[
                        "https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/",
                        "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/",
                    ],
                )
            )

        return findings

    # ── Rate Limiting Check ──────────────────────────────────────────────────

    async def _check_rate_limiting(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        """Check if critical authentication endpoints have rate limiting."""
        findings: list[Finding] = []
        unprotected_endpoints: list[str] = []

        for path in RATE_LIMIT_PATHS:
            url = f"{base_url}{path}"
            try:
                # First request to check if endpoint exists
                resp = await client.post(
                    url,
                    json={"email": "test@test.com", "password": "test123"},
                    headers={"Content-Type": "application/json"},
                )

                # Skip if endpoint doesn't exist
                if resp.status_code in (404, 405):
                    continue

                # Rapid-fire requests to check for rate limiting
                statuses: list[int] = []
                for _ in range(12):
                    try:
                        r = await client.post(
                            url,
                            json={"email": "bruteforce@test.com", "password": "wrong"},
                            headers={"Content-Type": "application/json"},
                        )
                        statuses.append(r.status_code)

                        # Check for rate limit headers
                        if any(h in r.headers for h in [
                            "x-ratelimit-limit", "x-rate-limit-limit",
                            "retry-after", "x-ratelimit-remaining",
                        ]):
                            break  # Rate limiting is present

                        # 429 = Too Many Requests
                        if r.status_code == 429:
                            break  # Rate limiting is working

                    except Exception:
                        break

                    await asyncio.sleep(0.05)

                # If we sent 12 requests and never got 429 or rate limit headers
                if len(statuses) >= 10 and 429 not in statuses:
                    # Check headers on last response for rate limit info
                    last_has_ratelimit = any(
                        h.lower().startswith(("x-ratelimit", "x-rate-limit", "retry-after"))
                        for h in (resp.headers or {})
                    )
                    if not last_has_ratelimit:
                        unprotected_endpoints.append(path)

            except Exception:
                pass

        if unprotected_endpoints:
            findings.append(
                Finding(
                    title="Missing Rate Limiting on Authentication Endpoints",
                    severity=Severity.MEDIUM,
                    category=VulnCategory.OTHER,
                    description=(
                        f"The following authentication endpoints do not appear to have "
                        f"rate limiting: {', '.join(unprotected_endpoints)}. "
                        f"This could allow brute-force attacks against user credentials."
                    ),
                    solution=(
                        "Implement rate limiting on all authentication endpoints. "
                        "Use progressive delays, CAPTCHA after failed attempts, "
                        "and account lockout policies. Recommended: max 5 attempts "
                        "per minute per IP."
                    ),
                    affected_component=f"{base_url}{unprotected_endpoints[0]}",
                    evidence=(
                        f"Sent 12 rapid requests without receiving HTTP 429 or "
                        f"rate-limit headers on: {', '.join(unprotected_endpoints)}"
                    ),
                    references=[
                        "https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/",
                        "https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html",
                    ],
                )
            )

        return findings

    # ── Data Exposure Analysis ───────────────────────────────────────────────

    async def _check_data_exposure(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        """Check API responses for sensitive data leakage."""
        findings: list[Finding] = []
        exposures_found: list[dict[str, str]] = []

        for path in DATA_EXPOSURE_PATHS:
            url = f"{base_url}{path}"
            try:
                resp = await client.get(url)
                if resp.status_code not in (200, 201):
                    continue

                body = resp.text[:10000]

                # Check for sensitive data patterns
                for pattern, label in SENSITIVE_PATTERNS:
                    if re.search(pattern, body, re.IGNORECASE):
                        exposures_found.append({
                            "path": path,
                            "issue": label,
                        })
                        break  # One exposure per path is enough

                # Check for verbose error messages with stack traces
                if any(kw in body for kw in [
                    "stack trace", "Traceback", "at Object.",
                    "Error: ", "Exception:", "node_modules/",
                    "ECONNREFUSED", "password", "DATABASE_URL",
                ]):
                    ct = resp.headers.get("content-type", "")
                    if "json" in ct or "text" in ct:
                        exposures_found.append({
                            "path": path,
                            "issue": "Verbose error/debug information",
                        })

                # Check for missing security headers on API responses
                ct = resp.headers.get("content-type", "")
                if "json" in ct:
                    cache_control = resp.headers.get("cache-control", "")
                    if "no-store" not in cache_control and "private" not in cache_control:
                        if path in ("/api/users/me", "/api/settings", "/api/billing"):
                            exposures_found.append({
                                "path": path,
                                "issue": "Sensitive endpoint missing Cache-Control: no-store",
                            })

            except Exception:
                pass

        # Deduplicate and create findings
        seen_issues: set[str] = set()
        for exp in exposures_found:
            key = f"{exp['path']}:{exp['issue']}"
            if key in seen_issues:
                continue
            seen_issues.add(key)

            findings.append(
                Finding(
                    title=f"Data Exposure — {exp['issue']}",
                    severity=Severity.HIGH if "password" in exp["issue"].lower()
                        or "key" in exp["issue"].lower()
                        or "token" in exp["issue"].lower()
                        else Severity.MEDIUM,
                    category=VulnCategory.INFO_DISCLOSURE,
                    description=(
                        f"Sensitive data detected at {exp['path']}: {exp['issue']}. "
                        f"API responses should not expose sensitive information."
                    ),
                    solution=(
                        "Remove sensitive fields from API responses. "
                        "Use response DTOs to control which fields are returned. "
                        "Disable debug mode in production. "
                        "Add Cache-Control: no-store to sensitive endpoints."
                    ),
                    affected_component=f"{base_url}{exp['path']}",
                    evidence=f"Path: {exp['path']}, Issue: {exp['issue']}",
                    references=[
                        "https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/",
                        "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/",
                    ],
                )
            )

        return findings
