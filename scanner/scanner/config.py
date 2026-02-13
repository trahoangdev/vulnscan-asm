"""Scanner engine configuration."""

from pydantic_settings import BaseSettings
from pydantic import Field


class ScannerConfig(BaseSettings):
    """Scanner configuration from environment variables."""

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # Database
    database_url: str = Field(
        default="postgresql://vulnscan:vulnscan_dev@localhost:5432/vulnscan_dev",
        alias="DATABASE_URL",
    )

    # API Server
    api_url: str = Field(default="http://localhost:4000/v1", alias="API_URL")
    api_key: str = Field(default="", alias="SCANNER_API_KEY")

    # Scanner Settings
    max_concurrent_scans: int = Field(default=5, alias="MAX_CONCURRENT_SCANS")
    scan_timeout: int = Field(default=3600, alias="SCAN_TIMEOUT")  # seconds
    rate_limit_rps: int = Field(default=10, alias="RATE_LIMIT_RPS")

    # Nmap
    nmap_path: str = Field(default="nmap", alias="NMAP_PATH")
    nmap_top_ports: int = Field(default=1000, alias="NMAP_TOP_PORTS")

    # DNS
    dns_resolvers: list[str] = Field(
        default=["8.8.8.8", "1.1.1.1"], alias="DNS_RESOLVERS"
    )
    dns_timeout: int = Field(default=5, alias="DNS_TIMEOUT")

    # HTTP
    http_timeout: int = Field(default=10, alias="HTTP_TIMEOUT")
    http_user_agent: str = Field(
        default="VulnScan-ASM/1.0 (Security Scanner)",
        alias="HTTP_USER_AGENT",
    )

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # Blocked ranges (private IPs, etc.)
    blocked_cidrs: list[str] = Field(
        default=[
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "127.0.0.0/8",
            "169.254.0.0/16",
        ],
        alias="BLOCKED_CIDRS",
    )

    class Config:
        env_file = ".env"
        extra = "ignore"


config = ScannerConfig()
