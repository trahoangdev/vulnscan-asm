"""Vulnerability checker module - CVE and known vulnerability detection."""

import asyncio
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


class VulnChecker(BaseModule):
    """Checks for known vulnerabilities based on discovered services and technologies."""

    @property
    def name(self) -> str:
        return "vuln_checker"

    @property
    def description(self) -> str:
        return "Checks for known CVEs and common vulnerabilities based on detected technologies"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        # Get discovered assets from previous modules
        discovered_assets: list[dict] = opts.get("discovered_assets", [])
        log = logger.bind(target=target)
        log.info("Starting vulnerability check", asset_count=len(discovered_assets))

        base_url = target if target.startswith("http") else f"https://{target}"

        # 1. Check for common web vulnerabilities
        web_findings = await self._check_common_web_vulns(base_url)
        findings.extend(web_findings)

        # 2. Check technologies for known CVEs (lookup against public API)
        tech_assets = [a for a in discovered_assets if a.get("type") == "TECHNOLOGY"]
        for tech in tech_assets:
            tech_findings = await self._check_technology_cves(
                tech.get("value", ""), tech.get("metadata", {})
            )
            findings.extend(tech_findings)

        raw_output["checks_performed"] = {
            "web_vulns": len(web_findings),
            "tech_cves": len(findings) - len(web_findings),
        }

        log.info("Vulnerability check completed", findings=len(findings))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    async def _check_common_web_vulns(self, base_url: str) -> list[Finding]:
        """Check for common web application vulnerabilities."""
        findings: list[Finding] = []

        async with httpx.AsyncClient(
            timeout=config.http_timeout,
            follow_redirects=False,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:
            # Check HTTPS redirect
            try:
                http_url = base_url.replace("https://", "http://")
                resp = await client.get(http_url)
                if resp.status_code not in (301, 302, 307, 308):
                    findings.append(
                        Finding(
                            title="HTTP to HTTPS Redirect Missing",
                            severity=Severity.MEDIUM,
                            category=VulnCategory.SECURITY_HEADERS,
                            description=f"HTTP request to {http_url} does not redirect to HTTPS.",
                            solution="Configure HTTP to HTTPS redirect on the web server.",
                            affected_component=http_url,
                        )
                    )
                elif "https://" not in (resp.headers.get("location", "")):
                    findings.append(
                        Finding(
                            title="HTTP Redirect Does Not Point to HTTPS",
                            severity=Severity.MEDIUM,
                            category=VulnCategory.SECURITY_HEADERS,
                            description="HTTP redirects but not to an HTTPS URL.",
                            solution="Ensure HTTP redirects to HTTPS.",
                            affected_component=http_url,
                        )
                    )
            except Exception:
                pass

            # Check for open redirects (basic check)
            try:
                test_url = f"{base_url}/?redirect=https://evil.com&url=https://evil.com&next=https://evil.com"
                resp = await client.get(test_url)
                location = resp.headers.get("location", "")
                if "evil.com" in location:
                    findings.append(
                        Finding(
                            title="Potential Open Redirect",
                            severity=Severity.MEDIUM,
                            category=VulnCategory.OPEN_REDIRECT,
                            description=f"The application may be vulnerable to open redirect attacks.",
                            solution="Validate and whitelist redirect URLs.",
                            affected_component=base_url,
                        )
                    )
            except Exception:
                pass

            # Check CORS misconfiguration
            try:
                resp = await client.get(
                    base_url,
                    headers={"Origin": "https://evil.com"},
                )
                acao = resp.headers.get("access-control-allow-origin", "")
                if acao == "*" or acao == "https://evil.com":
                    findings.append(
                        Finding(
                            title="CORS Misconfiguration",
                            severity=Severity.HIGH if "evil.com" in acao else Severity.MEDIUM,
                            category=VulnCategory.CORS_MISCONFIG,
                            description=f"CORS allows requests from any/untrusted origin: {acao}",
                            solution="Restrict CORS to trusted domains only.",
                            affected_component=base_url,
                        )
                    )
            except Exception:
                pass

            # Check cookie security
            try:
                resp = await client.get(base_url)
                for cookie_header in resp.headers.get_list("set-cookie"):
                    cookie_lower = cookie_header.lower()
                    cookie_name = cookie_header.split("=")[0].strip()

                    if "secure" not in cookie_lower:
                        findings.append(
                            Finding(
                                title=f"Cookie Missing Secure Flag: {cookie_name}",
                                severity=Severity.LOW,
                                category=VulnCategory.COOKIE_SECURITY,
                                description=f"Cookie '{cookie_name}' is missing the Secure flag.",
                                solution="Add the 'Secure' flag to all cookies.",
                                affected_component=base_url,
                            )
                        )

                    if "httponly" not in cookie_lower and "session" in cookie_lower:
                        findings.append(
                            Finding(
                                title=f"Session Cookie Missing HttpOnly: {cookie_name}",
                                severity=Severity.MEDIUM,
                                category=VulnCategory.COOKIE_SECURITY,
                                description=f"Session cookie '{cookie_name}' is missing HttpOnly flag.",
                                solution="Add the 'HttpOnly' flag to session cookies.",
                                affected_component=base_url,
                            )
                        )
            except Exception:
                pass

        return findings

    async def _check_technology_cves(
        self, tech_name: str, metadata: dict[str, Any]
    ) -> list[Finding]:
        """Look up known CVEs for a technology. Uses public CVE database API."""
        findings: list[Finding] = []

        # For MVP, we provide advisory-level findings for known-vulnerable tech
        # In production, this would query NVD/NIST API or a CVE database
        known_issues: dict[str, list[dict[str, Any]]] = {
            "WordPress": [
                {
                    "title": "WordPress Core - Keep Updated",
                    "severity": Severity.INFO,
                    "description": "WordPress detected. Ensure it is running the latest version.",
                    "solution": "Update WordPress core, themes, and plugins regularly.",
                }
            ],
            "PHP": [
                {
                    "title": "PHP Detected - Version Check Recommended",
                    "severity": Severity.INFO,
                    "description": "PHP detected on server. Old PHP versions have known CVEs.",
                    "solution": "Ensure PHP is updated to a supported version (8.1+).",
                }
            ],
        }

        issues = known_issues.get(tech_name, [])
        for issue in issues:
            findings.append(
                Finding(
                    title=issue["title"],
                    severity=issue["severity"],
                    category=VulnCategory.OUTDATED_SOFTWARE,
                    description=issue["description"],
                    solution=issue["solution"],
                    affected_component=tech_name,
                )
            )

        return findings
