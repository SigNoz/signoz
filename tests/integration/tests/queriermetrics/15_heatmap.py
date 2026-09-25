from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    assert_identical_query_response,
    build_builder_query,
    build_formula_query,
    build_linear_bucket_options,
    build_log_bucket_options,
    get_all_series,
    get_all_warnings,
    get_heatmap_buckets,
    get_heatmap_columns,
    index_series_by_label,
    make_query_request,
)

HISTOGRAM_FILE = get_testdata_file_path("histogram_data_1h.jsonl")
HISTOGRAM_COUNTERS_FILE = get_testdata_file_path("heatmap_histogram_3m.jsonl")
MINUTE_MS = 60_000


def test_gauge_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    minutes = 3
    start_ms = int((now - timedelta(minutes=minutes + 1)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_gauge"

    value_by_host = {f"host-{host:02d}": (200, 400, 800)[host // 8] + host for host in range(24)}
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"host": host},
                timestamp=now - timedelta(minutes=minutes - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for host, value in value_by_host.items()
            for minute in range(minutes)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max", group_by=["host"], bucket_options=build_log_bucket_options(0))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # a group by gives one series per host, and all of them are counted against
    # this one axis. 128 is on it so the lowest bucket holding anything reads as
    # (128, 256] rather than as everything at or below 256
    assert get_heatmap_buckets(data, "A") == pytest.approx([128.0, 256.0, 512.0, 1024.0])

    columns_by_host = {host: sorted(series["values"], key=lambda column: column["timestamp"]) for host, series in index_series_by_label(get_all_series(data, "A"), "host").items()}
    assert len(columns_by_host) == len(value_by_host)

    # a column carries its per-bucket counts and no `value`, since no single
    # number stands for a spread
    assert all("value" not in column for columns in columns_by_host.values() for column in columns)

    # a column holds one count per bucket plus a trailing one for the overflow.
    # the 200s reach (128, 256], the 400s (256, 512] and the 800s (512, 1024],
    # and every minute records the same value
    expected_columns = [
        [0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0],
    ]
    for host, columns in columns_by_host.items():
        assert [column["values"] for column in columns] == [expected_columns[int(host.removeprefix("host-")) // 8]] * minutes

    # summed across the hosts, a column is the spread of the 24 of them
    for minute in range(minutes):
        assert [sum(columns[minute]["values"][slot] for columns in columns_by_host.values()) for slot in range(5)] == [0, 8, 8, 8, 0]


def test_sum_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    minutes = 3
    start_ms = int((now - timedelta(minutes=minutes + 1)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_sum"

    value_by_endpoint = {f"/endpoint-{endpoint:02d}": (100, 800)[endpoint // 8] + endpoint for endpoint in range(16)}
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"endpoint": endpoint},
                timestamp=now - timedelta(minutes=minutes - minute),
                value=value,
                temporality="Cumulative",
                type_="Sum",
            )
            for endpoint, value in value_by_endpoint.items()
            for minute in range(minutes)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max", temporality="cumulative", group_by=["endpoint"], bucket_options=build_log_bucket_options(0))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    assert get_heatmap_buckets(data, "A") == pytest.approx([64.0, 128.0, 256.0, 512.0, 1024.0])

    columns_by_endpoint = {endpoint: sorted(series["values"], key=lambda column: column["timestamp"]) for endpoint, series in index_series_by_label(get_all_series(data, "A"), "endpoint").items()}
    assert len(columns_by_endpoint) == len(value_by_endpoint)

    # the 100s reach (64, 128] and the 800s (512, 1024], and every minute
    # records the same value
    expected_columns = [
        [0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0],
    ]
    for endpoint, columns in columns_by_endpoint.items():
        assert [column["values"] for column in columns] == [expected_columns[int(endpoint.removeprefix("/endpoint-")) // 8]] * minutes

    for minute in range(minutes):
        assert [sum(columns[minute]["values"][slot] for columns in columns_by_endpoint.values()) for slot in range(6)] == [0, 8, 0, 0, 8, 0]


def test_histogram_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_histogram"

    insert_metrics(
        Metrics.load_from_file(
            HISTOGRAM_FILE,
            base_time=now - timedelta(minutes=60),
            metric_name_override=metric_name,
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "increase", "p50", group_by=["le"], filter_expression='endpoint = "/health"')],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # a histogram's axis is its recorded `le` bounds exactly, since nothing is
    # known about what sits between two of them; `le=+Inf` has no finite bound
    # and is counted in the trailing overflow slot
    assert get_heatmap_buckets(data, "A") == [1000, 1500, 2000, 4000, 5000, 6000, 8000]

    columns = get_heatmap_columns(data, "A")
    assert columns
    for column in columns:
        assert len(column["values"]) == 8
        assert all(count >= 0 for count in column["values"])
    assert any(sum(column["values"]) > 0 for column in columns)


def test_linear_buckets(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_linear"

    # 100 wide buckets: 100 lands on the first, 250 on the third, and 1500 is
    # past maxValue so it counts in the overflow
    values = [100, 250, 1500]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=len(values) - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max", bucket_options=build_linear_bucket_options(1000, 10))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # 200 is on the axis although nothing reached it, so the gap between 100 and
    # 300 renders as a gap, and 0 is on it so the lowest bucket reads as (0, 100]
    assert get_heatmap_buckets(data, "A") == pytest.approx([0.0, 100.0, 200.0, 300.0])

    columns = get_heatmap_columns(data, "A")
    assert [column["values"] for column in columns] == [
        [0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 1],
    ]


def test_zero_bucket(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_zero_bucket"

    values = [0, 256, 1024]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=len(values) - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max", bucket_options=build_log_bucket_options(0))],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # a log axis cannot place a value at or below zero, so those share a bucket
    # of their own beneath the rest. 128 separates that bucket from the lowest
    # one holding anything, and 512 is spanned above it
    assert get_heatmap_buckets(data, "A") == pytest.approx([0.0, 128.0, 256.0, 512.0, 1024.0])

    columns = get_heatmap_columns(data, "A")
    assert [column["values"] for column in columns] == [
        [1, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0],
    ]


def test_single_bucket(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_single_bucket"

    values = [256, 256, 256]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=len(values) - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max")],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    # a single bucket leaves no gap to span, and still gets the rung below it so
    # its own lower bound is stated
    data = response.json()
    assert get_heatmap_buckets(data, "A") == pytest.approx([256 * 2 ** (-1 / 16), 256.0])
    assert [column["values"] for column in get_heatmap_columns(data, "A")] == [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
    ]


# the values seeded below are 256 and 512, so each axis here runs from the rung
# under the bucket holding 256 to the one holding 512 at that option's
# resolution: 16 log buckets to the 2x, one bucket per 16x, or a linear bucket
# every maxValue/numBuckets
@pytest.mark.parametrize(
    "bucket_options, expected_buckets",
    [
        (None, [256 * 2 ** (step / 16) for step in range(-1, 17)]),
        ({"kind": "log", "spec": {}}, [256 * 2 ** (step / 16) for step in range(-1, 17)]),
        (build_log_bucket_options(4), [256 * 2 ** (step / 16) for step in range(-1, 17)]),
        (build_log_bucket_options(-4), [1, 2**16]),
        (build_linear_bucket_options(1024), [step * 1024 / 60 for step in range(14, 31)]),
        (build_linear_bucket_options(1024, 512), [step * 1024 / 512 for step in range(127, 257)]),
    ],
    ids=["absent", "log_defaults", "the_finest_scale", "the_coarsest_scale", "linear_without_num_buckets", "the_most_buckets"],
)
def test_bucket_option_limits(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    bucket_options: dict | None,
    expected_buckets: list[float],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_bucket_option_limits"

    values = [256, 512]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=len(values) - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max", bucket_options=bucket_options)],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    assert get_heatmap_buckets(data, "A") == pytest.approx(expected_buckets)

    columns = get_heatmap_columns(data, "A")
    assert len(columns) == len(values)
    for column in columns:
        assert len(column["values"]) == len(expected_buckets) + 1
        assert sum(column["values"]) == 1


def test_bucket_options_come_from_the_enabled_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_bucket_options_on_two_queries"

    values = [256, 512]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=len(values) - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_builder_query("A", metric_name, "max", "max", disabled=True, bucket_options=build_linear_bucket_options(1024, 512)),
            build_builder_query("B", metric_name, "max", "max", bucket_options=build_log_bucket_options(-4)),
        ],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # B's axis, one bucket per 16x. A's 512 linear buckets to 1024 would have
    # put 130 of them between 256 and 512 alone
    assert get_heatmap_buckets(data, "B") == pytest.approx([1, 2**16])
    assert [column["values"] for column in get_heatmap_columns(data, "B")] == [
        [0, 1, 0],
        [0, 1, 0],
    ]


def test_formula_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_heatmap_formula"

    values = [100, 260, 295, 512, 1500]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=len(values) - minute),
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    from_metric = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_builder_query("A", metric_name, "max", "max", bucket_options=build_log_bucket_options(2))],
        request_type=RequestType.HEATMAP,
    )
    assert from_metric.status_code == HTTPStatus.OK, from_metric.text

    # a formula over the same query has to land its counts on the same axis. the
    # scale on the disabled input is out of range: only the query the heatmap
    # draws states an axis, so nothing reads that one
    from_formula = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_builder_query("A", metric_name, "max", "max", disabled=True, bucket_options={"kind": "log", "spec": {"scale": 5}}),
            build_formula_query("F1", "A", bucket_options=build_log_bucket_options(2)),
        ],
        request_type=RequestType.HEATMAP,
    )
    assert from_formula.status_code == HTTPStatus.OK, from_formula.text

    assert get_heatmap_buckets(from_formula.json(), "F1") == pytest.approx(get_heatmap_buckets(from_metric.json(), "A"))
    assert [column["values"] for column in get_heatmap_columns(from_formula.json(), "F1")] == [column["values"] for column in get_heatmap_columns(from_metric.json(), "A")]


def test_promql_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    end_ms = (int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000) // MINUTE_MS) * MINUTE_MS
    start_ms = end_ms - MINUTE_MS

    # the file's three columns are one minute apart, and the first sits a minute
    # before the query window so the earliest step has something to increase over.
    # Every counter in it stays above its own rise across a window, below which
    # increase clips its back-extrapolation at the counter's zero point.
    insert_metrics(Metrics.load_from_file(HISTOGRAM_COUNTERS_FILE, base_time=datetime.fromtimestamp((start_ms - MINUTE_MS) / 1000, tz=UTC)))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [{"type": "promql", "spec": {"name": "A", "query": "sum by (le) (increase(heatmap_request_duration_bucket[2m]))", "step": 60}}],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    assert get_heatmap_buckets(data, "A") == [1, 2, 4]

    series = get_all_series(data, "A")
    assert len(series) == 1
    # `le` is what the bucket axis is read off, so it is never a group label
    assert series[0].get("labels") in (None, [])

    # what the query returns per `le` is still cumulative across `le`, so each
    # count here is its own minus the one below it, and `le=+Inf` has no finite
    # bound to sit on and lands in the trailing slot. increase over a 2m window of
    # minutely samples extrapolates one minute's rise to two, hence the scaling.
    assert [column["values"] for column in get_heatmap_columns(data, "A")] == [
        [2, 6, 2, 2],
        [6, 0, 8, 4],
    ]


def test_promql_heatmap_with_no_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    end_ms = (int((datetime.now(tz=UTC) - timedelta(minutes=5)).timestamp() * 1000) // MINUTE_MS) * MINUTE_MS
    start_ms = end_ms - MINUTE_MS

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [{"type": "promql", "spec": {"name": "A", "query": "sum by (le) (increase(promql_heatmap_bucket_never_written[2m]))", "step": 60}}],
        request_type=RequestType.HEATMAP,
    )
    # a window holding nothing is not a query that can never draw a heatmap, so
    # it comes back empty where the latter is rejected
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    assert get_heatmap_buckets(data, "A") == []
    assert get_heatmap_columns(data, "A") == []


def test_clickhouse_heatmap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start = now - timedelta(minutes=2)
    metric_name = "test_heatmap_clickhouse"

    # cut into tens these fill (0, 10], (20, 30] and (80, 90] and leave
    # (10, 20] and (30, 80] with nothing in them
    values = [2, 5, 8, 21, 22, 23, 24, 26, 28, 30, 82, 88]
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"host": f"host-{host:02d}"},
                timestamp=start,
                value=value,
                type_="Gauge",
                is_monotonic=False,
            )
            for host, value in enumerate(values)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        int(start.timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": (
                        "SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) AS ts, "
                        "ceil(value / 10) * 10 - 10 AS `__bucket_min`, "
                        "ceil(value / 10) * 10 AS `__bucket_max`, "
                        "toFloat64(count()) AS `__result_0` "
                        "FROM signoz_metrics.distributed_samples_v4 "
                        f"WHERE metric_name = '{metric_name}' "
                        "GROUP BY ts, `__bucket_min`, `__bucket_max`"
                    ),
                    "disabled": False,
                },
            }
        ],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    # 20 and 80 are on the axis although no row ended there, so the two ranges
    # the query skipped hold a count of their own rather than widening the
    # buckets above them
    assert get_heatmap_buckets(data, "A") == [10, 20, 30, 80, 90]
    # a clickhouse heatmap takes no bucketOptions, so the counts land exactly
    # where the query put them, plus the overflow slot
    assert [column["values"] for column in get_heatmap_columns(data, "A")] == [
        [3, 0, 7, 0, 2, 0],
    ]


def test_clickhouse_heatmap_with_no_rows(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=2)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            {
                "type": "clickhouse_sql",
                "spec": {
                    "name": "A",
                    "query": (
                        "SELECT toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL 60 SECOND) AS ts, "
                        "toFloat64(0) AS `__bucket_min`, toFloat64(10) AS `__bucket_max`, toFloat64(count()) AS `__result_0` "
                        "FROM signoz_metrics.distributed_samples_v4 "
                        "WHERE metric_name = 'test_heatmap_clickhouse_never_written' "
                        "GROUP BY ts"
                    ),
                    "disabled": False,
                },
            }
        ],
        request_type=RequestType.HEATMAP,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    assert get_heatmap_buckets(data, "A") == []
    assert get_heatmap_columns(data, "A") == []


def test_cached_heatmap_matches_uncached(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test_heatmap_cache"

    # the first half sits 16x below the second, so the cached range and the fresh
    # one reach disjoint parts of the axis and neither may lose its counts
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=now - timedelta(minutes=60 - minute),
                value=256 if minute < 15 else 4096,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(30)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = [build_builder_query("A", metric_name, "max", "max")]
    wide_start_ms = int((now - timedelta(minutes=60)).timestamp() * 1000)
    wide_end_ms = int((now - timedelta(minutes=30)).timestamp() * 1000)

    warmup = make_query_request(
        signoz,
        token,
        wide_start_ms,
        int((now - timedelta(minutes=45)).timestamp() * 1000),
        query,
        request_type=RequestType.HEATMAP,
        no_cache=False,
    )
    assert warmup.status_code == HTTPStatus.OK, warmup.text

    from_cache = make_query_request(signoz, token, wide_start_ms, wide_end_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, wide_start_ms, wide_end_ms, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    assert_identical_query_response(from_cache, uncached)

    # 256 and 4096 are 16x apart, which the axis covers at 16 buckets per 2x plus
    # the rung under the lowest, and every column holds the one value its minute
    # recorded
    assert len(get_heatmap_buckets(uncached.json(), "A")) == 66
    assert [sum(column["values"]) for column in get_heatmap_columns(uncached.json(), "A")] == [1] * 30


def test_metric_with_no_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    missing_metric = "test_heatmap_metric_that_is_never_written"

    response = make_query_request(
        signoz,
        token,
        int((now - timedelta(minutes=30)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_builder_query("A", missing_metric, "max", "max", bucket_options=build_log_bucket_options(0))],
        request_type=RequestType.HEATMAP,
    )
    # a metric with nothing in the window carries no type to choose an axis
    # from, and that is an empty heatmap rather than a rejected request
    assert response.status_code == HTTPStatus.OK, response.text

    data = response.json()
    assert get_heatmap_buckets(data, "A") == []
    assert get_heatmap_columns(data, "A") == []
    assert any(missing_metric in warning["message"] for warning in get_all_warnings(data))
