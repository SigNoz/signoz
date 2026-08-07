"""Integration tests for the third-party (external) API monitoring domain list.

A translator over v5 builder queries, so these cover the contract it exposes (columns,
grouping, base filter, IP masking) plus the `max(timestamp)` Last Seen from #5824.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.thirdpartyapi import (
    domain_column_index,
    index_columns_by_query,
    make_third_party_apis_request,
    rows_by_domain,
    scalar_result,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# the placeholder the response layer writes where a query has no value for a row
NO_VALUE = "n/a"


# timestamp_attr seeds a numeric attribute named `timestamp`: resolution must keep the
# intrinsic column, else the multiIf union fails with "no supertype for DateTime64, Float64".
@pytest.mark.parametrize("noise", ["clean", "timestamp_attr"])
def test_domain_list_last_seen_is_the_span_instant(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    Two client spans to api.stripe.com, 3 and 1 minutes ago.

    Tests:
    Last Seen resolves to the newer span's instant. A numeric coercion of the
    DateTime64 column would yield seconds since epoch (~1.7e9), which lands in
    January 1970 once read as milliseconds.
    """
    extra_attrs = {"timestamp": 1.0} if noise == "timestamp_attr" else {}
    now = datetime.now(tz=UTC).replace(microsecond=0)
    newest = now - timedelta(minutes=1)
    domain = f"api.stripe-{noise}.com"

    insert_traces(
        [
            Traces(
                timestamp=ts,
                duration=timedelta(milliseconds=120),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="POST /v1/charges",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "checkout"},
                attributes={
                    "http.url": f"https://{domain}/v1/charges",
                    "http.host": domain,
                    **extra_attrs,
                },
            )
            for ts in (now - timedelta(minutes=3), newest)
        ]
    )

    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = scalar_result(response)
    rows = rows_by_domain(result)
    assert domain in rows, result["data"]

    raw_last_seen = rows[domain][index_columns_by_query(result)["lastseen"]]
    # a native DateTime64 serializes as an RFC 3339 instant; the span is seeded on a whole
    # second, so the instant is exact
    assert isinstance(raw_last_seen, str), f"Last Seen returned {raw_last_seen!r}, expected an RFC 3339 instant"
    last_seen = datetime.fromisoformat(raw_last_seen)

    assert last_seen == newest, f"Last Seen {raw_last_seen!r} resolved to {last_seen.isoformat()}, expected the newer span at {newest.isoformat()}"


def test_domain_list_groups_by_domain_and_counts_endpoints(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    api.github.com with 2 distinct URLs (one called twice); api.openai.com with 1.

    Tests:
    One row per domain, endpoint counts are distinct-URL counts, and the columns
    used only to feed the error-rate formula are stripped from the response.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    specs = [
        ("api.github.com", "https://api.github.com/repos"),
        ("api.github.com", "https://api.github.com/repos"),
        ("api.github.com", "https://api.github.com/issues"),
        ("api.openai.com", "https://api.openai.com/v1/chat"),
    ]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(milliseconds=200),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="client call",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "gateway"},
                attributes={"http.url": url, "http.host": host},
            )
            for i, (host, url) in enumerate(specs)
        ]
    )

    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.OK, response.text
    body = response.json()
    assert body["status"] == "success", body
    # the six queries are merged into exactly one table
    assert len(body["data"]["data"]["results"]) == 1, body["data"]["data"]["results"]

    result = scalar_result(response)

    by_query = index_columns_by_query(result)
    # exact set: the error/total_span intermediates only feed the error_rate formula and
    # must be stripped, and a new column should trip this rather than slip through
    assert by_query.keys() == {"endpoints", "lastseen", "rps", "p99", "error_rate"}, result["columns"]
    assert [col["name"] for col in result["columns"] if col["columnType"] == "group"] == ["http_host"], result["columns"]

    width = len(result["columns"])
    assert all(len(row) == width for row in result["data"]), result["data"]

    rows = rows_by_domain(result)
    endpoints = {domain: rows[domain][by_query["endpoints"]] for domain in ("api.github.com", "api.openai.com") if domain in rows}
    assert endpoints == {"api.github.com": 2, "api.openai.com": 1}, result["data"]

    # every query groups by http_host, so a seeded domain has a value in every column
    for domain in ("api.github.com", "api.openai.com"):
        assert NO_VALUE not in rows[domain], (domain, result["data"])


def test_domain_list_excludes_non_client_and_urlless_spans(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    A client span with an http.url, a server span with one, and a client span without.

    Tests:
    The base filter (`http_url EXISTS AND kind_string = 'Client'`) keeps only the
    first domain; the other two never reach the response.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    specs = [
        ("included.example.com", TracesKind.SPAN_KIND_CLIENT, "https://included.example.com/a"),
        (
            "server-kind.example.com",
            TracesKind.SPAN_KIND_SERVER,
            "https://server-kind.example.com/a",
        ),
        ("no-url.example.com", TracesKind.SPAN_KIND_CLIENT, None),
    ]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(milliseconds=50),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="call",
                kind=kind,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "gateway"},
                attributes=({"http.host": host} if url is None else {"http.url": url, "http.host": host}),
            )
            for i, (host, kind, url) in enumerate(specs)
        ]
    )

    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.OK, response.text
    domains = rows_by_domain(scalar_result(response)).keys()

    assert "included.example.com" in domains, domains
    assert "server-kind.example.com" not in domains, domains
    assert "no-url.example.com" not in domains, domains


@pytest.mark.parametrize("show_ip", [False, True])
def test_domain_list_show_ip_masks_ip_domains(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    show_ip: bool,
) -> None:
    """
    Setup:
    One client span each to a hostname, a bare IPv4 and a bare IPv6 address.

    Tests:
    show_ip gates both IP forms (net.ParseIP accepts either); the hostname always shows.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    specs = [
        ("named.example.com", "https://named.example.com/a"),
        ("10.42.7.9", "http://10.42.7.9/metrics"),
        ("2001:db8::42", "http://[2001:db8::42]/metrics"),
    ]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(milliseconds=50),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="call",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "gateway"},
                attributes={"http.url": url, "http.host": host},
            )
            for i, (host, url) in enumerate(specs)
        ]
    )

    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
        show_ip=show_ip,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    domains = rows_by_domain(scalar_result(response)).keys()

    assert "named.example.com" in domains, domains
    assert ("10.42.7.9" in domains) is show_ip, domains
    assert ("2001:db8::42" in domains) is show_ip, domains


def test_domain_list_latency_and_rate_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    3 client spans of 250ms on one domain, 1 on another.

    Tests:
    p99 is duration_nano in nanoseconds, and rps is rate() over the scalar window
    (count / (end - start) seconds), so the busier domain's rate is 3x the other's.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    busy, quiet = "busy.example.com", "quiet.example.com"
    duration = timedelta(milliseconds=250)
    specs = [(busy, 0), (busy, 1), (busy, 2), (quiet, 3)]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=duration,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="call",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": "gateway"},
                attributes={"http.url": f"https://{host}/a", "http.host": host},
            )
            for host, i in specs
        ]
    )

    start_ms = int((now - timedelta(minutes=10)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)
    response = make_third_party_apis_request(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), start_ms, end_ms)

    assert response.status_code == HTTPStatus.OK, response.text
    result = scalar_result(response)
    by_query = index_columns_by_query(result)
    rows = rows_by_domain(result)

    # every span has the same duration, so the percentile is that duration exactly
    expected_ns = duration / timedelta(microseconds=1) * 1000
    for domain in (busy, quiet):
        assert rows[domain][by_query["p99"]] == pytest.approx(expected_ns), (domain, result["data"])

    window_seconds = (end_ms - start_ms) / 1000
    assert rows[busy][by_query["rps"]] == pytest.approx(3 / window_seconds, rel=0.05), result["data"]
    assert rows[quiet][by_query["rps"]] == pytest.approx(1 / window_seconds, rel=0.05), result["data"]


@pytest.mark.parametrize(
    "label,errors,total,expected",
    [("quarter", 1, 4, 25.0), ("all", 2, 2, 100.0), ("none", 0, 3, 0.0)],
)
def test_domain_list_error_rate_is_a_percentage_of_spans(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    label: str,
    errors: int,
    total: int,
    expected: float,
) -> None:
    """
    Setup:
    `total` client spans on one domain, `errors` of them failed.

    Tests:
    error_rate is (error/total_span)*100 across the range, including the all-failed and
    none-failed edges.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    domain = f"errors-{label}.example.com"
    statuses = [TracesStatusCode.STATUS_CODE_ERROR] * errors + [TracesStatusCode.STATUS_CODE_OK] * (total - errors)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(milliseconds=100),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="call",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=status,
                resources={"service.name": "gateway"},
                attributes={"http.url": f"https://{domain}/a", "http.host": domain},
            )
            for i, status in enumerate(statuses)
        ]
    )

    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = scalar_result(response)
    rows = rows_by_domain(result)
    assert domain in rows, result["data"]

    error_rate = rows[domain][index_columns_by_query(result)["error_rate"]]
    assert error_rate == pytest.approx(expected), result["data"]


def test_domain_list_user_filter_narrows_the_base_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Two client spans to the same domain from different services.

    Tests:
    A caller filter is ANDed onto the base filter, so only the named service's span
    contributes.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    domain = "filtered.example.com"
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(milliseconds=100),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="call",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": service},
                attributes={"http.url": f"https://{domain}/{service}", "http.host": domain},
            )
            for i, service in enumerate(("keeper-svc", "dropped-svc"))
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=10)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)

    unfiltered = make_third_party_apis_request(signoz, token, start_ms, end_ms)
    filtered = make_third_party_apis_request(signoz, token, start_ms, end_ms, filter_expression="service.name = 'keeper-svc'")

    assert unfiltered.status_code == HTTPStatus.OK, unfiltered.text
    assert filtered.status_code == HTTPStatus.OK, filtered.text

    unfiltered_result = scalar_result(unfiltered)
    filtered_result = scalar_result(filtered)
    endpoints_key = "endpoints"
    assert rows_by_domain(unfiltered_result)[domain][index_columns_by_query(unfiltered_result)[endpoints_key]] == 2
    assert rows_by_domain(filtered_result)[domain][index_columns_by_query(filtered_result)[endpoints_key]] == 1


def test_domain_list_caller_group_by_adds_a_dimension(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Two client spans to one domain, from two services.

    Tests:
    A caller groupBy is merged after the domain key, so the domain splits into one row
    per group value and the extra key gets its own column.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    domain = "grouped.example.com"
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(milliseconds=100),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="call",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": service},
                attributes={"http.url": f"https://{domain}/a", "http.host": domain},
            )
            for i, service in enumerate(("svc-a", "svc-b"))
        ]
    )

    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
        group_by=[
            {
                "name": "service.name",
                "fieldDataType": "string",
                "fieldContext": "resource",
                "signal": "traces",
            }
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = scalar_result(response)

    assert "service.name" in {col["name"] for col in result["columns"]}, result["columns"]
    domain_idx = domain_column_index(result)
    service_idx = next(i for i, col in enumerate(result["columns"]) if col["name"] == "service.name")
    services = {row[service_idx] for row in result["data"] if row[domain_idx] == domain}
    assert services == {"svc-a", "svc-b"}, result["data"]


def test_domain_list_is_empty_outside_the_seeded_window(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Tests:
    A window with no matching spans answers 200 with no rows, not an error.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    long_ago = now - timedelta(days=400)
    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int(long_ago.timestamp() * 1000),
        end_ms=int((long_ago + timedelta(minutes=5)).timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert scalar_result(response)["data"] == []


def test_domain_list_requires_authentication(signoz: types.SigNoz) -> None:
    """
    Tests:
    The route sits behind ViewAccess, so an unauthenticated call is rejected.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    response = make_third_party_apis_request(
        signoz,
        "",
        start_ms=int((now - timedelta(minutes=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


def test_domain_list_rejects_inverted_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Tests:
    The request is validated before any query is built, so start >= end is a client
    error rather than an empty result.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    response = make_third_party_apis_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=int(now.timestamp() * 1000),
        end_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
