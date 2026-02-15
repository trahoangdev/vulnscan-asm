"""Default Credentials Checker — tests common admin panels for default logins."""

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


# Default credentials database: (service_name, paths, username/password pairs)
DEFAULT_CREDENTIALS: list[dict[str, Any]] = [
    {
        "service": "WordPress",
        "paths": ["/wp-login.php"],
        "method": "POST",
        "body_template": "log={user}&pwd={pass}&wp-submit=Log+In",
        "content_type": "application/x-www-form-urlencoded",
        "success_indicators": ["dashboard", "wp-admin", "wordpress.com"],
        "failure_indicators": ["incorrect", "error", "invalid"],
        "creds": [("admin", "admin"), ("admin", "password"), ("admin", "admin123"), ("admin", "12345")],
    },
    {
        "service": "phpMyAdmin",
        "paths": ["/phpmyadmin/", "/pma/"],
        "method": "POST",
        "body_template": "pma_username={user}&pma_password={pass}&server=1",
        "content_type": "application/x-www-form-urlencoded",
        "success_indicators": ["phpmyadmin", "server_databases", "navigation"],
        "failure_indicators": ["denied", "cannot", "incorrect", "#1045"],
        "creds": [("root", ""), ("root", "root"), ("root", "password"), ("admin", "admin")],
    },
    {
        "service": "Tomcat Manager",
        "paths": ["/manager/html", "/manager/"],
        "method": "BASIC_AUTH",
        "success_indicators": ["Tomcat", "manager", "deploy"],
        "failure_indicators": ["401", "unauthorized"],
        "creds": [("tomcat", "tomcat"), ("admin", "admin"), ("tomcat", "s3cret"), ("admin", "tomcat")],
    },
    {
        "service": "Jenkins",
        "paths": ["/j_acegi_security_check"],
        "method": "POST",
        "body_template": "j_username={user}&j_password={pass}&Submit=Sign+in",
        "content_type": "application/x-www-form-urlencoded",
        "success_indicators": ["dashboard", "jenkins", "manage"],
        "failure_indicators": ["invalid", "bad credentials", "loginError"],
        "creds": [("admin", "admin"), ("admin", "password"), ("admin", "jenkins")],
    },
    {
        "service": "Grafana",
        "paths": ["/login"],
        "method": "POST_JSON",
        "body_template": '{{"user":"{user}","password":"{pass}"}}',
        "content_type": "application/json",
        "success_indicators": ['"message":"Logged in"'],
        "failure_indicators": ["invalid", "unauthorized"],
        "creds": [("admin", "admin"), ("admin", "grafana"), ("admin", "password")],
    },
    {
        "service": "Kibana/Elasticsearch",
        "paths": ["/_security/_authenticate"],
        "method": "BASIC_AUTH",
        "success_indicators": ['"username"', '"roles"'],
        "failure_indicators": ["security_exception", "unauthorized"],
        "creds": [("elastic", "changeme"), ("elastic", "elastic"), ("admin", "admin")],
    },
    {
        "service": "RabbitMQ Management",
        "paths": ["/api/whoami"],
        "method": "BASIC_AUTH",
        "success_indicators": ['"name"', '"tags"'],
        "failure_indicators": ["unauthorized", "401"],
        "creds": [("guest", "guest"), ("admin", "admin"), ("rabbitmq", "rabbitmq")],
    },
    {
        "service": "Router/Modem",
        "paths": ["/login.htm", "/login.html", "/cgi-bin/login"],
        "method": "BASIC_AUTH",
        "success_indicators": ["configuration", "settings", "admin"],
        "failure_indicators": ["unauthorized", "invalid"],
        "creds": [("admin", "admin"), ("admin", "password"), ("admin", "1234"), ("root", "root")],
    },
]


class DefaultCredsChecker(BaseModule):
    """Tests common services for default/weak credentials."""

    @property
    def name(self) -> str:
        return "default_creds_checker"

    @property
    def description(self) -> str:
        return "Tests admin panels and services for default credentials"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {"tested": [], "vulnerable": []}

        base_url = target if target.startswith("http") else f"https://{target}"
        log = logger.bind(target=base_url)
        log.info("Starting default credentials check")

        # Get discovered assets that might have admin panels
        discovered = opts.get("discovered_assets", [])
        admin_urls: set[str] = set()
        for asset in discovered:
            if isinstance(asset, dict):
                val = asset.get("value", "")
                if "admin" in val.lower() or "login" in val.lower() or "manager" in val.lower():
                    admin_urls.add(val)

        try:
            async with httpx.AsyncClient(
                timeout=config.http_timeout,
                follow_redirects=True,
                verify=False,
                headers={"User-Agent": config.http_user_agent},
            ) as client:

                for service_def in DEFAULT_CREDENTIALS:
                    service_name = service_def["service"]
                    tested_any = False

                    for path in service_def["paths"]:
                        url = f"{base_url}{path}"

                        # Check if path exists first
                        try:
                            probe = await client.get(url)
                            if probe.status_code in (404, 403, 502, 503):
                                continue
                        except Exception:
                            continue

                        tested_any = True
                        raw_output["tested"].append({"service": service_name, "url": url})

                        for username, password in service_def["creds"]:
                            try:
                                result = await self._try_login(
                                    client, url, service_def, username, password
                                )

                                if result:
                                    findings.append(
                                        Finding(
                                            title=f"Default Credentials: {service_name}",
                                            severity=Severity.CRITICAL,
                                            category=VulnCategory.DEFAULT_CREDENTIALS,
                                            description=(
                                                f"{service_name} at {url} is accessible with default credentials "
                                                f"({username}:{self._mask_password(password)}). "
                                                "Default credentials allow unauthorized access to the service."
                                            ),
                                            solution=(
                                                f"Immediately change the {service_name} credentials. "
                                                "Use a strong unique password. Consider restricting access "
                                                "via firewall rules or VPN."
                                            ),
                                            affected_component=url,
                                            evidence=f"Login succeeded with {username}:{'*' * max(len(password), 3)}",
                                        )
                                    )
                                    raw_output["vulnerable"].append({
                                        "service": service_name,
                                        "url": url,
                                        "username": username,
                                    })
                                    break  # Don't test more creds once we found one

                            except Exception:
                                pass

                        # Small delay between services to be polite
                        import asyncio
                        await asyncio.sleep(0.5)

        except Exception as e:
            errors.append(f"Default credentials check error: {e}")
            log.error("Default credentials check failed", error=str(e))

        log.info(
            "Default credentials check completed",
            tested=len(raw_output["tested"]),
            vulnerable=len(raw_output["vulnerable"]),
        )

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    async def _try_login(
        self,
        client: httpx.AsyncClient,
        url: str,
        service_def: dict[str, Any],
        username: str,
        password: str,
    ) -> bool:
        """Attempt a single login and return True if it succeeded."""
        method = service_def.get("method", "POST")

        if method == "BASIC_AUTH":
            resp = await client.get(url, auth=(username, password))
            body = resp.text.lower()
            if resp.status_code == 200:
                for indicator in service_def.get("success_indicators", []):
                    if indicator.lower() in body:
                        return True
            return False

        elif method == "POST":
            body_template = service_def.get("body_template", "")
            data = body_template.format(user=username, **{"pass": password})
            resp = await client.post(
                url,
                content=data,
                headers={"Content-Type": service_def.get("content_type", "application/x-www-form-urlencoded")},
            )
            resp_body = resp.text.lower()
            # Check for failure indicators first (more reliable)
            for indicator in service_def.get("failure_indicators", []):
                if indicator.lower() in resp_body:
                    return False
            # Check for redirect to dashboard
            if resp.status_code in (302, 303) and resp.headers.get("location", ""):
                return True
            for indicator in service_def.get("success_indicators", []):
                if indicator.lower() in resp_body:
                    return True
            return False

        elif method == "POST_JSON":
            body_template = service_def.get("body_template", "{}")
            data = body_template.format(user=username, **{"pass": password})
            resp = await client.post(
                url,
                content=data,
                headers={"Content-Type": "application/json"},
            )
            resp_body = resp.text.lower()
            for indicator in service_def.get("success_indicators", []):
                if indicator.lower() in resp_body:
                    return True
            return False

        return False

    @staticmethod
    def _mask_password(password: str) -> str:
        """Mask password for display, showing only first char."""
        if not password:
            return "(empty)"
        if len(password) <= 2:
            return "*" * len(password)
        return password[0] + "*" * (len(password) - 1)
