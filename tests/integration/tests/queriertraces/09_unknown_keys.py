from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_raw_query,
    build_traces_scalar_query,
    get_rows,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# Traces KeyNotFound fallback: a key absent from field metadata is not a validation error.
# Existence is a property of the data, not of metadata, so the query runs against
# synthesized type-variant columns (filter / group-by / select) instead of failing.


def test_traces_filter_unknown_key_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """An unknown attribute key runs against synthesized columns and returns 200 with a
    "not found" warning so typos still surface."""
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_traces_scalar_query(
                [build_aggregation("count()")],
                filter_expression='totally.unknown.key = "x"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK

    warning = (response.json().get("data") or {}).get("warning") or {}
    messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
    assert any("totally.unknown.key" in m and "not found" in m for m in messages), f"expected a key-not-found warning, got warnings={messages}"


def test_traces_filter_unknown_resource_key_filters(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A resource-qualified unknown key must FILTER (0 rows), not be dropped: the
    resource-fingerprint sub-query skips keys absent from metadata, so the synthesized
    condition stays in the main query. A regression here returns every span."""
    now = datetime.now(tz=UTC)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name=f"op-{i}",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "res-filter-svc"},
                attributes={"http.method": "GET"},
            )
            for i in range(3)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ('service.name = "res-filter-svc"', 3),  # control: spans visible without the unknown term
        ('service.name = "res-filter-svc" AND resource.absent.key = "x"', 0),  # term filters, doesn't vanish
        ("resource.absent.numeric.key = 3", 0),  # numeric operand coerced, not a ClickHouse type error
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "traces", limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_traces_group_by_unknown_key_null_bucket(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Grouping by an unknown key runs against synthesized columns: every span lands in
    the NULL bucket instead of the query failing."""
    now = datetime.now(tz=UTC)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                duration=timedelta(seconds=1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                parent_span_id="",
                name=f"op-{i}",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources={"service.name": "groupby-unknown-svc"},
                attributes={"http.method": "GET"},
            )
            for i in range(3)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_traces_scalar_query(
                [build_aggregation("count()")],
                group_by=[build_group_by_field("totally.unknown.key", field_data_type="", field_context="")],
                filter_expression='service.name = "groupby-unknown-svc"',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK

    data = get_scalar_table_data(response.json())
    assert len(data) == 1, f"expected a single NULL-bucket group, got {data}"
    assert data[0][-1] == 3, f"expected all 3 spans in the NULL bucket, got {data}"
