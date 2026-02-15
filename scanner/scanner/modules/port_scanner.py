"""Port scanning module using python-nmap."""

import asyncio
import time
from typing import Any

import nmap

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


class PortScanner(BaseModule):
    """TCP/UDP port scanning via nmap."""

    @property
    def name(self) -> str:
        return "port_scanner"

    @property
    def description(self) -> str:
        return "Scans for open TCP/UDP ports and identifies running services"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        top_ports = opts.get("top_ports", config.nmap_top_ports)
        scan_type = opts.get("scan_type", "quick")  # quick, standard, deep

        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        try:
            nm = nmap.PortScanner(nmap_search_path=(config.nmap_path,))

            # Build nmap arguments based on scan depth
            if scan_type == "deep":
                arguments = f"-sV -sC --top-ports {top_ports} -T3"
            elif scan_type == "standard":
                arguments = f"-sV --top-ports {min(top_ports, 100)} -T4"
            else:
                arguments = f"--top-ports {min(top_ports, 20)} -T4"

            log = logger.bind(target=target, scan_type=scan_type)
            log.info("Starting port scan")

            # Run nmap in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: nm.scan(target, arguments=arguments)
            )

            raw_output = {"nmap_result": nm.scanstats()}

            for host in nm.all_hosts():
                for proto in nm[host].all_protocols():
                    ports = nm[host][proto].keys()
                    for port in sorted(ports):
                        port_info = nm[host][proto][port]
                        state = port_info.get("state", "unknown")

                        if state == "open":
                            service = port_info.get("name", "unknown")
                            version = port_info.get("version", "")
                            product = port_info.get("product", "")

                            # Record as asset
                            assets.append(
                                Asset(
                                    type="PORT",
                                    value=f"{host}:{port}/{proto}",
                                    metadata={
                                        "port": port,
                                        "protocol": proto,
                                        "state": state,
                                        "service": service,
                                        "product": product,
                                        "version": version,
                                    },
                                )
                            )

                            # Check for risky open ports
                            risky_ports = {
                                21: ("FTP", Severity.MEDIUM),
                                23: ("Telnet", Severity.HIGH),
                                25: ("SMTP (Open Relay risk)", Severity.MEDIUM),
                                445: ("SMB", Severity.HIGH),
                                3389: ("RDP", Severity.HIGH),
                                5900: ("VNC", Severity.HIGH),
                                6379: ("Redis (unauth risk)", Severity.CRITICAL),
                                27017: ("MongoDB (unauth risk)", Severity.CRITICAL),
                                9200: ("Elasticsearch", Severity.HIGH),
                            }

                            if port in risky_ports:
                                svc_name, sev = risky_ports[port]
                                findings.append(
                                    Finding(
                                        title=f"Risky Open Port: {port} ({svc_name})",
                                        severity=sev,
                                        category=VulnCategory.NETWORK,
                                        description=(
                                            f"Port {port}/{proto} ({svc_name}) is open on {host}. "
                                            f"This service may expose sensitive functionality."
                                        ),
                                        solution=f"Restrict access to port {port} using a firewall or disable the service if not needed.",
                                        affected_component=f"{host}:{port}",
                                    )
                                )

            log.info("Port scan completed", ports_found=len(assets))

        except nmap.PortScannerError as e:
            errors.append(f"Nmap error: {e}")
            logger.error("Nmap scan failed", error=str(e))
        except Exception as e:
            errors.append(f"Port scan error: {e}")
            logger.error("Port scan failed", error=str(e))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )
