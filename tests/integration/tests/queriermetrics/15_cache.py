from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_results_equal,
    build_builder_query,
    get_series_values,
    make_query_request,
)

MINUTE_MS = 60_000


def test_builder_shortening_the_time_range_at_the_end(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    # the cache outlives the run, so a fixed name would serve the previous run's
    # points back to this one
    metric_name = f"cache_end_shortened_{uuid4().hex[:8]}"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache. Flooring to a multiple of the 5m step makes the base query span
    # two whole steps, so both its points are complete
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 300 * 300, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms_base_query = start_time_ms + 10 * MINUTE_MS
    end_time_ms_shortened_query = start_time_ms + 7 * MINUTE_MS

    query = [build_builder_query("A", metric_name, "max", "max", step_interval=300)]

    # the 5m step splits the ten minutes into two points, each the max over its
    # own step: minutes 0-4 and minutes 5-9. The second changes partway through,
    # 256 until minute 7 and then 4096, so ending the range at minute 7 has to
    # reach a different value than ending it at minute 10
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=(16, 16, 16, 16, 16, 256, 256, 4096, 4096, 4096)[minute],
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(10)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    base_query = make_query_request(signoz, token, start_time_ms, end_time_ms_base_query, query, no_cache=False)
    assert base_query.status_code == HTTPStatus.OK, base_query.text
    points = sorted(get_series_values(base_query.json(), "A"), key=lambda point: point["timestamp"])
    assert [(point["value"], point.get("partial", False)) for point in points] == [(16, False), (4096, False)]

    from_cache = make_query_request(signoz, token, start_time_ms, end_time_ms_shortened_query, query, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, start_time_ms, end_time_ms_shortened_query, query, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    assert_results_equal(from_cache.json(), uncached.json(), "A", "shortened end")

    # the shortened end reaches only minutes 5-6 of the second point, so it comes
    # back as 256 and partial, where the cached one spans all five minutes
    from_cache_points = sorted(get_series_values(from_cache.json(), "A"), key=lambda point: point["timestamp"])
    uncached_points = sorted(get_series_values(uncached.json(), "A"), key=lambda point: point["timestamp"])
    assert [(point["value"], point.get("partial", False)) for point in from_cache_points] == [(16, False), (256, True)]
    assert [(point["value"], point.get("partial", False)) for point in uncached_points] == [(16, False), (256, True)]


def test_builder_shortening_the_time_range_at_the_start(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"cache_start_shortened_{uuid4().hex[:8]}"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache. Flooring to a multiple of the 5m step makes the base query span
    # two whole steps, so both its points are complete
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 300 * 300, tz=UTC)
    start_time_ms_base_query = int(start_time.timestamp() * 1000)
    start_time_ms_shortened_query = start_time_ms_base_query + 3 * MINUTE_MS
    end_time_ms = start_time_ms_base_query + 10 * MINUTE_MS

    query = [build_builder_query("A", metric_name, "max", "max", step_interval=300)]

    # the 5m step splits the ten minutes into two points, each the max over its
    # own step: minutes 0-4 and minutes 5-9. Only minute 0 holds 65536, so a first
    # point reaching it says the whole step was read even though the shortened
    # range opens at minute 3
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=(65536, 16, 16, 16, 16, 4096, 4096, 4096, 4096, 4096)[minute],
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(10)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    base_query = make_query_request(signoz, token, start_time_ms_base_query, end_time_ms, query, no_cache=False)
    assert base_query.status_code == HTTPStatus.OK, base_query.text
    points = sorted(get_series_values(base_query.json(), "A"), key=lambda point: point["timestamp"])
    assert [(point["value"], point.get("partial", False)) for point in points] == [(65536, False), (4096, False)]

    from_cache = make_query_request(signoz, token, start_time_ms_shortened_query, end_time_ms, query, no_cache=False)
    assert from_cache.status_code == HTTPStatus.OK, from_cache.text

    uncached = make_query_request(signoz, token, start_time_ms_shortened_query, end_time_ms, query, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    assert_results_equal(from_cache.json(), uncached.json(), "A", "shortened start")

    # starting inside the first point's step flags that point partial without
    # clipping its value, which still covers the whole step and so reaches the
    # 65536 at minute 0
    from_cache_points = sorted(get_series_values(from_cache.json(), "A"), key=lambda point: point["timestamp"])
    uncached_points = sorted(get_series_values(uncached.json(), "A"), key=lambda point: point["timestamp"])
    assert [(point["value"], point.get("partial", False)) for point in from_cache_points] == [(65536, True), (4096, False)]
    assert [(point["value"], point.get("partial", False)) for point in uncached_points] == [(65536, True), (4096, False)]


def test_promql_running_the_same_query_twice(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"cache_repeat_total_{uuid4().hex[:8]}"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms = start_time_ms + 2 * MINUTE_MS

    query = [{"type": "promql", "spec": {"name": "A", "query": f"sum(increase({metric_name}[2m]))", "step": 60}}]

    # the counter opens a minute before the query so its first point has something
    # to increase over, and starts far above its own rise across the range, below
    # which increase clips its back-extrapolation at the counter's zero point
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=1000 + 10 * minute,
                temporality="Cumulative",
                type_="Sum",
                is_monotonic=True,
            )
            for minute in range(-1, 4)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    first = make_query_request(signoz, token, start_time_ms, end_time_ms, query, no_cache=False)
    assert first.status_code == HTTPStatus.OK, first.text

    second = make_query_request(signoz, token, start_time_ms, end_time_ms, query, no_cache=False)
    assert second.status_code == HTTPStatus.OK, second.text

    assert_results_equal(first.json(), second.json(), "A", "the same query twice")

    # promql reports a point at the instant the range closes, and the second run,
    # answered out of what the first one cached, has to keep it
    for run, response in (("first", first), ("second", second)):
        timestamps = [point["timestamp"] for point in get_series_values(response.json(), "A")]
        assert end_time_ms in timestamps, f"{run} run dropped the point at the end of the range: {timestamps}"


def test_promql_shifting_the_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"cache_shift_total_{uuid4().hex[:8]}"

    # 40 minutes back clears the flux interval, which holds recent data out of
    # the cache. Flooring to a whole minute is what makes the first query aligned
    # to its 1m step, and the shifted one half a step off it
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=40)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)
    end_time_ms = start_time_ms + 3 * MINUTE_MS
    shifted_start_time_ms = start_time_ms + MINUTE_MS // 2
    shifted_end_time_ms = end_time_ms + MINUTE_MS // 2

    query = [{"type": "promql", "spec": {"name": "A", "query": f"sum(increase({metric_name}[2m]))", "step": 60}}]

    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=1000 + 10 * minute,
                temporality="Cumulative",
                type_="Sum",
                is_monotonic=True,
            )
            for minute in range(-1, 5)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    aligned = make_query_request(signoz, token, start_time_ms, end_time_ms, query, no_cache=False)
    assert aligned.status_code == HTTPStatus.OK, aligned.text

    uncached = make_query_request(signoz, token, shifted_start_time_ms, shifted_end_time_ms, query, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    # promql places its points at the range start plus whole steps, so the shifted
    # query reports 30s past every point the aligned one cached. Twice: the first
    # shifted run is what the cache stores for this range, the second is the one
    # it can answer out of the cache
    for run in ("first", "second"):
        from_cache = make_query_request(signoz, token, shifted_start_time_ms, shifted_end_time_ms, query, no_cache=False)
        assert from_cache.status_code == HTTPStatus.OK, from_cache.text
        assert_results_equal(from_cache.json(), uncached.json(), "A", f"shifted query, {run} run")


def test_builder_refreshing_a_sliding_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    metric_name = f"cache_sliding_{uuid4().hex[:8]}"

    # 90 minutes back so even the twentieth refresh closes clear of the flux
    # interval, which holds recent data out of the cache
    start_time = datetime.fromtimestamp(int((datetime.now(tz=UTC) - timedelta(minutes=90)).timestamp()) // 60 * 60, tz=UTC)
    start_time_ms = int(start_time.timestamp() * 1000)

    query = [build_builder_query("A", metric_name, "max", "max")]

    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "api"},
                timestamp=start_time + timedelta(minutes=minute),
                value=256 * 2 ** (minute % 3),
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(80)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # a dashboard left open on a one hour range, re-running a minute later each time
    for refresh in range(20):
        refresh_start_ms = start_time_ms + refresh * MINUTE_MS
        from_cache = make_query_request(signoz, token, refresh_start_ms, refresh_start_ms + 60 * MINUTE_MS, query, no_cache=False)
        assert from_cache.status_code == HTTPStatus.OK, from_cache.text

        # each refresh is stitched out of overlapping cached ranges, and a point
        # served from two of them at once shows up here
        timestamps = [point["timestamp"] for point in get_series_values(from_cache.json(), "A")]
        assert len(timestamps) == len(set(timestamps)), f"refresh {refresh} repeated a point"

    last_refresh_start_ms = start_time_ms + 19 * MINUTE_MS
    uncached = make_query_request(signoz, token, last_refresh_start_ms, last_refresh_start_ms + 60 * MINUTE_MS, query, no_cache=True)
    assert uncached.status_code == HTTPStatus.OK, uncached.text

    assert_results_equal(from_cache.json(), uncached.json(), "A", "the twentieth refresh")
