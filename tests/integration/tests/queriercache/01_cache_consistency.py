from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs, minutely_logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_all_series_equal,
    assert_series_points_equal,
    build_aggregation,
    build_builder_query,
    build_formula_query,
    build_function,
    build_group_by_field,
    build_order_by,
    build_scalar_query,
    find_named_result,
    get_all_series,
    make_query_request,
    series_points_by_label,
)
from fixtures.time import wait_until_second_of_minute

STEP = 60
MINUTE = timedelta(minutes=1)


def test_full_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Two services with steady per-minute counts in a window that ended more
    than the flux interval (5m) ago, so the first request fills the cache.

    Tests:
    The same window requested twice through the cache (miss, then full hit)
    equals the request with noCache. Baseline for the other tests.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    start, end = now - 40 * MINUTE, now - 20 * MINUTE
    insert_logs(minutely_logs(start, end, {"svc-a": 3, "svc-b": 1}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    start_ms, end_ms = int(start.timestamp() * 1000), int(end.timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    assert len(get_all_series(fresh.json(), "A")) == 2, fresh.text
    assert_series_points_equal(cached.json(), fresh.json(), "A", "full cache hit")


def test_full_hit_keeps_aggregation_alias(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    One service with logs in a fully cacheable window.

    Tests:
    A response served entirely from cache carries the same aggregation alias
    and index as the response that filled the cache.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    start, end = now - 30 * MINUTE, now - 20 * MINUTE
    insert_logs(minutely_logs(start, end, {"svc-a": 2}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()", "total")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    start_ms, end_ms = int(start.timestamp() * 1000), int(end.timestamp() * 1000)

    first = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert first.status_code == HTTPStatus.OK, first.text
    second = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert second.status_code == HTTPStatus.OK, second.text

    first_agg = find_named_result(first.json()["data"]["data"]["results"], "A")["aggregations"][0]
    second_agg = find_named_result(second.json()["data"]["data"]["results"], "A")["aggregations"][0]
    assert first_agg.get("alias"), first_agg
    assert second_agg.get("alias") == first_agg.get("alias"), f"cache hit changed the alias: first={first_agg.get('alias')!r} second={second_agg.get('alias')!r}"
    assert second_agg.get("index") == first_agg.get("index")


def test_limited_group_by_partial_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Four services. svc-a and svc-b dominate the first 20 minutes, svc-c and
    svc-d the next 20. Over the full 40 minutes the top two are svc-a and
    svc-c.

    Tests:
    A top-2 time series (limit=2, order by count() desc) whose first half is
    cached returns the same two series with points for the whole window as
    the request with noCache. The limit is a top-N over the requested
    window, not over each cached piece.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    head_start, head_end, tail_end = now - 60 * MINUTE, now - 40 * MINUTE, now - 20 * MINUTE
    insert_logs(minutely_logs(head_start, head_end, {"svc-a": 10, "svc-b": 8, "svc-c": 1, "svc-d": 1}, attributes={"run": run}))
    insert_logs(minutely_logs(head_end, tail_end, {"svc-a": 1, "svc-b": 1, "svc-c": 10, "svc-d": 8}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        limit=2,
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    head_start_ms, head_end_ms, tail_end_ms = (int(t.timestamp() * 1000) for t in (head_start, head_end, tail_end))

    warm = make_query_request(signoz, token, head_start_ms, head_end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, head_start_ms, tail_end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, head_start_ms, tail_end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "A")
    assert set(fresh_points) == {"svc-a", "svc-c"}, fresh_points
    assert all(len(points) == 40 for points in fresh_points.values()), {s: len(p) for s, p in fresh_points.items()}
    assert_series_points_equal(cached.json(), fresh.json(), "A", "top-N after a partial cache hit")


def test_time_shift_partial_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Logs one hour before the requested window, so a timeShift(3600) query
    reads them.

    Tests:
    A timeShift query whose first 30 minutes are cached returns the same
    points for the next 20 minutes as the request with noCache. The missing
    range is already in the shifted clock; the ranged sub-query must not
    shift it again.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    insert_logs(minutely_logs(now - 120 * MINUTE, now - 60 * MINUTE, {"svc-a": 4, "svc-b": 2}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
        functions=[build_function("timeShift", 3600)],
    )
    start_ms = int((now - 60 * MINUTE).timestamp() * 1000)
    first_end_ms = int((now - 30 * MINUTE).timestamp() * 1000)
    second_end_ms = int((now - 10 * MINUTE).timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, first_end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, second_end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, second_end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "A")
    assert set(fresh_points) == {"svc-a", "svc-b"}, fresh_points
    assert all(len(points) == 50 for points in fresh_points.values()), {s: len(p) for s, p in fresh_points.items()}
    assert_series_points_equal(cached.json(), fresh.json(), "A", "timeShift after a partial cache hit")


def test_promql_unaligned_start_partial_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    Setup:
    A gauge with one sample per minute for two services.

    Tests:
    Two PromQL requests whose starts sit at different offsets inside the
    step (17s, then 43s), as relative dashboard windows do. Both are moved
    onto the step grid, so the second request is a partial hit on the
    first one's entry, and its response equals the request with noCache.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric = f"cache_gauge_{uuid4().hex[:8]}"
    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels={"service": service},
                timestamp=now - minute * MINUTE,
                value=value,
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(46, 8, -1)
            for service, value in (("svc-a", 10.0), ("svc-b", 20.0))
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = {"type": "promql", "spec": {"name": "A", "query": f"sum by (service) ({metric})", "step": STEP}}

    first_start_ms = int((now - 40 * MINUTE + timedelta(seconds=17)).timestamp() * 1000)
    first_end_ms = int((now - 11 * MINUTE + timedelta(seconds=17)).timestamp() * 1000)
    second_start_ms = int((now - 40 * MINUTE + timedelta(seconds=43)).timestamp() * 1000)
    second_end_ms = int((now - 10 * MINUTE + timedelta(seconds=43)).timestamp() * 1000)

    warm = make_query_request(signoz, token, first_start_ms, first_end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, second_start_ms, second_end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, second_start_ms, second_end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "A", label="service")
    assert set(fresh_points) == {"svc-a", "svc-b"}, fresh_points
    phases = {ts % (STEP * 1000) for points in fresh_points.values() for ts in points}
    assert phases == {0}, phases
    assert_series_points_equal(cached.json(), fresh.json(), "A", "PromQL after a partial cache hit with an unaligned start", label="service")


def test_flux_boundary_interval_is_refreshed_with_late_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Logs up to and into the minute T that contains the flux boundary
    (now - 5m). After the first request, more logs arrive inside T after the
    boundary, as an export that lags by a few minutes does.

    Tests:
    T is still filling, so it must not be served from cache. The second
    request reports the new count for T, as the request with noCache does.
    """
    wait_until_second_of_minute(12, 40)
    now = datetime.now(tz=UTC)
    run = uuid4().hex[:8]
    interval_start = (now - 5 * MINUTE).replace(second=0, microsecond=0)
    window_start = interval_start - 10 * MINUTE
    insert_logs(minutely_logs(window_start, interval_start, {"svc-a": 2}, attributes={"run": run}))
    insert_logs([Logs(timestamp=interval_start + timedelta(seconds=2 + i), resources={"service.name": "svc-a"}, attributes={"run": run}, body=f"early {i}") for i in range(3)])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    window_start_ms = int(window_start.timestamp() * 1000)

    warm = make_query_request(signoz, token, window_start_ms, int(datetime.now(tz=UTC).timestamp() * 1000), [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text

    insert_logs([Logs(timestamp=interval_start + timedelta(seconds=50, milliseconds=i), resources={"service.name": "svc-a"}, attributes={"run": run}, body=f"late {i}") for i in range(4)])

    later_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    cached = make_query_request(signoz, token, window_start_ms, later_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, window_start_ms, later_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    interval_ms = int(interval_start.timestamp() * 1000)
    fresh_points = series_points_by_label(fresh.json(), "A")["svc-a"]
    assert fresh_points[interval_ms] == 7, fresh_points
    cached_points = series_points_by_label(cached.json(), "A")["svc-a"]
    assert cached_points[interval_ms] == fresh_points[interval_ms], f"cache served the stale count {cached_points[interval_ms]} for the interval that contains the flux boundary"


def test_full_hit_after_sliding_refreshes_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    One service with logs over an hour, all older than the flux interval.

    Tests:
    Five refreshes of a 30 minute window that slides by one minute (the
    auto-refresh pattern), then a full cache hit of the last window. The
    full hit equals the request with noCache, and the rowsScanned it reports
    does not exceed the rows the refreshes scanned in total. Every refresh
    stores the merged window as one more overlapping bucket whose stats
    already include the previous buckets, and a read sums all of them.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    insert_logs(minutely_logs(now - 70 * MINUTE, now - 10 * MINUTE, {"svc-a": 3}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    base = now - 60 * MINUTE

    refreshes = 5
    for i in range(refreshes):
        refresh = make_query_request(signoz, token, int((base + i * MINUTE).timestamp() * 1000), int((base + 30 * MINUTE + i * MINUTE).timestamp() * 1000), [query], no_cache=False)
        assert refresh.status_code == HTTPStatus.OK, refresh.text

    last_start_ms = int((base + (refreshes - 1) * MINUTE).timestamp() * 1000)
    last_end_ms = int((base + 30 * MINUTE + (refreshes - 1) * MINUTE).timestamp() * 1000)
    cached = make_query_request(signoz, token, last_start_ms, last_end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, last_start_ms, last_end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_rows = fresh.json()["data"]["meta"]["rowsScanned"]
    cached_rows = cached.json()["data"]["meta"]["rowsScanned"]
    assert fresh_rows > 0, fresh.json()["data"]["meta"]
    assert_series_points_equal(cached.json(), fresh.json(), "A", f"full hit after {refreshes} sliding refreshes")
    assert cached_rows <= refreshes * fresh_rows, f"full cache hit reports {cached_rows} rows scanned; {refreshes} refreshes of a query that scans {fresh_rows} rows cannot have scanned more than {refreshes * fresh_rows}"


def test_sub_step_window_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    One log per minute for ten minutes, cached with a 5 minute step.

    Tests:
    A request for the first three minutes with the same step equals the
    request with noCache, which aggregates the partial interval (3 logs).
    The cache holds the whole interval (5 logs) and serves it.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start = now.replace(minute=now.minute - now.minute % 5) - 30 * MINUTE
    end = start + 10 * MINUTE
    run = uuid4().hex[:8]
    insert_logs(minutely_logs(start, end, {"svc-a": 1}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=300,
    )
    start_ms, end_ms = int(start.timestamp() * 1000), int(end.timestamp() * 1000)
    short_end_ms = int((start + 3 * MINUTE).timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, short_end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, short_end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    assert series_points_by_label(fresh.json(), "A") == {"svc-a": {start_ms: 3}}, fresh.text
    assert_series_points_equal(cached.json(), fresh.json(), "A", "window shorter than the step")


def test_running_diff_full_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    Setup:
    A gauge that grows by 10 every minute over four minutes.

    Tests:
    runningDiff over the last three minutes, requested twice. The metrics
    builder fetches one lookback point before the window so the first
    interval has a difference; the cache does not keep that point, so the
    full hit loses the first difference.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric = f"cache_diff_{uuid4().hex[:8]}"
    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels={"service": "svc-a"},
                timestamp=now - (14 - i) * MINUTE,
                value=100.0 + 10 * i,
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
            for i in range(4)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query("A", metric, "avg", "avg", group_by=["service"], functions=[build_function("runningDiff")])
    start_ms, end_ms = int((now - 13 * MINUTE).timestamp() * 1000), int((now - 10 * MINUTE).timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "A", label="service")
    assert sorted(fresh_points["svc-a"].values()) == [10, 10, 10], fresh_points
    assert_series_points_equal(cached.json(), fresh.json(), "A", "runningDiff on a full cache hit", label="service")


def test_limited_group_by_shrunk_window_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a dominates the first five minutes (20/min against 1/min), svc-b the
    next five (10/min against 1/min). Over ten minutes svc-a wins.

    Tests:
    After the whole window is cached with limit=1, a request for the second
    half equals the request with noCache: svc-b. The cache serves the winner
    of the window that filled it.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    start, middle, end = now - 40 * MINUTE, now - 35 * MINUTE, now - 30 * MINUTE
    insert_logs(minutely_logs(start, middle, {"svc-a": 20, "svc-b": 1}, attributes={"run": run}))
    insert_logs(minutely_logs(middle, end, {"svc-a": 1, "svc-b": 10}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        limit=1,
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    start_ms, middle_ms, end_ms = (int(t.timestamp() * 1000) for t in (start, middle, end))

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, middle_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, middle_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "A")
    assert set(fresh_points) == {"svc-b"} and sorted(fresh_points["svc-b"].values()) == [10] * 5, fresh_points
    assert_series_points_equal(cached.json(), fresh.json(), "A", "top-1 of a window smaller than the cached window")


def test_formula_by_alias_full_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    One log per minute for one service, fully cacheable window.

    Tests:
    A formula that references the aggregation by alias, `[A.__result_0] * 2`,
    requested twice. The full hit returns the aggregation without its alias,
    so the reference resolves to nothing and the formula is empty.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    start, end = now - 30 * MINUTE, now - 20 * MINUTE
    insert_logs(minutely_logs(start, end, {"svc-a": 1}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    queries = [
        build_scalar_query(
            name="A",
            signal="logs",
            aggregations=[build_aggregation("count()")],
            group_by=[build_group_by_field("service.name", "string", "resource")],
            filter_expression=f"run = '{run}'",
            step_interval=STEP,
        ),
        build_formula_query("F", "[A.__result_0] * 2"),
    ]
    start_ms, end_ms = int(start.timestamp() * 1000), int(end.timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, end_ms, queries, no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, end_ms, queries, no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, end_ms, queries, no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "F")
    assert set(fresh_points["svc-a"].values()) == {2}, fresh_points
    assert_series_points_equal(cached.json(), fresh.json(), "F", "formula by alias on a full cache hit")


def test_promql_reserved_variable_partial_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Setup:
    No data needed: vector($start_timestamp) returns the request start.

    Tests:
    A two minute request fills the cache, then the same start with a four
    minute window. Every point of the second response equals the request
    start, as with noCache. The gap sub-query renders the variable from its
    own fragment start.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    start = now - 20 * MINUTE
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = {"type": "promql", "spec": {"name": "A", "query": "vector($start_timestamp)", "step": STEP}}
    start_ms = int(start.timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, int((start + 2 * MINUTE).timestamp() * 1000), [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, int((start + 4 * MINUTE).timestamp() * 1000), [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, int((start + 4 * MINUTE).timestamp() * 1000), [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_values = {v["value"] for s in get_all_series(fresh.json(), "A") for v in s["values"]}
    assert fresh_values == {start_ms / 1000}, fresh_values
    cached_values = {v["value"] for s in get_all_series(cached.json(), "A") for v in s["values"]}
    assert cached_values == fresh_values, f"gap sub-query rendered $start_timestamp from its fragment: {sorted(cached_values)}"
    assert_all_series_equal(cached.json(), fresh.json(), "A", "PromQL reserved variable after a partial cache hit")


def test_promql_sub_step_window_at_flux_boundary_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    Setup:
    A gauge with one sample per minute for the last 30 minutes, and a cache
    entry for the query from an older window.

    Tests:
    A one minute window centred on the flux boundary (now - 5m) with a
    5 minute step evaluates once, at the grid instant its start is moved
    to, with the cache as with noCache.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric = f"cache_flux_{uuid4().hex[:8]}"
    insert_metrics(
        [
            Metrics(
                metric_name=metric,
                labels={"service": "svc-a"},
                timestamp=now - minute * MINUTE,
                value=10.0,
                temporality="Unspecified",
                type_="Gauge",
                is_monotonic=False,
            )
            for minute in range(30, -1, -1)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = {"type": "promql", "spec": {"name": "A", "query": f"sum by (service) ({metric})", "step": 300}}

    warm = make_query_request(signoz, token, int((now - 30 * MINUTE).timestamp() * 1000), int((now - 20 * MINUTE).timestamp() * 1000), [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text

    boundary = datetime.now(tz=UTC) - 5 * MINUTE
    start_ms = int((boundary - timedelta(seconds=30)).timestamp() * 1000)
    end_ms = int((boundary + timedelta(seconds=30)).timestamp() * 1000)
    cached = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = series_points_by_label(fresh.json(), "A", label="service")
    assert fresh_points == {"svc-a": {start_ms - start_ms % (300 * 1000): 10}}, fresh_points
    assert_series_points_equal(cached.json(), fresh.json(), "A", "PromQL window shorter than the step at the flux boundary", label="service")


def test_narrower_window_does_not_serve_series_without_points(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a logs for ten minutes, svc-b logs for the first five only.

    Tests:
    After the ten minutes are cached, a request for the last five minutes
    returns only svc-a, as the request with noCache does. The cache keeps
    every series of the bucket and only drops their points, so svc-b comes
    back with no values.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    run = uuid4().hex[:8]
    start, middle, end = now - 40 * MINUTE, now - 35 * MINUTE, now - 30 * MINUTE
    insert_logs(minutely_logs(start, end, {"svc-a": 1}, attributes={"run": run}))
    insert_logs(minutely_logs(start, middle, {"svc-b": 1}, attributes={"run": run}))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=STEP,
    )
    start_ms, middle_ms, end_ms = (int(t.timestamp() * 1000) for t in (start, middle, end))

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, middle_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, middle_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    assert set(series_points_by_label(fresh.json(), "A")) == {"svc-a"}, fresh.text
    assert_series_points_equal(cached.json(), fresh.json(), "A", "series set of a window narrower than the cached window")
