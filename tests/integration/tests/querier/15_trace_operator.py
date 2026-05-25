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

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def _rows(response: requests.Response) -> list:
    return response.json()["data"]["data"]["results"][0].get("rows") or []


def _names(response: requests.Response) -> set:
    return {r["data"]["name"] for r in _rows(response)}


def _run_case(signoz: types.SigNoz, token: str, start_ms: int, end_ms: int, case: dict) -> None:
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
    assert response.status_code == HTTPStatus.OK, f"[{case['name']}] HTTP {response.status_code}: {response.text}"
    assert case["validate"](response), f"[{case['name']}] validation failed: {response.json()}"


# ============================================================================
# Dataset — 4 traces shared across all order-by and expression cases
#
# Each trace uses a single shared operation.type vocabulary:
#   "root"    — root-level spans in T1 (two of them), T2, T3
#   "child"   — direct child of the service root in T1, T2
#   "leaf"    — grandchild (indirect descendant of the service root) in T1, T2
#   "orphan"  — T4's only span; no "root" ancestor in its trace
#
# T1  checkout-svc  api-proxy (3 s, no children) ─┐
#                                                   ├─ both op="root", same trace_id
#                   POST /checkout (5 s) → lookup-cart → check-inventory
#
# T2  catalog-svc   GET /catalog (1 s) → fetch-catalog → read-cache
# T3  standalone-svc  standalone-server  (root-only, no children)
# T4  isolated-svc    isolated-worker    (orphan, no root ancestor)
#
# T1 has TWO op="root" spans in the same trace: api-proxy (no children) and
# POST /checkout (parents the chain). This makes returnSpansFrom="" and
# returnSpansFrom="A" produce different results for A => B and A -> B:
#   default   → only the root spans that directly satisfy the predicate
#   return_A  → all root spans from traces where the predicate held
#
# How the traces satisfy each test case:
#
#   A -> B (indirect)  A=root  B=leaf   T1✓ T2✓  T3✗(no leaf)  T4✗
#   A => B (direct)    A=root  B=child  T1✓ T2✓  T3✗(no child) T4✗
#   A && B             A=root  B=child  T1✓ T2✓  T3✗           T4✗
#   A || B             A=root  B=orphan T1✓ T2✓  T3✓(via A)    T4✓(via B)
#   A NOT B            A=root  B=child  T1✗ T2✗  T3✓(A, no B)  T4✗
#
#   ob.indirect  A->B returnSpansFrom=A order http.method DESC
#                → 3 rows: POST /checkout(POST), GET /catalog(GET), api-proxy(no method)
#   ob.duration  A=>B returnSpansFrom=A order duration_nano DESC
#                → 3 rows: POST /checkout(5s), api-proxy(3s), GET /catalog(1s)
#   ob.select    A=>B returnSpansFrom=A order http.method DESC (in selectFields)
#                → 3 rows: POST(POST /checkout), GET(GET /catalog), ""(api-proxy)
# ============================================================================


def test_trace_operator(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    t1_trace_id = TraceIdGenerator.trace_id()
    t1_checkout_span_id = TraceIdGenerator.span_id()  # POST /checkout — parents the chain
    t1_child_span_id = TraceIdGenerator.span_id()      # lookup-cart

    t2_trace_id = TraceIdGenerator.trace_id()
    t2_root_span_id = TraceIdGenerator.span_id()
    t2_child_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            # T1 — checkout-svc, two op="root" spans in the same trace:
            #   api-proxy: a network proxy span with no children (3 s)
            #   POST /checkout: the actual service entry point that parents the chain (5 s)
            # This split is the key to distinguishing returnSpansFrom="" from "A":
            #   default   → only POST /checkout satisfies A => B or A -> B
            #   return_A  → api-proxy is included too (all root spans from the matching trace)
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=3),
                trace_id=t1_trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="api-proxy",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "checkout-svc"},
                attributes={"operation.type": "root"},
            ),
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
                attributes={"operation.type": "root", "http.method": "POST"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=2),
                trace_id=t1_trace_id,
                span_id=t1_child_span_id,
                parent_span_id=t1_checkout_span_id,
                name="lookup-cart",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "checkout-svc"},
                attributes={"operation.type": "child"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=t1_trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=t1_child_span_id,
                name="check-inventory",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "checkout-svc"},
                attributes={"operation.type": "leaf"},
            ),
            # T2 — catalog-svc: GET /catalog (1 s root) → fetch-catalog → read-cache
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
                attributes={"operation.type": "root", "http.method": "GET"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=2),
                trace_id=t2_trace_id,
                span_id=t2_child_span_id,
                parent_span_id=t2_root_span_id,
                name="fetch-catalog",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "catalog-svc"},
                attributes={"operation.type": "child"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=t2_trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=t2_child_span_id,
                name="read-cache",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "catalog-svc"},
                attributes={"operation.type": "leaf"},
            ),
            # T3 — standalone-svc: root-only, no children
            #   Fails A => B / A -> B / A && B (no child or leaf descendant).
            #   Matches A NOT B (has root, no child).
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
                attributes={"operation.type": "root", "http.method": "POST"},
            ),
            # T4 — isolated-svc: single orphan span with no "root" ancestor in its trace.
            #   Used only as the B side of A || B to prove the OR operator matches via B.
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name="isolated-worker",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "isolated-svc"},
                attributes={"operation.type": "orphan"},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    cases = [
        # ── Order-by: http.method DESC, NOT in selectFields ──────────────────────
        # Guards against NOT_FOUND_COLUMN_IN_BLOCK: ordering by a column absent from
        # the outer SELECT used to cause a ClickHouse query failure.
        # returnSpansFrom="A" returns all T1 root spans: POST /checkout (POST) and
        # api-proxy (no http.method), plus GET /catalog (GET) from T2.
        {
            "name": "ob.indirect.http_method_not_in_select",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'leaf'",
            "expression": "A -> B",
            "return_spans_from": "A",
            "select_fields": [{"name": "service.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "order": [{"key": {"name": "http.method", "fieldDataType": "string", "fieldContext": "attribute"}, "direction": "desc"}],
            "validate": lambda r: (
                len(_rows(r)) == 3
                and _rows(r)[0]["data"]["service.name"] == "checkout-svc"   # POST /checkout
                and _rows(r)[1]["data"]["service.name"] == "catalog-svc"    # GET /catalog
                and _rows(r)[2]["data"]["service.name"] == "checkout-svc"   # api-proxy (no http.method → last)
            ),
        },
        # ── Order-by: duration_nano DESC, core span field ─────────────────────────
        # returnSpansFrom="A" includes api-proxy (3 s) in T1's result.
        # Order: POST /checkout (5 s) > api-proxy (3 s) > GET /catalog (1 s).
        {
            "name": "ob.duration.duration_nano_desc",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'child'",
            "expression": "A => B",
            "return_spans_from": "A",
            "order": [{"key": {"name": "duration_nano", "fieldContext": "span"}, "direction": "desc"}],
            "validate": lambda r: (
                len(_rows(r)) == 3
                and _rows(r)[0]["data"]["name"] == "POST /checkout"
                and _rows(r)[1]["data"]["name"] == "api-proxy"
                and _rows(r)[2]["data"]["name"] == "GET /catalog"
            ),
        },
        # ── Order-by: http.method DESC, IS in selectFields ────────────────────────
        # http.method is selected so it appears in each result row.
        # api-proxy has no http.method attribute → empty string → sorts last.
        {
            "name": "ob.select.http_method_in_select",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'child'",
            "expression": "A => B",
            "return_spans_from": "A",
            "select_fields": [{"name": "http.method", "fieldDataType": "string", "fieldContext": "attribute"}],
            "order": [{"key": {"name": "http.method", "fieldDataType": "string", "fieldContext": "attribute"}, "direction": "desc"}],
            "validate": lambda r: (
                len(_rows(r)) == 3
                and _rows(r)[0]["data"]["http.method"] == "POST"
                and _rows(r)[1]["data"]["http.method"] == "GET"
                and _rows(r)[2]["data"]["http.method"] == ""
            ),
        },
        # ── A => B (direct child), returnSpansFrom="" ─────────────────────────────
        # Only POST /checkout directly parents lookup-cart; api-proxy has no children.
        # T3 does not match (root-only). Default returns only the satisfying A spans.
        {
            "name": "ex.direct_child.default",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'child'",
            "expression": "A => B",
            "return_spans_from": "",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog"},
        },
        # ── A => B (direct child), returnSpansFrom="A" ────────────────────────────
        # T1 matches; return_A pulls all T1 root spans → api-proxy is included too.
        {
            "name": "ex.direct_child.return_A",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'child'",
            "expression": "A => B",
            "return_spans_from": "A",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog", "api-proxy"},
        },
        # ── A -> B (indirect descendant), returnSpansFrom="" ──────────────────────
        # Only POST /checkout is an ancestor of check-inventory; api-proxy has no descendants.
        # T3 does not match (no leaf). Default returns only the satisfying A spans.
        {
            "name": "ex.indirect_descendant.default",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'leaf'",
            "expression": "A -> B",
            "return_spans_from": "",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog"},
        },
        # ── A -> B (indirect descendant), returnSpansFrom="A" ────────────────────
        # T1 matches; return_A pulls all T1 root spans → api-proxy is included too.
        {
            "name": "ex.indirect_descendant.return_A",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'leaf'",
            "expression": "A -> B",
            "return_spans_from": "A",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog", "api-proxy"},
        },
        # ── A && B (both present in same trace), returnSpansFrom="" ───────────────
        # T1 and T2 match (each trace has both root and child); T3 does not.
        # A && B returns all A spans from matching traces — api-proxy is included
        # because it shares T1's trace_id with POST /checkout.
        # (return_A produces the same set by definition; no separate case needed.)
        {
            "name": "ex.and.default",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'child'",
            "expression": "A && B",
            "return_spans_from": "",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog", "api-proxy"},
        },
        # ── A || B (either present), returnSpansFrom="" ───────────────────────────
        # T1, T2, T3 match via A; T4 matches via B.
        # Default returns UNION of all A and B spans from matching traces.
        {
            "name": "ex.or.default",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'orphan'",
            "expression": "A || B",
            "return_spans_from": "",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog", "api-proxy", "standalone-server", "isolated-worker"},
        },
        # ── A || B, returnSpansFrom="A" ───────────────────────────────────────────
        # All four traces match; only A spans are returned.
        # T4 has no root span, so it contributes nothing.
        {
            "name": "ex.or.return_A",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'orphan'",
            "expression": "A || B",
            "return_spans_from": "A",
            "validate": lambda r: _names(r) == {"POST /checkout", "GET /catalog", "api-proxy", "standalone-server"},
        },
        # ── A NOT B (A present, B absent from trace), returnSpansFrom="" ─────────
        # T1 and T2 do NOT match: their traces contain child spans.
        # T3 MATCHES: has root but no child in its trace.
        # T4 has no root, so it cannot contribute an A span.
        # (return_A produces the same set; no separate case needed.)
        {
            "name": "ex.not.default",
            "filter_a": "operation.type = 'root'",
            "filter_b": "operation.type = 'child'",
            "expression": "A NOT B",
            "return_spans_from": "",
            "validate": lambda r: _names(r) == {"standalone-server"},
        },
    ]

    for case in cases:
        _run_case(signoz, token, start_ms, end_ms, case)
