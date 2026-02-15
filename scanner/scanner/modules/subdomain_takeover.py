"""Subdomain takeover detection module.

Checks CNAME records for subdomains pointing to unclaimed third-party services.
"""

import asyncio
import time
from typing import Any

import dns.resolver
import dns.exception
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


# Fingerprints of unclaimed third-party services.
# Each entry: service name, CNAME patterns, HTTP body indicators of dangling record.
TAKEOVER_FINGERPRINTS: list[dict[str, Any]] = [
    {
        "service": "GitHub Pages",
        "cname_patterns": [".github.io"],
        "http_fingerprints": [
            "There isn't a GitHub Pages site here.",
            "For root URLs (like http://example.com/) you must provide an index.html file",
        ],
        "nxdomain": False,
    },
    {
        "service": "Heroku",
        "cname_patterns": [".herokuapp.com", ".herokussl.com"],
        "http_fingerprints": [
            "No such app",
            "no-such-app",
            "herokucdn.com/error-pages",
        ],
        "nxdomain": True,
    },
    {
        "service": "AWS S3",
        "cname_patterns": [".s3.amazonaws.com", ".s3-website"],
        "http_fingerprints": [
            "NoSuchBucket",
            "The specified bucket does not exist",
        ],
        "nxdomain": False,
    },
    {
        "service": "AWS Elastic Beanstalk",
        "cname_patterns": [".elasticbeanstalk.com"],
        "http_fingerprints": [],
        "nxdomain": True,
    },
    {
        "service": "Azure",
        "cname_patterns": [
            ".azurewebsites.net",
            ".cloudapp.net",
            ".cloudapp.azure.com",
            ".trafficmanager.net",
            ".blob.core.windows.net",
            ".azure-api.net",
            ".azurehdinsight.net",
            ".azureedge.net",
        ],
        "http_fingerprints": [],
        "nxdomain": True,
    },
    {
        "service": "Shopify",
        "cname_patterns": [".myshopify.com"],
        "http_fingerprints": [
            "Sorry, this shop is currently unavailable.",
            "Only one step left!",
        ],
        "nxdomain": False,
    },
    {
        "service": "Fastly",
        "cname_patterns": [".fastly.net"],
        "http_fingerprints": ["Fastly error: unknown domain"],
        "nxdomain": False,
    },
    {
        "service": "Pantheon",
        "cname_patterns": [".pantheonsite.io"],
        "http_fingerprints": [
            "404 error unknown site!",
            "The gods are wise",
        ],
        "nxdomain": False,
    },
    {
        "service": "Tumblr",
        "cname_patterns": [".tumblr.com"],
        "http_fingerprints": [
            "Whatever you were looking for doesn't currently exist at this address.",
            "There's nothing here.",
        ],
        "nxdomain": False,
    },
    {
        "service": "WordPress.com",
        "cname_patterns": [".wordpress.com"],
        "http_fingerprints": [
            "Do you want to register",
        ],
        "nxdomain": False,
    },
    {
        "service": "Surge.sh",
        "cname_patterns": [".surge.sh"],
        "http_fingerprints": ["project not found"],
        "nxdomain": False,
    },
    {
        "service": "Zendesk",
        "cname_patterns": [".zendesk.com"],
        "http_fingerprints": [
            "Help Center Closed",
            "this help center no longer exists",
        ],
        "nxdomain": False,
    },
    {
        "service": "Unbounce",
        "cname_patterns": [".unbouncepages.com"],
        "http_fingerprints": ["The requested URL was not found on this server"],
        "nxdomain": False,
    },
    {
        "service": "Fly.io",
        "cname_patterns": [".fly.dev"],
        "http_fingerprints": [],
        "nxdomain": True,
    },
    {
        "service": "Netlify",
        "cname_patterns": [".netlify.app", ".netlify.com"],
        "http_fingerprints": ["Not Found - Request ID:"],
        "nxdomain": False,
    },
]


class SubdomainTakeover(BaseModule):
    """Detects potential subdomain takeover vulnerabilities."""

    @property
    def name(self) -> str:
        return "subdomain_takeover"

    @property
    def description(self) -> str:
        return "Checks for subdomain takeover via dangling CNAME records"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {"checked": [], "vulnerable": []}

        # Collect subdomains from previously discovered assets
        discovered_assets: list[dict] = opts.get("discovered_assets", [])
        subdomains: list[str] = [
            a["value"]
            for a in discovered_assets
            if a.get("type") == "SUBDOMAIN"
        ]

        # Also check the target itself
        clean = target.replace("https://", "").replace("http://", "").rstrip("/")
        if clean not in subdomains:
            subdomains.insert(0, clean)

        log = logger.bind(target=target)
        log.info("Starting subdomain takeover check", subdomain_count=len(subdomains))

        resolver = dns.resolver.Resolver()
        resolver.nameservers = config.dns_resolvers
        resolver.timeout = config.dns_timeout
        resolver.lifetime = config.dns_timeout * 2

        checked = 0
        for subdomain in subdomains:
            try:
                result = await self._check_subdomain(subdomain, resolver)
                raw_output["checked"].append(subdomain)
                checked += 1

                if result:
                    findings.append(result)
                    raw_output["vulnerable"].append(subdomain)
                    assets.append(
                        Asset(
                            type="SUBDOMAIN",
                            value=subdomain,
                            metadata={"takeover_risk": True, "service": result.affected_component},
                        )
                    )
            except Exception as e:
                errors.append(f"Error checking {subdomain}: {e}")

        log.info(
            "Subdomain takeover check completed",
            checked=checked,
            vulnerable=len(findings),
        )

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    async def _check_subdomain(
        self, subdomain: str, resolver: dns.resolver.Resolver
    ) -> Finding | None:
        """Check a single subdomain for takeover potential."""
        loop = asyncio.get_event_loop()

        # Step 1: Resolve CNAME record
        try:
            answers = await loop.run_in_executor(
                None, lambda: resolver.resolve(subdomain, "CNAME")
            )
            cname_target = str(answers[0]).rstrip(".")
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.DNSException):
            return None

        # Step 2: Match CNAME against known vulnerable services
        matched_service = None
        matched_fp = None
        for fp in TAKEOVER_FINGERPRINTS:
            for pattern in fp["cname_patterns"]:
                if cname_target.endswith(pattern) or pattern in cname_target:
                    matched_service = fp["service"]
                    matched_fp = fp
                    break
            if matched_service:
                break

        if not matched_service or not matched_fp:
            return None

        # Step 3: Check if CNAME target is NXDOMAIN (strong indicator)
        is_nxdomain = False
        if matched_fp.get("nxdomain"):
            try:
                await loop.run_in_executor(
                    None, lambda: resolver.resolve(cname_target, "A")
                )
            except dns.resolver.NXDOMAIN:
                is_nxdomain = True
            except Exception:
                pass

        # Step 4: HTTP probe for service-specific fingerprint
        http_match = False
        if matched_fp.get("http_fingerprints"):
            try:
                async with httpx.AsyncClient(
                    timeout=8,
                    follow_redirects=True,
                    verify=False,
                    headers={"User-Agent": config.http_user_agent},
                ) as client:
                    for scheme in ("https", "http"):
                        try:
                            resp = await client.get(f"{scheme}://{subdomain}")
                            body = resp.text
                            for fingerprint in matched_fp["http_fingerprints"]:
                                if fingerprint.lower() in body.lower():
                                    http_match = True
                                    break
                            if http_match:
                                break
                        except Exception:
                            continue
            except Exception:
                pass

        if not is_nxdomain and not http_match:
            return None

        # Build finding
        evidence_parts = [f"CNAME: {subdomain} → {cname_target}"]
        if is_nxdomain:
            evidence_parts.append(f"CNAME target {cname_target} returns NXDOMAIN")
        if http_match:
            evidence_parts.append(f"HTTP response matches {matched_service} unclaimed fingerprint")

        return Finding(
            title=f"Potential Subdomain Takeover: {subdomain}",
            severity=Severity.HIGH,
            category=VulnCategory.INFO_DISCLOSURE,
            description=(
                f"Subdomain '{subdomain}' has a CNAME record pointing to {matched_service} "
                f"({cname_target}), but the service appears to be unclaimed. An attacker could "
                f"register the service and serve malicious content on this subdomain."
            ),
            solution=(
                f"Either remove the dangling CNAME DNS record for {subdomain}, "
                f"or reclaim the {matched_service} resource that it points to."
            ),
            affected_component=matched_service,
            evidence="\n".join(evidence_parts),
            references=[
                "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/10-Test_for_Subdomain_Takeover",
                "https://github.com/EdOverflow/can-i-take-over-xyz",
            ],
        )
