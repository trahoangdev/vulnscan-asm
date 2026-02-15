"""Base scanner module interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class VulnCategory(str, Enum):
    SQL_INJECTION = "SQL_INJECTION"
    XSS_REFLECTED = "XSS_REFLECTED"
    XSS_STORED = "XSS_STORED"
    SSRF = "SSRF"
    LFI = "LFI"
    RFI = "RFI"
    COMMAND_INJECTION = "COMMAND_INJECTION"
    PATH_TRAVERSAL = "PATH_TRAVERSAL"
    OPEN_REDIRECT = "OPEN_REDIRECT"
    CSRF = "CSRF"
    IDOR = "IDOR"
    CORS_MISCONFIG = "CORS_MISCONFIG"
    SECURITY_HEADERS = "SECURITY_HEADERS"
    SSL_TLS = "SSL_TLS"
    CERT_ISSUE = "CERT_ISSUE"
    INFO_DISCLOSURE = "INFO_DISCLOSURE"
    DIRECTORY_LISTING = "DIRECTORY_LISTING"
    SENSITIVE_FILE = "SENSITIVE_FILE"
    OUTDATED_SOFTWARE = "OUTDATED_SOFTWARE"
    DEFAULT_CREDENTIALS = "DEFAULT_CREDENTIALS"
    EMAIL_SECURITY = "EMAIL_SECURITY"
    COOKIE_SECURITY = "COOKIE_SECURITY"
    HTTP_METHODS = "HTTP_METHODS"
    WAF_DETECTED = "WAF_DETECTED"
    OTHER = "OTHER"


@dataclass
class Finding:
    """A single vulnerability finding."""
    title: str
    severity: Severity
    category: VulnCategory
    description: str
    solution: str = ""
    cve_id: str | None = None
    cvss_score: float | None = None
    affected_component: str = ""
    evidence: str = ""
    references: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Asset:
    """A discovered asset (subdomain, IP, port, etc.)."""
    type: str  # SUBDOMAIN, IP, PORT, ENDPOINT, TECHNOLOGY
    value: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ModuleResult:
    """Result from a scanner module."""
    module_name: str
    assets: list[Asset] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    raw_output: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0


class BaseModule(ABC):
    """Base class for all scanner modules."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Module name identifier."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description."""
        ...

    @abstractmethod
    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        """
        Execute the scan module against a target.

        Args:
            target: The target to scan (domain, IP, URL).
            options: Optional configuration for this scan.

        Returns:
            ModuleResult with discovered assets and findings.
        """
        ...

    async def validate_target(self, target: str) -> bool:
        """Validate that the target is acceptable for scanning."""
        return bool(target and target.strip())
