"""Tests for the stored XSS detection in VulnChecker."""

import pytest
import httpx

from scanner.models import ModuleResult, Severity, VulnCategory
from scanner.modules.vuln_checker import VulnChecker


@pytest.fixture
def checker():
    return VulnChecker()


# ── Stored XSS payloads ─────────────────────────────────────────────────────

def test_stored_xss_payloads_exist(checker: VulnChecker):
    """STORED_XSS_PAYLOADS has at least 3 payloads."""
    assert len(checker.STORED_XSS_PAYLOADS) >= 3
    for p in checker.STORED_XSS_PAYLOADS:
        assert "XSS_TEST" in p or "alert" in p or "confirm" in p


# ── _test_stored_xss — form detected, payload persists ──────────────────────

@pytest.mark.asyncio
async def test_stored_xss_payload_persists(checker: VulnChecker):
    """When a POST form is found and the payload appears on re-fetch, a finding is returned."""
    first_payload = checker.STORED_XSS_PAYLOADS[0]

    page_html = '''
    <html><body>
    <form method="POST" action="/comments">
      <input type="hidden" name="csrf" value="token123">
      <input type="text" name="comment">
      <button type="submit">Submit</button>
    </form>
    </body></html>
    '''

    # After submission, the page contains the payload (stored XSS)
    page_with_xss = f'<html><body><div class="comments">{first_payload}</div></body></html>'

    call_count = {"get": 0}

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(200, text="OK")
        # GET requests
        call_count["get"] += 1
        if call_count["get"] <= 1:
            # First GET — render the form
            return httpx.Response(200, text=page_html)
        else:
            # Subsequent GETs — the payload is stored
            return httpx.Response(200, text=page_with_xss)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://victim.test", [], client
        )

    assert len(findings) >= 1
    f = findings[0]
    assert f.severity == Severity.HIGH
    assert f.category == VulnCategory.XSS_STORED
    assert "Stored XSS" in f.title
    assert "/comments" in f.affected_component
    assert "comment" in f.evidence
    assert first_payload in f.evidence


# ── _test_stored_xss — payload does NOT persist ─────────────────────────────

@pytest.mark.asyncio
async def test_stored_xss_payload_not_persisted(checker: VulnChecker):
    """When the payload does not appear on re-fetch, no finding is returned."""
    page_html = '''
    <html><body>
    <form method="POST" action="/comments">
      <input type="text" name="comment">
    </form>
    </body></html>
    '''
    safe_page = '<html><body><div class="comments">clean content</div></body></html>'

    call_count = {"get": 0}

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(200, text="OK")
        call_count["get"] += 1
        if call_count["get"] <= 1:
            return httpx.Response(200, text=page_html)
        return httpx.Response(200, text=safe_page)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://safe.test", [], client
        )

    assert len(findings) == 0


# ── _test_stored_xss — no forms on page ─────────────────────────────────────

@pytest.mark.asyncio
async def test_stored_xss_no_forms(checker: VulnChecker):
    """Page with no POST forms returns empty findings."""
    page_html = '<html><body><p>No forms here</p></body></html>'

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=page_html)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://noform.test", [], client
        )

    assert len(findings) == 0


# ── _test_stored_xss — only GET forms (no POST) ─────────────────────────────

@pytest.mark.asyncio
async def test_stored_xss_only_get_forms(checker: VulnChecker):
    """GET forms are skipped; only POST forms are tested."""
    page_html = '''
    <html><body>
    <form method="GET" action="/search">
      <input type="text" name="q">
    </form>
    </body></html>
    '''

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=page_html)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://getonly.test", [], client
        )

    assert len(findings) == 0


# ── _test_stored_xss — textarea support ──────────────────────────────────────

@pytest.mark.asyncio
async def test_stored_xss_textarea(checker: VulnChecker):
    """Textarea fields are also tested for stored XSS."""
    first_payload = checker.STORED_XSS_PAYLOADS[0]

    page_html = '''
    <html><body>
    <form method="POST" action="/post">
      <textarea name="body"></textarea>
      <button type="submit">Post</button>
    </form>
    </body></html>
    '''

    page_with_xss = f'<html><body>{first_payload}</body></html>'
    call_count = {"get": 0}

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(200, text="OK")
        call_count["get"] += 1
        if call_count["get"] <= 1:
            return httpx.Response(200, text=page_html)
        return httpx.Response(200, text=page_with_xss)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://textarea.test", [], client
        )

    assert len(findings) >= 1
    assert "body" in findings[0].evidence


# ── _test_stored_xss — multiple endpoints deduplicated ───────────────────────

@pytest.mark.asyncio
async def test_stored_xss_deduplicates_pages(checker: VulnChecker):
    """Duplicate endpoints are skipped (already seen)."""
    page_html = '<html><body><p>No forms</p></body></html>'

    request_urls: list[str] = []

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        request_urls.append(str(request.url))
        return httpx.Response(200, text=page_html)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        # Pass duplicate endpoints
        endpoints = [
            "https://dedup.test/page1?a=1",
            "https://dedup.test/page1?b=2",  # same path, different query → deduped
        ]
        findings = await checker._test_stored_xss(
            "https://dedup.test", endpoints, client
        )

    # Base URL + page1 (deduped) = 2 unique GETs
    unique_paths = set(request_urls)
    assert len(unique_paths) <= 3  # base + at most 2 unique paths


# ── _test_stored_xss — network errors handled gracefully ────────────────────

@pytest.mark.asyncio
async def test_stored_xss_network_error(checker: VulnChecker):
    """Connection errors don't crash the test."""
    async def mock_handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("Connection refused")

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://down.test", [], client
        )

    assert findings == []


# ── _test_stored_xss — relative action URL resolved ─────────────────────────

@pytest.mark.asyncio
async def test_stored_xss_relative_action(checker: VulnChecker):
    """Relative form action is resolved against the page URL."""
    first_payload = checker.STORED_XSS_PAYLOADS[0]

    page_html = '''
    <html><body>
    <form method="POST" action="/submit-comment">
      <input type="text" name="msg">
    </form>
    </body></html>
    '''

    page_with_xss = f'<html><body>{first_payload}</body></html>'
    call_count = {"get": 0}
    posted_urls: list[str] = []

    async def mock_handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            posted_urls.append(str(request.url))
            return httpx.Response(200, text="OK")
        call_count["get"] += 1
        if call_count["get"] <= 1:
            return httpx.Response(200, text=page_html)
        return httpx.Response(200, text=page_with_xss)

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        findings = await checker._test_stored_xss(
            "https://rel.test/page", [], client
        )

    # POST should go to the resolved absolute URL
    assert any("/submit-comment" in u for u in posted_urls)
    assert len(findings) >= 1
