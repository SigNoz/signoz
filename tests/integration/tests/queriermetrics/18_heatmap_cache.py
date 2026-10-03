from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    RequestType,
    assert_identical_query_response,
    build_builder_query,
    build_linear_bucket_options,
    get_heatmap_buckets,
    get_heatmap_columns,
    make_query_request,
)

MINUTE_MS = 60_000


@pytest.mark.parametrize(
    "first_minute, expected_buckets",
    [
        pytest.param(0, [100, 200], id="the_lower_half"),
        pytest.param(5, [800, 900], id="the_upper_half"),
    ],
)
def test_builder_narrowing_to_half_the_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    first_minute: int,
    expected_buckets: list[int],
) -> None:
    metric_name = f"heatmap_cache_narrowed_{uuid4().hex[:8]}"

    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms = start_time_ms + 10 * MINUTE_MS

    # 100 wide buckets, and the first five minutes sit seven buckets under the
    # last five, so the axis over all ten covers a stretch neither half reaches
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=150 if minute < 5 else 850,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(10)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = [build_builder_query("A", metric_name, "max", "max", bucket_options=build_linear_bucket_options(1000, 10))]

    # the whole range first, which is what puts its axis in the cache
    whole_range = make_query_request(signoz, token, start_time_ms, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert whole_range.status_code == HTTPStatus.OK, whole_range.text
    assert get_heatmap_buckets(whole_range.json(), "A") == pytest.approx([100, 200, 300, 400, 500, 600, 700, 800, 900])
    assert [column["values"] for column in get_heatmap_columns(whole_range.json(), "A")] == [
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ]

    half_start_ms = start_time_ms + first_minute * MINUTE_MS
    half_end_ms = half_start_ms + 5 * MINUTE_MS
    from_cache = make_query_request(signoz, token, half_start_ms, half_end_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, half_start_ms, half_end_ms, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    for source, response in (("uncached", uncached), ("from cache", from_cache)):
        assert get_heatmap_buckets(response.json(), "A") == pytest.approx(expected_buckets), source
        assert [column["values"] for column in get_heatmap_columns(response.json(), "A")] == [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 0],
        ], source

    assert_identical_query_response(from_cache, uncached)


def test_builder_narrowing_a_histogram(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"heatmap_cache_histogram_{uuid4().hex[:8]}_bucket"

    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms = start_time_ms + 10 * MINUTE_MS

    # the count each `le` reports every minute, cumulative across `le` as a
    # histogram is. For the first five minutes the ten arrivals are all at or
    # below 1, for the last five they are all between 4 and 8, and the buckets
    # holding none of them report a count of 0 rather than going unreported
    le_to_counts = {
        "1": [10, 10, 10, 10, 10, 0, 0, 0, 0, 0],
        "2": [10, 10, 10, 10, 10, 0, 0, 0, 0, 0],
        "4": [10, 10, 10, 10, 10, 0, 0, 0, 0, 0],
        "8": [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
        "+Inf": [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    }
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"le": le},
                timestamp=start_time + timedelta(minutes=minute),
                value=count,
                temporality="Delta",
                type_="Histogram",
            )
            for le, counts in le_to_counts.items()
            for minute, count in enumerate(counts)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    query = [build_builder_query("A", metric_name, "increase", "p50", temporality="delta", group_by=["le"])]

    # the whole range first, which is what puts its axis in the cache
    whole_range = make_query_request(signoz, token, start_time_ms, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert whole_range.status_code == HTTPStatus.OK, whole_range.text
    assert get_heatmap_buckets(whole_range.json(), "A") == [1, 2, 4, 8]
    assert [column["values"] for column in get_heatmap_columns(whole_range.json(), "A")] == [
        [10, 0, 0, 0, 0],
        [10, 0, 0, 0, 0],
        [10, 0, 0, 0, 0],
        [10, 0, 0, 0, 0],
        [10, 0, 0, 0, 0],
        [0, 0, 0, 10, 0],
        [0, 0, 0, 10, 0],
        [0, 0, 0, 10, 0],
        [0, 0, 0, 10, 0],
        [0, 0, 0, 10, 0],
    ]

    # even though this shortened time range has no data below 4, all histogram
    # buckets are still returned back
    half_start_ms = start_time_ms + 5 * MINUTE_MS
    from_cache = make_query_request(signoz, token, half_start_ms, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, half_start_ms, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    for source, response in (("uncached", uncached), ("from cache", from_cache)):
        assert get_heatmap_buckets(response.json(), "A") == [1, 2, 4, 8], source
        assert [column["values"] for column in get_heatmap_columns(response.json(), "A")] == [
            [0, 0, 0, 10, 0],
            [0, 0, 0, 10, 0],
            [0, 0, 0, 10, 0],
            [0, 0, 0, 10, 0],
            [0, 0, 0, 10, 0],
        ], source

    assert_identical_query_response(from_cache, uncached)


def test_builder_shortening_the_time_range_at_the_end(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"heatmap_cache_end_shortened_{uuid4().hex[:8]}"

    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 300 * 300, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms_base_query = start_time_ms + 10 * MINUTE_MS
    end_time_ms_shortened_query = start_time_ms + 7 * MINUTE_MS

    query = [build_builder_query("A", metric_name, "max", "max", step_interval=300, bucket_options=build_linear_bucket_options(1000, 10))]

    # the 5m step splits the ten minutes into two columns, each the max over its
    # own step: minutes 0-4 and minutes 5-9. The second changes partway through,
    # 250 until minute 7 and then 850, which fall six buckets apart, so ending
    # the range at minute 7 has to reach a different bucket than ending it at
    # minute 10 and an axis that stops well below it
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=(150, 150, 150, 150, 150, 250, 250, 850, 850, 850)[minute],
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(10)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    base_query = make_query_request(signoz, token, start_time_ms, end_time_ms_base_query, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert base_query.status_code == HTTPStatus.OK, base_query.text

    # 100 wide buckets, and the two maxes are 150 and 850, so the axis runs from
    # the bottom of (100, 200] to the top of (800, 900]
    assert get_heatmap_buckets(base_query.json(), "A") == pytest.approx([100, 200, 300, 400, 500, 600, 700, 800, 900])
    base_columns = get_heatmap_columns(base_query.json(), "A")
    assert [column["values"] for column in base_columns] == [
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    ]
    assert [column.get("partial", False) for column in base_columns] == [False, False]

    from_cache = make_query_request(signoz, token, start_time_ms, end_time_ms_shortened_query, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, start_time_ms, end_time_ms_shortened_query, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    # the shortened end reaches only minutes 5-6 of the second column, whose max
    # is 250 and which comes back partial. Nothing in this window passes 300, so
    # the axis stops there rather than carrying the buckets above it
    for label, response in (("uncached", uncached), ("from cache", from_cache)):
        assert get_heatmap_buckets(response.json(), "A") == pytest.approx([100, 200, 300]), label
        columns = get_heatmap_columns(response.json(), "A")
        assert [column["values"] for column in columns] == [
            [0, 1, 0, 0],
            [0, 0, 1, 0],
        ], label
        assert [column.get("partial", False) for column in columns] == [False, True], label

    assert_identical_query_response(from_cache, uncached)


def test_builder_shortening_the_time_range_at_the_start(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"heatmap_cache_start_shortened_{uuid4().hex[:8]}"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache. Flooring to a multiple of the 5m step makes the base query span
    # two whole steps, so both its columns are complete
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 300 * 300, tz=UTC)
    start_time_ms_base_query = int(start_time.timestamp() * 1000)
    start_time_ms_shortened_query = start_time_ms_base_query + 3 * MINUTE_MS
    end_time_ms = start_time_ms_base_query + 10 * MINUTE_MS

    query = [build_builder_query("A", metric_name, "max", "max", step_interval=300, bucket_options=build_linear_bucket_options(1000, 10))]

    # the 5m step splits the ten minutes into two columns, each the max over its
    # own step: minutes 0-4 and minutes 5-9. Only minute 0 reaches 950, so a
    # first column counted in (900, 1000] says the whole step was read even
    # though the shortened range opens at minute 3
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=(950, 150, 150, 150, 150, 350, 350, 350, 350, 350)[minute],
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(10)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    base_query = make_query_request(signoz, token, start_time_ms_base_query, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert base_query.status_code == HTTPStatus.OK, base_query.text

    # 100 wide buckets, and the two maxes are 950 and 350, so the axis runs from
    # the bottom of (300, 400] to the top of (900, 1000]
    assert get_heatmap_buckets(base_query.json(), "A") == pytest.approx([300, 400, 500, 600, 700, 800, 900, 1000])
    base_columns = get_heatmap_columns(base_query.json(), "A")
    assert [column["values"] for column in base_columns] == [
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0],
    ]
    assert [column.get("partial", False) for column in base_columns] == [False, False]

    from_cache = make_query_request(signoz, token, start_time_ms_shortened_query, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, start_time_ms_shortened_query, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    # starting inside the first column's step flags that column partial without
    # clipping its counts, which still cover the whole step and so reach the 950
    # at minute 0, leaving the axis where the base query drew it
    for label, response in (("uncached", uncached), ("from cache", from_cache)):
        assert get_heatmap_buckets(response.json(), "A") == pytest.approx([300, 400, 500, 600, 700, 800, 900, 1000]), label
        columns = get_heatmap_columns(response.json(), "A")
        assert [column["values"] for column in columns] == [
            [0, 0, 0, 0, 0, 0, 0, 1, 0],
            [0, 1, 0, 0, 0, 0, 0, 0, 0],
        ], label
        assert [column.get("partial", False) for column in columns] == [True, False], label

    assert_identical_query_response(from_cache, uncached)


def test_builder_refreshing_a_sliding_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"heatmap_cache_sliding_{uuid4().hex[:8]}"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)

    query = [build_builder_query("A", metric_name, "max", "max", bucket_options=build_linear_bucket_options(1000, 10))]

    # the 1m step gives one column per seeded minute, and 100 wide buckets give
    # every minute a bucket no other minute reaches, so a column stitched in from
    # the wrong range is counted in the wrong bucket
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=100 * minute + 50,
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(7)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # the window slides onto a bucket a minute higher each refresh, so an axis
    # carried over from an earlier one is off by as many buckets
    expected_buckets_by_refresh = [
        [0, 100, 200, 300, 400],
        [100, 200, 300, 400, 500],
        [200, 300, 400, 500, 600],
        [300, 400, 500, 600, 700],
    ]

    # whichever four minutes a refresh reads, each is in a bucket of its own and
    # they arrive in order, so the counts run down the diagonal
    expected_columns = [
        [0, 1, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
    ]

    # a dashboard left open on a four minute range, re-running a minute later each
    # time, so every refresh is stitched out of the ranges the ones before it cached
    for refresh, expected_buckets in enumerate(expected_buckets_by_refresh):
        refresh_start_ms = start_time_ms + refresh * MINUTE_MS
        from_cache = make_query_request(signoz, token, refresh_start_ms, refresh_start_ms + 4 * MINUTE_MS, query, request_type=RequestType.HEATMAP, no_cache=False)
        assert from_cache.status_code == HTTPStatus.OK, from_cache.text

        assert get_heatmap_buckets(from_cache.json(), "A") == pytest.approx(expected_buckets), f"refresh {refresh}"

        # a column served twice, dropped, or carried over from an earlier refresh
        # breaks the diagonal or the run of timestamps
        columns = get_heatmap_columns(from_cache.json(), "A")
        assert [column["timestamp"] for column in columns] == [
            refresh_start_ms,
            refresh_start_ms + MINUTE_MS,
            refresh_start_ms + 2 * MINUTE_MS,
            refresh_start_ms + 3 * MINUTE_MS,
        ], f"refresh {refresh}"
        assert [column["values"] for column in columns] == expected_columns, f"refresh {refresh}"

    uncached = make_query_request(signoz, token, refresh_start_ms, refresh_start_ms + 4 * MINUTE_MS, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    assert_identical_query_response(from_cache, uncached)


def test_promql_running_the_same_query_twice(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"heatmap_cache_repeat_{uuid4().hex[:8]}_bucket"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms = start_time_ms + 2 * MINUTE_MS

    query = [{"type": "promql", "spec": {"name": "A", "query": f"sum by (le) (increase({metric_name}[2m]))", "step": 60}}]

    # the cumulative count of each `le`, one entry per minute. The counters open
    # a minute before the query so its first column has something to increase
    # over, and start far above their own rise across the range, below which
    # increase clips its back-extrapolation at a counter's zero point
    le_to_counts = {
        "1": [1000, 1005, 1010, 1020],
        "2": [2000, 2010, 2025, 2040],
        "4": [3000, 3015, 3040, 3070],
        "+Inf": [4000, 4022, 4050, 4090],
    }
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"__temporality__": "Cumulative", "service": "api", "le": le},
                timestamp=start_time + timedelta(minutes=minute),
                value=count,
                temporality="Cumulative",
                type_="Histogram",
            )
            for le, counts in le_to_counts.items()
            for minute, count in enumerate(counts, start=-1)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    first = make_query_request(signoz, token, start_time_ms, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert first.status_code == HTTPStatus.OK, first.text

    second = make_query_request(signoz, token, start_time_ms, end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert second.status_code == HTTPStatus.OK, second.text

    # promql reports a column at the instant the range closes, and the second
    # run, answered out of what the first one cached, has to keep it
    for run, response in (("first", first), ("second", second)):
        assert get_heatmap_buckets(response.json(), "A") == [1, 2, 4], run
        ## what the query returns per `le` is cumulative across `le`, so each
        ## count is its own minus the one below it, and `le=+Inf` has no finite
        ## bound to sit on and lands in the trailing slot. increase over a 2m
        ## window of minutely samples extrapolates one minute's rise to two.
        assert [(column["timestamp"], column["values"]) for column in get_heatmap_columns(response.json(), "A")] == [
            (start_time_ms, [10, 10, 10, 14]),  # t = 0, the minute brings 5, 10, 15 and 22 arrivals at or below each `le`
            (start_time_ms + MINUTE_MS, [10, 20, 20, 6]),  # t = 1m, 5, 15, 25 and 28
            (end_time_ms, [20, 10, 30, 20]),  # t = 2m, 10, 15, 30 and 40
        ], f"{run} run"

    assert_identical_query_response(first, second)


def test_promql_shifting_the_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"heatmap_cache_shift_{uuid4().hex[:8]}_bucket"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache. Flooring to a whole minute is what makes the first query aligned
    # to its 1m step, and the unaligned one half a step off it
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    aligned_start_time_ms = int(start_time.timestamp() * 1000)
    aligned_end_time_ms = aligned_start_time_ms + 3 * MINUTE_MS
    unaligned_start_time_ms = aligned_start_time_ms + MINUTE_MS // 2
    unaligned_end_time_ms = aligned_end_time_ms + MINUTE_MS // 2

    query = [{"type": "promql", "spec": {"name": "A", "query": f"sum by (le) (max_over_time({metric_name}[2m]))", "step": 60}}]

    # a sample every 30s, each `le` counting up by its own fixed amount every
    # time. The two queries report 30s apart, so they land on different samples
    # and share no count between them
    le_to_arrivals_per_sample = {"1": 100, "2": 300, "4": 600, "+Inf": 1000}
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"__temporality__": "Cumulative", "service": "api", "le": le},
                timestamp=start_time + timedelta(seconds=30 * half_minute),
                value=arrivals_per_sample * (half_minute + 4),
                temporality="Cumulative",
                type_="Histogram",
            )
            for le, arrivals_per_sample in le_to_arrivals_per_sample.items()
            for half_minute in range(-3, 8)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    aligned_and_cached = make_query_request(signoz, token, aligned_start_time_ms, aligned_end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
    assert aligned_and_cached.status_code == HTTPStatus.OK, aligned_and_cached.text

    # what the cache now holds, and what the unaligned query must not be served
    assert get_heatmap_buckets(aligned_and_cached.json(), "A") == [1, 2, 4]
    ## each column reads the counters at their latest sample at or before its
    ## timestamp, and a bucket holds its own `le`'s count less the one below it.
    assert [(column["timestamp"], column["values"]) for column in get_heatmap_columns(aligned_and_cached.json(), "A")] == [
        (aligned_start_time_ms, [400, 800, 1200, 1600]),  # t = 0, the fourth sample
        (aligned_start_time_ms + MINUTE_MS, [600, 1200, 1800, 2400]),  # t = 1m, the sixth
        (aligned_start_time_ms + 2 * MINUTE_MS, [800, 1600, 2400, 3200]),  # t = 2m, the eighth
        (aligned_end_time_ms, [1000, 2000, 3000, 4000]),  # t = 3m, the tenth
    ]

    ## every column falls on a sample the aligned run never reported, so being
    ## served the cached run's answer shows up in the counts and not only the
    ## timestamps.
    unaligned_columns = [
        (unaligned_start_time_ms, [500, 1000, 1500, 2000]),  # t = 30s, the fifth sample
        (unaligned_start_time_ms + MINUTE_MS, [700, 1400, 2100, 2800]),  # t = 1m30s, the seventh
        (unaligned_start_time_ms + 2 * MINUTE_MS, [900, 1800, 2700, 3600]),  # t = 2m30s, the ninth
        (unaligned_end_time_ms, [1100, 2200, 3300, 4400]),  # t = 3m30s, the eleventh
    ]

    unaligned_and_uncached = make_query_request(signoz, token, unaligned_start_time_ms, unaligned_end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=True)
    assert unaligned_and_uncached.status_code == HTTPStatus.OK, unaligned_and_uncached.text
    assert get_heatmap_buckets(unaligned_and_uncached.json(), "A") == [1, 2, 4], "unaligned query, uncached"
    assert [(column["timestamp"], column["values"]) for column in get_heatmap_columns(unaligned_and_uncached.json(), "A")] == unaligned_columns, "unaligned query, uncached"

    # promql reports at the range start plus whole steps, so these columns sit
    # 30s off the cached ones. The first run stores them, the second reads them back
    for run in ("first", "second"):
        unaligned_and_cached = make_query_request(signoz, token, unaligned_start_time_ms, unaligned_end_time_ms, query, request_type=RequestType.HEATMAP, no_cache=False)
        assert unaligned_and_cached.status_code == HTTPStatus.OK, unaligned_and_cached.text
        assert get_heatmap_buckets(unaligned_and_cached.json(), "A") == [1, 2, 4], f"unaligned query, {run} run"
        assert [(column["timestamp"], column["values"]) for column in get_heatmap_columns(unaligned_and_cached.json(), "A")] == unaligned_columns, f"unaligned query, {run} run"
        assert_identical_query_response(unaligned_and_cached, unaligned_and_uncached)
