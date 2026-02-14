"""Scanner modules package."""

from scanner.modules.port_scanner import PortScanner
from scanner.modules.dns_enumerator import DnsEnumerator
from scanner.modules.ssl_analyzer import SslAnalyzer
from scanner.modules.web_crawler import WebCrawler
from scanner.modules.tech_detector import TechDetector
from scanner.modules.vuln_checker import VulnChecker
from scanner.modules.subdomain_takeover import SubdomainTakeover
from scanner.modules.admin_detector import AdminDetector
from scanner.modules.nvd_cve_matcher import NvdCveMatcher

__all__ = [
    "PortScanner",
    "DnsEnumerator",
    "SslAnalyzer",
    "WebCrawler",
    "TechDetector",
    "VulnChecker",
    "SubdomainTakeover",
    "AdminDetector",
    "NvdCveMatcher",
]

# Module registry keyed by module name
MODULE_REGISTRY = {
    "port_scanner": PortScanner,
    "dns_enumerator": DnsEnumerator,
    "ssl_analyzer": SslAnalyzer,
    "web_crawler": WebCrawler,
    "tech_detector": TechDetector,
    "vuln_checker": VulnChecker,
    "subdomain_takeover": SubdomainTakeover,
    "admin_detector": AdminDetector,
    "nvd_cve_matcher": NvdCveMatcher,
}
