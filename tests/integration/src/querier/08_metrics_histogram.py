"""
Look at the histogram_data_1h.jsonl file for the relevant data
"""

import logging
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List, Optional, Union

logger = logging.getLogger(__name__)

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_builder_query,
    build_order_by,
    get_all_series,
    get_series_values,
    make_query_request,
)
from fixtures.utils import get_testdata_file_path

FILE = get_testdata_file_path("histogram_data_1h.jsonl")
FILE_WITH_MANY_GROUPS = get_testdata_file_path("histogram_data_1h_many_groups.jsonl")


@pytest.mark.parametrize(
    "threshold, operator, first_value, last_value",
    [
        (1000, "<=", 11, 69),
        (100, "<=", 1.1, 6.9),
        (7500, "<=", 16.75, 74.75),
        (8000, "<=", 17, 75),
        (
            80000,
            "<=",
            17,
            75,
        ),  ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
        (1000, ">", 7, 7),
        (100, ">", 16.9, 69.1),
        (7500, ">", 1.25, 1.25),
        (8000, ">", 1, 1),
        (
            80000,
            ">",
            1,
            1,
        ),  ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
    ],
)
def test_histogram_count_for_one_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    threshold: float,
    operator: str,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_one_endpoint_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "increase",
        "count",
        comparisonSpaceAggregationParam={"threshold": threshold, "operator": operator},
        filter_expression='endpoint = "/health"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 59
    assert result_values[0]["value"] == first_value
    assert result_values[-1]["value"] == last_value


@pytest.mark.parametrize(
    "threshold, operator, first_value, last_value",
    [
        (1000, "<=", 22, 138),
        (100, "<=", 2.2, 13.8),
        (7500, "<=", 33.5, 149.5),
        (8000, "<=", 34, 150),
        (
            80000,
            "<=",
            34,
            150,
        ),  ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
        (1000, ">", 14, 14),
        (100, ">", 33.8, 138.2),
        (7500, ">", 2.5, 2.5),
        (8000, ">", 2, 2),
        (
            80000,
            ">",
            2,
            2,
        ),  ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
    ],
)
def test_histogram_count_for_one_service(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    threshold: float,
    operator: str,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_one_service_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "increase",
        "count",
        comparisonSpaceAggregationParam={"threshold": threshold, "operator": operator},
        filter_expression='service = "api"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 59
    assert result_values[0]["value"] == first_value
    assert result_values[-1]["value"] == last_value


@pytest.mark.parametrize(
    "threshold, operator, zeroth_value, first_value, last_value",
    [
        (1000, "<=", 12345, 11, 69),
        (100, "<=", 1234.5, 1.1, 6.9),
        (7500, "<=", 12345, 16.75, 74.75),
        (8000, "<=", 12345, 17, 75),
        (
            80000,
            "<=",
            12345,
            17,
            75,
        ),  ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
        (1000, ">", 0, 7, 7),
        (100, ">", 11110.5, 16.9, 69.1),
        (7500, ">", 0, 1.25, 1.25),
        (8000, ">", 0, 1, 1),
        (
            80000,
            ">",
            0,
            1,
            1,
        ),  ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
    ],
)
def test_histogram_count_for_delta_service(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    threshold: float,
    operator: str,
    zeroth_value: float,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_delta_service_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "increase",
        "count",
        comparisonSpaceAggregationParam={"threshold": threshold, "operator": operator},
        filter_expression='service = "web"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert (
        len(result_values) == 60
    )  ## in delta, the value at 10:01 will also be reported
    assert result_values[0]["value"] == zeroth_value
    assert (
        result_values[1]["value"] == first_value
    )  ## to keep parallel to the cumulative test cases, first_value refers to the value at 10:02
    assert result_values[-1]["value"] == last_value


@pytest.mark.parametrize(
    "threshold, operator, zeroth_value, first_value, last_value",
    [
        (1000, "<=", 12345, 33, 207),
        (100, "<=", 1234.5, 3.3, 20.7),
        (7500, "<=", 12345, 50.25, 224.25),
        (8000, "<=", 12345, 51, 225),
        (80000, "<=", 12345, 51, 225),
        (1000, ">", 0, 21, 21),
        (100, ">", 11110.5, 50.7, 207.3),
        (7500, ">", 0, 3.75, 3.75),
        (8000, ">", 0, 3, 3),
        (80000, ">", 0, 3, 3),
    ],
)
def test_histogram_count_for_all_services(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    threshold: float,
    operator: str,
    zeroth_value: float,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_all_services_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "increase",
        "count",
        comparisonSpaceAggregationParam={"threshold": threshold, "operator": operator},
        ## no services filter, this tests for multitemporality handling as well
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert (
        len(result_values) == 60
    )  ## in delta, the value at 10:01 will also be reported
    assert result_values[0]["value"] == zeroth_value
    assert (
        result_values[1]["value"] == first_value
    )  ## to keep parallel to the cumulative test cases, first_value refers to the value at 10:02
    assert result_values[-1]["value"] == last_value


def test_histogram_count_no_param(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_count_no_param_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "increase",
        "count",
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    all_series = get_all_series(data, "A")
    assert (
        len(all_series) == 8
    ), f"Expected 8 series for 8 le buckets, got {len(all_series)}"

    le_buckets = {}
    for series in all_series:
        le = series.get("labels", [{}])[0].get("value", "unknown")
        values = sorted(series.get("values", []), key=lambda x: x["timestamp"])
        le_buckets[le] = values

    expected_buckets = {"1000", "1500", "2000", "4000", "5000", "6000", "8000", "+Inf"}
    assert (
        set(le_buckets.keys()) == expected_buckets
    ), f"Expected endpoints {expected_buckets}, got {set(le_buckets.keys())}"

    first_values = {
        "1000": 33,
        "1500": 36,
        "2000": 39,
        "4000": 42,
        "5000": 45,
        "6000": 48,
        "8000": 51,
        "+Inf": 54,
    }
    last_values = {
        "1000": 207,
        "1500": 210,
        "2000": 213,
        "4000": 216,
        "5000": 219,
        "6000": 222,
        "8000": 225,
        "+Inf": 228,
    }
    for le, values in le_buckets.items():
        assert len(values) == 60

        for v in values:
            assert (
                v["value"] >= 0
            ), f"Count for {le} should not be negative: {v['value']}"
        assert values[0]["value"] == 12345
        assert (
            values[1]["value"] == first_values[le]
        )  ## to keep parallel to the cumulative test cases, first_value refers to the value at 10:02
        assert values[-1]["value"] == last_values[le]

@pytest.mark.parametrize(
    "space_agg, zeroth_value, first_value, last_value",
    [
        ("p50", 500, 818.182, 550.725),
        ("p75", 750, 3000, 826.087),
        ("p90", 900, 6400, 991.304),
        ("p95", 950, 8000, 4200),
        ("p99", 990, 8000, 8000),
    ],
)
def test_histogram_percentile_for_all_services(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    space_agg: str,
    zeroth_value: float,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{space_agg}_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        space_agg,
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 60
    assert result_values[0]["value"] == zeroth_value
    assert result_values[1]["value"] == first_value
    assert result_values[-1]["value"] == last_value

@pytest.mark.parametrize(
    "space_agg, first_value, last_value",
    [
        ("p50", 818.182, 550.725),
        ("p75", 3000, 826.087),
        ("p90", 6400, 991.304),
        ("p95", 8000, 4200),
        ("p99", 8000, 8000),
    ],
)
def test_histogram_percentile_for_cumulative_service(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    space_agg: str,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{space_agg}_cumulative_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        space_agg,
        filter_expression='service = "api"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 59
    assert result_values[0]["value"] == first_value
    assert result_values[-1]["value"] == last_value

@pytest.mark.parametrize(
    "space_agg, zeroth_value, first_value, last_value",
    [
        ("p50", 500, 818.182, 550.725),
        ("p75", 750, 3000, 826.087),
        ("p90", 900, 6400, 991.304),
        ("p95", 950, 8000, 4200),
        ("p99", 990, 8000, 8000),
    ],
)
def test_histogram_percentile_for_delta_service(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    space_agg: str,
    zeroth_value: float,
    first_value: float,
    last_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{space_agg}_bucket"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        space_agg,
        filter_expression='service = "web"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 60
    assert result_values[0]["value"] == zeroth_value
    assert result_values[1]["value"] == first_value
    assert result_values[-1]["value"] == last_value


def _assert_series_endpoint_labels(
    series: list,
    expected_endpoints: Union[set, List[str]],
    prefix: str,
) -> None:
    labels = [s.get("labels", [{}])[0].get("value", "unknown") for s in series]
    if isinstance(expected_endpoints, set):
        assert (
            set(labels) == expected_endpoints
        ), f"Expected {prefix} endpoints {expected_endpoints}, got {set(labels)}"
    else:
        assert labels == expected_endpoints, (
            f"Expected {prefix} endpoints in order {expected_endpoints}, got {labels}"
        )


@pytest.mark.parametrize(
    "order_suffix,order_by,limit,expected_count,expected_endpoints",
    [
        (
            "no_order",
            None,
            None,
            3,
            ["/checkout", "/health", "/orders"],
        ),
        (
            "asc",
            [build_order_by("endpoint", "asc")],
            None,
            3,
            ["/checkout", "/health", "/orders"],
        ),
        (
            "asc_lim2",
            [build_order_by("endpoint", "asc")],
            2,
            2,
            ["/checkout", "/health"],
        ),
        (
            "desc",
            [build_order_by("endpoint", "desc")],
            None,
            3,
            ["/orders", "/health", "/checkout"],
        ),
        (
            "desc_lim2",
            [build_order_by("endpoint", "desc")],
            2,
            2,
            ["/orders", "/health"],
        ),
        (
            "asc_metric_name",
            [build_order_by("count(test_histogram_count_groupby_asc_metric_name)", "asc")],
            None,
            3,
            ["/health", "/orders", "/checkout"], ## health and orders have the same size so they are then sorted endpoint as a tiebreaker
        ),
        (
            "asc_metric_name_lim2",
            [build_order_by("count(test_histogram_count_groupby_asc_metric_name_lim2)", "asc")],
            2,
            2,
            ["/health", "/orders"],
        ),
        (
            "desc_metric_name",
            [build_order_by("count(test_histogram_count_groupby_desc_metric_name)", "desc")],
            None,
            3,
            ["/checkout", "/health", "/orders"], ## health and orders have the same size so they are then sorted endpoint as a tiebreaker
        ),
        (
            "desc_metric_name_lim2",
            [build_order_by("count(test_histogram_count_groupby_desc_metric_name_lim2)", "desc")],
            2,
            2,
            ["/checkout", "/health"],
        ),
    ],
)
def test_histogram_count_group_by_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    order_suffix: str,
    order_by: Optional[List],
    limit: Optional[int],
    expected_count: int,
    expected_endpoints: Union[set, List[str]],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_histogram_count_groupby_{order_suffix}"

    metrics = Metrics.load_from_file(
        FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_count = build_builder_query(
        "A",
        metric_name,
        "increase",
        "count",
        comparisonSpaceAggregationParam={"threshold": 1000, "operator": "<="},
        group_by=["endpoint"],
        order_by=order_by,
        limit=limit,
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query_count])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    count_all_series = get_all_series(data, "A")

    assert (
        len(count_all_series) == expected_count
    ), f"Expected {expected_count} series, got {len(count_all_series)}"

    _assert_series_endpoint_labels(count_all_series, expected_endpoints, "count")

    count_values = {}
    for series in count_all_series:
        endpoint = series.get("labels", [{}])[0].get("value", "unknown")
        count_values[endpoint] = sorted(
            series.get("values", []), key=lambda x: x["timestamp"]
        )

    for endpoint, values in count_values.items():
        for v in values:
            assert v["value"] >= 0, f"Count for {endpoint} should not be negative: {v['value']}"

    # /health (cumulative, service=api): 59 points, increase starts at 11/min → 69/min
    if "/health" in count_values:
        vals = count_values["/health"]
        assert vals[0]["value"] == 11, f"Expected /health count first=11, got {vals[0]['value']}"
        assert vals[-1]["value"] == 69, f"Expected /health count last=69, got {vals[-1]['value']}"

    # /orders (cumulative, service=api): same distribution as /health
    if "/orders" in count_values:
        vals = count_values["/orders"]
        assert vals[0]["value"] == 11, f"Expected /orders count first=11, got {vals[0]['value']}"
        assert vals[-1]["value"] == 69, f"Expected /orders count last=69, got {vals[-1]['value']}"

    # /checkout (delta, service=web): 60 points, zeroth=12345 (raw delta), then 11/min → 69/min
    if "/checkout" in count_values:
        vals = count_values["/checkout"]
        assert vals[0]["value"] == 12345, f"Expected /checkout count zeroth=12345, got {vals[0]['value']}"
        assert vals[1]["value"] == 11, f"Expected /checkout count first=11, got {vals[1]['value']}"
        assert vals[-1]["value"] == 69, f"Expected /checkout count last=69, got {vals[-1]['value']}"


@pytest.mark.parametrize(
    "order_suffix,order_by,limit,expected_count,expected_endpoints",
    [
        (
            "no_order",
            None,
            None,
            4,
            [ "/checkout", "/health", "/orders", "/coupon"],
        ),
        (
            "only_limit",
            None,
            1,
            1,
            [ "/checkout"], ##health and checkout have the same size so they are then sorted endpoint as a tiebreaker, and only checkout makes the limit
        ),
        (
            "asc",
            [build_order_by("endpoint", "asc")],
            None,
            4,
            [ "/checkout", "/coupon", "/health", "/orders"],
        ),
        (
            "asc_lim2",
            [build_order_by("endpoint", "asc")],
            2,
            2,
            ["/checkout", "/coupon"],
        ),
        (
            "desc",
            [build_order_by("endpoint", "desc")],
            None,
            4,
            ["/orders", "/health", "/coupon", "/checkout"],
        ),
        (
            "desc_lim2",
            [build_order_by("endpoint", "desc")],
            2,
            2,
            ["/orders", "/health"],
        ),
        (
            "asc_metric_name",
            [build_order_by("p75(test_histogram_p75_groupby_asc_metric_name)", "asc")],
            None,
            4,
            ["/coupon", "/orders", "/checkout", "/health"], ## health and checkout have the same size so they are then sorted endpoint as a tiebreaker
        ),
        (
            "asc_metric_name_lim2",
            [build_order_by("p75(test_histogram_p75_groupby_asc_metric_name_lim2)", "asc")],
            2,
            2,
            ["/coupon", "/orders"],
        ),
        (
            "asc_metric_name_lim3",
            [build_order_by("p75(test_histogram_p75_groupby_asc_metric_name_lim3)", "asc")],
            3,
            3,
            ["/coupon", "/orders", "/checkout"], ##health and checkout have the same size so they are then sorted endpoint as a tiebreaker, and only checkout makes the limit
        ),
        (
            "desc_metric_name",
            [build_order_by("p75(test_histogram_p75_groupby_desc_metric_name)", "desc")],
            None,
            4,
            [ "/checkout", "/health", "/orders", "/coupon"],
        ),
        (
            "desc_metric_name_lim2",
            [build_order_by("p75(test_histogram_p75_groupby_desc_metric_name_lim2)", "desc")],
            2,
            2,
            [ "/checkout", "/health"],
        ),
        (
            "desc_metric_name_lim2",
            [build_order_by("p75(test_histogram_p75_groupby_desc_metric_name_lim2)", "desc")],
            1,
            1,
            [ "/checkout"], ##health and checkout have the same size so they are then sorted endpoint as a tiebreaker, and only checkout makes the limit
        ),
    ],
)
def test_histogram_percentile_group_by_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    order_suffix: str,
    order_by: Optional[List],
    limit: Optional[int],
    expected_count: int,
    expected_endpoints: Union[set, List[str]],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_histogram_p75_groupby_{order_suffix}"

    metrics = Metrics.load_from_file(
        FILE_WITH_MANY_GROUPS,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_p75 = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        "p75",
        group_by=["endpoint"],
        order_by=order_by,
        limit=limit,
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query_p75])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    p75_series = get_all_series(data, "A")

    for series in p75_series:
        endpoint = series.get("labels", [{}])[0].get("value", "unknown")
        values = series.get("values", [])

    assert (
        len(p75_series) == expected_count
    ), f"Expected {expected_count} p75 series, got {len(p75_series)}"

    _assert_series_endpoint_labels(p75_series, expected_endpoints, "p75")

    p75_values = {}
    for series in p75_series:
        endpoint = series.get("labels", [{}])[0].get("value", "unknown")
        p75_values[endpoint] = sorted(
            series.get("values", []), key=lambda x: x["timestamp"]
        )

    for endpoint, values in p75_values.items():
        for v in values:
            assert v["value"] >= 0, f"p75 for {endpoint} should not be negative: {v['value']}"

    # /health (cumulative, service=api)
    if "/health" in p75_values:
        vals = p75_values["/health"]
        assert vals[0]["value"] == 6000, f"Expected /health p75 first=8000, got {vals[0]['value']}"
        assert vals[-1]["value"] == 6000, f"Expected /health p75 last=991.304, got {vals[-1]['value']}"

    # /orders (cumulative, service=api): same distribution as /health
    if "/orders" in p75_values:
        vals = p75_values["/orders"]
        assert vals[0]["value"] == 4500, f"Expected /orders p75 first=6400, got {vals[0]['value']}"
        assert vals[-1]["value"] == 4500, f"Expected /orders p75 last=991.304, got {vals[-1]['value']}"

    # /checkout (delta, service=web): 60 points
    if "/checkout" in p75_values:
        vals = p75_values["/checkout"]
        assert vals[0]["value"] == 6000, f"Expected /checkout p75 zeroth=900, got {vals[0]['value']}"
        assert vals[1]["value"] == 6000, f"Expected /checkout p75 first=6400, got {vals[1]['value']}"
        assert vals[-1]["value"] == 6000, f"Expected /checkout p75 last=991.304, got {vals[-1]['value']}"

    # /coupon (delta, service=web): 60 points
    if "/coupon" in p75_values:
        vals = p75_values["/coupon"]
        assert vals[0]["value"] == 1125, f"Expected /coupon p75 zeroth=900, got {vals[0]['value']}"
        assert vals[1]["value"] == 1125, f"Expected /coupon p75 first=6400, got {vals[1]['value']}"
        assert vals[-1]["value"] == 1125, f"Expected /coupon p75 last=991.304, got {vals[-1]['value']}"


@pytest.mark.parametrize(
    "order_suffix,order_by,limit,expected_count,expected_endpoints, expected_status_codes",
    [
        (
            "no_order",
            None,
            None,
            5,
            [ "/checkout", "/health", "/orders", "/coupon", "/coupon"], ## coupon has 200 and 500 status codes so it will appear twice
            [ "200", "200", "200", "200", "500"],
        ),
        (
            "only_limit",
            None,
            1,
            1,
            [ "/checkout"], ##health and checkout have the same size so they are then sorted endpoint as a tiebreaker, and only checkout makes the limit
            [ "200"]
        ),
        (
            "asc_endpoint",
            [build_order_by("endpoint", "asc")],
            None,
            5,
            [ "/checkout", "/coupon", "/coupon", "/health", "/orders"],
            [ "200", "200", "500", "200", "200"],
        ),
        (
            "asc_endpoint_status_code",
            [build_order_by("endpoint", "asc"), build_order_by("status_code", "asc")],
            None,
            5,
            [ "/checkout", "/coupon", "/coupon", "/health", "/orders"],
            [ "200", "200", "500", "200", "200"],
        ),
        (
            "asc_status_code_endpoint",
            [build_order_by("status_code", "asc"), build_order_by("endpoint", "asc")],
            None,
            5,
            [ "/checkout", "/coupon", "/health", "/orders", "/coupon"],
            [ "200", "200", "200", "200", "500"],
        ),
        (
            "asc_endpoint_limit_2",
            [build_order_by("endpoint", "asc")],
            2,
            2,
            [ "/checkout", "/coupon"],
            [ "200", "200"],
        ),
        (
            "asc_endpoint_status_code_limit_2",
            [build_order_by("endpoint", "asc"), build_order_by("status_code", "asc")],
            2,
            2,
            [ "/checkout", "/coupon"],
            [ "200", "200"],
        ),
        (
            "asc_status_code_endpoint_limit_4",
            [build_order_by("status_code", "asc"), build_order_by("endpoint", "asc")],
            4,
            4,
            [ "/checkout", "/coupon", "/health", "/orders"],
            [ "200", "200", "200", "200"],
        ),
        (
            "desc_endpoint",
            [build_order_by("endpoint", "desc")],
            None,
            5,
            ["/orders", "/health", "/coupon", "/coupon", "/checkout"],
            [ "200", "200", "200", "500", "200"],
        ),
        (
            "desc_endpoint_status_code",
            [build_order_by("endpoint", "desc"), build_order_by("status_code", "desc")],
            None,
            5,
            ["/orders", "/health", "/coupon", "/coupon", "/checkout"],
            [ "200", "200", "500", "200", "200"],
        ),
        (
            "desc_status_code_endpoint",
            [build_order_by("status_code", "desc"), build_order_by("endpoint", "desc")],
            None,
            5,
            ["/coupon", "/orders", "/health", "/coupon", "/checkout"],
            [ "500", "200", "200", "200", "200"],
        ),
        (
            "desc_endpoint_limit2",
            [build_order_by("endpoint", "desc")],
            3,
            3,
            ["/orders", "/health", "/coupon"],
            [ "200", "200", "200"],
        ),
        (
            "desc_endpoint_status_code_limit3",
            [build_order_by("endpoint", "desc"), build_order_by("status_code", "desc")],
            3,
            3,
            ["/orders", "/health", "/coupon"],
            [ "200", "200", "500"],
        ),
        (
            "desc_status_code_endpoint_limit2",
            [build_order_by("status_code", "desc"), build_order_by("endpoint", "desc")],
            2,
            2,
            ["/coupon", "/orders"],
            [ "500", "200"],
        ),
    ],
)
def test_histogram_percentile_group_by_endpoint_and_status_code(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    order_suffix: str,
    order_by: Optional[List],
    limit: Optional[int],
    expected_count: int,
    expected_endpoints: Union[set, List[str]],
    expected_status_codes: Union[set, List[str]],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_histogram_p75_groupby_{order_suffix}"

    metrics = Metrics.load_from_file(
        FILE_WITH_MANY_GROUPS,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_p75 = build_builder_query(
        "A",
        metric_name,
        "doesnotreallymatter",
        "p75",
        group_by=["endpoint", "status_code"],
        order_by=order_by,
        limit=limit,
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query_p75])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    p75_series = get_all_series(data, "A")

    for series in p75_series:
        endpoint = series.get("labels", [{}])[0].get("value", "unknown")
        status_code = series.get("labels", [{}])[1].get("value", "unknown")
        values = series.get("values", [])
        avg = sum(v["value"] for v in values) / len(values) if values else 0
        logger.warning("endpoint=%s status_code=%s average_p75=%.3f", endpoint, status_code, avg)

    assert (
        len(p75_series) == expected_count
    ), f"Expected {expected_count} p75 series, got {len(p75_series)}"

    _assert_series_endpoint_labels(p75_series, expected_endpoints, "p75")
    
    endpoints = [s.get("labels", [{}])[0].get("value", "unknown") for s in p75_series]
    assert endpoints == expected_endpoints, (
        f"Expected p75 endpoints in order {expected_endpoints}, got {endpoints}"
    )
    status_codes = [s.get("labels", [{}])[1].get("value", "unknown") for s in p75_series]
    assert status_codes == expected_status_codes, (
        f"Expected p75 endpoints in order {expected_status_codes}, got {status_codes}"
    )

    p75_values = {}
    for series in p75_series:
        endpoint = series.get("labels", [{}])[0].get("value", "unknown")
        status_code = series.get("labels", [{}])[1].get("value", "unknown")
        p75_values[endpoint+status_code] = sorted(
            series.get("values", []), key=lambda x: x["timestamp"]
        )

    for endpoint, values in p75_values.items():
        for v in values:
            assert v["value"] >= 0, f"p75 for {endpoint} should not be negative: {v['value']}"

    # /health (cumulative, service=api)
    if "/health200" in p75_values:
        vals = p75_values["/health200"]
        assert vals[0]["value"] == 6000, f"Expected /health p75 first=8000, got {vals[0]['value']}"
        assert vals[-1]["value"] == 6000, f"Expected /health p75 last=991.304, got {vals[-1]['value']}"

    # /orders (cumulative, service=api): same distribution as /health
    if "/orders200" in p75_values:
        vals = p75_values["/orders200"]
        assert vals[0]["value"] == 4500, f"Expected /orders p75 first=6400, got {vals[0]['value']}"
        assert vals[-1]["value"] == 4500, f"Expected /orders p75 last=991.304, got {vals[-1]['value']}"

    # /checkout (delta, service=web): 60 points
    if "/checkout200" in p75_values:
        vals = p75_values["/checkout200"]
        assert vals[0]["value"] == 6000, f"Expected /checkout p75 zeroth=900, got {vals[0]['value']}"
        assert vals[1]["value"] == 6000, f"Expected /checkout p75 first=6400, got {vals[1]['value']}"
        assert vals[-1]["value"] == 6000, f"Expected /checkout p75 last=991.304, got {vals[-1]['value']}"

    # /coupon (delta, service=web): 60 points
    if "/coupon200" in p75_values:
        vals = p75_values["/coupon200"]
        assert vals[0]["value"] == 1250, f"Expected /coupon200 p75 zeroth=900, got {vals[0]['value']}"
        assert vals[1]["value"] == 1250, f"Expected /coupon200 p75 first=6400, got {vals[1]['value']}"
        assert vals[-1]["value"] == 1250, f"Expected /coupon200 p75 last=991.304, got {vals[-1]['value']}"
    
    if "/coupon500" in p75_values:
        vals = p75_values["/coupon500"]
        assert vals[0]["value"] == 750, f"Expected /coupon500 p75 zeroth=900, got {vals[0]['value']}"
        assert vals[1]["value"] == 750, f"Expected /coupon500 p75 first=6400, got {vals[1]['value']}"
        assert vals[-1]["value"] == 750, f"Expected /coupon500 p75 last=991.304, got {vals[-1]['value']}"
