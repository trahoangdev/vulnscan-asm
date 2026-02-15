"""NVD CVE matching module — queries NIST NVD API for known vulnerabilities.

Matches detected technologies (from tech_detector) against the NVD database
to find known CVEs for specific software + version combinations.
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


NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# Map CVSS v3 base score ranges to our severity
def _cvss_to_severity(score: float) -> Severity:
    if score >= 9.0:
        return Severity.CRITICAL
    if score >= 7.0:
        return Severity.HIGH
    if score >= 4.0:
        return Severity.MEDIUM
    if score >= 0.1:
        return Severity.LOW
    return Severity.INFO


# CPE vendor/product names for known technologies
TECH_TO_CPE: dict[str, dict[str, str]] = {
    "WordPress": {"vendor": "wordpress", "product": "wordpress"},
    "Drupal": {"vendor": "drupal", "product": "drupal"},
    "Joomla": {"vendor": "joomla", "product": "joomla\\!"},
    "PHP": {"vendor": "php", "product": "php"},
    "Nginx": {"vendor": "f5", "product": "nginx"},
    "Apache": {"vendor": "apache", "product": "http_server"},
    "IIS": {"vendor": "microsoft", "product": "internet_information_services"},
    "ASP.NET": {"vendor": "microsoft", "product": "asp.net_core"},
    "Next.js": {"vendor": "vercel", "product": "next.js"},
    "React": {"vendor": "facebook", "product": "react"},
    "Vue.js": {"vendor": "vuejs", "product": "vue.js"},
    "Angular": {"vendor": "google", "product": "angular"},
}


class NvdCveMatcher(BaseModule):
    """Matches detected technologies against the NVD CVE database."""

    @property
    def name(self) -> str:
        return "nvd_cve_matcher"

    @property
    def description(self) -> str:
        return "Queries NVD for known CVEs matching detected technologies"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {"queries": 0, "cves_found": 0}

        discovered_assets: list[dict] = opts.get("discovered_assets", [])
        tech_assets = [a for a in discovered_assets if a.get("type") == "TECHNOLOGY"]

        log = logger.bind(target=target)
        log.info("Starting NVD CVE matching", tech_count=len(tech_assets))

        if not tech_assets:
            log.info("No technologies discovered — skipping NVD lookup")
            return ModuleResult(
                module_name=self.name,
                assets=assets,
                findings=findings,
                raw_output=raw_output,
                errors=errors,
                duration_seconds=time.time() - start,
            )

        # Query NVD for each known technology
        async with httpx.AsyncClient(
            timeout=20,
            headers={
                "User-Agent": "VulnScan-ASM/1.0",
            },
        ) as client:
            for tech in tech_assets:
                tech_name = tech.get("value", "")
                version = tech.get("metadata", {}).get("version")

                cpe_info = TECH_TO_CPE.get(tech_name)
                if not cpe_info:
                    continue

                try:
                    tech_findings = await self._query_nvd(
                        client, tech_name, cpe_info, version
                    )
                    findings.extend(tech_findings)
                    raw_output["queries"] += 1
                    raw_output["cves_found"] += len(tech_findings)

                    # Small delay to respect NVD rate limits (no API key = 5 req/30s)
                    await asyncio.sleep(6)

                except Exception as e:
                    errors.append(f"NVD query failed for {tech_name}: {e}")

        log.info(
            "NVD CVE matching completed",
            queries=raw_output["queries"],
            cves=raw_output["cves_found"],
        )

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    async def _query_nvd(
        self,
        client: httpx.AsyncClient,
        tech_name: str,
        cpe_info: dict[str, str],
        version: str | None,
    ) -> list[Finding]:
        """Query the NVD API for CVEs matching a technology."""
        findings: list[Finding] = []

        # Build keyword query — NVD 2.0 supports keywordSearch
        keyword = f"{cpe_info['vendor']} {cpe_info['product']}"
        if version:
            keyword += f" {version}"

        params: dict[str, Any] = {
            "keywordSearch": keyword,
            "keywordExactMatch": "",
            "resultsPerPage": 10,
        }

        try:
            resp = await client.get(NVD_API_BASE, params=params)

            if resp.status_code == 403:
                # Rate limited — back off
                await asyncio.sleep(30)
                resp = await client.get(NVD_API_BASE, params=params)

            if resp.status_code != 200:
                return findings

            data = resp.json()
            vulnerabilities = data.get("vulnerabilities", [])

            for vuln_item in vulnerabilities[:5]:  # Limit to top 5 CVEs per tech
                cve = vuln_item.get("cve", {})
                cve_id = cve.get("id", "")

                # Extract description
                descriptions = cve.get("descriptions", [])
                desc = ""
                for d in descriptions:
                    if d.get("lang") == "en":
                        desc = d.get("value", "")
                        break

                # Extract CVSS score
                metrics = cve.get("metrics", {})
                cvss_score = None
                severity = Severity.MEDIUM

                # Try CVSS v3.1 first, fallback to v3.0, then v2.0
                for metric_key in ("cvssMetricV31", "cvssMetricV30"):
                    metric_list = metrics.get(metric_key, [])
                    if metric_list:
                        cvss_data = metric_list[0].get("cvssData", {})
                        cvss_score = cvss_data.get("baseScore")
                        if cvss_score:
                            severity = _cvss_to_severity(cvss_score)
                        break

                if not cvss_score:
                    v2_list = metrics.get("cvssMetricV2", [])
                    if v2_list:
                        cvss_data = v2_list[0].get("cvssData", {})
                        cvss_score = cvss_data.get("baseScore")
                        if cvss_score:
                            severity = _cvss_to_severity(cvss_score)

                # Extract references
                refs = [
                    r.get("url", "")
                    for r in cve.get("references", [])[:3]
                    if r.get("url")
                ]
                refs.insert(0, f"https://nvd.nist.gov/vuln/detail/{cve_id}")

                findings.append(
                    Finding(
                        title=f"Known CVE: {cve_id} ({tech_name})",
                        severity=severity,
                        category=VulnCategory.OUTDATED_SOFTWARE,
                        description=desc[:500] if desc else f"Known vulnerability in {tech_name}.",
                        solution=(
                            f"Update {tech_name} to the latest patched version. "
                            f"See {refs[0]} for details."
                        ),
                        cve_id=cve_id,
                        cvss_score=cvss_score,
                        affected_component=tech_name,
                        references=refs,
                    )
                )

        except httpx.TimeoutException:
            pass
        except Exception:
            pass

        return findings
