"""Tests for the API endpoint discovery scanner module."""

import pytest
import httpx

from scanner.models import ModuleResult, Severity, VulnCategory
from scanner.modules.api_discovery import ApiDiscovery

# Allow unmatched requests — the module probes many paths and we only mock a few.
pytestmark = pytest.mark.httpx_mock(assert_all_requests_were_expected=False)


@pytest.fixture
def module():
    return ApiDiscovery()


# ── Basic properties ─────────────────────────────────────────────────────────

def test_name(module: ApiDiscovery):
    assert module.name == "api_discovery"


def test_description(module: ApiDiscovery):
    assert "API" in module.description


# ── run() — API base path probing ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_probe_api_base_paths(module: ApiDiscovery, httpx_mock):
    """Discovered API base paths appear as API_ENDPOINT assets."""
    httpx_mock.add_response(
        url="https://example.com/api",
        status_code=200,
        headers={"content-type": "application/json"},
        json={"ok": True},
    )
    # All other paths → 404
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://example.com")

    assert isinstance(result, ModuleResult)
    api_assets = [a for a in result.assets if a.value == "https://example.com/api"]
    assert len(api_assets) >= 1
    assert api_assets[0].type == "API_ENDPOINT"
    assert api_assets[0].metadata["status_code"] == 200
    assert result.raw_output["api_base_paths"] >= 1


@pytest.mark.asyncio
async def test_non_http_target_gets_https_prefix(module: ApiDiscovery, httpx_mock):
    """Target without http(s) prefix gets https:// prepended."""
    httpx_mock.add_response(status_code=404)

    result = await module.run("example.com")

    assert isinstance(result, ModuleResult)
    # Check at least one request was made to https://example.com/*
    requests_made = httpx_mock.get_requests()
    assert all(str(r.url).startswith("https://example.com") for r in requests_made)


# ── run() — OpenAPI / Swagger docs ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_openapi_docs_found(module: ApiDiscovery, httpx_mock):
    """OpenAPI document triggers an INFO_DISCLOSURE finding and API_ENDPOINT assets."""
    swagger_body = '{"swagger": "2.0", "info": {}, "paths": {"/users": {}, "/orders": {}}}'

    httpx_mock.add_response(
        url="https://target.io/swagger.json",
        status_code=200,
        text=swagger_body,
    )
    # Default for everything else
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://target.io")

    # Should have an INFO_DISCLOSURE finding about exposed docs
    doc_findings = [f for f in result.findings if f.category == VulnCategory.INFO_DISCLOSURE and "OpenAPI" in f.title]
    assert len(doc_findings) >= 1
    assert doc_findings[0].severity == Severity.LOW

    # Endpoints extracted from spec (/users, /orders) should appear as assets
    values = {a.value for a in result.assets}
    assert "https://target.io/users" in values or "https://target.io/orders" in values
    assert "openapi_docs" in result.raw_output


@pytest.mark.asyncio
async def test_no_openapi_docs(module: ApiDiscovery, httpx_mock):
    """When no OpenAPI docs found, no related finding is generated."""
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://target.io")

    doc_findings = [f for f in result.findings if "OpenAPI" in f.title]
    assert len(doc_findings) == 0


# ── run() — GraphQL introspection ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_graphql_introspection_enabled(module: ApiDiscovery, httpx_mock):
    """GraphQL introspection triggers a MEDIUM finding."""
    httpx_mock.add_response(
        url="https://gql.test/graphql",
        method="POST",
        status_code=200,
        json={"data": {"__schema": {"types": [{"name": "Query"}]}}},
    )
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://gql.test")

    gql_findings = [f for f in result.findings if "GraphQL" in f.title]
    assert len(gql_findings) == 1
    assert gql_findings[0].severity == Severity.MEDIUM
    assert gql_findings[0].category == VulnCategory.INFO_DISCLOSURE

    # Asset with graphql type
    gql_assets = [a for a in result.assets if a.metadata.get("type") == "graphql"]
    assert len(gql_assets) >= 1
    assert result.raw_output["graphql_found"] is True


@pytest.mark.asyncio
async def test_graphql_not_available(module: ApiDiscovery, httpx_mock):
    """No GraphQL endpoint → graphql_found is False."""
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://gql.test")

    assert result.raw_output["graphql_found"] is False


# ── run() — JavaScript endpoint extraction ───────────────────────────────────

@pytest.mark.asyncio
async def test_js_endpoint_extraction(module: ApiDiscovery, httpx_mock):
    """API URLs parsed from JS source files appear as assets."""
    js_content = '''
    const API = "/api/v2/users";
    fetch("/api/v2/orders");
    axios.get("/rest/products");
    '''

    httpx_mock.add_response(status_code=404)  # default

    result = await module.run(
        "https://jstest.io",
        options={
            "discovered_assets": [
                {"type": "ENDPOINT", "value": "https://jstest.io/app.js"},
            ]
        },
    )

    # If the JS file was fetched (status 200), endpoints should appear.
    # With the default 404 mock the JS fetch also 404s, so endpoints won't appear.
    # Let's just verify no crash occurred.
    assert isinstance(result, ModuleResult)
    assert result.module_name == "api_discovery"


@pytest.mark.asyncio
async def test_js_endpoint_extraction_with_content(module: ApiDiscovery, httpx_mock):
    """When JS file responds 200, API patterns are extracted."""
    js_content = 'const url = "/api/v2/users"; fetch("/api/v2/orders");'

    httpx_mock.add_response(
        url="https://jstest.io/app.js",
        status_code=200,
        text=js_content,
    )
    httpx_mock.add_response(status_code=404)

    result = await module.run(
        "https://jstest.io",
        options={
            "discovered_assets": [
                {"type": "ENDPOINT", "value": "https://jstest.io/app.js"},
            ]
        },
    )

    js_assets = [a for a in result.assets if a.metadata.get("source") == "javascript"]
    assert len(js_assets) >= 1
    assert result.raw_output["js_extracted_endpoints"] >= 1


# ── run() — robots.txt parsing ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_robots_txt_api_paths(module: ApiDiscovery, httpx_mock):
    """API paths in robots.txt disallow rules appear as assets."""
    robots = "User-agent: *\nDisallow: /api/internal\nDisallow: /images\n"

    httpx_mock.add_response(
        url="https://robots.test/robots.txt",
        status_code=200,
        text=robots,
    )
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://robots.test")

    robots_assets = [a for a in result.assets if a.metadata.get("source") == "robots.txt"]
    assert len(robots_assets) >= 1
    values = {a.value for a in robots_assets}
    assert "https://robots.test/api/internal" in values
    # /images should NOT be included (not an API keyword)
    assert "https://robots.test/images" not in values


# ── run() — REST resource probing ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rest_resource_probing(module: ApiDiscovery, httpx_mock):
    """REST resources under discovered API bases appear as assets."""
    # /api returns 200 JSON → becomes an api base
    httpx_mock.add_response(
        url="https://rest.test/api",
        status_code=200,
        headers={"content-type": "application/json"},
        json={},
    )
    # /api/users returns 200 JSON
    httpx_mock.add_response(
        url="https://rest.test/api/users",
        status_code=200,
        headers={"content-type": "application/json"},
        json=[],
    )
    # /api/auth returns 401
    httpx_mock.add_response(
        url="https://rest.test/api/auth",
        status_code=401,
        headers={"content-type": "application/json"},
        json={"error": "Unauthorized"},
    )
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://rest.test")

    values = {a.value for a in result.assets}
    assert "https://rest.test/api/users" in values or "https://rest.test/api/auth" in values


# ── run() — error handling ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_network_errors_dont_crash(module: ApiDiscovery, httpx_mock):
    """Network errors are caught gracefully; module returns partial results."""
    httpx_mock.add_exception(httpx.ConnectError("Connection refused"))

    result = await module.run("https://fail.test")

    assert isinstance(result, ModuleResult)
    assert result.module_name == "api_discovery"
    assert result.duration_seconds >= 0


# ── run() — result structure ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_result_structure(module: ApiDiscovery, httpx_mock):
    """ModuleResult has all expected fields populated."""
    httpx_mock.add_response(status_code=404)

    result = await module.run("https://struct.test")

    assert result.module_name == "api_discovery"
    assert isinstance(result.assets, list)
    assert isinstance(result.findings, list)
    assert isinstance(result.raw_output, dict)
    assert isinstance(result.errors, list)
    assert result.duration_seconds > 0
    assert "api_base_paths" in result.raw_output
    assert "openapi_docs" in result.raw_output
    assert "graphql_found" in result.raw_output
    assert "rest_endpoints" in result.raw_output
    assert "js_extracted_endpoints" in result.raw_output
