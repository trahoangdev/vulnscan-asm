"""SSL/TLS certificate analysis module."""

import asyncio
import ssl
import socket
import time
from datetime import datetime, timezone
from typing import Any

from cryptography import x509
from cryptography.hazmat.primitives import hashes

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


class SslAnalyzer(BaseModule):
    """Analyzes SSL/TLS certificates and configuration."""

    @property
    def name(self) -> str:
        return "ssl_analyzer"

    @property
    def description(self) -> str:
        return "Analyzes SSL/TLS certificates, protocols, and cipher suites"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        port = opts.get("port", 443)
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        log = logger.bind(target=target, port=port)
        log.info("Starting SSL/TLS analysis")

        try:
            loop = asyncio.get_event_loop()
            cert_info = await loop.run_in_executor(
                None, lambda: self._get_cert_info(target, port)
            )

            if cert_info is None:
                errors.append(f"Could not connect to {target}:{port} via SSL/TLS")
                return ModuleResult(
                    module_name=self.name, errors=errors,
                    duration_seconds=time.time() - start,
                )

            raw_output = cert_info

            # Record certificate as asset
            assets.append(
                Asset(
                    type="CERTIFICATE",
                    value=f"{target}:{port}",
                    metadata={
                        "subject": cert_info.get("subject", ""),
                        "issuer": cert_info.get("issuer", ""),
                        "valid_from": cert_info.get("not_before", ""),
                        "valid_to": cert_info.get("not_after", ""),
                        "serial": cert_info.get("serial", ""),
                    },
                )
            )

            # Check expiration
            not_after = cert_info.get("not_after_dt")
            if not_after:
                now = datetime.now(timezone.utc)
                days_left = (not_after - now).days

                if days_left < 0:
                    findings.append(
                        Finding(
                            title="SSL Certificate Expired",
                            severity=Severity.CRITICAL,
                            category=VulnCategory.CERT_ISSUE,
                            description=f"The SSL certificate for {target} expired {abs(days_left)} days ago.",
                            solution="Renew the SSL certificate immediately.",
                            affected_component=f"{target}:{port}",
                        )
                    )
                elif days_left < 30:
                    findings.append(
                        Finding(
                            title="SSL Certificate Expiring Soon",
                            severity=Severity.HIGH if days_left < 7 else Severity.MEDIUM,
                            category=VulnCategory.CERT_ISSUE,
                            description=f"The SSL certificate for {target} expires in {days_left} days.",
                            solution="Renew the SSL certificate before it expires.",
                            affected_component=f"{target}:{port}",
                        )
                    )

            # Check self-signed
            if cert_info.get("self_signed"):
                findings.append(
                    Finding(
                        title="Self-Signed SSL Certificate",
                        severity=Severity.MEDIUM,
                        category=VulnCategory.CERT_ISSUE,
                        description=f"The SSL certificate for {target} is self-signed.",
                        solution="Use a certificate from a trusted Certificate Authority (CA).",
                        affected_component=f"{target}:{port}",
                    )
                )

            # Check weak signature algorithm
            sig_algo = cert_info.get("signature_algorithm", "").lower()
            if "sha1" in sig_algo or "md5" in sig_algo:
                findings.append(
                    Finding(
                        title="Weak Certificate Signature Algorithm",
                        severity=Severity.HIGH,
                        category=VulnCategory.SSL_TLS,
                        description=f"Certificate uses weak signature algorithm: {sig_algo}",
                        solution="Re-issue the certificate with SHA-256 or stronger.",
                        affected_component=f"{target}:{port}",
                    )
                )

            # Check for wildcard
            if cert_info.get("is_wildcard"):
                findings.append(
                    Finding(
                        title="Wildcard SSL Certificate",
                        severity=Severity.LOW,
                        category=VulnCategory.SSL_TLS,
                        description=f"A wildcard certificate is used for {target}.",
                        solution="Consider using individual certificates for critical subdomains.",
                        affected_component=f"{target}:{port}",
                    )
                )

            # Check TLS version support
            tls_checks = await loop.run_in_executor(
                None, lambda: self._check_tls_versions(target, port)
            )
            raw_output["tls_versions"] = tls_checks

            for version, supported in tls_checks.items():
                if supported and version in ("SSLv3", "TLSv1.0", "TLSv1.1"):
                    findings.append(
                        Finding(
                            title=f"Deprecated {version} Supported",
                            severity=Severity.HIGH if version == "SSLv3" else Severity.MEDIUM,
                            category=VulnCategory.SSL_TLS,
                            description=f"{target} supports deprecated protocol {version}.",
                            solution=f"Disable {version} and use TLS 1.2 or higher.",
                            affected_component=f"{target}:{port}",
                        )
                    )

            log.info("SSL analysis completed", findings=len(findings))

        except Exception as e:
            errors.append(f"SSL analysis error: {e}")
            logger.error("SSL analysis failed", error=str(e))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    def _get_cert_info(self, host: str, port: int) -> dict[str, Any] | None:
        """Get certificate information from a host."""
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            with socket.create_connection((host, port), timeout=config.http_timeout) as sock:
                with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                    der_cert = ssock.getpeercert(binary_form=True)
                    if not der_cert:
                        return None

                    cert = x509.load_der_x509_certificate(der_cert)

                    subject = cert.subject.rfc4514_string()
                    issuer = cert.issuer.rfc4514_string()

                    return {
                        "subject": subject,
                        "issuer": issuer,
                        "serial": str(cert.serial_number),
                        "not_before": cert.not_valid_before_utc.isoformat(),
                        "not_after": cert.not_valid_after_utc.isoformat(),
                        "not_after_dt": cert.not_valid_after_utc,
                        "signature_algorithm": cert.signature_algorithm_oid._name,
                        "self_signed": subject == issuer,
                        "is_wildcard": any(
                            "*" in str(attr.value)
                            for attr in cert.subject
                        ),
                        "version": cert.version.name,
                    }
        except Exception:
            return None

    def _check_tls_versions(self, host: str, port: int) -> dict[str, bool]:
        """Check which TLS versions are supported."""
        results: dict[str, bool] = {}
        protocols = {
            "TLSv1.0": ssl.TLSVersion.TLSv1,
            "TLSv1.1": ssl.TLSVersion.TLSv1_1,
            "TLSv1.2": ssl.TLSVersion.TLSv1_2,
            "TLSv1.3": ssl.TLSVersion.TLSv1_3,
        }

        for name, version in protocols.items():
            try:
                ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                ctx.minimum_version = version
                ctx.maximum_version = version

                with socket.create_connection((host, port), timeout=5) as sock:
                    with ctx.wrap_socket(sock, server_hostname=host):
                        results[name] = True
            except Exception:
                results[name] = False

        return results
