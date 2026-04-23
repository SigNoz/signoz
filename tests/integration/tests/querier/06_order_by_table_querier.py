from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, Dict, List, Optional, Tuple

import requests

from fixtures import querier, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

log_or_trace_service_counts = {
    "service-a": 5,
    "service-b": 3,
    "service-c": 7,
    "service-d": 1,
}

metric_values_for_test = {
    "service-a": 50.0,
    "service-b": 30.0,
    "service-c": 70.0,
    "service-d": 10.0,
}


def generate_logs_with_counts(
    now: datetime,
    service_counts: Dict[str, int],
) -> List[Logs]:
    logs = []
    for service, count in service_counts.items():
        for i in range(count):
            logs.append(
                Logs(
                    timestamp=now - timedelta(seconds=i + 1),
                    resources={"service.name": service},
                    body=f"{service} log {i}",
                )
            )
    return logs


def generate_traces_with_counts(
    now: datetime,
    service_counts: Dict[str, int],
) -> List[Traces]:
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


def generate_metrics_with_values(
    now: datetime,
    service_values: Dict[str, float],
) -> List[Metrics]:
    metrics = []
    for service, value in service_values.items():
        metrics.append(
            Metrics(
                metric_name="test.metric",
                labels={"service.name": service},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
        )
    return metrics


def make_scalar_query_request(
    signoz: types.SigNoz,
    token: str,
    now: datetime,
    queries: List[Dict],
    lookback_minutes: int = 5,
) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int(
                (now - timedelta(minutes=lookback_minutes)).timestamp() * 1000
            ),
            "end": int(now.timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {"queries": queries},
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )


def build_logs_query(
    name: str = "A",
    aggregations: Optional[List[str]] = None,
    group_by: Optional[List[str]] = None,
    order_by: Optional[List[Tuple[str, str]]] = None,
    limit: Optional[int] = None,
) -> Dict:
    if aggregations is None:
        aggregations = ["count()"]

    aggs = [querier.build_logs_aggregation(expr) for expr in aggregations]
    gb = (
        [querier.build_group_by_field(f, "string", "resource") for f in group_by]
        if group_by
        else None
    )
    order = (
        [querier.build_order_by(name, direction) for name, direction in order_by]
        if order_by
        else None
    )

    return querier.build_scalar_query(
        name=name,
        signal="logs",
        aggregations=aggs,
        group_by=gb,
        order=order,
        limit=limit,
    )


def build_traces_query(
    name: str = "A",
    aggregations: Optional[List[str]] = None,
    group_by: Optional[List[str]] = None,
    order_by: Optional[List[Tuple[str, str]]] = None,
    limit: Optional[int] = None,
) -> Dict:
    if aggregations is None:
        aggregations = ["count()"]

    aggs = [querier.build_logs_aggregation(expr) for expr in aggregations]
    gb = (
        [querier.build_group_by_field(f, "string", "resource") for f in group_by]
        if group_by
        else None
    )
    order = (
        [querier.build_order_by(name, direction) for name, direction in order_by]
        if order_by
        else None
    )

    return querier.build_scalar_query(
        name=name,
        signal="traces",
        aggregations=aggs,
        group_by=gb,
        order=order,
        limit=limit,
    )


def build_metrics_query(
    name: str = "A",
    metric_name: str = "test.metric",
    time_aggregation: str = "latest",
    space_aggregation: str = "sum",
    group_by: Optional[List[str]] = None,
    order_by: Optional[List[Tuple[str, str]]] = None,
    limit: Optional[int] = None,
) -> Dict:
    aggs = [
        querier.build_metrics_aggregation(
            metric_name, time_aggregation, space_aggregation, "unspecified"
        )
    ]
    gb = (
        [querier.build_group_by_field(f, "string", "attribute") for f in group_by]
        if group_by
        else None
    )
    order = (
        [querier.build_order_by(name, direction) for name, direction in order_by]
        if order_by
        else None
    )

    return querier.build_scalar_query(
        name=name,
        signal="metrics",
        aggregations=aggs,
        group_by=gb,
        order=order,
        limit=limit,
    )


def test_logs_scalar_group_by_single_agg_no_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_logs_query(group_by=["service.name"])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 7), ("service-a", 5), ("service-b", 3), ("service-d", 1)],
        "Logs no order - default desc",
    )


def test_logs_scalar_group_by_single_agg_order_by_agg_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_logs_query(group_by=["service.name"], order_by=[("count()", "asc")])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 1), ("service-b", 3), ("service-a", 5), ("service-c", 7)],
        "Logs order by agg asc",
    )


def test_logs_scalar_group_by_single_agg_order_by_agg_desc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_logs_query(group_by=["service.name"], order_by=[("count()", "desc")])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 7), ("service-a", 5), ("service-b", 3), ("service-d", 1)],
        "Logs order by agg desc",
    )


def test_logs_scalar_group_by_single_agg_order_by_grouping_key_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"], order_by=[("service.name", "asc")]
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 5), ("service-b", 3), ("service-c", 7), ("service-d", 1)],
        "Logs order by grouping key asc",
    )


def test_logs_scalar_group_by_single_agg_order_by_grouping_key_desc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"], order_by=[("service.name", "desc")]
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 1), ("service-c", 7), ("service-b", 3), ("service-a", 5)],
        "Logs order by grouping key desc",
    )


def test_logs_scalar_group_by_multiple_aggs_order_by_first_agg_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"],
                aggregations=["count()", "count_distinct(body)"],
                order_by=[("count()", "asc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_column_order(
        data, 0, ["service-d", "service-b", "service-a", "service-c"], "First column"
    )


def test_logs_scalar_group_by_multiple_aggs_order_by_second_agg_desc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"],
                aggregations=["count()", "count_distinct(body)"],
                order_by=[("count_distinct(body)", "desc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    # count_distinct(body) should equal count() since each log has unique body
    querier.assert_scalar_column_order(
        data, 0, ["service-c", "service-a", "service-b", "service-d"], "First column"
    )


def test_logs_scalar_group_by_single_agg_order_by_agg_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"], order_by=[("count()", "asc")], limit=2
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 1), ("service-b", 3)],
        "Logs order by agg asc with limit 2",
    )


def test_logs_scalar_group_by_single_agg_order_by_agg_desc_limit_3(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"], order_by=[("count()", "desc")], limit=3
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 7), ("service-a", 5), ("service-b", 3)],
        "Logs order by agg desc with limit 3",
    )


def test_logs_scalar_group_by_order_by_grouping_key_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_logs(generate_logs_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_logs_query(
                group_by=["service.name"], order_by=[("service.name", "asc")], limit=2
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 5), ("service-b", 3)],
        "Logs order by grouping key asc with limit 2",
    )


def test_traces_scalar_group_by_single_agg_no_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_traces_query(
                group_by=["service.name"], order_by=[("service.name", "asc")]
            )
        ],
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_traces_query(
                group_by=["service.name"], order_by=[("service.name", "desc")]
            )
        ],
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
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
    querier.assert_scalar_column_order(
        data, 0, ["service-d", "service-b", "service-a", "service-c"], "First column"
    )


def test_traces_scalar_group_by_single_agg_order_by_agg_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_traces_query(
                group_by=["service.name"], order_by=[("count()", "asc")], limit=2
            )
        ],
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_traces_query(
                group_by=["service.name"], order_by=[("count()", "desc")], limit=3
            )
        ],
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
    insert_traces: Callable[[List[Traces]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_traces(generate_traces_with_counts(now, log_or_trace_service_counts))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_traces_query(
                group_by=["service.name"], order_by=[("service.name", "asc")], limit=2
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 5), ("service-b", 3)],
        "Traces order by grouping key asc with limit 2",
    )


def test_metrics_scalar_group_by_single_agg_no_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [build_metrics_query(group_by=["service.name"])],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [
            ("service-c", 70.0),
            ("service-a", 50.0),
            ("service-b", 30.0),
            ("service-d", 10.0),
        ],
        "Metrics no order - default desc",
    )


def test_metrics_scalar_group_by_single_agg_order_by_agg_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("sum(test.metric)", "asc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [
            ("service-d", 10.0),
            ("service-b", 30.0),
            ("service-a", 50.0),
            ("service-c", 70.0),
        ],
        "Metrics order by agg asc",
    )


def test_metrics_scalar_group_by_single_agg_order_by_grouping_key_asc(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("service.name", "asc")],
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [
            ("service-a", 50.0),
            ("service-b", 30.0),
            ("service-c", 70.0),
            ("service-d", 10.0),
        ],
        "Metrics order by grouping key asc",
    )


def test_metrics_scalar_group_by_single_agg_order_by_agg_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("sum(test.metric)", "asc")],
                limit=2,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-d", 10.0), ("service-b", 30.0)],
        "Metrics order by agg asc with limit 2",
    )


def test_metrics_scalar_group_by_single_agg_order_by_agg_desc_limit_3(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("sum(test.metric)", "desc")],
                limit=3,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-c", 70.0), ("service-a", 50.0), ("service-b", 30.0)],
        "Metrics order by agg desc with limit 3",
    )


def test_metrics_scalar_group_by_order_by_grouping_key_asc_limit_2(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    insert_metrics(generate_metrics_with_values(now, metric_values_for_test))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_metrics_query(
                group_by=["service.name"],
                order_by=[("service.name", "asc")],
                limit=2,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = querier.get_scalar_table_data(response.json())
    querier.assert_scalar_result_order(
        data,
        [("service-a", 50.0), ("service-b", 30.0)],
        "Metrics order by grouping key asc with limit 2",
    )
