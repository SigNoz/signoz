from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_formula_query,
    build_group_by_field,
    build_metrics_aggregation,
    build_order_by,
    build_scalar_query,
    find_named_result,
    get_scalar_table_data,
    make_query_request,
    make_scalar_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

# Four services ordered by count, descending: service-c 7, service-a 5, service-b 3, service-d 1.
service_counts = {"service-a": 5, "service-b": 3, "service-c": 7, "service-d": 1}


@pytest.mark.parametrize(
    "limit, offset, expected_services",
    [
        pytest.param(2, 1, ["service-a", "service-b"], id="offset_within_page"),
        pytest.param(2, 4, [], id="offset_past_the_end"),
    ],
)
def test_logs_scalar_offset_skips_rows_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    limit: int,
    offset: int,
    expected_services: list[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": service},
                body=f"{service} log {i}",
            )
            for service, count in service_counts.items()
            for i in range(count)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                order=[build_order_by("count()", "desc")],
                limit=limit,
                offset=offset,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert get_scalar_table_data(response.json()) == [[service, service_counts[service]] for service in expected_services]


@pytest.mark.parametrize(
    "limit, offset, expected_services",
    [
        pytest.param(2, 1, ["service-a", "service-b"], id="offset_within_page"),
        pytest.param(2, 4, [], id="offset_past_the_end"),
    ],
)
def test_traces_scalar_offset_skips_rows_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    limit: int,
    offset: int,
    expected_services: list[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=i + 1),
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                resources={"service.name": service},
                name=f"{service} span {i}",
            )
            for service, count in service_counts.items()
            for i in range(count)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_scalar_query(
                name="A",
                signal="traces",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                order=[build_order_by("count()", "desc")],
                limit=limit,
                offset=offset,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert get_scalar_table_data(response.json()) == [[service, service_counts[service]] for service in expected_services]


def test_metrics_scalar_offset_skips_rows_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # Ordered by value, descending: service-c 70, service-a 50, service-b 30, service-d 10.
    insert_metrics(
        [
            Metrics(
                metric_name="offset.gauge",
                labels={"service.name": service},
                timestamp=now - timedelta(seconds=1),
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
                value=value,
            )
            for service, value in {"service-a": 50.0, "service-b": 30.0, "service-c": 70.0, "service-d": 10.0}.items()
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        now,
        [
            build_scalar_query(
                name="A",
                signal="metrics",
                aggregations=[build_metrics_aggregation("offset.gauge", "latest", "sum", "unspecified", reduce_to="last")],
                group_by=[build_group_by_field("service.name", "string", "attribute")],
                order=[build_order_by("sum(offset.gauge)", "desc")],
                limit=2,
                offset=1,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert get_scalar_table_data(response.json()) == [["service-a", 50.0], ["service-b", 30.0]]


def test_formula_scalar_offset_skips_rows_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": service},
                body=f"{service} log {i}",
            )
            for service, count in service_counts.items()
            for i in range(count)
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
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count()")],
                group_by=[build_group_by_field("service.name")],
                disabled=True,
            ),
            build_formula_query(
                "F1",
                "A * 2",
                order=[build_order_by("__result", "desc")],
                limit=2,
                offset=1,
            ),
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    result = find_named_result(response.json()["data"]["data"]["results"], "F1")
    assert result is not None, "formula result F1 not found"
    service_column = next(i for i, column in enumerate(result["columns"]) if column["name"] == "service.name")
    value_column = next(i for i, column in enumerate(result["columns"]) if column["name"] == "__result")
    assert [[row[service_column], row[value_column]] for row in result["data"]] == [["service-a", 10.0], ["service-b", 6.0]]


def test_negative_offset_is_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        datetime.now(tz=UTC).replace(second=0, microsecond=0),
        [build_scalar_query(name="A", signal="logs", aggregations=[build_aggregation("count()")], offset=-1)],
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json()["error"]["message"] == "invalid query 'A': offset must be non-negative, got -1"


def test_offset_without_limit_is_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_scalar_query_request(
        signoz,
        token,
        datetime.now(tz=UTC).replace(second=0, microsecond=0),
        [build_scalar_query(name="A", signal="logs", aggregations=[build_aggregation("count()")], offset=1)],
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json()["error"]["message"] == "invalid query 'A': offset requires a limit"
