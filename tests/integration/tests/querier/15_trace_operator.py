"""
Integration tests for TraceOperatorQuery (builder_trace_operator) through the
/api/v5/query_range endpoint.

Covers:
1. Order-by variants (A -> B, A => B) with returnSpansFrom="A".
   Guards against the NOT_FOUND_COLUMN_IN_BLOCK regression where ordering by a
   column absent from an outer SELECT caused a query failure.
2. Expression operators (=>, ->, &&, ||, A NOT B) with and without returnSpansFrom.

returnSpansFrom semantics
--------------------------
returnSpansFrom="" (default)
    The final rows come from the expression's root CTE.  Only spans that
    directly satisfy the structural predicate are returned.

returnSpansFrom="A"
    The expression is still evaluated in full (the structural relationship
    must hold), but the final rows are drawn from the A sub-query CTE,
    filtered to traces that appeared in the expression result.  Concretely:
    the query returns every A span whose trace_id belongs to a trace that
    matched the expression.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    assert_grouped_scalar,
    assert_raw_row_subset,
    assert_scalar_value,
    format_timestamp,
    generate_traces_with_corrupt_metadata,
    get_rows,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def _names(response: requests.Response) -> set:
    return {r["data"]["name"] for r in get_rows(response)}


# ============================================================================
# Dataset — 4 traces using real OTel semantic-convention attributes
#
# Filter A = "http.method EXISTS"  (HTTP entry-point spans)
# Filter B = "db.system = 'redis'"         (direct Redis cache calls)
#          / "db.system = 'postgresql'"    (deeper DB queries, for indirect tests)
#          / "messaging.system = 'kafka'"  (async consumer, for OR tests)
#
# T1  checkout-svc [SERVER] POST /checkout (5s)   ← structural root, http.method=POST
#                             ├─ proxy-svc [SERVER] api-proxy (3s)  ← http.method=POST; no db children
#                             └─ [CLIENT] lookup-cart (redis)
#                                  └─ [CLIENT] check-inventory (postgresql)
#
# T2  catalog-svc  [SERVER] GET /catalog (1s)     ← http.method=GET
#                             └─ [CLIENT] fetch-catalog (redis)
#                                  └─ [CLIENT] read-cache (postgresql)
#
# T3  standalone-svc  [SERVER] standalone-server   ← http.method=POST; no db/cache children
# T4  isolated-svc    [CONSUMER] isolated-worker   ← messaging.system=kafka; no http.method → not in A
#
# T1 has TWO spans matching filter A (http.method EXISTS); returnSpansFrom changes what is returned:
#   default  → only spans that directly satisfy the structural predicate
#   return_A → all matching A spans from traces where the predicate held
#
# Expression truth table:
#   A -> B  (indirect)  A=http.method EXISTS  B=db.system='postgresql'  T1✓ T2✓ T3✗ T4✗
#   A => B  (direct)    A=http.method EXISTS  B=db.system='redis'       T1✓ T2✓ T3✗ T4✗
#   A && B              A=http.method EXISTS  B=db.system='redis'       T1✓ T2✓ T3✗ T4✗
#   A || B              A=http.method EXISTS  B=messaging.system='kafka' T1✓ T2✓ T3✓ T4✓
#   A NOT B             A=http.method EXISTS  B=db.system='redis'       T1✗ T2✗ T3✓ T4✗
#
# Order-by cases (all use returnSpansFrom=A, 3 rows expected):
#   ob.indirect  A->B order http.method DESC  → POST(checkout+proxy), GET(catalog)
#   ob.duration  A=>B order duration_nano DESC → POST/checkout(5s), api-proxy(3s), GET/catalog(1s)
#   ob.select    A=>B order http.method DESC  → POST, POST, GET
# ============================================================================


@pytest.mark.parametrize(
    "case",
    [
        # ── Order-by: http.method DESC, NOT in selectFields ──────────────────────
        # Guards against NOT_FOUND_COLUMN_IN_BLOCK: ordering by a column absent from
        # the outer SELECT used to cause a ClickHouse query failure.
        # returnSpansFrom="A" returns all T1 http.method spans: POST /checkout and api-proxy
        # (both http.method="POST", services checkout-svc and proxy-svc), plus
        # GET /catalog (http.method="GET") from T2.
        # The two POST spans are tied so their relative order is undefined; catalog-svc
        # (GET) is guaranteed to sort last.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'postgresql'",
                "expression": "A -> B",
                "return_spans_from": "A",
                "select_fields": [{"name": "service.name", "fieldDataType": "string", "fieldContext": "resource"}],
                "order": [{"key": {"name": "http.method", "fieldDataType": "string", "fieldContext": "attribute"}, "direction": "desc"}],
                "validate": lambda r: len(get_rows(r)) == 3 and {get_rows(r)[0]["data"]["service.name"], get_rows(r)[1]["data"]["service.name"]} == {"checkout-svc", "proxy-svc"} and get_rows(r)[2]["data"]["service.name"] == "catalog-svc",
            },
            id="ob.indirect.http_method_not_in_select",
        ),
        # ── Order-by: duration_nano DESC, core span field ─────────────────────────
        # returnSpansFrom="A" includes api-proxy (3 s) in T1's result.
        # Order: POST /checkout (5 s) > api-proxy (3 s) > GET /catalog (1 s).
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'redis'",
                "expression": "A => B",
                "return_spans_from": "A",
                "order": [{"key": {"name": "duration_nano", "fieldContext": "span"}, "direction": "desc"}],
                "validate": lambda r: len(get_rows(r)) == 3 and get_rows(r)[0]["data"]["name"] == "POST /checkout" and get_rows(r)[1]["data"]["name"] == "api-proxy" and get_rows(r)[2]["data"]["name"] == "GET /catalog",
            },
            id="ob.duration.duration_nano_desc",
        ),
        # ── Order-by: http.method DESC, IS in selectFields ────────────────────────
        # http.method is selected so it appears in each result row.
        # Both POST /checkout and api-proxy carry http.method="POST"; their relative
        # order is undefined. GET /catalog ("GET") always sorts last.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'redis'",
                "expression": "A => B",
                "return_spans_from": "A",
                "select_fields": [{"name": "http.method", "fieldDataType": "string", "fieldContext": "attribute"}],
                "order": [{"key": {"name": "http.method", "fieldDataType": "string", "fieldContext": "attribute"}, "direction": "desc"}],
                "validate": lambda r: len(get_rows(r)) == 3 and get_rows(r)[0]["data"]["http.method"] == "POST" and get_rows(r)[1]["data"]["http.method"] == "POST" and get_rows(r)[2]["data"]["http.method"] == "GET",
            },
            id="ob.select.http_method_in_select",
        ),
        # ── A => B (direct child), returnSpansFrom="" ─────────────────────────────
        # POST /checkout directly parents lookup-cart (redis); api-proxy has no redis child.
        # T3 does not match (no redis descendant). Default returns only the satisfying A spans.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'redis'",
                "expression": "A => B",
                "return_spans_from": "",
                "validate": lambda r: len(get_rows(r)) == 2 and _names(r) == {"POST /checkout", "GET /catalog"},
            },
            id="ex.direct_child.default",
        ),
        # ── A => B (direct child), returnSpansFrom="A" ────────────────────────────
        # T1 matches; return_A pulls all T1 http.method spans → api-proxy is included too.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'redis'",
                "expression": "A => B",
                "return_spans_from": "A",
                "validate": lambda r: len(get_rows(r)) == 3 and _names(r) == {"POST /checkout", "GET /catalog", "api-proxy"},
            },
            id="ex.direct_child.return_A",
        ),
        # ── A -> B (indirect descendant), returnSpansFrom="" ──────────────────────
        # POST /checkout is an ancestor of check-inventory (postgresql) via lookup-cart.
        # api-proxy has no postgresql descendants. T3 has no postgresql descendant.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'postgresql'",
                "expression": "A -> B",
                "return_spans_from": "",
                "validate": lambda r: len(get_rows(r)) == 2 and _names(r) == {"POST /checkout", "GET /catalog"},
            },
            id="ex.indirect_descendant.default",
        ),
        # ── A -> B (indirect descendant), returnSpansFrom="A" ────────────────────
        # T1 matches; return_A pulls all T1 http.method spans → api-proxy is included too.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'postgresql'",
                "expression": "A -> B",
                "return_spans_from": "A",
                "validate": lambda r: len(get_rows(r)) == 3 and _names(r) == {"POST /checkout", "GET /catalog", "api-proxy"},
            },
            id="ex.indirect_descendant.return_A",
        ),
        # ── A && B (both present in same trace), returnSpansFrom="" ───────────────
        # T1 and T2 match (each trace has http.method spans AND redis spans); T3 does not.
        # A && B returns all A spans from matching traces — api-proxy is included
        # because it shares T1's trace_id with POST /checkout.
        # (return_A produces the same set by definition; no separate case needed.)
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'redis'",
                "expression": "A && B",
                "return_spans_from": "",
                "validate": lambda r: len(get_rows(r)) == 3 and _names(r) == {"POST /checkout", "GET /catalog", "api-proxy"},
            },
            id="ex.and.default",
        ),
        # ── A || B (either present), returnSpansFrom="" ───────────────────────────
        # T1, T2, T3 match via A (http.method spans); T4 matches via B (kafka span).
        # Default returns UNION of all A and B spans from matching traces.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "messaging.system = 'kafka'",
                "expression": "A || B",
                "return_spans_from": "",
                "validate": lambda r: len(get_rows(r)) == 5 and _names(r) == {"POST /checkout", "GET /catalog", "api-proxy", "standalone-server", "isolated-worker"},
            },
            id="ex.or.default",
        ),
        # ── A || B, returnSpansFrom="A" ───────────────────────────────────────────
        # All four traces match; only A spans are returned.
        # T4 has no http.method span, so it contributes nothing to A.
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "messaging.system = 'kafka'",
                "expression": "A || B",
                "return_spans_from": "A",
                "validate": lambda r: len(get_rows(r)) == 4 and _names(r) == {"POST /checkout", "GET /catalog", "api-proxy", "standalone-server"},
            },
            id="ex.or.return_A",
        ),
        # ── A NOT B (A present, B absent from trace), returnSpansFrom="" ─────────
        # T1 and T2 do NOT match: their traces contain redis spans.
        # T3 MATCHES: has http.method span but no redis span in its trace.
        # T4 has no http.method span, so it cannot contribute an A span.
        # (return_A produces the same set; no separate case needed.)
        pytest.param(
            {
                "filter_a": "http.method EXISTS",
                "filter_b": "db.system = 'redis'",
                "expression": "A NOT B",
                "return_spans_from": "",
                "validate": lambda r: len(get_rows(r)) == 1 and _names(r) == {"standalone-server"},
            },
            id="ex.not.default",
        ),
    ],
)
def test_trace_operator(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    case: dict,
) -> None:
    t1_trace_id = TraceIdGenerator.trace_id()
    t1_checkout_span_id = TraceIdGenerator.span_id()  # POST /checkout — structural root of T1
    t1_child_span_id = TraceIdGenerator.span_id()  # lookup-cart

    t2_trace_id = TraceIdGenerator.trace_id()
    t2_root_span_id = TraceIdGenerator.span_id()
    t2_child_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            # T1 — two http.method spans in the same trace, modelling a real proxy+service pair.
            # POST /checkout (checkout-svc) is the root (parent_span_id="").
            # api-proxy (proxy-svc) is a structural child of POST /checkout but also has
            # http.method set, so it matches filter A alongside POST /checkout.
            # Both carry http.method="POST" — they differ only in service.name.
            # This is what makes returnSpansFrom="" and returnSpansFrom="A" distinct:
            #   default  → only POST /checkout satisfies A => B or A -> B
            #   return_A → api-proxy is pulled in too (all A spans from the matching trace)
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=t1_trace_id,
                span_id=t1_checkout_span_id,
                parent_span_id="",
                name="POST /checkout",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "checkout-svc"},
                attributes={"http.method": "POST", "http.route": "/checkout"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=3),
                trace_id=t1_trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=t1_checkout_span_id,
                name="api-proxy",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "proxy-svc"},
                attributes={"http.method": "POST", "http.route": "/proxy"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=2),
                trace_id=t1_trace_id,
                span_id=t1_child_span_id,
                parent_span_id=t1_checkout_span_id,
                name="lookup-cart",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "checkout-svc"},
                attributes={"db.system": "redis", "db.operation": "GET"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=t1_trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=t1_child_span_id,
                name="check-inventory",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "checkout-svc"},
                attributes={"db.system": "postgresql", "db.operation": "SELECT"},
            ),
            # T2 — catalog-svc: GET /catalog (1 s root) → fetch-catalog (redis) → read-cache (postgresql)
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=t2_trace_id,
                span_id=t2_root_span_id,
                parent_span_id="",
                name="GET /catalog",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "catalog-svc"},
                attributes={"http.method": "GET", "http.route": "/catalog"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=2),
                trace_id=t2_trace_id,
                span_id=t2_child_span_id,
                parent_span_id=t2_root_span_id,
                name="fetch-catalog",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "catalog-svc"},
                attributes={"db.system": "redis", "db.operation": "GET"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=t2_trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=t2_child_span_id,
                name="read-cache",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "catalog-svc"},
                attributes={"db.system": "postgresql", "db.operation": "SELECT"},
            ),
            # T3 — standalone-svc: HTTP entry span with no downstream calls.
            #   Fails A => B / A -> B / A && B (no redis/postgresql descendant).
            #   Matches A NOT B (has http.method span, no redis child).
            #   Contributes to A || B via A.
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=3),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="standalone-server",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "standalone-svc"},
                attributes={"http.method": "POST", "http.route": "/"},
            ),
            # T4 — isolated-svc: Kafka consumer; no http.method so it never matches filter A.
            #   Used only as the B side of A || B to prove the OR operator matches via B.
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="isolated-worker",
                kind=TracesKind.SPAN_KIND_CONSUMER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "isolated-svc"},
                attributes={"messaging.system": "kafka", "messaging.destination": "orders"},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    spec: dict = {
        "name": "C",
        "expression": case["expression"],
        "returnSpansFrom": case.get("return_spans_from", ""),
        "limit": case.get("limit", 100),
    }
    if case.get("select_fields"):
        spec["selectFields"] = case["select_fields"]
    if case.get("order"):
        spec["order"] = case["order"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {"name": "A", "signal": "traces", "filter": {"expression": case["filter_a"]}, "limit": 100},
                    },
                    {
                        "type": "builder_query",
                        "spec": {"name": "B", "signal": "traces", "filter": {"expression": case["filter_b"]}, "limit": 100},
                    },
                    {"type": "builder_trace_operator", "spec": spec},
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )
    assert response.status_code == HTTPStatus.OK, f"HTTP {response.status_code}: {response.text}"
    assert case["validate"](response), f"validation failed: {response.json()}"


def _expected_trace_subset(trace: Traces) -> dict[str, Any]:
    return {
        "duration_nano": trace.duration_nano,
        "name": trace.name,
        "parent_span_id": trace.parent_span_id,
        "span_id": trace.span_id,
        "timestamp": format_timestamp(trace.timestamp),
        "trace_id": trace.trace_id,
    }


@pytest.mark.parametrize(
    "payload_factory,request_type,assert_result",
    [
        # Case 1: CTE filter uses the deprecated intrinsic field `durationNano`.
        pytest.param(
            lambda traces: [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "filter": {"expression": 'durationNano = "3s"'},
                    },
                },
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "B",
                        "signal": "traces",
                        "filter": {"expression": 'durationNano = "5s"'},
                    },
                },
                {
                    "type": "builder_trace_operator",
                    "spec": {
                        "name": "C",
                        "expression": "A => B",
                        "limit": 1,
                    },
                },
            ],
            "raw",
            lambda response, traces: assert_raw_row_subset(response, "C", _expected_trace_subset(traces[0])),
            id="deprecated-intrinsic-filter",
        ),
        # Case 2: CTE filter uses the deprecated calculated field `responseStatusCode`.
        pytest.param(
            lambda traces: [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "filter": {"expression": 'responseStatusCode = "200"'},
                    },
                },
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "B",
                        "signal": "traces",
                        "filter": {"expression": 'durationNano = "5s"'},
                    },
                },
                {
                    "type": "builder_trace_operator",
                    "spec": {
                        "name": "C",
                        "expression": "A => B",
                        "limit": 1,
                    },
                },
            ],
            "raw",
            lambda response, traces: assert_raw_row_subset(response, "C", _expected_trace_subset(traces[0])),
            id="deprecated-calculated-filter",
        ),
        # Case 3: order by uses `count_` with fieldContext `span`, which has
        # to be rewritten to the aggregation alias `span.count_`.
        pytest.param(
            lambda traces: [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "aggregations": [{"expression": "count()"}],
                    },
                },
                {
                    "type": "builder_trace_operator",
                    "spec": {
                        "name": "C",
                        "expression": "A",
                        "aggregations": [{"expression": "count()", "alias": "span.count_"}],
                        "order": [{"key": {"name": "count_", "fieldContext": "span"}, "direction": "desc"}],
                    },
                },
            ],
            "scalar",
            lambda response, traces: assert_scalar_value(response, "C", len(traces)),
            id="context-prefixed-aggregation-alias-order",
        ),
        # Case 4: group by lists `cloud.provider` twice (once with a resource
        # context, once without).
        pytest.param(
            lambda traces: [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "disabled": True,
                        "aggregations": [{"expression": "count()"}],
                    },
                },
                {
                    "type": "builder_trace_operator",
                    "spec": {
                        "name": "C",
                        "expression": "A",
                        "aggregations": [{"expression": "count()"}],
                        "groupBy": [
                            {"name": "cloud.provider", "fieldContext": "resource"},
                            {"name": "cloud.provider"},
                        ],
                    },
                },
            ],
            "scalar",
            lambda response, traces: assert_grouped_scalar(response, "C", expected_groups=1, expected_columns=2, last_col_value=len(traces)),
            id="duplicate-group-by-deduplicated",
        ),
    ],
)
def test_trace_operator_with_adjusted_keys(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    payload_factory: Callable[[list[Traces]], list[dict[str, Any]]],
    request_type: str,
    assert_result: Callable[[requests.Response, list[Traces]], None],
) -> None:
    """
    Trace operators build a CTE per referenced builder query and an outer
    query on top. Both layers need the same key adjustment as regular trace
    queries, otherwise deprecated keys and context-prefixed aliases don't
    resolve.
    """
    traces = generate_traces_with_corrupt_metadata()
    insert_traces(traces)
    payload = payload_factory(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type=request_type,
        queries=payload,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert_result(response, traces)
