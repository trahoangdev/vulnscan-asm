"""WHOIS lookup, Reverse DNS, and Banner Grabbing module."""

import asyncio
import re
import socket
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


# Ports to grab banners from
BANNER_PORTS = [21, 22, 25, 80, 110, 143, 443, 587, 993, 995, 3306, 5432, 8080, 8443]


class ReconModule(BaseModule):
    """WHOIS lookup, Reverse DNS, and Service Banner Grabbing."""

    @property
    def name(self) -> str:
        return "recon_module"

    @property
    def description(self) -> str:
        return "WHOIS lookup, Reverse DNS, and Banner Grabbing"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        log = logger.bind(target=target)
        log.info("Starting recon (WHOIS, rDNS, banners)")

        hostname = target
        for prefix in ("https://", "http://"):
            if hostname.startswith(prefix):
                hostname = hostname[len(prefix):]
        hostname = hostname.split("/")[0].split(":")[0]

        # 1. Resolve IPs
        ips: list[str] = []
        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, lambda: socket.getaddrinfo(hostname, None, socket.AF_INET)
            )
            ips = list(set(r[4][0] for r in results))
            raw_output["resolved_ips"] = ips
        except socket.gaierror as e:
            errors.append(f"DNS resolution failed: {e}")

        # 2. WHOIS lookup (via whois.iana.org HTTPS API or simple socket)
        whois_data = await self._whois_lookup(hostname)
        if whois_data:
            raw_output["whois"] = whois_data
            assets.append(
                Asset(
                    type="WHOIS",
                    value=f"WHOIS: {hostname}",
                    metadata=whois_data,
                )
            )

            # Check for expiring domain
            expiry = whois_data.get("expiry_date", "")
            if expiry:
                try:
                    from datetime import datetime
                    exp_date = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                    days_left = (exp_date - datetime.now(exp_date.tzinfo)).days
                    if days_left < 30:
                        findings.append(
                            Finding(
                                title=f"Domain Expiring Soon ({days_left} days)",
                                severity=Severity.MEDIUM,
                                category=VulnCategory.OTHER,
                                description=(
                                    f"Domain {hostname} expires in {days_left} days ({expiry}). "
                                    "An expired domain can be re-registered by attackers."
                                ),
                                solution="Renew the domain registration promptly.",
                                affected_component=hostname,
                            )
                        )
                except Exception:
                    pass

        # 3. Reverse DNS for each IP
        for ip in ips:
            rdns = await self._reverse_dns(ip)
            if rdns:
                raw_output.setdefault("rdns", {})[ip] = rdns
                assets.append(
                    Asset(
                        type="DNS_RECORD",
                        value=f"rDNS: {ip} -> {rdns}",
                        metadata={"type": "PTR", "ip": ip, "hostname": rdns},
                    )
                )

        # 3b. IP Geolocation & ASN lookup
        for ip in ips:
            geo_data = await self._ip_geolocation(ip)
            if geo_data:
                raw_output.setdefault("geolocation", {})[ip] = geo_data
                loc_str = ", ".join(
                    filter(None, [geo_data.get("city"), geo_data.get("region"), geo_data.get("country")])
                )
                assets.append(
                    Asset(
                        type="GEO_IP",
                        value=f"GeoIP: {ip} ({loc_str})",
                        metadata=geo_data,
                    )
                )
                # ASN info
                asn = geo_data.get("asn")
                asn_org = geo_data.get("asn_org")
                if asn:
                    raw_output.setdefault("asn", {})[ip] = {"asn": asn, "org": asn_org}
                    assets.append(
                        Asset(
                            type="ASN",
                            value=f"ASN: {asn} ({asn_org or 'Unknown'})",
                            metadata={"ip": ip, "asn": asn, "asn_org": asn_org},
                        )
                    )

        # 4. Banner grabbing on discovered IPs
        if ips:
            primary_ip = ips[0]
            discovered_ports = opts.get("open_ports", BANNER_PORTS)
            banners = await self._grab_banners(primary_ip, discovered_ports)
            raw_output["banners"] = banners

            for port, banner in banners.items():
                assets.append(
                    Asset(
                        type="SERVICE",
                        value=f"{primary_ip}:{port}",
                        metadata={"port": port, "banner": banner, "ip": primary_ip},
                    )
                )

                # Check for version disclosure
                version_patterns = [
                    r"(?:SSH|OpenSSH)[_/-][\d.]+",
                    r"(?:Apache|nginx|IIS)[/ ][\d.]+",
                    r"(?:MySQL|MariaDB|PostgreSQL)[\s/][\d.]+",
                    r"(?:ProFTPD|vsftpd|Pure-FTPd)[\s/][\d.]+",
                    r"(?:Postfix|Exim|Sendmail|Dovecot)",
                ]
                for vp in version_patterns:
                    match = re.search(vp, banner, re.IGNORECASE)
                    if match:
                        findings.append(
                            Finding(
                                title=f"Service Version Disclosed: {match.group()} on port {port}",
                                severity=Severity.LOW,
                                category=VulnCategory.INFO_DISCLOSURE,
                                description=(
                                    f"Service on port {port} discloses its version: {match.group()}. "
                                    "Version information helps attackers find known vulnerabilities."
                                ),
                                solution="Configure the service to hide version information in banners.",
                                affected_component=f"{primary_ip}:{port}",
                                evidence=f"Banner: {banner[:200]}",
                            )
                        )
                        break

        log.info("Recon completed", ips=len(ips), banners=len(raw_output.get("banners", {})))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    async def _whois_lookup(self, domain: str) -> dict[str, Any] | None:
        """Perform a WHOIS lookup using a public HTTP API."""
        try:
            async with httpx.AsyncClient(timeout=10, verify=False) as client:
                # Use a simple WHOIS API
                resp = await client.get(
                    f"https://whois.freeaitools.org/api?domain={domain}",
                    headers={"User-Agent": config.http_user_agent},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "registrar": data.get("registrar", ""),
                        "creation_date": data.get("creation_date", ""),
                        "expiry_date": data.get("expiration_date", ""),
                        "updated_date": data.get("updated_date", ""),
                        "name_servers": data.get("name_servers", []),
                        "status": data.get("status", []),
                        "dnssec": data.get("dnssec", ""),
                    }
        except Exception:
            pass

        # Fallback: direct WHOIS socket query
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, lambda: self._raw_whois(domain))
            if result:
                return self._parse_raw_whois(result)
        except Exception:
            pass

        return None

    @staticmethod
    def _raw_whois(domain: str) -> str:
        """Raw WHOIS query via socket."""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(5)
            s.connect(("whois.iana.org", 43))
            s.sendall(f"{domain}\r\n".encode())
            response = b""
            while True:
                chunk = s.recv(4096)
                if not chunk:
                    break
                response += chunk
            s.close()

            text = response.decode("utf-8", errors="ignore")

            # Find the actual registrar WHOIS server
            refer_match = re.search(r"refer:\s+(.+)", text)
            if refer_match:
                whois_server = refer_match.group(1).strip()
                s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s2.settimeout(5)
                s2.connect((whois_server, 43))
                s2.sendall(f"{domain}\r\n".encode())
                response2 = b""
                while True:
                    chunk = s2.recv(4096)
                    if not chunk:
                        break
                    response2 += chunk
                s2.close()
                return response2.decode("utf-8", errors="ignore")

            return text
        except Exception:
            return ""

    @staticmethod
    def _parse_raw_whois(raw: str) -> dict[str, Any]:
        """Parse raw WHOIS text into structured data."""
        data: dict[str, Any] = {}

        patterns = {
            "registrar": r"Registrar:\s*(.+)",
            "creation_date": r"Creation Date:\s*(.+)",
            "expiry_date": r"(?:Expir(?:y|ation) Date|Registry Expiry Date):\s*(.+)",
            "updated_date": r"Updated Date:\s*(.+)",
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, raw, re.IGNORECASE)
            if match:
                data[key] = match.group(1).strip()

        # Name servers
        ns_matches = re.findall(r"Name Server:\s*(.+)", raw, re.IGNORECASE)
        if ns_matches:
            data["name_servers"] = [ns.strip().lower() for ns in ns_matches]

        return data

    async def _ip_geolocation(self, ip: str) -> dict[str, Any] | None:
        """Get geolocation and ASN data for an IP using free APIs."""
        # Try ip-api.com (free, no key required, 45 req/min)
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(
                    f"http://ip-api.com/json/{ip}",
                    params={"fields": "status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,query"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("status") == "success":
                        as_str = data.get("as", "")
                        asn_match = re.match(r"AS(\d+)", as_str)
                        return {
                            "ip": ip,
                            "country": data.get("country"),
                            "country_code": data.get("countryCode"),
                            "region": data.get("regionName"),
                            "city": data.get("city"),
                            "zip": data.get("zip"),
                            "lat": data.get("lat"),
                            "lon": data.get("lon"),
                            "timezone": data.get("timezone"),
                            "isp": data.get("isp"),
                            "org": data.get("org"),
                            "asn": int(asn_match.group(1)) if asn_match else None,
                            "asn_org": data.get("asname"),
                        }
        except Exception:
            pass

        # Fallback: ipinfo.io (free tier)
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(f"https://ipinfo.io/{ip}/json")
                if resp.status_code == 200:
                    data = resp.json()
                    org_str = data.get("org", "")
                    asn_match = re.match(r"AS(\d+)\s*(.*)", org_str)
                    loc = data.get("loc", "").split(",")
                    return {
                        "ip": ip,
                        "country": data.get("country"),
                        "country_code": data.get("country"),
                        "region": data.get("region"),
                        "city": data.get("city"),
                        "zip": data.get("postal"),
                        "lat": float(loc[0]) if len(loc) == 2 else None,
                        "lon": float(loc[1]) if len(loc) == 2 else None,
                        "timezone": data.get("timezone"),
                        "isp": data.get("org"),
                        "org": data.get("org"),
                        "asn": int(asn_match.group(1)) if asn_match else None,
                        "asn_org": asn_match.group(2).strip() if asn_match else None,
                    }
        except Exception:
            pass

        return None

    async def _reverse_dns(self, ip: str) -> str | None:
        """Perform reverse DNS lookup."""
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: socket.gethostbyaddr(ip)
            )
            return result[0]
        except (socket.herror, socket.gaierror, OSError):
            return None

    async def _grab_banners(self, ip: str, ports: list[int]) -> dict[int, str]:
        """Grab service banners from open ports."""
        banners: dict[int, str] = {}

        async def grab_one(port: int) -> tuple[int, str] | None:
            try:
                loop = asyncio.get_event_loop()
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(ip, port),
                    timeout=3,
                )

                # Some services send banner immediately
                try:
                    data = await asyncio.wait_for(reader.read(1024), timeout=3)
                    banner = data.decode("utf-8", errors="ignore").strip()
                except asyncio.TimeoutError:
                    # For HTTP ports, send a request
                    if port in (80, 443, 8080, 8443):
                        writer.write(b"HEAD / HTTP/1.0\r\nHost: " + ip.encode() + b"\r\n\r\n")
                        await writer.drain()
                        try:
                            data = await asyncio.wait_for(reader.read(2048), timeout=3)
                            banner = data.decode("utf-8", errors="ignore").strip()
                        except asyncio.TimeoutError:
                            banner = ""
                    else:
                        banner = ""

                writer.close()
                try:
                    await writer.wait_closed()
                except Exception:
                    pass

                if banner:
                    return (port, banner[:500])
            except Exception:
                pass
            return None

        # Grab banners concurrently
        tasks = [grab_one(p) for p in ports[:20]]  # Limit to 20 ports
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, tuple):
                banners[result[0]] = result[1]

        return banners
