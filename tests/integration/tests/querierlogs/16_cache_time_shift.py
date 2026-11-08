from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_aggregation,
    build_function,
    build_group_by_field,
    build_scalar_query,
    get_all_series,
    index_series_by_label,
    make_query_request,
)

MINUTE = timedelta(minutes=1)


def test_time_shift_partial_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    svc-a: 4 logs and svc-b: 2 logs in every minute of the hour before the
    requested window, so a timeShift(3600) query reads them. The hour before
    that holds 9 and 7 logs per minute, so a gap read one shift too far back
    returns points with those counts instead of nothing.

    Tests:
    A timeShift query whose first 30 minutes are cached returns the same
    points for the next 20 minutes as the request with noCache. The missing
    range is already in the shifted clock, so the gap query must not shift
    it again.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # the cache outlives the run, so a fixed filter would serve the previous
    # run's points back to this one
    run = uuid4().hex[:8]
    insert_logs(
        [
            Logs(
                timestamp=now - 120 * MINUTE + minute * MINUTE + timedelta(seconds=1 + i),
                resources={"service.name": service},
                attributes={"run": run},
                body=f"{service} {minute} {i}",
            )
            for minute in range(60)
            for service, count in (("svc-a", 4), ("svc-b", 2))
            for i in range(count)
        ]
        + [
            Logs(
                timestamp=now - 180 * MINUTE + minute * MINUTE + timedelta(seconds=1 + i),
                resources={"service.name": service},
                attributes={"run": run},
                body=f"{service} earlier {minute} {i}",
            )
            for minute in range(60)
            for service, count in (("svc-a", 9), ("svc-b", 7))
            for i in range(count)
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

    fresh_points = {service: {point["timestamp"]: point["value"] for point in series["values"]} for service, series in index_series_by_label(get_all_series(fresh.json(), "A"), "service.name").items()}
    assert set(fresh_points) == {"svc-a", "svc-b"}, fresh_points
    assert {service: len(points) for service, points in fresh_points.items()} == {"svc-a": 50, "svc-b": 50}

    cached_points = {service: {point["timestamp"]: point["value"] for point in series["values"]} for service, series in index_series_by_label(get_all_series(cached.json(), "A"), "service.name").items()}
    assert cached_points == fresh_points
