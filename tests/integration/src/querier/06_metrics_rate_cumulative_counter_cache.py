import os
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from src.querier import (
    assert_all_series_equal,
    assert_results_equal,
    build_builder_query,
    make_query_request,
)

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
CUMULATIVE_COUNTERS_FILE = os.path.join(TESTDATA_DIR, "cumulative_counters_1h.jsonl")


def test_cache_right_overlap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Timeline (minutes ago from now):
         |----cached----|
              |----query----|
    40        50      60    70
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_right_overlap"

    # cache: 60-40 min ago, query: 70-50 min ago
    cache_start = int((now - timedelta(minutes=60)).timestamp() * 1000)
    cache_end = int((now - timedelta(minutes=40)).timestamp() * 1000)
    query_start = int((now - timedelta(minutes=70)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=50)).timestamp() * 1000)

    print(
        "yo dates here",
        now.timestamp() * 1000,
        cache_start,
        cache_end,
        query_start,
        query_end,
    )
    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=80),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    response_cache_populate = make_query_request(
        signoz, token, cache_start, cache_end, [query], no_cache=False
    )
    assert response_cache_populate.status_code == HTTPStatus.OK

    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Right overlap: cached result should match ground truth",
    )


def test_cache_left_overlap(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Timeline (minutes ago from now):
              |----cached----|
         |----query----|
    40        50      60    70
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_left_overlap"

    # cache: 70-50 min ago, query: 60-40 min ago
    cache_start = int((now - timedelta(minutes=70)).timestamp() * 1000)
    cache_end = int((now - timedelta(minutes=50)).timestamp() * 1000)
    query_start = int((now - timedelta(minutes=60)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=40)).timestamp() * 1000)

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=80),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    response_cache_populate = make_query_request(
        signoz, token, cache_start, cache_end, [query], no_cache=False
    )
    assert response_cache_populate.status_code == HTTPStatus.OK

    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Left overlap: cached result should match ground truth",
    )


def test_cache_subset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Timeline (minutes ago from now):
    |--------cached--------|
         |--query--|
    40   50        70      80
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_subset"

    # cache: 80-40 min ago, query: 70-50 min ago (subset)
    cache_start = int((now - timedelta(minutes=80)).timestamp() * 1000)
    cache_end = int((now - timedelta(minutes=40)).timestamp() * 1000)
    query_start = int((now - timedelta(minutes=70)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=50)).timestamp() * 1000)

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    response_cache_populate = make_query_request(
        signoz, token, cache_start, cache_end, [query], no_cache=False
    )
    assert response_cache_populate.status_code == HTTPStatus.OK

    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Subset: cached result should match ground truth",
    )


def test_cache_superset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Timeline (minutes ago from now):
              |--cached--|
    |--------query--------|
    40       55    65     80
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_superset"

    # cache: 65-55 min ago, query: 80-40 min ago (superset)
    cache_start = int((now - timedelta(minutes=65)).timestamp() * 1000)
    cache_end = int((now - timedelta(minutes=55)).timestamp() * 1000)
    query_start = int((now - timedelta(minutes=80)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=40)).timestamp() * 1000)

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    response_cache_populate = make_query_request(
        signoz, token, cache_start, cache_end, [query], no_cache=False
    )
    assert response_cache_populate.status_code == HTTPStatus.OK

    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Superset: cached result should match ground truth",
    )


def test_cache_gap_in_middle(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Timeline (minutes ago from now):
    |--cached--|     |--cached--|
    |----------query------------|
    40         50   60          70
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_gap_middle"

    # cache1: 50-40 min ago, cache2: 70-60 min ago, query: 70-40 min ago
    cache1_start = int((now - timedelta(minutes=50)).timestamp() * 1000)
    cache1_end = int((now - timedelta(minutes=40)).timestamp() * 1000)
    cache2_start = int((now - timedelta(minutes=70)).timestamp() * 1000)
    cache2_end = int((now - timedelta(minutes=60)).timestamp() * 1000)
    query_start = int((now - timedelta(minutes=70)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=40)).timestamp() * 1000)

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=80),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    # populate cache with first range
    response_cache1 = make_query_request(
        signoz, token, cache1_start, cache1_end, [query], no_cache=False
    )
    assert response_cache1.status_code == HTTPStatus.OK

    # populate cache with second range i.e create gap
    response_cache2 = make_query_request(
        signoz, token, cache2_start, cache2_end, [query], no_cache=False
    )
    assert response_cache2.status_code == HTTPStatus.OK

    # truth
    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    # query full range - should hit both cache entries and query gap
    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Gap in middle: cached result should match ground truth",
    )


def test_cache_multiple_gaps(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    """
    Timeline (minutes ago from now):
    |-c1-|     |-c2-|     |-c3-|
    |------------query------------|
    40   45   55   60    70   75  80
    """
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_multi_gaps"

    # cache ranges (minutes ago from now)
    ranges = [
        (45, 40),  # cache1: 45-40 min ago
        (60, 55),  # cache2: 60-55 min ago
        (75, 70),  # cache3: 75-70 min ago
    ]
    query_start = int((now - timedelta(minutes=80)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=40)).timestamp() * 1000)

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    for start_min, end_min in ranges:
        start = int((now - timedelta(minutes=start_min)).timestamp() * 1000)
        end = int((now - timedelta(minutes=end_min)).timestamp() * 1000)
        response = make_query_request(
            signoz, token, start, end, [query], no_cache=False
        )
        assert response.status_code == HTTPStatus.OK

    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Multiple gaps: cached result should match ground truth",
    )


def test_cache_group_by_superset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_groupby"

    # cache: 65-55 min ago, query: 80-40 min ago (superset)
    cache_start = int((now - timedelta(minutes=65)).timestamp() * 1000)
    cache_end = int((now - timedelta(minutes=55)).timestamp() * 1000)
    query_start = int((now - timedelta(minutes=80)).timestamp() * 1000)
    query_end = int((now - timedelta(minutes=40)).timestamp() * 1000)

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        group_by=["endpoint"],
    )

    response_cache_populate = make_query_request(
        signoz, token, cache_start, cache_end, [query], no_cache=False
    )
    assert response_cache_populate.status_code == HTTPStatus.OK

    response_ground_truth = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    response_cached = make_query_request(
        signoz, token, query_start, query_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_all_series_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Group by with cache: all series should match ground truth",
    )


def test_cache_incremental_expansion(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_incremental"

    # expanding query ranges (minutes ago from now)
    ranges = [
        (65, 55),  # initial
        (70, 50),  # expanded
        (80, 40),  # final
    ]

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    final_start = int((now - timedelta(minutes=80)).timestamp() * 1000)
    final_end = int((now - timedelta(minutes=40)).timestamp() * 1000)
    response_ground_truth = make_query_request(
        signoz, token, final_start, final_end, [query], no_cache=True
    )
    assert response_ground_truth.status_code == HTTPStatus.OK

    # simulate incremental queries (each populates cache with no_cache=False)
    for start_min, end_min in ranges:
        start = int((now - timedelta(minutes=start_min)).timestamp() * 1000)
        end = int((now - timedelta(minutes=end_min)).timestamp() * 1000)
        response = make_query_request(
            signoz, token, start, end, [query], no_cache=False
        )
        assert response.status_code == HTTPStatus.OK

    # final query should match non-cached result
    response_cached = make_query_request(
        signoz, token, final_start, final_end, [query], no_cache=False
    )
    assert response_cached.status_code == HTTPStatus.OK

    assert_results_equal(
        response_cached.json(),
        response_ground_truth.json(),
        "A",
        "Incremental expansion: final cached result should match ground truth",
    )


def test_cache_sliding_window(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    metric_name = "test_cache_sliding"

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=90),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "rate",
        "sum",
        temporality="cumulative",
        filter_expression='endpoint = "/health"',
    )

    # sliding window queries (minutes ago from now)
    windows = [
        (60, 50),  # first window
        (65, 55),  # slide right
        (70, 60),  # slide right more
    ]

    for start_min, end_min in windows:
        start = int((now - timedelta(minutes=start_min)).timestamp() * 1000)
        end = int((now - timedelta(minutes=end_min)).timestamp() * 1000)

        response_ground_truth = make_query_request(
            signoz, token, start, end, [query], no_cache=True
        )
        assert response_ground_truth.status_code == HTTPStatus.OK

        response_cached = make_query_request(
            signoz, token, start, end, [query], no_cache=False
        )
        assert response_cached.status_code == HTTPStatus.OK

        assert_results_equal(
            response_cached.json(),
            response_ground_truth.json(),
            "A",
            f"Sliding window [{start_min}-{end_min}]: cached should match ground truth",
        )
