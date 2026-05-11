"""
Integration tests for TraceOperatorQuery (builder_trace_operator) through the
/api/v5/query_range endpoint.

Covers:
1. Basic trace operator (A => B) — returns matched spans from the correct trace.
2. Order by a field absent from selectFields — must not return a server error.
   Guards against the ClickHouse NOT_FOUND_COLUMN_IN_BLOCK regression where
   ordering by a column absent from an outer SELECT caused a query failure.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    OrderBy,
    TelemetryFieldKey,
    TraceOperatorQuery,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


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


def test_trace_operator_query_basic(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Insert one parent span and one child span in the same trace.

    Tests:
    A => B (parent has a direct child) returns the parent span (returnSpansFrom=A)
    from the correct trace.
    """
    parent_trace_id = TraceIdGenerator.trace_id()
    parent_span_id = TraceIdGenerator.span_id()
    child_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=parent_trace_id,
                span_id=parent_span_id,
                parent_span_id="",
                name="parent-op",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-a"},
                attributes={"operation.type": "parent"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=2),
                trace_id=parent_trace_id,
                span_id=child_span_id,
                parent_span_id=parent_span_id,
                name="child-op",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-a"},
                attributes={"operation.type": "child"},
            ),
        ]
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
            _builder_query("A", "operation.type = 'parent'"),
            _builder_query("B", "operation.type = 'child'"),
            TraceOperatorQuery(
                name="C",
                expression="A => B",
                return_spans_from="A",
                limit=100,
            ).to_dict(),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0].get("rows") or []
    assert len(rows) == 1
    assert rows[0]["data"]["trace_id"] == parent_trace_id
    assert rows[0]["data"]["name"] == "parent-op"


def test_trace_operator_query_order_by_field_not_in_select_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Two traces, each with a grandparent → middle → grandchild chain:
      Trace 1: grandparent (svc-a, http.method=POST) → middle → grandchild
      Trace 2: grandparent (svc-b, http.method=GET)  → middle → grandchild

    Tests:
    A -> B (indirect descendant) with selectFields=[service.name] and
    order=[http.method DESC], where http.method is NOT in selectFields.

    1. Query succeeds (no NOT_FOUND_COLUMN_IN_BLOCK error from ClickHouse).
    2. Results are actually ordered: POST sorts before GET descending, so
       svc-a must come before svc-b.
    """
    trace_id_1 = TraceIdGenerator.trace_id()
    trace_id_2 = TraceIdGenerator.trace_id()

    gp_span_id_1 = TraceIdGenerator.span_id()
    mid_span_id_1 = TraceIdGenerator.span_id()
    gc_span_id_1 = TraceIdGenerator.span_id()

    gp_span_id_2 = TraceIdGenerator.span_id()
    mid_span_id_2 = TraceIdGenerator.span_id()
    gc_span_id_2 = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            # Trace 1 — grandparent has http.method=POST (sorts first in DESC)
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=trace_id_1,
                span_id=gp_span_id_1,
                parent_span_id="",
                name="gp-op",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-a"},
                attributes={"operation.type": "grandparent", "http.method": "POST"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=3),
                trace_id=trace_id_1,
                span_id=mid_span_id_1,
                parent_span_id=gp_span_id_1,
                name="mid-op",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-a"},
                attributes={"operation.type": "middle"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=trace_id_1,
                span_id=gc_span_id_1,
                parent_span_id=mid_span_id_1,
                name="gc-op",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-a"},
                attributes={"operation.type": "grandchild"},
            ),
            # Trace 2 — grandparent has http.method=GET (sorts second in DESC)
            Traces(
                timestamp=now - timedelta(seconds=7),
                duration=timedelta(seconds=5),
                trace_id=trace_id_2,
                span_id=gp_span_id_2,
                parent_span_id="",
                name="gp-op",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-b"},
                attributes={"operation.type": "grandparent", "http.method": "GET"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=6),
                duration=timedelta(seconds=3),
                trace_id=trace_id_2,
                span_id=mid_span_id_2,
                parent_span_id=gp_span_id_2,
                name="mid-op",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-b"},
                attributes={"operation.type": "middle"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=1),
                trace_id=trace_id_2,
                span_id=gc_span_id_2,
                parent_span_id=mid_span_id_2,
                name="gc-op",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-b"},
                attributes={"operation.type": "grandchild"},
            ),
        ]
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
            _builder_query("A", "operation.type = 'grandparent'"),
            _builder_query("B", "operation.type = 'grandchild'"),
            TraceOperatorQuery(
                name="C",
                expression="A -> B",  # indirect descendant
                return_spans_from="A",
                limit=100,
                select_fields=[
                    TelemetryFieldKey(name="service.name", field_data_type="string", field_context="resource"),
                ],
                order=[
                    # http.method is intentionally absent from select_fields
                    OrderBy(
                        key=TelemetryFieldKey(name="http.method", field_data_type="string", field_context="tag"),
                        direction="desc",
                    ),
                ],
            ).to_dict(),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0].get("rows") or []

    # Both grandparent spans must be returned
    assert len(rows) == 2

    # Ordering: POST > GET in DESC — svc-a (POST) must come before svc-b (GET)
    assert rows[0]["data"]["service.name"] == "svc-a", f"Expected svc-a (POST) first in http.method DESC order, got {rows[0]['data']['service.name']}"
    assert rows[1]["data"]["service.name"] == "svc-b", f"Expected svc-b (GET) second in http.method DESC order, got {rows[1]['data']['service.name']}"


def test_trace_operator_query_order_by_select_field(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Guards against the CH 25.12.5 NOT_FOUND_COLUMN_IN_BLOCK regression
    for ORDER BY col AS `col` on a column that IS included in the SELECT result.

    The original fix only handled timestamp. The bug fires for any
    column using the alias-in-ORDER-BY pattern — including core fields like
    duration_nano. Previously, ColumnExpressionFor produced `duration_nano AS
    `duration_nano`` and that expression was used verbatim in ORDER BY, triggering
    the column-rename to duration_nano_0 inside a CTE against a Distributed table.

    Setup:
    Two traces each with a parent → child pair; the parents have distinct durations
    (5 s and 1 s).

    Tests:
    A => B with order=[duration_nano DESC] and no explicit selectFields.
    1. Query succeeds (no NOT_FOUND_COLUMN_IN_BLOCK error).
    2. Longer-duration parent (5 s) appears before the shorter one (1 s).
    """
    trace_id_1 = TraceIdGenerator.trace_id()
    trace_id_2 = TraceIdGenerator.trace_id()
    parent_span_id_1 = TraceIdGenerator.span_id()
    child_span_id_1 = TraceIdGenerator.span_id()
    parent_span_id_2 = TraceIdGenerator.span_id()
    child_span_id_2 = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=trace_id_1,
                span_id=parent_span_id_1,
                parent_span_id="",
                name="parent-long",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-long"},
                attributes={"operation.type": "parent"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=1),
                trace_id=trace_id_1,
                span_id=child_span_id_1,
                parent_span_id=parent_span_id_1,
                name="child-long",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-long"},
                attributes={"operation.type": "child"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=1),
                trace_id=trace_id_2,
                span_id=parent_span_id_2,
                parent_span_id="",
                name="parent-short",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-short"},
                attributes={"operation.type": "parent"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=7),
                duration=timedelta(seconds=1),
                trace_id=trace_id_2,
                span_id=child_span_id_2,
                parent_span_id=parent_span_id_2,
                name="child-short",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-short"},
                attributes={"operation.type": "child"},
            ),
        ]
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
            _builder_query("A", "operation.type = 'parent'"),
            _builder_query("B", "operation.type = 'child'"),
            TraceOperatorQuery(
                name="C",
                expression="A => B",
                return_spans_from="A",
                limit=100,
                order=[
                    OrderBy(
                        key=TelemetryFieldKey(name="duration_nano", field_context="span"),
                        direction="desc",
                    ),
                ],
            ).to_dict(),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0].get("rows") or []

    assert len(rows) == 2
    # DESC: 5 s parent first, 1 s parent second
    assert rows[0]["data"]["name"] == "parent-long", f"Expected parent-long (5s) first in duration_nano DESC, got {rows[0]['data']['name']}"
    assert rows[1]["data"]["name"] == "parent-short", f"Expected parent-short (1s) second in duration_nano DESC, got {rows[1]['data']['name']}"


def test_trace_operator_query_order_by_non_core_field_in_select(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Variant of the Q4-analog where the ORDER BY column is a non-core attribute
    field that IS also in selectFields.

    Previously, ColumnExpressionFor produced `attributes_string['http.method'] AS
    `http.method`` for every custom field, and that expression was used verbatim
    in ORDER BY — generating ORDER BY attributes_string['http.method'] AS
    `http.method` DESC, which triggers the CH 25.12.5 column-rename regression
    inside a CTE against a Distributed table.

    Setup:
    Two traces each with a parent → child pair; parents have distinct http.method
    values (POST and GET).

    Tests:
    A => B with selectFields=[http.method] and order=[http.method DESC].
    1. Query succeeds (no NOT_FOUND_COLUMN_IN_BLOCK error).
    2. http.method is present in every result row (it is in selectFields).
    3. Results are ordered DESC — POST before GET.
    """
    trace_id_1 = TraceIdGenerator.trace_id()
    trace_id_2 = TraceIdGenerator.trace_id()
    parent_span_id_1 = TraceIdGenerator.span_id()
    child_span_id_1 = TraceIdGenerator.span_id()
    parent_span_id_2 = TraceIdGenerator.span_id()
    child_span_id_2 = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=3),
                trace_id=trace_id_1,
                span_id=parent_span_id_1,
                parent_span_id="",
                name="parent-post",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-post"},
                attributes={"operation.type": "parent", "http.method": "POST"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=1),
                trace_id=trace_id_1,
                span_id=child_span_id_1,
                parent_span_id=parent_span_id_1,
                name="child-post",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-post"},
                attributes={"operation.type": "child"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=8),
                duration=timedelta(seconds=3),
                trace_id=trace_id_2,
                span_id=parent_span_id_2,
                parent_span_id="",
                name="parent-get",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-get"},
                attributes={"operation.type": "parent", "http.method": "GET"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=7),
                duration=timedelta(seconds=1),
                trace_id=trace_id_2,
                span_id=child_span_id_2,
                parent_span_id=parent_span_id_2,
                name="child-get",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "svc-get"},
                attributes={"operation.type": "child"},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    http_method_field = TelemetryFieldKey(
        name="http.method",
        field_data_type="string",
        field_context="tag",
    )

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type="raw",
        queries=[
            _builder_query("A", "operation.type = 'parent'"),
            _builder_query("B", "operation.type = 'child'"),
            TraceOperatorQuery(
                name="C",
                expression="A => B",
                return_spans_from="A",
                limit=100,
                select_fields=[http_method_field],
                order=[OrderBy(key=http_method_field, direction="desc")],
            ).to_dict(),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0].get("rows") or []

    assert len(rows) == 2
    # http.method must be present in every row (it is in selectFields)
    for row in rows:
        assert "http.method" in row["data"], f"http.method missing from row: {row['data']}"
    # DESC: POST before GET
    assert rows[0]["data"]["http.method"] == "POST", f"Expected POST first in http.method DESC, got {rows[0]['data']['http.method']}"
    assert rows[1]["data"]["http.method"] == "GET", f"Expected GET second in http.method DESC, got {rows[1]['data']['http.method']}"
