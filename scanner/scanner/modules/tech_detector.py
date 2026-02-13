"""Technology detection module."""

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


# Simplified technology fingerprints
TECH_SIGNATURES: list[dict[str, Any]] = [
    # CMS
    {"name": "WordPress", "category": "CMS", "patterns": {
        "header": [r"X-Powered-By:.*WordPress"],
        "body": [r"wp-content/", r"wp-includes/", r"wp-json"],
        "meta": [r'name="generator"\s+content="WordPress'],
    }},
    {"name": "Drupal", "category": "CMS", "patterns": {
        "header": [r"X-Generator:.*Drupal", r"X-Drupal"],
        "body": [r"sites/default/files", r"Drupal.settings"],
    }},
    {"name": "Joomla", "category": "CMS", "patterns": {
        "body": [r"/media/jui/", r"/components/com_"],
        "meta": [r'name="generator"\s+content="Joomla'],
    }},
    # Frameworks
    {"name": "React", "category": "JavaScript Framework", "patterns": {
        "body": [r"__NEXT_DATA__", r"_reactRootContainer", r"react-root"],
    }},
    {"name": "Next.js", "category": "JavaScript Framework", "patterns": {
        "body": [r"__NEXT_DATA__", r"/_next/static"],
        "header": [r"x-powered-by:.*Next\.js"],
    }},
    {"name": "Vue.js", "category": "JavaScript Framework", "patterns": {
        "body": [r"__vue__", r"vue-router", r"data-v-[a-f0-9]+"],
    }},
    {"name": "Angular", "category": "JavaScript Framework", "patterns": {
        "body": [r"ng-version=", r"ng-app", r"angular\.min\.js"],
    }},
    # Servers
    {"name": "Nginx", "category": "Web Server", "patterns": {
        "header": [r"server:\s*nginx"],
    }},
    {"name": "Apache", "category": "Web Server", "patterns": {
        "header": [r"server:\s*Apache"],
    }},
    {"name": "IIS", "category": "Web Server", "patterns": {
        "header": [r"server:\s*Microsoft-IIS"],
    }},
    # Languages
    {"name": "PHP", "category": "Programming Language", "patterns": {
        "header": [r"x-powered-by:.*PHP"],
        "body": [r"\.php"],
    }},
    {"name": "ASP.NET", "category": "Programming Language", "patterns": {
        "header": [r"x-aspnet-version", r"x-powered-by:.*ASP\.NET"],
    }},
    # CDN/Services
    {"name": "Cloudflare", "category": "CDN", "patterns": {
        "header": [r"cf-ray:", r"server:\s*cloudflare"],
    }},
    {"name": "AWS", "category": "Cloud", "patterns": {
        "header": [r"x-amz-", r"server:\s*AmazonS3"],
    }},
    # Analytics
    {"name": "Google Analytics", "category": "Analytics", "patterns": {
        "body": [r"google-analytics\.com/analytics\.js", r"gtag/js", r"UA-\d+-\d+"],
    }},
]


class TechDetector(BaseModule):
    """Detects technologies used by a website."""

    @property
    def name(self) -> str:
        return "tech_detector"

    @property
    def description(self) -> str:
        return "Identifies web technologies, frameworks, and services in use"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        base_url = target if target.startswith("http") else f"https://{target}"
        log = logger.bind(target=base_url)
        log.info("Starting technology detection")

        detected: list[dict[str, str]] = []

        try:
            async with httpx.AsyncClient(
                timeout=config.http_timeout,
                follow_redirects=True,
                verify=False,
                headers={"User-Agent": config.http_user_agent},
            ) as client:
                response = await client.get(base_url)
                body = response.text
                headers_str = "\n".join(f"{k}: {v}" for k, v in response.headers.items())

                for tech in TECH_SIGNATURES:
                    found = False
                    patterns = tech.get("patterns", {})

                    # Check headers
                    for pattern in patterns.get("header", []):
                        if re.search(pattern, headers_str, re.IGNORECASE):
                            found = True
                            break

                    # Check body
                    if not found:
                        for pattern in patterns.get("body", []):
                            if re.search(pattern, body, re.IGNORECASE):
                                found = True
                                break

                    # Check meta tags
                    if not found:
                        for pattern in patterns.get("meta", []):
                            if re.search(pattern, body, re.IGNORECASE):
                                found = True
                                break

                    if found:
                        detected.append({
                            "name": tech["name"],
                            "category": tech["category"],
                        })
                        assets.append(
                            Asset(
                                type="TECHNOLOGY",
                                value=tech["name"],
                                metadata={
                                    "category": tech["category"],
                                    "detected_on": base_url,
                                },
                            )
                        )

            raw_output["detected_technologies"] = detected
            log.info("Tech detection completed", technologies=len(detected))

        except Exception as e:
            errors.append(f"Technology detection error: {e}")
            logger.error("Tech detection failed", error=str(e))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )
