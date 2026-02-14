"""Admin panel detection module.

Probes for exposed admin interfaces, login pages, and management panels.
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


# Comprehensive list of admin paths grouped by platform
ADMIN_PATHS: list[dict[str, Any]] = [
    # Generic admin panels
    {"path": "/admin", "label": "Admin Panel"},
    {"path": "/admin/", "label": "Admin Panel"},
    {"path": "/admin/login", "label": "Admin Login"},
    {"path": "/administrator/", "label": "Administrator Panel"},
    {"path": "/adminpanel/", "label": "Admin Panel"},
    {"path": "/backend/", "label": "Backend Panel"},
    {"path": "/console/", "label": "Console"},
    {"path": "/controlpanel/", "label": "Control Panel"},
    {"path": "/dashboard/", "label": "Dashboard"},
    {"path": "/manage/", "label": "Management Panel"},
    {"path": "/management/", "label": "Management Panel"},
    {"path": "/panel/", "label": "Panel"},
    {"path": "/siteadmin/", "label": "Site Admin"},
    {"path": "/webadmin/", "label": "Web Admin"},

    # WordPress
    {"path": "/wp-admin/", "label": "WordPress Admin"},
    {"path": "/wp-login.php", "label": "WordPress Login"},

    # Database management
    {"path": "/phpmyadmin/", "label": "phpMyAdmin"},
    {"path": "/pma/", "label": "phpMyAdmin"},
    {"path": "/adminer/", "label": "Adminer"},
    {"path": "/adminer.php", "label": "Adminer"},

    # Server management
    {"path": "/cpanel", "label": "cPanel"},
    {"path": "/whm/", "label": "WHM Panel"},
    {"path": "/plesk/", "label": "Plesk"},
    {"path": "/webmin/", "label": "Webmin"},

    # CMS
    {"path": "/administrator/index.php", "label": "Joomla Admin"},
    {"path": "/user/login", "label": "Drupal Login"},
    {"path": "/admin/config", "label": "Drupal Admin"},
    {"path": "/ghost/", "label": "Ghost Admin"},
    {"path": "/modx/", "label": "MODX Admin"},

    # Application servers
    {"path": "/manager/html", "label": "Tomcat Manager"},
    {"path": "/manager/status", "label": "Tomcat Status"},
    {"path": "/server-status", "label": "Apache Server Status"},
    {"path": "/server-info", "label": "Apache Server Info"},

    # API / dev tools
    {"path": "/graphql", "label": "GraphQL Endpoint"},
    {"path": "/graphiql", "label": "GraphiQL IDE"},
    {"path": "/swagger/", "label": "Swagger UI"},
    {"path": "/api-docs", "label": "API Docs"},
    {"path": "/api/docs", "label": "API Docs"},
    {"path": "/debug/", "label": "Debug Panel"},
    {"path": "/_profiler/", "label": "Symfony Profiler"},
    {"path": "/elmah.axd", "label": "ELMAH (.NET Error Log)"},

    # Monitoring / status
    {"path": "/status", "label": "Status Page"},
    {"path": "/health", "label": "Health Check"},
    {"path": "/metrics", "label": "Metrics Endpoint"},
    {"path": "/actuator", "label": "Spring Boot Actuator"},
    {"path": "/actuator/health", "label": "Actuator Health"},
    {"path": "/actuator/env", "label": "Actuator Environment"},
]

# Indicators that a response is an actual admin/login page (not a generic 404/redirect)
LOGIN_FINGERPRINTS = [
    r"<input[^>]*type=['\"]password['\"]",
    r"login|sign[\s_-]*in|log[\s_-]*in",
    r"username|password|email",
    r"admin|dashboard|control\s*panel",
    r"<form[^>]*action=",
]


class AdminDetector(BaseModule):
    """Detects exposed admin panels and management interfaces."""

    @property
    def name(self) -> str:
        return "admin_detector"

    @property
    def description(self) -> str:
        return "Detects exposed admin panels, login pages, and management interfaces"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {"checked": 0, "found": []}

        exclude_paths: list[str] = opts.get("exclude_paths", [])
        log = logger.bind(target=target)
        log.info("Starting admin panel detection")

        base_url = target if target.startswith("http") else f"https://{target}"

        async with httpx.AsyncClient(
            timeout=8,
            follow_redirects=False,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:
            # Check each admin path
            for entry in ADMIN_PATHS:
                path = entry["path"]
                label = entry["label"]

                # Apply exclusion rules
                if any(exc in path for exc in exclude_paths):
                    continue

                raw_output["checked"] += 1
                url = f"{base_url}{path}"

                try:
                    resp = await client.get(url)

                    # Successful response (200) or redirect to login (302)
                    if resp.status_code == 200:
                        is_login = self._is_login_page(resp.text)

                        assets.append(
                            Asset(
                                type="ENDPOINT",
                                value=url,
                                metadata={
                                    "admin_panel": True,
                                    "label": label,
                                    "has_login_form": is_login,
                                    "status_code": resp.status_code,
                                },
                            )
                        )
                        raw_output["found"].append({"path": path, "label": label, "login": is_login})

                        severity = Severity.HIGH if is_login else Severity.MEDIUM

                        findings.append(
                            Finding(
                                title=f"Exposed Admin Panel: {label}",
                                severity=severity,
                                category=VulnCategory.INFO_DISCLOSURE,
                                description=(
                                    f"An administrative interface ({label}) was found at {url}. "
                                    f"{'A login form is present.' if is_login else 'The page is accessible without authentication.'} "
                                    f"Exposed admin panels increase the attack surface."
                                ),
                                solution=(
                                    "Restrict access to admin panels by IP whitelist, VPN, "
                                    "or remove public access entirely. Use strong authentication "
                                    "and rate-limit login attempts."
                                ),
                                affected_component=url,
                                evidence=f"HTTP {resp.status_code} at {url}. Login form: {is_login}.",
                            )
                        )

                    elif resp.status_code in (301, 302, 303, 307, 308):
                        location = resp.headers.get("location", "")
                        # Redirect to a login page is still a valid finding
                        if any(kw in location.lower() for kw in ["login", "auth", "signin"]):
                            raw_output["found"].append({"path": path, "label": label, "redirect": location})

                            assets.append(
                                Asset(
                                    type="ENDPOINT",
                                    value=url,
                                    metadata={
                                        "admin_panel": True,
                                        "label": label,
                                        "redirects_to": location,
                                    },
                                )
                            )

                            findings.append(
                                Finding(
                                    title=f"Admin Panel Detected (Redirect): {label}",
                                    severity=Severity.MEDIUM,
                                    category=VulnCategory.INFO_DISCLOSURE,
                                    description=(
                                        f"Admin path {path} redirects to {location}, indicating "
                                        f"an admin interface exists at this location."
                                    ),
                                    solution=(
                                        "Restrict access to admin endpoints using IP whitelist or VPN."
                                    ),
                                    affected_component=url,
                                    evidence=f"HTTP {resp.status_code} → {location}",
                                )
                            )

                except httpx.TimeoutException:
                    pass
                except Exception as e:
                    errors.append(f"Error checking {path}: {e}")

        log.info(
            "Admin panel detection completed",
            checked=raw_output["checked"],
            found=len(raw_output["found"]),
        )

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    @staticmethod
    def _is_login_page(html: str) -> bool:
        """Heuristic check whether the HTML contains a login form."""
        html_lower = html.lower()
        score = 0

        if re.search(r"<input[^>]*type=['\"]password['\"]", html_lower):
            score += 3
        if re.search(r"<form", html_lower):
            score += 1
        if any(word in html_lower for word in ("login", "sign in", "log in")):
            score += 2
        if any(word in html_lower for word in ("username", "email")):
            score += 1
        if any(word in html_lower for word in ("admin", "dashboard", "panel")):
            score += 1

        return score >= 4
