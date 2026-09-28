import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from uuid import uuid4

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    assert_series_points_equal,
    build_builder_query,
    make_query_request,
)

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
CUMULATIVE_COUNTERS_FILE = os.path.join(TESTDATA_DIR, "cumulative_counters_1h.jsonl")
MINUTE = timedelta(minutes=1)


@pytest.mark.parametrize(
    "cached_windows,query_window",
    [
        pytest.param([(60, 40)], (70, 50), id="right_overlap"),
        pytest.param([(70, 50)], (60, 40), id="left_overlap"),
        pytest.param([(80, 40)], (70, 50), id="subset"),
        pytest.param([(65, 55)], (80, 40), id="superset"),
        pytest.param([(50, 40), (70, 60)], (70, 40), id="gap_in_middle"),
        pytest.param([(45, 40), (60, 55), (75, 70)], (80, 40), id="multiple_gaps"),
    ],
)
def test_cumulative_rate_overlap_shapes_match_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
    cached_windows: list[tuple[int, int]],
    query_window: tuple[int, int],
) -> None:
    """
    Setup:
    The cumulative counter fixture (one hour of samples, five endpoints) placed
    90 minutes back, so every window is older than the flux interval.

    Tests:
    The overlap shapes of PR 9977 on a rate over a cumulative counter, whose
    first point needs the sample before the window. Windows are minutes ago
    as (start, end). The cached windows are requested first, then the query
    window through the cache and with noCache, and both must agree.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric = f"cache_shape_{uuid4().hex[:8]}"
    insert_metrics(Metrics.load_from_file(CUMULATIVE_COUNTERS_FILE, base_time=now - 90 * MINUTE, metric_name_override=metric))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query("A", metric, "rate", "sum", temporality="cumulative", group_by=["endpoint"])

    for start_ago, end_ago in cached_windows:
        warm = make_query_request(signoz, token, int((now - start_ago * MINUTE).timestamp() * 1000), int((now - end_ago * MINUTE).timestamp() * 1000), [query], no_cache=False)
        assert warm.status_code == HTTPStatus.OK, warm.text

    start_ms = int((now - query_window[0] * MINUTE).timestamp() * 1000)
    end_ms = int((now - query_window[1] * MINUTE).timestamp() * 1000)
    fresh = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=True)
    assert fresh.status_code == HTTPStatus.OK, fresh.text
    cached = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
    assert cached.status_code == HTTPStatus.OK, cached.text

    assert_series_points_equal(cached.json(), fresh.json(), "A", f"cumulative rate, cached {cached_windows}, query {query_window}", label="endpoint")


def test_cumulative_rate_sliding_refreshes_match_no_cache(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    """
    Setup:
    The cumulative counter fixture placed 90 minutes back.

    Tests:
    A 30 minute window over the rate that slides by one minute for ten
    refreshes (PR 9977's continuous fetching case); every refresh equals the
    request with noCache.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric = f"cache_slide_{uuid4().hex[:8]}"
    insert_metrics(Metrics.load_from_file(CUMULATIVE_COUNTERS_FILE, base_time=now - 90 * MINUTE, metric_name_override=metric))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query("A", metric, "rate", "sum", temporality="cumulative", group_by=["endpoint"])

    for refresh in range(10):
        start_ms = int((now - (80 - refresh) * MINUTE).timestamp() * 1000)
        end_ms = int((now - (50 - refresh) * MINUTE).timestamp() * 1000)
        cached = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=False)
        assert cached.status_code == HTTPStatus.OK, cached.text
        fresh = make_query_request(signoz, token, start_ms, end_ms, [query], no_cache=True)
        assert fresh.status_code == HTTPStatus.OK, fresh.text
        assert_series_points_equal(cached.json(), fresh.json(), "A", f"cumulative rate, refresh {refresh}", label="endpoint")
