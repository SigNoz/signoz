from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_aggregation_query,
    build_group_by_field,
    build_order_by,
    get_all_series,
    index_series_by_label,
    make_query_request,
)

MINUTE = timedelta(minutes=1)


def test_limited_group_by_partial_hit_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    The two halves have different winners, so a limit applied per cached
    piece returns the union of both instead of the window's top two.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # the cache outlives the run, so a fixed filter would serve the previous
    # run's points back to this one
    run = uuid4().hex[:8]
    head_start = now - 60 * MINUTE
    insert_logs(
        [
            Logs(
                timestamp=head_start + minute * MINUTE + timedelta(seconds=1 + i),
                resources={"service.name": service},
                attributes={"run": run},
                body=f"{service} {minute} {i}",
            )
            for minute in range(40)
            for service, count in (("svc-a", 10 if minute < 20 else 1), ("svc-b", 8 if minute < 20 else 1), ("svc-c", 1 if minute < 20 else 10), ("svc-d", 1 if minute < 20 else 8))
            for i in range(count)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_aggregation_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        limit=2,
        filter_expression=f"run = '{run}'",
        step_interval=60,
    )
    head_start_ms = int(head_start.timestamp() * 1000)
    head_end_ms = int((head_start + 20 * MINUTE).timestamp() * 1000)
    tail_end_ms = int((head_start + 40 * MINUTE).timestamp() * 1000)

    warm = make_query_request(signoz, token, head_start_ms, head_end_ms, [query], no_cache=False, request_type=RequestType.TIME_SERIES)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, head_start_ms, tail_end_ms, [query], no_cache=False, request_type=RequestType.TIME_SERIES)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, head_start_ms, tail_end_ms, [query], no_cache=True, request_type=RequestType.TIME_SERIES)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = {service: {point["timestamp"]: point["value"] for point in series["values"]} for service, series in index_series_by_label(get_all_series(fresh.json(), "A"), "service.name").items()}
    assert set(fresh_points) == {"svc-a", "svc-c"}, fresh_points
    assert {service: len(points) for service, points in fresh_points.items()} == {"svc-a": 40, "svc-c": 40}

    cached_points = {service: {point["timestamp"]: point["value"] for point in series["values"]} for service, series in index_series_by_label(get_all_series(cached.json(), "A"), "service.name").items()}
    assert cached_points == fresh_points


def test_limited_group_by_shrunk_window_matches_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    svc-a wins the full window and svc-b wins its second half, so a cache
    that keeps the window's winner serves the wrong series for the half.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # the cache outlives the run, so a fixed filter would serve the previous
    # run's points back to this one
    run = uuid4().hex[:8]
    start = now - 40 * MINUTE
    insert_logs(
        [
            Logs(
                timestamp=start + minute * MINUTE + timedelta(seconds=1 + i),
                resources={"service.name": service},
                attributes={"run": run},
                body=f"{service} {minute} {i}",
            )
            for minute in range(10)
            for service, count in (("svc-a", 20 if minute < 5 else 1), ("svc-b", 1 if minute < 5 else 10))
            for i in range(count)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_aggregation_query(
        name="A",
        signal="logs",
        aggregations=[build_aggregation("count()")],
        group_by=[build_group_by_field("service.name", "string", "resource")],
        order=[build_order_by("count()", "desc")],
        limit=1,
        filter_expression=f"run = '{run}'",
        step_interval=60,
    )
    start_ms = int(start.timestamp() * 1000)
    middle_ms = int((start + 5 * MINUTE).timestamp() * 1000)
    end_ms = int((start + 10 * MINUTE).timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False, request_type=RequestType.TIME_SERIES)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, middle_ms, end_ms, [query], no_cache=False, request_type=RequestType.TIME_SERIES)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, middle_ms, end_ms, [query], no_cache=True, request_type=RequestType.TIME_SERIES)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = {service: {point["timestamp"]: point["value"] for point in series["values"]} for service, series in index_series_by_label(get_all_series(fresh.json(), "A"), "service.name").items()}
    assert set(fresh_points) == {"svc-b"}, fresh_points
    assert sorted(fresh_points["svc-b"].values()) == [10] * 5, fresh_points

    cached_points = {service: {point["timestamp"]: point["value"] for point in series["values"]} for service, series in index_series_by_label(get_all_series(cached.json(), "A"), "service.name").items()}
    assert cached_points == fresh_points
