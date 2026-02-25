"""
Look at the histogram_data_1h.jsonl file for the relevant data
"""

import random
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_builder_query,
    get_all_series,
    get_series_values,
    make_query_request,
)
from fixtures.utils import get_testdata_file_path

FILE = get_testdata_file_path("histogram_data_1h.jsonl")

@pytest.mark.parametrize(
    "threshold, operator, first_value, last_value",
    [
        (1000, "<=", 11, 69),
        (100, "<=", 1.1, 6.9),
        (7500, "<=", 16.75, 74.75),
        (8000, "<=", 17, 75),
        (80000, "<=", 17, 75), ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
        (1000, ">", 7, 7),
        (100, ">", 16.9, 69.1),
        (7500, ">", 1.25, 1.25),
        (8000, ">", 1, 1),
        (80000, ">", 1, 1), ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
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
        comparisonSpaceAggregationParam={
            "threshold": threshold,
            "operator": operator
        },
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
        (80000, "<=", 34, 150), ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
        (1000, ">", 14, 14),
        (100, ">", 33.8, 138.2),
        (7500, ">", 2.5, 2.5),
        (8000, ">", 2, 2),
        (80000, ">", 2, 2), ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
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
        comparisonSpaceAggregationParam={
            "threshold": threshold,
            "operator": operator
        },
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
        (80000, "<=", 12345, 17, 75), ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
        (1000, ">", 0, 7, 7),
        (100, ">", 11110.5, 16.9, 69.1),
        (7500, ">", 0, 1.25, 1.25),
        (8000, ">", 0, 1, 1),
        (80000, ">", 0, 1, 1), ## cuz we don't know the max value in infinity, all numbers beyond the biggest finite bucket will report the same answer
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
        comparisonSpaceAggregationParam={
            "threshold": threshold,
            "operator": operator
        },
        filter_expression='service = "web"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 60 ## in delta, the value at 10:01 will also be reported
    assert result_values[0]["value"] == zeroth_value
    assert result_values[1]["value"] == first_value ## to keep parallel to the cumulative test cases, first_value refers to the value at 10:02
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
        comparisonSpaceAggregationParam={
            "threshold": threshold,
            "operator": operator
        },
        ## no services filter, this tests for multitemporality handling as well
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) == 60 ## in delta, the value at 10:01 will also be reported
    assert result_values[0]["value"] == zeroth_value
    assert result_values[1]["value"] == first_value ## to keep parallel to the cumulative test cases, first_value refers to the value at 10:02
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

    first_values = {"1000": 33, "1500": 36, "2000": 39, "4000": 42, "5000": 45, "6000": 48, "8000": 51, "+Inf": 54}
    last_values = {"1000": 207, "1500": 210, "2000": 213, "4000": 216, "5000": 219, "6000": 222, "8000": 225, "+Inf": 228}
    for le, values in le_buckets.items():
        assert len(values) == 60

        for v in values:
            assert (
                v["value"] >= 0
            ), f"Count for {le} should not be negative: {v['value']}"
        assert values[0]["value"] == 12345
        assert values[1]["value"] == first_values[le] ## to keep parallel to the cumulative test cases, first_value refers to the value at 10:02
        assert values[-1]["value"] == last_values[le] 