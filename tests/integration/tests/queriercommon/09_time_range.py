from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    MetricAggregation,
    get_all_warnings,
    get_error_message,
    get_series_values,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces

TWO_YEARS = timedelta(days=730)


@pytest.mark.parametrize(
    "start_ms,end_ms,message",
    [
        pytest.param(0, 1_700_000_000_000, "start time is required", id="zero_start"),
        pytest.param(1_700_000_000_000, 1_700_000_000_000, "start time must be before end time", id="start_equals_end"),
        # 2592000000 is 30 days in ms; read as an epoch in seconds it is year 2052.
        pytest.param(1_700_000_000_000, 2_592_000_000, "end time 2052-02-20T00:00:00Z is too far in the future", id="end_in_2052"),
    ],
)
def test_time_range_rejected(
    start_ms: int,
    end_ms: int,
    message: str,
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        queries=[BuilderQuery(signal="logs", aggregations=[Aggregation(expression="count()")], step_interval=60).to_dict()],
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert get_error_message(response.json()) == message


def test_two_year_logs_timeseries_step_clamped(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    # A 1s step over 2 years is clamped to 42045s (at most ~1500 points); end is aligned to it so the bucket count is stable.
    step_seconds = 42045
    end = datetime.fromtimestamp(int(datetime.now(tz=UTC).timestamp()) // step_seconds * step_seconds, tz=UTC)
    insert_logs([Logs(timestamp=end - timedelta(minutes=1), resources={"service.name": "time-range-logs"}, body="two year span")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((end - TWO_YEARS).timestamp() * 1000),
        end_ms=int(end.timestamp() * 1000),
        queries=[
            BuilderQuery(
                signal="logs",
                filter_expression="service.name = 'time-range-logs'",
                aggregations=[Aggregation(expression="count()")],
                step_interval=1,
            ).to_dict()
        ],
        format_options={"formatTableResultForUI": False, "fillGaps": True},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["meta"]["stepIntervals"] == {"A": step_seconds}
    assert get_all_warnings(response.json()) == [
        {"message": f"Query A is requesting aggregation interval 1 seconds, which is smaller than the minimum allowed interval of {step_seconds} seconds for selected time range. Using the minimum instead"},
    ]
    values = get_series_values(response.json(), "A")
    assert len(values) == 1502
    assert sum(v["value"] for v in values) == 1


def test_two_year_traces_timeseries_step_clamped(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    # Same clamp as logs: 42045s; end is aligned to it so the bucket count is stable.
    step_seconds = 42045
    end = datetime.fromtimestamp(int(datetime.now(tz=UTC).timestamp()) // step_seconds * step_seconds, tz=UTC)
    insert_traces([Traces(timestamp=end - timedelta(minutes=1), trace_id=TraceIdGenerator.trace_id(), span_id=TraceIdGenerator.span_id(), resources={"service.name": "time-range-traces"})])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((end - TWO_YEARS).timestamp() * 1000),
        end_ms=int(end.timestamp() * 1000),
        queries=[
            BuilderQuery(
                signal="traces",
                filter_expression="service.name = 'time-range-traces'",
                aggregations=[Aggregation(expression="count()")],
                step_interval=1,
            ).to_dict()
        ],
        format_options={"formatTableResultForUI": False, "fillGaps": True},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["meta"]["stepIntervals"] == {"A": step_seconds}
    assert get_all_warnings(response.json()) == [
        {"message": f"Query A is requesting aggregation interval 1 seconds, which is smaller than the minimum allowed interval of {step_seconds} seconds for selected time range. Using the minimum instead"},
    ]
    values = get_series_values(response.json(), "A")
    assert len(values) == 1502
    assert sum(v["value"] for v in values) == 1


def test_two_year_metrics_timeseries_step_clamped(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    # A 1s step over 2 years is clamped to 210600s (~300 points); end is aligned to it so the bucket count is stable.
    step_seconds = 210600
    metric_name = "time_range_two_year_gauge"
    end = datetime.fromtimestamp(int(datetime.now(tz=UTC).timestamp()) // step_seconds * step_seconds, tz=UTC)
    insert_metrics([Metrics(metric_name=metric_name, labels={"service": "time-range-metrics"}, timestamp=end - timedelta(minutes=1), value=1.0, temporality="Unspecified", type_="Gauge", is_monotonic=False)])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((end - TWO_YEARS).timestamp() * 1000),
        end_ms=int(end.timestamp() * 1000),
        queries=[
            BuilderQuery(
                signal="metrics",
                aggregations=[MetricAggregation(metric_name=metric_name, time_aggregation="latest", space_aggregation="sum", temporality="unspecified")],
                step_interval=1,
            ).to_dict()
        ],
        format_options={"formatTableResultForUI": False, "fillGaps": True},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["meta"]["stepIntervals"] == {"A": step_seconds}
    assert get_all_warnings(response.json()) == [
        {"message": f"Query A is requesting aggregation interval 1 seconds, which is smaller than the minimum allowed interval of {step_seconds} seconds for selected time range. Using the minimum instead"},
    ]
    assert len(get_series_values(response.json(), "A")) == 301
