from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_heatmap_query,
    build_linear_bucket_options,
    build_log_bucket_options,
    build_scalar_query,
    get_all_series,
    get_error_message,
    get_buckets,
    get_heatmap_columns,
    index_series_by_label,
    make_query_request,
)


def test_linear_heatmap_grouped(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    bytes_by_service = {"heatmap-svc-a": [50, 250], "heatmap-svc-b": [950, 5000]}
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=index + 1),
                resources={"service.name": service},
                attributes={"response_bytes": response_bytes},
                body=f"{service} served {response_bytes} bytes",
            )
            for service, values in bytes_by_service.items()
            for index, response_bytes in enumerate(values)
        ]
        # a log without the field counts as 0
        + [
            Logs(
                timestamp=now - timedelta(seconds=index + 1),
                resources={"service.name": "heatmap-svc-a"},
                body="no response size",
            )
            for index in range(2)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int((now + timedelta(seconds=5)).timestamp() * 1000),
        [
            build_heatmap_query(
                "A",
                "logs",
                "response_bytes",
                group_by=[build_group_by_field("service.name", "string", "resource")],
                filter_expression="service.name IN ('heatmap-svc-a', 'heatmap-svc-b')",
                bucket_options=build_linear_bucket_options(1000, 10),
            )
        ],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # 1000 split into 10 gives (0, 100], (100, 200], ... (900, 1000], and 5000
    # is past 1000 so it counts in the trailing overflow
    buckets = get_buckets(data, "A")
    assert buckets == pytest.approx([0.0, 100.0, 200.0, 300.0, 400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0])

    series_by_service = index_series_by_label(get_all_series(data, "A"), "service.name")
    assert set(series_by_service) == set(bytes_by_service)

    totals_by_service = {service: [sum(column["values"][slot] for column in series["values"]) for slot in range(len(buckets) + 1)] for service, series in series_by_service.items()}
    assert totals_by_service == {
        "heatmap-svc-a": [2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        "heatmap-svc-b": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    }


def test_log_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=index + 1),
                resources={"service.name": "heatmap-log-axis"},
                attributes={"queue_depth": queue_depth},
                body=f"queue depth {queue_depth}",
            )
            for index, queue_depth in enumerate([100, 300, 600])
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int((now + timedelta(seconds=5)).timestamp() * 1000),
        [build_heatmap_query("A", "logs", "queue_depth", filter_expression="service.name = 'heatmap-log-axis'", bucket_options=build_log_bucket_options(0))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # a doubling per bucket, with one rung under the lowest bucket reached so
    # its lower bound is on the axis; (128, 256] holds nothing but stays
    buckets = get_buckets(data, "A")
    assert buckets == pytest.approx([64.0, 128.0, 256.0, 512.0, 1024.0])
    assert [sum(column["values"][slot] for column in get_heatmap_columns(data, "A")) for slot in range(len(buckets) + 1)] == [0, 1, 0, 1, 1, 0]


def test_default_axis(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=index + 1),
                resources={"service.name": "heatmap-default-axis"},
                attributes={"batch_size": 1000},
                body="batch of 1000",
            )
            for index in range(2)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int((now + timedelta(seconds=5)).timestamp() * 1000),
        [build_heatmap_query("A", "logs", "batch_size", filter_expression="service.name = 'heatmap-default-axis'")],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # no bucketOptions is the finest log axis, 16 buckets per doubling: 1000
    # sits in (2^(159/16), 2^10]
    buckets = get_buckets(data, "A")
    totals = [sum(column["values"][slot] for column in get_heatmap_columns(data, "A")) for slot in range(len(buckets) + 1)]
    holding = [slot for slot, total in enumerate(totals) if total]
    assert holding == [len(buckets) - 1]
    assert totals[holding[0]] == 2
    assert buckets[-2:] == pytest.approx([2 ** (159 / 16), 1024.0])


@pytest.mark.parametrize(
    "aggregations, request_type, disabled, expected_message",
    [
        pytest.param(
            [build_aggregation("count()")],
            RequestType.HEATMAP,
            False,
            'a logs or traces heatmap counts events by the field named in heatmap(<field>), got "count()"',
            id="count_aggregation",
        ),
        pytest.param(
            [build_aggregation("heatmap(response_bytes)"), build_aggregation("heatmap(queue_depth)")],
            RequestType.HEATMAP,
            False,
            "a heatmap renders one bucket axis, but the query has 2 aggregations",
            id="two_aggregations",
        ),
        pytest.param(
            [build_aggregation("heatmap(response_bytes)")],
            RequestType.TIME_SERIES,
            False,
            "heatmap() is not supported for time_series requests",
            id="heatmap_in_a_time_series_request",
        ),
        pytest.param(
            [build_aggregation("heatmap(response_bytes)")],
            RequestType.HEATMAP,
            True,
            "heatmap() is not supported for a disabled query, which feeds a formula as a time series",
            id="heatmap_on_a_disabled_query",
        ),
    ],
)
def test_heatmap_rejections(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    aggregations: list[dict],
    request_type: str,
    disabled: bool,
    expected_message: str,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_scalar_query("A", "logs", aggregations, disabled=disabled)],
        request_type=request_type,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert expected_message in get_error_message(response.json())
