from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import make_scalar_query_request
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

log_or_trace_service_counts = {
    "service-a": 5,
    "service-b": 3,
    "service-c": 7,
    "service-d": 1,
}


def generate_traces_with_counts(
    now: datetime,
    service_counts: dict[str, int],
) -> list[Traces]:
    traces = []
    for service, count in service_counts.items():
        for i in range(count):
            trace_id = TraceIdGenerator.trace_id()
            span_id = TraceIdGenerator.span_id()
            traces.append(
                Traces(
                    timestamp=now - timedelta(seconds=i + 1),
                    kind=TracesKind.SPAN_KIND_SERVER,
                    status_code=TracesStatusCode.STATUS_CODE_OK,
                    trace_id=trace_id,
                    span_id=span_id,
                    resources={"service.name": service},
                    name=f"{service} span {i}",
                )
            )
    return traces


def build_traces_query(
    name: str = "A",
    aggregations: list[str] | None = None,
    group_by: list[str] | None = None,
    order_by: list[tuple[str, str]] | None = None,
    limit: int | None = None,
) -> dict:
    if aggregations is None:
        aggregations = ["count()"]

    aggs = [querier.build_logs_aggregation(expr) for expr in aggregations]
    gb = [querier.build_group_by_field(f, "string", "resource") for f in group_by] if group_by else None
    order = [querier.build_order_by(name, direction) for name, direction in order_by] if order_by else None

    return querier.build_scalar_query(
        name=name,
        signal="traces",
        aggregations=aggs,
        group_by=gb,
        order=order,
        limit=limit,
    )


def test_traces_scalar_group_by_single_agg_no_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 7), ("service-a", 5), ("service-b", 3), ("service-d", 1)],
        "Traces no order - default desc",
    )


def test_traces_scalar_group_by_single_agg_order_by_agg_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("count()", "asc")])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 1), ("service-b", 3), ("service-a", 5), ("service-c", 7)],
        "Traces order by agg asc",
    )


def test_traces_scalar_group_by_single_agg_order_by_agg_desc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("count()", "desc")])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 7), ("service-a", 5), ("service-b", 3), ("service-d", 1)],
        "Traces order by agg desc",
    )


def test_traces_scalar_group_by_single_agg_order_by_grouping_key_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("service.name", "asc")])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 5), ("service-b", 3), ("service-c", 7), ("service-d", 1)],
        "Traces order by grouping key asc",
    )


def test_traces_scalar_group_by_single_agg_order_by_grouping_key_desc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("service.name", "desc")])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 1), ("service-c", 7), ("service-b", 3), ("service-a", 5)],
        "Traces order by grouping key desc",
    )


def test_traces_scalar_group_by_multiple_aggs_order_by_first_agg_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_traces_query(
                group_by=["service.name"],
                aggregations=["count()", "count_distinct(trace_id)"],
                order_by=[("count()", "asc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_column_order(data, 0, ["service-d", "service-b", "service-a", "service-c"], "First column")


def test_traces_scalar_group_by_single_agg_order_by_agg_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("count()", "asc")], limit=2)],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 1), ("service-b", 3)],
        "Traces order by agg asc with limit 2",
    )


def test_traces_scalar_group_by_single_agg_order_by_agg_desc_limit_3(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("count()", "desc")], limit=3)],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 7), ("service-a", 5), ("service-b", 3)],
        "Traces order by agg desc with limit 3",
    )


def test_traces_scalar_group_by_order_by_grouping_key_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_traces_query(group_by=["service.name"], order_by=[("service.name", "asc")], limit=2)],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 5), ("service-b", 3)],
        "Traces order by grouping key asc with limit 2",
    )
