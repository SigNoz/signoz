from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_heatmap_query,
    build_linear_bucket_options,
    build_log_bucket_options,
    get_buckets,
    get_heatmap_columns,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind


def test_duration_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    durations = [timedelta(milliseconds=5)] * 6 + [timedelta(seconds=1)] * 3 + [timedelta(seconds=30)]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(minutes=2, seconds=index),
                duration=duration,
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="GET /cart",
                kind=TracesKind.SPAN_KIND_SERVER,
                resources={"service.name": "heatmap-cart"},
            )
            for index, duration in enumerate(durations)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_heatmap_query("A", "traces", "duration_nano", filter_expression="service.name = 'heatmap-cart'", bucket_options=build_log_bucket_options(0))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # a doubling per bucket in nanoseconds: 5ms is in (2^22, 2^23], 1s in
    # (2^29, 2^30] and 30s in (2^34, 2^35], and 2^22 is the rung under 5ms
    buckets = get_buckets(data, "A")
    assert buckets == pytest.approx([float(2**power) for power in range(22, 36)])

    totals = [sum(column["values"][slot] for column in get_heatmap_columns(data, "A")) for slot in range(len(buckets) + 1)]
    assert {buckets[slot]: total for slot, total in enumerate(totals) if total} == {2.0**23: 6, 2.0**30: 3, 2.0**35: 1}
    assert sum(totals) == len(durations)


def test_span_attribute_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    rows_returned = [5, 5, 5, 45, 45, 250]
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(minutes=2, seconds=index),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="SELECT orders",
                kind=TracesKind.SPAN_KIND_CLIENT,
                resources={"service.name": "heatmap-orders-db"},
                attributes={"db.rows_returned": rows},
            )
            for index, rows in enumerate(rows_returned)
        ]
        # a span without the attribute is not counted
        + [
            Traces(
                timestamp=now - timedelta(minutes=2, seconds=index),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name="BEGIN",
                kind=TracesKind.SPAN_KIND_CLIENT,
                resources={"service.name": "heatmap-orders-db"},
            )
            for index in range(2)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_heatmap_query("A", "traces", "db.rows_returned", filter_expression="service.name = 'heatmap-orders-db'", bucket_options=build_linear_bucket_options(100, 10))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # 100 split into 10 gives (0, 10], (10, 20], ... (90, 100]: 5 is in the
    # first, 45 in (40, 50], and 250 is past 100 so it counts in the overflow
    buckets = get_buckets(data, "A")
    assert buckets == pytest.approx([0.0, 10.0, 20.0, 30.0, 40.0, 50.0])
    assert [sum(column["values"][slot] for column in get_heatmap_columns(data, "A")) for slot in range(len(buckets) + 1)] == [0, 3, 0, 0, 0, 2, 1]
