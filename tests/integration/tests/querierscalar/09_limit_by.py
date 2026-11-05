from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_scalar_result_order,
    build_aggregation,
    build_group_by_field,
    build_metrics_aggregation,
    build_scalar_query,
    get_error_message,
    get_scalar_table_data,
    make_query_request,
    make_scalar_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces

# Ordered by value: b/checkout 7, c/login 6, a/login 5, a/checkout 4, a/search 3,
# b/login 2, b/search 1. Each case below returns rows that a plain limit cannot.
LIMIT_BY_VALUES = {
    ("service-a", "login"): 5,
    ("service-a", "checkout"): 4,
    ("service-a", "search"): 3,
    ("service-b", "checkout"): 7,
    ("service-b", "login"): 2,
    ("service-b", "search"): 1,
    ("service-c", "login"): 6,
}

LIMIT_BY_CASES = [
    pytest.param(
        "1",
        None,
        [("service-b", "checkout", 7), ("service-c", "login", 6), ("service-a", "login", 5)],
        id="one_per_service",
    ),
    pytest.param(
        "2",
        5,
        [("service-b", "checkout", 7), ("service-c", "login", 6), ("service-a", "login", 5), ("service-a", "checkout", 4), ("service-b", "login", 2)],
        id="two_per_service_then_limit",
    ),
]


@pytest.mark.parametrize("rows_per_service,limit,expected_rows", LIMIT_BY_CASES)
def test_logs_scalar_limit_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    rows_per_service: str,
    limit: int | None,
    expected_rows: list[tuple],
) -> None:
    """limitBy keeps the top rows of each service, in the query order, before the limit applies."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": service}, attributes={"operation": operation}, body=f"{service} {operation} {i}") for (service, operation), count in LIMIT_BY_VALUES.items() for i in range(count)])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource"), build_group_by_field("operation", "string", "attribute")],
        limit_by={"keys": ["service.name"], "value": rows_per_service},
        limit=limit,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert_scalar_result_order(get_scalar_table_data(response.json()), expected_rows, "logs limitBy")


@pytest.mark.parametrize("rows_per_service,limit,expected_rows", LIMIT_BY_CASES)
def test_traces_scalar_limit_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    rows_per_service: str,
    limit: int | None,
    expected_rows: list[tuple],
) -> None:
    """limitBy keeps the top rows of each service, in the query order, before the limit applies."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": service},
                attributes={"operation": operation},
                name=f"{service} {operation}",
            )
            for (service, operation), count in LIMIT_BY_VALUES.items()
            for i in range(count)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="traces",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource"), build_group_by_field("operation", "string", "attribute")],
        limit_by={"keys": ["service.name"], "value": rows_per_service},
        limit=limit,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert_scalar_result_order(get_scalar_table_data(response.json()), expected_rows, "traces limitBy")


@pytest.mark.parametrize("rows_per_service,limit,expected_rows", LIMIT_BY_CASES)
def test_metrics_scalar_limit_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    rows_per_service: str,
    limit: int | None,
    expected_rows: list[tuple],
) -> None:
    """Metrics reduce to scalar in the querier, so limitBy runs there; the result must match the SQL behaviour."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_metrics(
        [
            Metrics(
                metric_name="test.limit_by",
                labels={"service.name": service, "operation": operation},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=float(value),
            )
            for (service, operation), value in LIMIT_BY_VALUES.items()
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = build_scalar_query(
        name="A",
        signal="metrics",
        aggregations=[build_metrics_aggregation("test.limit_by", "latest", "sum", "unspecified", reduce_to="last")],
        group_by=[build_group_by_field("service.name", "string", "attribute"), build_group_by_field("operation", "string", "attribute")],
        limit_by={"keys": ["service.name"], "value": rows_per_service},
        limit=limit,
    )
    response = make_scalar_query_request(signoz, token, now, [query])

    assert response.status_code == HTTPStatus.OK, response.text
    assert_scalar_result_order(get_scalar_table_data(response.json()), expected_rows, "metrics limitBy")


@pytest.mark.parametrize(
    "request_type,limit_by,expected_message",
    [
        pytest.param("time_series", {"keys": ["service.name"], "value": "1"}, "invalid query 'A': limitBy is supported only for scalar requests", id="time_series"),
        pytest.param("raw", {"keys": ["service.name"], "value": "1"}, "invalid query 'A': limitBy is supported only for scalar requests", id="raw"),
        pytest.param("scalar", {"keys": ["operation"], "value": "1"}, "invalid query 'A': limitBy key \"operation\" is not a group-by key", id="key_not_grouped"),
        pytest.param("scalar", {"keys": ["service.name"], "value": "0"}, "invalid query 'A': limitBy value must be a positive integer, got \"0\"", id="zero_value"),
        pytest.param("scalar", {"keys": [], "value": "1"}, "invalid query 'A': limitBy keys cannot be empty", id="no_keys"),
    ],
)
def test_limit_by_bad_request(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    request_type: str,
    limit_by: dict,
    expected_message: str,
) -> None:
    """A limitBy that the query cannot apply is a bad request, never ignored."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=request_type,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name", "string", "resource")],
                limit_by=limit_by,
            )
        ],
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert get_error_message(response.json()) == expected_message
