"""Scan engine orchestrator - coordinates module execution."""

import asyncio
import time
from typing import Any

from scanner.config import config
from scanner.logger import logger
from scanner.models import ModuleResult, BaseModule, Asset, Finding
from scanner.modules import MODULE_REGISTRY


# Scan profiles define which modules run
SCAN_PROFILES: dict[str, list[str]] = {
    "QUICK": ["dns_enumerator", "ssl_analyzer", "tech_detector"],
    "STANDARD": ["dns_enumerator", "port_scanner", "ssl_analyzer", "web_crawler", "tech_detector"],
    "DEEP": [
        "dns_enumerator",
        "port_scanner",
        "ssl_analyzer",
        "web_crawler",
        "tech_detector",
        "vuln_checker",
    ],
}


class ScanEngine:
    """Orchestrates vulnerability scanning across multiple modules."""

    def __init__(self, progress_callback: Any = None):
        """
        Args:
            progress_callback: Optional async callable(progress: int, message: str)
                              to report scan progress.
        """
        self.progress_callback = progress_callback

    async def run_scan(
        self,
        target: str,
        profile: str = "STANDARD",
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Execute a full scan against a target.

        Args:
            target: Domain, IP, or URL to scan.
            profile: Scan profile (QUICK, STANDARD, DEEP).
            options: Additional options per module.

        Returns:
            Aggregated scan results.
        """
        opts = options or {}
        start = time.time()
        log = logger.bind(target=target, profile=profile)
        log.info("Starting scan")

        module_names = SCAN_PROFILES.get(profile, SCAN_PROFILES["STANDARD"])
        total_modules = len(module_names)
        completed = 0

        all_assets: list[dict[str, Any]] = []
        all_findings: list[dict[str, Any]] = []
        module_results: dict[str, dict[str, Any]] = {}
        all_errors: list[str] = []

        for i, module_name in enumerate(module_names):
            module_cls = MODULE_REGISTRY.get(module_name)
            if not module_cls:
                log.warning(f"Unknown module: {module_name}")
                continue

            module: BaseModule = module_cls()
            log.info(f"Running module: {module.name}")

            await self._report_progress(
                int((i / total_modules) * 100),
                f"Running {module.description}...",
            )

            try:
                # Pass discovered assets to vuln_checker
                module_opts = opts.get(module_name, {})
                if module_name == "vuln_checker":
                    module_opts["discovered_assets"] = all_assets

                result: ModuleResult = await asyncio.wait_for(
                    module.run(target, module_opts),
                    timeout=config.scan_timeout,
                )

                # Collect results
                for asset in result.assets:
                    asset_dict = {
                        "type": asset.type,
                        "value": asset.value,
                        "metadata": asset.metadata,
                    }
                    all_assets.append(asset_dict)

                for finding in result.findings:
                    finding_dict = {
                        "title": finding.title,
                        "severity": finding.severity.value,
                        "category": finding.category.value,
                        "description": finding.description,
                        "solution": finding.solution,
                        "cveId": finding.cve_id,
                        "cvssScore": finding.cvss_score,
                        "affectedComponent": finding.affected_component,
                        "evidence": finding.evidence,
                        "references": finding.references,
                        "metadata": finding.metadata,
                    }
                    all_findings.append(finding_dict)

                module_results[module_name] = {
                    "assets": len(result.assets),
                    "findings": len(result.findings),
                    "errors": result.errors,
                    "duration": result.duration_seconds,
                }
                all_errors.extend(result.errors)

                completed += 1
                log.info(
                    f"Module {module.name} completed",
                    assets=len(result.assets),
                    findings=len(result.findings),
                )

            except asyncio.TimeoutError:
                error_msg = f"Module {module_name} timed out"
                all_errors.append(error_msg)
                log.error(error_msg)
            except Exception as e:
                error_msg = f"Module {module_name} failed: {e}"
                all_errors.append(error_msg)
                log.error(error_msg, error=str(e))

        await self._report_progress(100, "Scan completed")

        duration = time.time() - start
        log.info(
            "Scan completed",
            duration=f"{duration:.1f}s",
            assets=len(all_assets),
            findings=len(all_findings),
            errors=len(all_errors),
        )

        return {
            "target": target,
            "profile": profile,
            "duration_seconds": duration,
            "modules_completed": completed,
            "modules_total": total_modules,
            "assets": all_assets,
            "findings": all_findings,
            "module_results": module_results,
            "errors": all_errors,
            "summary": self._generate_summary(all_findings),
        }

    def _generate_summary(self, findings: list[dict[str, Any]]) -> dict[str, Any]:
        """Generate a summary of findings by severity."""
        severity_counts = {
            "CRITICAL": 0,
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0,
            "INFO": 0,
        }
        for f in findings:
            sev = f.get("severity", "INFO")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        total = len(findings)
        risk_score = (
            severity_counts["CRITICAL"] * 40
            + severity_counts["HIGH"] * 20
            + severity_counts["MEDIUM"] * 5
            + severity_counts["LOW"] * 1
        )

        # Normalize to 0-100 security score (higher = more secure)
        max_score = max(total * 40, 1)
        security_score = max(0, min(100, 100 - int((risk_score / max_score) * 100)))

        return {
            "total_findings": total,
            "severity_counts": severity_counts,
            "risk_score": risk_score,
            "security_score": security_score,
        }

    async def _report_progress(self, progress: int, message: str) -> None:
        """Report progress through callback if set."""
        if self.progress_callback:
            try:
                await self.progress_callback(progress, message)
            except Exception:
                pass
