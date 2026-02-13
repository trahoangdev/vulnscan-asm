"""DNS enumeration module."""

import asyncio
import time
from typing import Any

import dns.resolver
import dns.zone
import dns.query
import dns.exception

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


COMMON_SUBDOMAINS = [
    "www", "mail", "ftp", "smtp", "pop", "imap", "blog", "webmail",
    "server", "ns1", "ns2", "smtp", "secure", "vpn", "api", "dev",
    "staging", "test", "portal", "admin", "app", "m", "mobile",
    "docs", "cdn", "media", "static", "assets", "img", "images",
    "css", "js", "git", "svn", "ci", "jenkins", "jira", "confluence",
    "wiki", "help", "support", "status", "monitor", "grafana",
]


class DnsEnumerator(BaseModule):
    """DNS record enumeration and subdomain discovery."""

    @property
    def name(self) -> str:
        return "dns_enumerator"

    @property
    def description(self) -> str:
        return "Enumerates DNS records and discovers subdomains"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        resolver = dns.resolver.Resolver()
        resolver.nameservers = config.dns_resolvers
        resolver.timeout = config.dns_timeout
        resolver.lifetime = config.dns_timeout * 2

        log = logger.bind(target=target)
        log.info("Starting DNS enumeration")

        # 1. Enumerate standard DNS records
        record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]
        for rtype in record_types:
            try:
                answers = resolver.resolve(target, rtype)
                records = [str(r) for r in answers]
                raw_output[rtype] = records

                for record in records:
                    assets.append(
                        Asset(
                            type="DNS_RECORD",
                            value=f"{rtype}: {record}",
                            metadata={"record_type": rtype, "value": record, "domain": target},
                        )
                    )

                    # Check for SPF/DMARC in TXT records
                    if rtype == "TXT":
                        if "v=spf1" in record:
                            raw_output["spf"] = record
                        if "v=DMARC1" in record.upper():
                            raw_output["dmarc"] = record

            except dns.resolver.NoAnswer:
                pass
            except dns.resolver.NXDOMAIN:
                errors.append(f"Domain {target} does not exist")
                break
            except dns.exception.DNSException as e:
                errors.append(f"DNS query failed for {rtype}: {e}")

        # Check for missing email security records
        if "spf" not in raw_output:
            findings.append(
                Finding(
                    title="Missing SPF Record",
                    severity=Severity.MEDIUM,
                    category=VulnCategory.EMAIL_SECURITY,
                    description=f"No SPF record found for {target}. This may allow email spoofing.",
                    solution="Add an SPF record to your DNS configuration.",
                    affected_component=target,
                )
            )

        if "dmarc" not in raw_output:
            findings.append(
                Finding(
                    title="Missing DMARC Record",
                    severity=Severity.MEDIUM,
                    category=VulnCategory.EMAIL_SECURITY,
                    description=f"No DMARC record found for {target}.",
                    solution="Add a DMARC record (e.g., _dmarc.{target} TXT 'v=DMARC1; p=reject').",
                    affected_component=target,
                )
            )

        # 2. Zone transfer attempt
        try:
            ns_answers = resolver.resolve(target, "NS")
            for ns in ns_answers:
                ns_host = str(ns).rstrip(".")
                try:
                    zone = dns.zone.from_xfr(
                        dns.query.xfr(ns_host, target, timeout=config.dns_timeout)
                    )
                    findings.append(
                        Finding(
                            title="DNS Zone Transfer Allowed (AXFR)",
                            severity=Severity.HIGH,
                            category=VulnCategory.INFO_DISCLOSURE,
                            description=(
                                f"DNS zone transfer (AXFR) is allowed on nameserver {ns_host}. "
                                f"This exposes all DNS records to anyone."
                            ),
                            solution="Restrict AXFR to authorized secondary nameservers only.",
                            affected_component=ns_host,
                        )
                    )
                    # Add discovered records as assets
                    for name_node in zone.nodes:
                        subdomain = str(name_node)
                        if subdomain != "@":
                            fqdn = f"{subdomain}.{target}"
                            assets.append(
                                Asset(type="SUBDOMAIN", value=fqdn, metadata={"source": "zone_transfer"})
                            )
                except Exception:
                    pass  # Zone transfer not allowed (expected)
        except Exception:
            pass

        # 3. Subdomain brute-force
        wordlist = opts.get("wordlist", COMMON_SUBDOMAINS)
        discovered = 0

        async def check_subdomain(sub: str) -> Asset | None:
            fqdn = f"{sub}.{target}"
            try:
                loop = asyncio.get_event_loop()
                answers = await loop.run_in_executor(
                    None, lambda: resolver.resolve(fqdn, "A")
                )
                ips = [str(r) for r in answers]
                return Asset(
                    type="SUBDOMAIN",
                    value=fqdn,
                    metadata={"ips": ips, "source": "bruteforce"},
                )
            except Exception:
                return None

        # Run subdomain checks concurrently (batches of 10)
        for i in range(0, len(wordlist), 10):
            batch = wordlist[i : i + 10]
            results = await asyncio.gather(*[check_subdomain(sub) for sub in batch])
            for asset in results:
                if asset:
                    assets.append(asset)
                    discovered += 1

        log.info("DNS enumeration completed", records=len(assets), subdomains=discovered)

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )
