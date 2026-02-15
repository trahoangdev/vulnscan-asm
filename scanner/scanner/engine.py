"""Scan engine orchestrator - coordinates module execution."""

import asyncio
import ipaddress
import socket
import time
from typing import Any

from scanner.config import config
from scanner.logger import logger
from scanner.models import ModuleResult, BaseModule, Asset, Finding
from scanner.modules import MODULE_REGISTRY


# Scan profiles define which modules run
SCAN_PROFILES: dict[str, list[str]] = {
    "QUICK": ["dns_enumerator", "ssl_analyzer", "tech_detector"],
    "STANDARD": [
        "dns_enumerator",
        "port_scanner",
        "ssl_analyzer",
        "web_crawler",
        "tech_detector",
        "admin_detector",
        "recon_module",
    ],
    "DEEP": [
        "dns_enumerator",
        "port_scanner",
        "ssl_analyzer",
        "web_crawler",
        "tech_detector",
        "waf_detector",
        "recon_module",
        "vuln_checker",
        "subdomain_takeover",
        "admin_detector",
        "nvd_cve_matcher",
        "api_discovery",
        "api_security",
    ],
}


class ScanEngine:
    """Orchestrates vulnerability scanning across multiple modules."""

    def __init__(self, progress_callback: Any = None):
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
            profile: Scan profile (QUICK, STANDARD, DEEP, CUSTOM).
            options: Additional options:
                - modules: explicit list of module names to run (for CUSTOM profile)
                - exclude_paths: list of URL path substrings to skip
                - max_concurrent: max parallel module execution (default 1 = sequential)
                - request_delay: seconds between individual HTTP requests
        """
        opts = options or {}
        start = time.time()
        log = logger.bind(target=target, profile=profile)
        log.info("Starting scan")

        # ── Enforce private IP blocking ──
        if self._is_blocked_target(target):
            log.warning("Target resolves to blocked IP range", target=target)
            return {
                "target": target,
                "profile": profile,
                "duration_seconds": time.time() - start,
                "modules_completed": 0,
                "modules_total": 0,
                "assets": [],
                "findings": [],
                "module_results": {},
                "errors": [f"Target '{target}' resolves to a blocked/private IP range."],
                "summary": {"total_findings": 0, "severity_counts": {}, "risk_score": 0, "security_score": 100},
            }

        # Determine which modules to run
        if profile == "CUSTOM" and opts.get("modules"):
            module_names = [m for m in opts["modules"] if m in MODULE_REGISTRY]
        else:
            module_names = SCAN_PROFILES.get(profile, SCAN_PROFILES["STANDARD"])

        total_modules = len(module_names)
        completed = 0

        all_assets: list[dict[str, Any]] = []
        all_findings: list[dict[str, Any]] = []
        module_results: dict[str, dict[str, Any]] = {}
        all_errors: list[str] = []

        # Build shared options for modules
        exclude_paths: list[str] = opts.get("exclude_paths", [])
        exclude_subdomains: list[str] = opts.get("exclude_subdomains", [])
        exclude_ports: list[int] = opts.get("exclude_ports", [])
        exclude_modules: list[str] = opts.get("exclude_modules", [])
        exclusion_rules: list[dict] = opts.get("exclusion_rules", [])

        # Filter out excluded modules
        if exclude_modules:
            module_names = [m for m in module_names if m not in exclude_modules]
            total_modules = len(module_names)

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
                # Build per-module options
                module_opts = opts.get(module_name, {})

                # Pass discovered assets to modules that need them
                if module_name in ("vuln_checker", "subdomain_takeover", "nvd_cve_matcher", "admin_detector"):
                    module_opts["discovered_assets"] = all_assets

                # Pass exclusion rules
                if exclude_paths:
                    module_opts["exclude_paths"] = exclude_paths
                if exclude_subdomains:
                    module_opts["exclude_subdomains"] = exclude_subdomains
                if exclude_ports:
                    module_opts["exclude_ports"] = exclude_ports
                if exclusion_rules:
                    module_opts["exclusion_rules"] = exclusion_rules

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
        """Generate a summary with CVSS-based risk scoring."""
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

        # Calculate CVSS-weighted risk score using base metric approximation
        # Each finding maps its category to a CVSS v3.1 base score range
        cvss_scores: list[float] = []
        for f in findings:
            explicit_cvss = f.get("cvssScore")
            if explicit_cvss is not None and isinstance(explicit_cvss, (int, float)):
                cvss_scores.append(float(explicit_cvss))
            else:
                cvss_scores.append(self._estimate_cvss(f))

        # Aggregate risk: average CVSS * finding-count factor (capped)
        avg_cvss = sum(cvss_scores) / max(len(cvss_scores), 1)
        # risk_score: 0-100 scale reflecting overall risk
        count_factor = min(total / 5, 3.0)  # more findings amplify risk, cap at 3x
        risk_score = min(100, round(avg_cvss * 10 * max(count_factor, 1.0)))

        # security_score: inverse of risk (higher = more secure)
        security_score = max(0, 100 - risk_score)

        # Build CVSS distribution
        cvss_distribution = {
            "critical_9_10": len([s for s in cvss_scores if s >= 9.0]),
            "high_7_9": len([s for s in cvss_scores if 7.0 <= s < 9.0]),
            "medium_4_7": len([s for s in cvss_scores if 4.0 <= s < 7.0]),
            "low_0_4": len([s for s in cvss_scores if 0.1 <= s < 4.0]),
            "info": len([s for s in cvss_scores if s < 0.1]),
        }

        return {
            "total_findings": total,
            "severity_counts": severity_counts,
            "risk_score": risk_score,
            "security_score": security_score,
            "avg_cvss": round(avg_cvss, 1),
            "max_cvss": round(max(cvss_scores) if cvss_scores else 0.0, 1),
            "cvss_distribution": cvss_distribution,
        }

    @staticmethod
    def _estimate_cvss(finding: dict[str, Any]) -> float:
        """
        Estimate a CVSS v3.1 base score from finding category and severity.

        Uses OWASP/NVD reference ranges for common vulnerability categories.
        CVSS v3.1 Base Score = f(AV, AC, PR, UI, S, C, I, A)
        """
        category = finding.get("category", "OTHER")
        severity = finding.get("severity", "INFO")

        # Category → representative CVSS base score (based on typical NVD data)
        CATEGORY_CVSS: dict[str, float] = {
            "SQL_INJECTION":       9.8,   # AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
            "COMMAND_INJECTION":   9.8,   # AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
            "RFI":                 9.1,   # AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
            "SSRF":                8.6,   # AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N
            "XSS_STORED":         8.1,   # AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N
            "LFI":                 7.5,   # AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
            "PATH_TRAVERSAL":      7.5,   # AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
            "IDOR":                7.5,   # AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N
            "XSS_REFLECTED":       6.1,   # AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
            "CORS_MISCONFIG":      5.3,   # AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
            "CSRF":                4.3,   # AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N
            "OPEN_REDIRECT":       4.3,   # AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N
            "SSL_TLS":             5.3,   # AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N
            "CERT_ISSUE":          4.8,   # AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N
            "SECURITY_HEADERS":    3.7,   # AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N
            "COOKIE_SECURITY":     3.5,   # AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N
            "HTTP_METHODS":        3.1,   # AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N
            "INFO_DISCLOSURE":     5.3,   # AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
            "DIRECTORY_LISTING":   5.3,   # AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
            "SENSITIVE_FILE":      5.3,   # AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
            "OUTDATED_SOFTWARE":   5.6,   # varies, median NVD
            "DEFAULT_CREDENTIALS": 9.8,   # AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
            "EMAIL_SECURITY":      3.7,   # AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N
            "WAF_DETECTED":        0.0,   # informational
            "OTHER":               3.0,
        }

        # Use category-specific CVSS if available, else fall back to severity
        cvss = CATEGORY_CVSS.get(category)
        if cvss is not None:
            return cvss

        SEVERITY_CVSS: dict[str, float] = {
            "CRITICAL": 9.5,
            "HIGH": 7.5,
            "MEDIUM": 5.0,
            "LOW": 2.5,
            "INFO": 0.0,
        }
        return SEVERITY_CVSS.get(severity, 0.0)

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

    @staticmethod
    def _is_blocked_target(target: str) -> bool:
        """Check if target resolves to a blocked/private IP range."""
        blocked_networks = [
            ipaddress.ip_network(cidr) for cidr in config.blocked_cidrs
        ]

        # Strip protocol/path to get hostname
        hostname = target
        for prefix in ("https://", "http://"):
            if hostname.startswith(prefix):
                hostname = hostname[len(prefix):]
        hostname = hostname.split("/")[0].split(":")[0]

        # Check if it's a direct IP
        try:
            ip = ipaddress.ip_address(hostname)
            return any(ip in net for net in blocked_networks)
        except ValueError:
            pass

        # Resolve hostname and check
        try:
            results = socket.getaddrinfo(hostname, None)
            for _, _, _, _, sockaddr in results:
                try:
                    ip = ipaddress.ip_address(sockaddr[0])
                    if any(ip in net for net in blocked_networks):
                        return True
                except ValueError:
                    pass
        except socket.gaierror:
            pass

        return False
