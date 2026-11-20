from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_builder_query,
    build_function,
    get_all_series,
    index_series_by_label,
    make_query_request,
)

MINUTE = timedelta(minutes=1)


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
    runningDiff over the last three of those minutes, requested twice. The
    metrics statement reads one step before the window so the first
    interval has a difference. The second request, a full cache hit, must
    return the same three differences as the request with noCache.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    # the cache outlives the run, so a fixed name would serve the previous
    # run's points back to this one
    metric_name = f"cache_running_diff_{uuid4().hex[:8]}"
    insert_metrics(
        [
            Metrics(
                metric_name=metric_name,
                labels={"service": "svc-a"},
                timestamp=now - (14 - i) * MINUTE,
                value=100.0 + 10 * i,
                type_="Gauge",
                is_monotonic=False,
            )
            for i in range(4)
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query("A", metric_name, "avg", "avg", group_by=["service"], functions=[build_function("runningDiff")])
    start_ms = int((now - 13 * MINUTE).timestamp() * 1000)
    end_ms = int((now - 10 * MINUTE).timestamp() * 1000)

    warm = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert warm.status_code == HTTPStatus.OK, warm.text
    cached = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text
    fresh = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text

    fresh_points = {point["timestamp"]: point["value"] for point in index_series_by_label(get_all_series(fresh.json(), "A"), "service")["svc-a"]["values"]}
    assert sorted(fresh_points.values()) == [10, 10, 10], fresh_points

    cached_points = {point["timestamp"]: point["value"] for point in index_series_by_label(get_all_series(cached.json(), "A"), "service")["svc-a"]["values"]}
    assert cached_points == fresh_points
