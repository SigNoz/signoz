from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any


from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import find_named_result, make_query_request
from fixtures.traces import (
    TraceIdGenerator,
    Traces,
    TracesEvent,
    TracesKind,
    TracesLink,
    TracesRefType,
    TracesStatusCode,
)

# Full set of keys the trace_operator list response returns when selectFields
# is empty — matches the builder_query path's ALL_SELECT_FIELDS (every intrinsic
# and calculated column, plus the merged `attributes` and `resource` maps that
# wrap the contextual columns).
ALL_SELECT_FIELDS = [
    "timestamp",
    "trace_id",
    "span_id",
    "trace_state",
    "parent_span_id",
    "flags",
    "name",
    "kind",
    "kind_string",
    "duration_nano",
    "status_code",
    "status_message",
    "status_code_string",
    "events",
    "links",
    "response_status_code",
    "external_http_url",
    "http_url",
    "external_http_method",
    "http_method",
    "http_host",
    "db_name",
    "db_operation",
    "has_error",
    "is_remote",
    "attributes",
    "resource",
]

# Hardcoded core columns the trace_operator buildListQuery always projects,
# in addition to any user-supplied selectFields.
TRACE_OPERATOR_CORE_FIELDS = [
    "timestamp",
    "trace_id",
    "span_id",
    "name",
    "duration_nano",
    "parent_span_id",
]


def _verify_full_expansion(rows: list[dict], parent_trace: Traces) -> None:
    """Empty-selectFields case: every column from the builder_query parity set
    arrives, and events/links are parsed into structured form (refType is
    dropped at the consume layer).
    """
    assert len(rows) == 1
    parent_row = rows[0]["data"]
    assert set(parent_row.keys()) == set(ALL_SELECT_FIELDS)
    assert parent_row["events"] == parent_trace.events
    assert parent_row["links"] == parent_trace.links
    for link in parent_row["links"]:
        assert "refType" not in link


def _verify_explicit_projection(rows: list[dict], parent_trace: Traces) -> None:  # pylint: disable=unused-argument
    """Explicit-selectFields case: only the 6 hardcoded core fields plus the
    user-supplied resource.service.name come back. Contextual columns
    (events/links/attributes/resource) and the rest of the intrinsics never
    appear because the consume-layer merge isn't triggered.
    """
    assert len(rows) == 1
    parent_row = rows[0]["data"]
    assert set(parent_row.keys()) == set(TRACE_OPERATOR_CORE_FIELDS + ["service.name"])


@pytest.mark.parametrize(
    "select_fields,verify_values",
    [
        pytest.param([], _verify_full_expansion, id="empty-select-fields"),
        pytest.param(
            [{"name": "service.name", "fieldContext": "resource"}],
            _verify_explicit_projection,
            id="explicit-service-name",
        ),
    ],
)
def test_trace_operator_select_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    select_fields: list[dict[str, Any]],
    verify_values: Callable[[list[dict], Traces], None],
) -> None:
    """
    Setup:
    Insert a parent (operation.type = 'parent') with one event and one
    user-supplied link, plus a child span (operation.type = 'child').

    Tests:
    1. With selectFields=[], the `A => B` trace_operator returns every column
       in ALL_SELECT_FIELDS, mirroring the builder_query path. Events arrive
       as {name, timeUnixNano, attributes} and links as {traceId, spanId}
       with refType dropped at the consume layer.
    2. With an explicit selectFields=[{"name": "service.name"}], only the 6
       hardcoded core columns plus service.name come back — no auto-expansion
       to the full set.

    See:
    - pkg/telemetrytraces/trace_operator_cte_builder.go::buildFinalQuery for
      the expansion gate.
    - pkg/telemetrytraces/trace_operator_cte_builder.go::buildListQuery for
      the per-row SELECT.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    trace_id = TraceIdGenerator.trace_id()
    parent_span_id = TraceIdGenerator.span_id()
    child_span_id = TraceIdGenerator.span_id()

    parent_event = TracesEvent(
        name="request_received",
        timestamp=now - timedelta(seconds=4, microseconds=500_000),
        attribute_map={"http.method": "GET"},
    )
    linked_trace_id = TraceIdGenerator.trace_id()
    linked_span_id = TraceIdGenerator.span_id()
    user_link = TracesLink(
        trace_id=linked_trace_id,
        span_id=linked_span_id,
        ref_type=TracesRefType.REF_TYPE_FOLLOWS_FROM,
    )

    parent_trace = Traces(
        timestamp=now - timedelta(seconds=5),
        duration=timedelta(seconds=4),
        trace_id=trace_id,
        span_id=parent_span_id,
        parent_span_id="",
        name="parent-operation",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "trace-operator-query"},
        attributes={"operation.type": "parent"},
        events=[parent_event],
        links=[user_link],
    )
    child_trace = Traces(
        timestamp=now - timedelta(seconds=4),
        duration=timedelta(seconds=1),
        trace_id=trace_id,
        span_id=child_span_id,
        parent_span_id=parent_span_id,
        name="child-operation",
        kind=TracesKind.SPAN_KIND_INTERNAL,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources={"service.name": "trace-operator-query"},
        attributes={"operation.type": "child"},
    )
    insert_traces([parent_trace, child_trace])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    operator_spec: dict[str, Any] = {
        "name": "C",
        "expression": "A => B",
        "limit": 10,
        "order": [{"key": {"name": "timestamp"}, "direction": "asc"}],
    }
    if select_fields:
        operator_spec["selectFields"] = select_fields

    queries = [
        {
            "type": "builder_query",
            "spec": {
                "name": "A",
                "signal": "traces",
                "filter": {"expression": "operation.type = 'parent'"},
                "limit": 100,
                "disabled": True,
            },
        },
        {
            "type": "builder_query",
            "spec": {
                "name": "B",
                "signal": "traces",
                "filter": {"expression": "operation.type = 'child'"},
                "limit": 100,
                "disabled": True,
            },
        },
        {"type": "builder_trace_operator", "spec": operator_spec},
    ]

    response = make_query_request(
        signoz,
        token,
        start_ms=int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(datetime.now(tz=UTC).timestamp() * 1000),
        request_type="raw",
        queries=queries,
    )

    assert response.status_code == HTTPStatus.OK

    results = response.json()["data"]["data"]["results"]
    trace_operator_result = find_named_result(results, "C")
    rows = trace_operator_result["rows"]
    verify_values(rows, parent_trace)
