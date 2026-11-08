from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_aggregation,
    build_group_by_field,
    build_scalar_query,
    get_all_series,
    index_series_by_label,
    make_query_request,
)
from fixtures.time import wait_until_second_of_minute

MINUTE = timedelta(minutes=1)


def test_flux_boundary_interval_is_refreshed_with_late_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a: 2 logs in every minute of the ten minutes before the minute T that
    contains the flux boundary (now - 5m), and 3 logs early in T. After the
    first request, 4 more logs arrive late in T, after the boundary, as an
    export that lags by a few minutes does.

    Tests:
    T is still filling, so it must not be served from cache. The second
    request reports the new count for T, as the request with noCache does.
    """
    # the boundary must fall after the early logs (second 4) and before the
    # late ones (second 50)
    wait_until_second_of_minute(12, 40)
    now = datetime.now(tz=UTC)
    # the cache outlives the run, so a fixed filter would serve the previous
    # run's points back to this one
    run = uuid4().hex[:8]
    interval_start = (now - 5 * MINUTE).replace(second=0, microsecond=0)
    window_start = interval_start - 10 * MINUTE
    insert_logs(
        [
            Logs(
                timestamp=window_start + minute * MINUTE + timedelta(seconds=1 + i),
                resources={"service.name": "svc-a"},
                attributes={"run": run},
                body=f"svc-a {minute} {i}",
            )
            for minute in range(10)
            for i in range(2)
        ]
        + [
            Logs(
                timestamp=interval_start + timedelta(seconds=2 + i),
                resources={"service.name": "svc-a"},
                attributes={"run": run},
                body=f"early {i}",
            )
            for i in range(3)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_scalar_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        filter_expression=f"run = '{run}'",
        step_interval=60,
    )
    window_start_ms = int(window_start.timestamp() * 1000)

    warm = make_query_request(signoz, token, window_start_ms, int(datetime.now(tz=UTC).timestamp() * 1000), [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text

    insert_logs(
        [
            Logs(
                timestamp=interval_start + timedelta(seconds=50, milliseconds=i),
                resources={"service.name": "svc-a"},
                attributes={"run": run},
                body=f"late {i}",
            )
            for i in range(4)
        ]
    )

    later_ms = int(datetime.now(tz=UTC).timestamp() * 1000)
    cached = make_query_request(signoz, token, window_start_ms, later_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, window_start_ms, later_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    interval_ms = int(interval_start.timestamp() * 1000)
    fresh_points = {point["timestamp"]: point["value"] for point in index_series_by_label(get_all_series(fresh.json(), "A"), "service.name")["svc-a"]["values"]}
    assert fresh_points[interval_ms] == 7, fresh_points
    cached_points = {point["timestamp"]: point["value"] for point in index_series_by_label(get_all_series(cached.json(), "A"), "service.name")["svc-a"]["values"]}
    assert cached_points[interval_ms] == fresh_points[interval_ms], f"cache served the stale count {cached_points[interval_ms]} for the interval that contains the flux boundary"
