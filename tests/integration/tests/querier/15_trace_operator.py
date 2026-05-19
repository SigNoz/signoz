"""
Integration tests for TraceOperatorQuery (builder_trace_operator) through the
/api/v5/query_range endpoint.

Covers:
1. Basic trace operator (A => B) — returns matched spans from the correct trace.
2. Order by a field absent from selectFields — must not return a server error.
   Guards against the ClickHouse NOT_FOUND_COLUMN_IN_BLOCK regression where
   ordering by a column absent from an outer SELECT caused a query failure.
3. Expression operators (=>, ->, &&, ||, A NOT B) with and without returnSpansFrom.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    OrderBy,
    TelemetryFieldKey,
    TraceOperatorQuery,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

@dataclass
class _SpanDef:
    """Span spec relative to 'now'. parent_idx=-1 for root spans."""

    name: str
    service: str
    op_type: str
    duration_s: int
    time_offset_s: int
    parent_idx: int = -1
    extra_attrs: dict = field(default_factory=dict)


def _build_trace(now: datetime, trace_id: str, spans: list[_SpanDef]) -> list[Traces]:
    span_ids = [TraceIdGenerator.span_id() for _ in spans]
    result = []
    for defn, span_id in zip(spans, span_ids):
        parent_id = "" if defn.parent_idx < 0 else span_ids[defn.parent_idx]
        kind = TracesKind.SPAN_KIND_SERVER if defn.parent_idx < 0 else TracesKind.SPAN_KIND_INTERNAL
        result.append(
            Traces(
                timestamp=now - timedelta(seconds=defn.time_offset_s),
                duration=timedelta(seconds=defn.duration_s),
                trace_id=trace_id,
                span_id=span_id,
                parent_span_id=parent_id,
                name=defn.name,
                kind=kind,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": defn.service},
                attributes={"operation.type": defn.op_type, **defn.extra_attrs},
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
# Order-by variants
# ---------------------------------------------------------------------------
# Each case uses a unique op_type prefix so spans inserted by earlier
# parametrize runs (shared DB session) are never picked up by later ones.


@dataclass
class _OrderByCase:
    id: str
    trace1_spans: list[_SpanDef]
    trace2_spans: list[_SpanDef]
    filter_a: str
    filter_b: str
    expression: str
    select_fields: list[TelemetryFieldKey] | None
    order: list[OrderBy]
    expected_rows: list[dict]  # ordered; each dict is a partial match against row data


_ORDER_BY_CASES: list[_OrderByCase] = [
    # Order by attribute absent from selectFields — NOT_FOUND_COLUMN_IN_BLOCK regression guard.
    _OrderByCase(
        id="field_not_in_select",
        trace1_spans=[
            _SpanDef("fnis-gp", "svc-a", "fnis-grandparent", 5, 10, extra_attrs={"http.method": "POST"}),
            _SpanDef("fnis-mid", "svc-a", "fnis-middle", 3, 9, parent_idx=0),
            _SpanDef("fnis-gc", "svc-a", "fnis-grandchild", 1, 8, parent_idx=1),
        ],
        trace2_spans=[
            _SpanDef("fnis-gp", "svc-b", "fnis-grandparent", 5, 7, extra_attrs={"http.method": "GET"}),
            _SpanDef("fnis-mid", "svc-b", "fnis-middle", 3, 6, parent_idx=0),
            _SpanDef("fnis-gc", "svc-b", "fnis-grandchild", 1, 5, parent_idx=1),
        ],
        filter_a="operation.type = 'fnis-grandparent'",
        filter_b="operation.type = 'fnis-grandchild'",
        expression="A -> B",
        select_fields=[TelemetryFieldKey(name="service.name", field_data_type="string", field_context="resource")],
        order=[OrderBy(
            key=TelemetryFieldKey(name="http.method", field_data_type="string", field_context="attribute"),
            direction="desc",
        )],
        # POST > GET in DESC → svc-a first
        expected_rows=[{"service.name": "svc-a"}, {"service.name": "svc-b"}],
    ),
    # Order by a core span field (duration_nano) with no explicit selectFields.
    _OrderByCase(
        id="core_span_field",
        trace1_spans=[
            _SpanDef("csf-parent-long", "svc-long", "csf-parent", 5, 10),
            _SpanDef("csf-child-long", "svc-long", "csf-child", 1, 9, parent_idx=0),
        ],
        trace2_spans=[
            _SpanDef("csf-parent-short", "svc-short", "csf-parent", 1, 8),
            _SpanDef("csf-child-short", "svc-short", "csf-child", 1, 7, parent_idx=0),
        ],
        filter_a="operation.type = 'csf-parent'",
        filter_b="operation.type = 'csf-child'",
        expression="A => B",
        select_fields=None,
        order=[OrderBy(key=TelemetryFieldKey(name="duration_nano", field_context="span"), direction="desc")],
        # 5 s parent first, 1 s parent second
        expected_rows=[{"name": "csf-parent-long"}, {"name": "csf-parent-short"}],
    ),
    # Order by a non-core attribute that IS in selectFields — checks ordering and field presence.
    _OrderByCase(
        id="non_core_field_in_select",
        trace1_spans=[
            _SpanDef("ncis-parent-post", "svc-post", "ncis-parent", 3, 10, extra_attrs={"http.method": "POST"}),
            _SpanDef("ncis-child-post", "svc-post", "ncis-child", 1, 9, parent_idx=0),
        ],
        trace2_spans=[
            _SpanDef("ncis-parent-get", "svc-get", "ncis-parent", 3, 8, extra_attrs={"http.method": "GET"}),
            _SpanDef("ncis-child-get", "svc-get", "ncis-child", 1, 7, parent_idx=0),
        ],
        filter_a="operation.type = 'ncis-parent'",
        filter_b="operation.type = 'ncis-child'",
        expression="A => B",
        select_fields=[TelemetryFieldKey(name="http.method", field_data_type="string", field_context="attribute")],
        order=[OrderBy(
            key=TelemetryFieldKey(name="http.method", field_data_type="string", field_context="attribute"),
            direction="desc",
        )],
        # POST > GET in DESC; http.method must appear in both rows (it is in selectFields)
        expected_rows=[{"http.method": "POST"}, {"http.method": "GET"}],
    ),
]


@pytest.mark.parametrize("case", [pytest.param(c, id=c.id) for c in _ORDER_BY_CASES])
def test_trace_operator_query_order_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    case: _OrderByCase,
) -> None:
    """
    Verifies that trace operator queries honour the order-by clause.

    Cases:
    - field_not_in_select: order by attribute absent from selectFields
      (NOT_FOUND_COLUMN_IN_BLOCK regression guard).
    - core_span_field: order by duration_nano with no explicit selectFields.
    - non_core_field_in_select: order by attribute present in selectFields.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    trace_id_1 = TraceIdGenerator.trace_id()
    trace_id_2 = TraceIdGenerator.trace_id()

    insert_traces(
        _build_trace(now, trace_id_1, case.trace1_spans)
        + _build_trace(now, trace_id_2, case.trace2_spans)
        + _build_trace(now, TraceIdGenerator.trace_id(), [_SpanDef("noise-span", "svc-noise", "noise-op", 1, 2)])
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type="raw",
        queries=[
            _builder_query("A", case.filter_a),
            _builder_query("B", case.filter_b),
            TraceOperatorQuery(
                name="C",
                expression=case.expression,
                return_spans_from="A",
                limit=100,
                select_fields=case.select_fields,
                order=case.order,
            ).to_dict(),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0].get("rows") or []
    assert len(rows) == len(case.expected_rows)

    for i, (row, expected) in enumerate(zip(rows, case.expected_rows)):
        for key, value in expected.items():
            assert row["data"].get(key) == value, (
                f"[{case.id}] row {i}: expected {key}={value!r}, got {row['data'].get(key)!r}"
            )


# ---------------------------------------------------------------------------
# Operator × returnSpansFrom matrix
# ---------------------------------------------------------------------------
# Each case uses a unique op_type prefix so DB rows from earlier parametrize
# runs never contaminate later ones (the session-level ClickHouse is shared).
#
# Operators tested: => -> && || (A NOT B)
# For each operator two cases:
#   "default"  — returnSpansFrom="" → result comes from the expression's root CTE
#   "return_A" — returnSpansFrom="A" → result comes from the A sub-query CTE
#
# Root-CTE semantics:
#   =>        A spans that have a DIRECT child matching B
#   ->        A spans that are ancestors of any B span
#   &&        A spans from traces that also contain a B span
#   ||        UNION of A spans and B spans
#   A NOT B   A spans from traces that contain no B span


@dataclass
class _ExprCase:
    id: str
    traces: list[list[_SpanDef]]  # one inner list per trace
    filter_a: str
    filter_b: str
    expression: str
    return_spans_from: str          # "" → use expression root CTE
    expected_names: set[str]        # span.name values that must appear (exact set)


_EXPR_CASES: list[_ExprCase] = [
    # ── A => B (direct child) ────────────────────────────────────────────────
    # "default": root CTE = A spans that have a direct B child
    _ExprCase(
        id="direct_child_default",
        traces=[
            [
                _SpanDef("dcd-root", "svc-dcd-a", "dcd-root", 5, 10),
                _SpanDef("dcd-leaf", "svc-dcd-a", "dcd-leaf", 2, 9, parent_idx=0),
            ],
            [_SpanDef("dcd-root-only", "svc-dcd-b", "dcd-root", 2, 7)],  # A but no B child
        ],
        filter_a="operation.type = 'dcd-root'",
        filter_b="operation.type = 'dcd-leaf'",
        expression="A => B",
        return_spans_from="",
        expected_names={"dcd-root"},  # only the root that HAS a direct child
    ),
    # "return_A": returns ALL A spans, bypassing the expression filter
    _ExprCase(
        id="direct_child_return_A",
        traces=[
            [
                _SpanDef("dca-root", "svc-dca-a", "dca-root", 5, 10),
                _SpanDef("dca-leaf", "svc-dca-a", "dca-leaf", 2, 9, parent_idx=0),
            ],
            [_SpanDef("dca-root-only", "svc-dca-b", "dca-root", 2, 7)],
        ],
        filter_a="operation.type = 'dca-root'",
        filter_b="operation.type = 'dca-leaf'",
        expression="A => B",
        return_spans_from="A",
        expected_names={"dca-root", "dca-root-only"},
    ),
    # ── A -> B (indirect descendant) ─────────────────────────────────────────
    _ExprCase(
        id="indirect_descendant_default",
        traces=[
            [
                _SpanDef("idd-gp", "svc-idd-a", "idd-gp", 5, 10),
                _SpanDef("idd-mid", "svc-idd-a", "idd-mid", 3, 9, parent_idx=0),
                _SpanDef("idd-gc", "svc-idd-a", "idd-gc", 1, 8, parent_idx=1),
            ],
            [_SpanDef("idd-gp-only", "svc-idd-b", "idd-gp", 2, 7)],  # A but no B descendant
        ],
        filter_a="operation.type = 'idd-gp'",
        filter_b="operation.type = 'idd-gc'",
        expression="A -> B",
        return_spans_from="",
        expected_names={"idd-gp"},
    ),
    _ExprCase(
        id="indirect_descendant_return_A",
        traces=[
            [
                _SpanDef("ida-gp", "svc-ida-a", "ida-gp", 5, 10),
                _SpanDef("ida-mid", "svc-ida-a", "ida-mid", 3, 9, parent_idx=0),
                _SpanDef("ida-gc", "svc-ida-a", "ida-gc", 1, 8, parent_idx=1),
            ],
            [_SpanDef("ida-gp-only", "svc-ida-b", "ida-gp", 2, 7)],
        ],
        filter_a="operation.type = 'ida-gp'",
        filter_b="operation.type = 'ida-gc'",
        expression="A -> B",
        return_spans_from="A",
        expected_names={"ida-gp", "ida-gp-only"},
    ),
    # ── A && B ────────────────────────────────────────────────────────────────
    _ExprCase(
        id="and_default",
        traces=[
            [
                _SpanDef("and-root", "svc-and-a", "and-root", 5, 10),
                _SpanDef("and-leaf", "svc-and-a", "and-leaf", 2, 9, parent_idx=0),
            ],
            [_SpanDef("and-root-only", "svc-and-b", "and-root", 2, 7)],  # A but no B in trace
        ],
        filter_a="operation.type = 'and-root'",
        filter_b="operation.type = 'and-leaf'",
        expression="A && B",
        return_spans_from="",
        expected_names={"and-root"},  # A from traces that also contain B
    ),
    _ExprCase(
        id="and_return_A",
        traces=[
            [
                _SpanDef("ana-root", "svc-ana-a", "ana-root", 5, 10),
                _SpanDef("ana-leaf", "svc-ana-a", "ana-leaf", 2, 9, parent_idx=0),
            ],
            [_SpanDef("ana-root-only", "svc-ana-b", "ana-root", 2, 7)],
        ],
        filter_a="operation.type = 'ana-root'",
        filter_b="operation.type = 'ana-leaf'",
        expression="A && B",
        return_spans_from="A",
        expected_names={"ana-root", "ana-root-only"},
    ),
    # ── A || B ────────────────────────────────────────────────────────────────
    _ExprCase(
        id="or_default",
        traces=[
            [_SpanDef("ord-a-span", "svc-ord-a", "ord-a", 5, 10)],
            [_SpanDef("ord-b-span", "svc-ord-b", "ord-b", 2, 7)],
        ],
        filter_a="operation.type = 'ord-a'",
        filter_b="operation.type = 'ord-b'",
        expression="A || B",
        return_spans_from="",
        expected_names={"ord-a-span", "ord-b-span"},  # UNION of both A and B
    ),
    _ExprCase(
        id="or_return_A",
        traces=[
            [_SpanDef("ora-a-span", "svc-ora-a", "ora-a", 5, 10)],
            [_SpanDef("ora-b-span", "svc-ora-b", "ora-b", 2, 7)],
        ],
        filter_a="operation.type = 'ora-a'",
        filter_b="operation.type = 'ora-b'",
        expression="A || B",
        return_spans_from="A",
        expected_names={"ora-a-span"},
    ),
    # ── A NOT B (binary not) ──────────────────────────────────────────────────
    # Unary NOT A is skipped: its root CTE reads from all_spans (unbounded by
    # filter), making row counts non-deterministic across a shared test session.
    _ExprCase(
        id="not_binary_default",
        traces=[
            [
                _SpanDef("nbd-root-with-child", "svc-nbd-a", "nbd-root", 5, 10),
                _SpanDef("nbd-child", "svc-nbd-a", "nbd-child", 2, 9, parent_idx=0),
            ],
            [_SpanDef("nbd-root-no-child", "svc-nbd-b", "nbd-root", 2, 7)],  # A, no B
        ],
        filter_a="operation.type = 'nbd-root'",
        filter_b="operation.type = 'nbd-child'",
        expression="A NOT B",
        return_spans_from="",
        expected_names={"nbd-root-no-child"},  # A from traces that have no B
    ),
    _ExprCase(
        id="not_binary_return_A",
        traces=[
            [
                _SpanDef("nba-root-with-child", "svc-nba-a", "nba-root", 5, 10),
                _SpanDef("nba-child", "svc-nba-a", "nba-child", 2, 9, parent_idx=0),
            ],
            [_SpanDef("nba-root-no-child", "svc-nba-b", "nba-root", 2, 7)],
        ],
        filter_a="operation.type = 'nba-root'",
        filter_b="operation.type = 'nba-child'",
        expression="A NOT B",
        return_spans_from="A",
        expected_names={"nba-root-with-child", "nba-root-no-child"},  # ALL A spans
    ),
]


@pytest.mark.parametrize("case", [pytest.param(c, id=c.id) for c in _EXPR_CASES])
def test_trace_operator_expressions(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    case: _ExprCase,
) -> None:
    """
    Matrix of expression operators × returnSpansFrom settings.

    For each operator (=>, ->, &&, ||, A NOT B) two cases verify:
    - default (returnSpansFrom=""): result comes from the expression's root CTE,
      so only spans satisfying the full structural predicate are returned.
    - return_A (returnSpansFrom="A"): result comes from the raw A sub-query CTE,
      bypassing the structural filter, returning ALL spans matching filter A.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    all_spans: list[Traces] = []
    for span_defs in case.traces:
        all_spans.extend(_build_trace(now, TraceIdGenerator.trace_id(), span_defs))
    # Noise: op_type "noise-op" matches no filter in any case; surfacing it would
    # mean a filter regression, which the set-equality assertion below would catch.
    all_spans.extend(_build_trace(now, TraceIdGenerator.trace_id(), [_SpanDef("noise-span", "svc-noise", "noise-op", 1, 2)]))
    insert_traces(all_spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type="raw",
        queries=[
            _builder_query("A", case.filter_a),
            _builder_query("B", case.filter_b),
            TraceOperatorQuery(
                name="C",
                expression=case.expression,
                return_spans_from=case.return_spans_from,
                limit=100,
            ).to_dict(),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0].get("rows") or []

    actual_names = {row["data"]["name"] for row in rows}
    assert actual_names == case.expected_names, (
        f"[{case.id}] expected spans {case.expected_names}, got {actual_names}"
    )
