"""
Integration tests for TraceOperatorQuery (builder_trace_operator) through the
/api/v5/query_range endpoint.

Covers:
1. Order-by variants for trace operator (A -> B, A => B) with returnSpansFrom="A".
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

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import OrderBy, TelemetryFieldKey, TraceOperatorQuery, make_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _chain_trace(now: datetime, *spans: tuple) -> list[Traces]:
    """
    Build a single trace as a linear chain.
    Each span tuple is (name, service, op_type, duration_s[, extra_attrs]).
    The first span is the root; each subsequent span is a child of the previous.
    """
    trace_id = TraceIdGenerator.trace_id()
    ids = [TraceIdGenerator.span_id() for _ in spans]
    result = []
    for i, s in enumerate(spans):
        name, service, op_type, duration_s = s[0], s[1], s[2], s[3]
        extra = s[4] if len(s) > 4 else {}
        result.append(
            Traces(
                timestamp=now - timedelta(seconds=10 - i),
                duration=timedelta(seconds=duration_s),
                trace_id=trace_id,
                span_id=ids[i],
                parent_span_id="" if i == 0 else ids[i - 1],
                name=name,
                kind=TracesKind.SPAN_KIND_SERVER if i == 0 else TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": service},
                attributes={"operation.type": op_type, **extra},
            )
        )
    return result


def _builder_query(name: str, filter_expr: str, limit: int = 100) -> dict:
    return {
        "type": "builder_query",
        "spec": {
            "name": name,
            "signal": "traces",
            "filter": {"expression": filter_expr},
            "limit": limit,
        },
    }


# ---------------------------------------------------------------------------
# Order-by test
# ---------------------------------------------------------------------------


def test_trace_operator_query_order_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Verifies order-by behaviour for three sub-cases, all inserted once:

    field_not_in_select
        Order by an attribute absent from selectFields.
        Guards against the NOT_FOUND_COLUMN_IN_BLOCK ClickHouse regression.

    core_span_field
        Order by duration_nano with no explicit selectFields.

    non_core_field_in_select
        Order by an attribute that IS in selectFields.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            # field_not_in_select — two 3-level chains; differ only by http.method
            *_chain_trace(
                now,
                ("fnis-gp", "svc-a", "fnis-grandparent", 5, {"http.method": "POST"}),
                ("fnis-mid", "svc-a", "fnis-middle", 3),
                ("fnis-gc", "svc-a", "fnis-grandchild", 1),
            ),
            *_chain_trace(
                now,
                ("fnis-gp", "svc-b", "fnis-grandparent", 5, {"http.method": "GET"}),
                ("fnis-mid", "svc-b", "fnis-middle", 3),
                ("fnis-gc", "svc-b", "fnis-grandchild", 1),
            ),
            # core_span_field — two parent→child chains; differ by duration
            *_chain_trace(now, ("csf-parent-long", "svc-long", "csf-parent", 5), ("csf-child-long", "svc-long", "csf-child", 1)),
            *_chain_trace(now, ("csf-parent-short", "svc-short", "csf-parent", 1), ("csf-child-short", "svc-short", "csf-child", 1)),
            # non_core_field_in_select — two parent→child chains; differ by http.method
            *_chain_trace(now, ("ncis-parent-post", "svc-post", "ncis-parent", 3, {"http.method": "POST"}), ("ncis-child-post", "svc-post", "ncis-child", 1)),
            *_chain_trace(now, ("ncis-parent-get", "svc-get", "ncis-parent", 3, {"http.method": "GET"}), ("ncis-child-get", "svc-get", "ncis-child", 1)),
            # noise
            *_chain_trace(now, ("noise-span", "svc-noise", "noise-op", 1)),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    def check_order(case_id, filter_a, filter_b, expression, select_fields, order, expected_rows):
        resp = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="raw",
            queries=[
                _builder_query("A", filter_a),
                _builder_query("B", filter_b),
                TraceOperatorQuery(name="C", expression=expression, return_spans_from="A", limit=100, select_fields=select_fields, order=order).to_dict(),
            ],
        )
        assert resp.status_code == HTTPStatus.OK, f"[{case_id}] {resp.text}"
        assert resp.json()["status"] == "success"
        rows = resp.json()["data"]["data"]["results"][0].get("rows") or []
        assert len(rows) == len(expected_rows), f"[{case_id}] expected {len(expected_rows)} rows, got {len(rows)}"
        for i, (row, expected) in enumerate(zip(rows, expected_rows)):
            for key, value in expected.items():
                assert row["data"].get(key) == value, f"[{case_id}] row {i}: {key}={value!r} expected, got {row['data'].get(key)!r}"

    # POST > GET in DESC; order key is absent from selectFields
    check_order(
        "field_not_in_select",
        "operation.type = 'fnis-grandparent'",
        "operation.type = 'fnis-grandchild'",
        "A -> B",
        [TelemetryFieldKey(name="service.name", field_data_type="string", field_context="resource")],
        [OrderBy(key=TelemetryFieldKey(name="http.method", field_data_type="string", field_context="attribute"), direction="desc")],
        [{"service.name": "svc-a"}, {"service.name": "svc-b"}],
    )

    # 5 s parent before 1 s parent in DESC
    check_order(
        "core_span_field",
        "operation.type = 'csf-parent'",
        "operation.type = 'csf-child'",
        "A => B",
        None,
        [OrderBy(key=TelemetryFieldKey(name="duration_nano", field_context="span"), direction="desc")],
        [{"name": "csf-parent-long"}, {"name": "csf-parent-short"}],
    )

    # POST > GET in DESC; order key is in selectFields so it appears in each row
    check_order(
        "non_core_field_in_select",
        "operation.type = 'ncis-parent'",
        "operation.type = 'ncis-child'",
        "A => B",
        [TelemetryFieldKey(name="http.method", field_data_type="string", field_context="attribute")],
        [OrderBy(key=TelemetryFieldKey(name="http.method", field_data_type="string", field_context="attribute"), direction="desc")],
        [{"http.method": "POST"}, {"http.method": "GET"}],
    )


# ---------------------------------------------------------------------------
# Expression × returnSpansFrom test
# ---------------------------------------------------------------------------


def test_trace_operator_expressions(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Covers all five operators × two returnSpansFrom settings in a single pass.

    All test spans are inserted once; each operator uses a unique op_type prefix
    so queries never interfere with each other.

    For each operator:
      default (returnSpansFrom="")  — only spans satisfying the structural predicate
      return_A (returnSpansFrom="A") — A spans from traces where the predicate held

    Unary NOT A is skipped: its root CTE reads from all_spans (unbounded by any
    filter), making row counts non-deterministic across a shared ClickHouse session.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            # A => B: trace 1 matches (dc-root directly parents dc-leaf); trace 2 does not
            *_chain_trace(now, ("dc-root", "svc-dc-a", "dc-root", 5), ("dc-leaf", "svc-dc-a", "dc-leaf", 2)),
            *_chain_trace(now, ("dc-root-only", "svc-dc-b", "dc-root", 2)),
            # A -> B: trace 1 matches (id-gp is an indirect ancestor of id-gc); trace 2 does not
            *_chain_trace(
                now,
                ("id-gp", "svc-id-a", "id-gp", 5),
                ("id-mid", "svc-id-a", "id-mid", 3),
                ("id-gc", "svc-id-a", "id-gc", 1),
            ),
            *_chain_trace(now, ("id-gp-only", "svc-id-b", "id-gp", 2)),
            # A && B: trace 1 matches (contains both A and B); trace 2 does not (no B)
            *_chain_trace(now, ("and-root", "svc-and-a", "and-root", 5), ("and-leaf", "svc-and-a", "and-leaf", 2)),
            *_chain_trace(now, ("and-root-only", "svc-and-b", "and-root", 2)),
            # A || B: trace 1 has A only, trace 2 has B only (both match A || B)
            *_chain_trace(now, ("or-a-span", "svc-or-a", "or-a", 5)),
            *_chain_trace(now, ("or-b-span", "svc-or-b", "or-b", 2)),
            # A NOT B: trace 1 has A + B child (does NOT match); trace 2 has A only (matches)
            *_chain_trace(now, ("not-root-with-child", "svc-not-a", "not-root", 5), ("not-child", "svc-not-a", "not-child", 2)),
            *_chain_trace(now, ("not-root-no-child", "svc-not-b", "not-root", 2)),
            # noise — must not surface in any query below
            *_chain_trace(now, ("noise-span", "svc-noise", "noise-op", 1)),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    def check(case_id, filter_a, filter_b, expression, return_spans_from, expected_names):
        resp = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="raw",
            queries=[
                _builder_query("A", filter_a),
                _builder_query("B", filter_b),
                TraceOperatorQuery(name="C", expression=expression, return_spans_from=return_spans_from, limit=100).to_dict(),
            ],
        )
        assert resp.status_code == HTTPStatus.OK, f"[{case_id}] {resp.text}"
        rows = resp.json()["data"]["data"]["results"][0].get("rows") or []
        actual = {r["data"]["name"] for r in rows}
        assert actual == expected_names, f"[{case_id}] expected {expected_names!r}, got {actual!r}"

    # ── A => B (direct child) ────────────────────────────────────────────────
    check("direct_child_default", "operation.type = 'dc-root'", "operation.type = 'dc-leaf'", "A => B", "", {"dc-root"})
    check("direct_child_return_A", "operation.type = 'dc-root'", "operation.type = 'dc-leaf'", "A => B", "A", {"dc-root"})

    # ── A -> B (indirect descendant) ─────────────────────────────────────────
    check("indirect_descendant_default", "operation.type = 'id-gp'", "operation.type = 'id-gc'", "A -> B", "", {"id-gp"})
    check("indirect_descendant_return_A", "operation.type = 'id-gp'", "operation.type = 'id-gc'", "A -> B", "A", {"id-gp"})

    # ── A && B ────────────────────────────────────────────────────────────────
    check("and_default", "operation.type = 'and-root'", "operation.type = 'and-leaf'", "A && B", "", {"and-root"})
    check("and_return_A", "operation.type = 'and-root'", "operation.type = 'and-leaf'", "A && B", "A", {"and-root"})

    # ── A || B ────────────────────────────────────────────────────────────────
    # default returns UNION of A and B; return_A returns only A spans from matching traces
    check("or_default", "operation.type = 'or-a'", "operation.type = 'or-b'", "A || B", "", {"or-a-span", "or-b-span"})
    check("or_return_A", "operation.type = 'or-a'", "operation.type = 'or-b'", "A || B", "A", {"or-a-span"})

    # ── A NOT B (binary not) ──────────────────────────────────────────────────
    check("not_binary_default", "operation.type = 'not-root'", "operation.type = 'not-child'", "A NOT B", "", {"not-root-no-child"})
    check("not_binary_return_A", "operation.type = 'not-root'", "operation.type = 'not-child'", "A NOT B", "A", {"not-root-no-child"})
