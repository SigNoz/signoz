"""
Look at the multi_temporality_counters_1h.jsonl file for the relevant data
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

MULTI_TEMPORALITY_FILE = get_testdata_file_path("multi_temporality_counters_1h.jsonl")
MULTI_TEMPORALITY_FILE_10h = get_testdata_file_path(
    "multi_temporality_counters_10h.jsonl"
)
MULTI_TEMPORALITY_FILE_24h = get_testdata_file_path(
    "multi_temporality_counters_24h.jsonl"
)


@pytest.mark.parametrize(
    "time_aggregation, expected_value_at_31st_minute, expected_value_at_32nd_minute, steady_value",
    [
        ("rate", 0.0167, 0.133, 0.0833),
        ("increase", 2, 8, 5),
    ],
)
def test_with_steady_values_and_reset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    time_aggregation: str,
    expected_value_at_31st_minute: float,
    expected_value_at_32nd_minute: float,
    steady_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{time_aggregation}_stale"

    metrics = Metrics.load_from_file(
        MULTI_TEMPORALITY_FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        time_aggregation,
        "sum",
        filter_expression='endpoint = "/orders"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) >= 58
    # the counter reset happened at 31st minute
    # we skip the rate value for the first data point without previous value
    assert result_values[29]["value"] == expected_value_at_31st_minute
    assert result_values[30]["value"] == expected_value_at_32nd_minute
    assert (
        result_values[38]["value"] == steady_value
    )  # 38th minute is when cumulative shifts to delta
    count_of_steady_rate = sum(1 for v in result_values if v["value"] == steady_value)
    assert (
        count_of_steady_rate >= 55
    )  # 59 - (1 reset + 1 high rate + 1 at the beginning)
    # All rates should be non-negative (stale periods = 0 rate)
    for v in result_values:
        assert (
            v["value"] >= 0
        ), f"{time_aggregation} should not be negative: {v['value']}"


@pytest.mark.parametrize(
    "time_aggregation, stable_health_value, stable_products_value, stable_checkout_value, spike_checkout_value, stable_orders_value, spike_users_value",
    [
        ("rate", 0.167, 0.333, 0.0167, 0.833, 0.0833, 0.0167),
        ("increase", 10, 20, 1, 50, 5, 1),
    ],
)
def test_group_by_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    time_aggregation: str,
    stable_health_value: float,
    stable_products_value: float,
    stable_checkout_value: float,
    spike_checkout_value: float,
    stable_orders_value: float,
    spike_users_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{time_aggregation}_groupby"

    metrics = Metrics.load_from_file(
        MULTI_TEMPORALITY_FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        time_aggregation,
        "sum",
        group_by=["endpoint"],
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    all_series = get_all_series(data, "A")
    # Should have 5 different endpoints
    assert (
        len(all_series) == 5
    ), f"Expected 5 series for 5 endpoints, got {len(all_series)}"

    # endpoint -> values
    endpoint_values = {}
    for series in all_series:
        endpoint = series.get("labels", [{}])[0].get("value", "unknown")
        values = sorted(series.get("values", []), key=lambda x: x["timestamp"])
        endpoint_values[endpoint] = values

    expected_endpoints = {"/products", "/health", "/checkout", "/orders", "/users"}
    assert (
        set(endpoint_values.keys()) == expected_endpoints
    ), f"Expected endpoints {expected_endpoints}, got {set(endpoint_values.keys())}"

    # at no point rate should be negative
    for endpoint, values in endpoint_values.items():
        for v in values:
            assert (
                v["value"] >= 0
            ), f"Rate for {endpoint} should not be negative: {v['value']}"

    # /health: 60 data points (t01-t60), steady +10/min
    health_values = endpoint_values["/health"]
    assert (
        len(health_values) >= 58
    ), f"Expected >= 58 values for /health, got {len(health_values)}"
    count_steady_health = sum(
        1 for v in health_values if v["value"] == stable_health_value
    )
    assert (
        count_steady_health >= 57
    ), f"Expected >= 57 steady rate values ({stable_health_value}) for /health, got {count_steady_health}"
    # all /health rates should be state except possibly first/last due to boundaries
    for v in health_values[1:-1]:
        assert (
            v["value"] == stable_health_value
        ), f"Expected /health rate {stable_health_value}, got {v['value']}"

    # /products: 51 data points with 10-minute gap (t20-t29 missing), steady +20/min
    products_values = endpoint_values["/products"]
    assert (
        len(products_values) >= 49
    ), f"Expected >= 49 values for /products, got {len(products_values)}"
    count_steady_products = sum(
        1 for v in products_values if v["value"] == stable_products_value
    )

    # most values should be stable, some boundary values differ due to 10-min gap
    assert (
        count_steady_products >= 46
    ), f"Expected >= 46 steady rate values ({stable_products_value}) for /products, got {count_steady_products}"

    # check that non-stable values are due to gap averaging (should be lower)
    gap_boundary_values = [
        v["value"] for v in products_values if v["value"] != stable_products_value
    ]
    for val in gap_boundary_values:
        assert (
            0 < val < stable_products_value
        ), f"Gap boundary values should be between 0 and {stable_products_value}, got {val}"

    # /checkout: 61 data points (t00-t60), +1/min normal, +50/min spike at t40-t44
    checkout_values = endpoint_values["/checkout"]
    assert (
        len(checkout_values) >= 59
    ), f"Expected >= 59 values for /checkout, got {len(checkout_values)}"
    count_steady_checkout = sum(
        1 for v in checkout_values if v["value"] == stable_checkout_value
    )
    assert (
        count_steady_checkout >= 53
    ), f"Expected >= 53 steady {time_aggregation} values ({stable_checkout_value}) for /checkout, got {count_steady_checkout}"
    # check that spike values exist (traffic spike +50/min at t40-t44)
    count_spike_checkout = sum(
        1 for v in checkout_values if v["value"] == spike_checkout_value
    )
    assert (
        count_spike_checkout >= 4
    ), f"Expected >= 4 spike {time_aggregation} values ({spike_checkout_value}) for /checkout, got {count_spike_checkout}"

    # spike values should be consecutive
    spike_indices = [
        i for i, v in enumerate(checkout_values) if v["value"] == spike_checkout_value
    ]
    assert len(spike_indices) >= 4, f"Expected >= 4 spike indices, got {spike_indices}"
    # consecutiveness
    for i in range(1, len(spike_indices)):
        assert (
            spike_indices[i] == spike_indices[i - 1] + 1
        ), f"Spike indices should be consecutive, got {spike_indices}"

    # /orders: 60 data points (t00-t60) with gap at t30, counter reset at t31 (150->2)
    # reset at t31 causes: rate/increase at t30 includes gap (lower), t31 has high rate after reset
    orders_values = endpoint_values["/orders"]
    assert (
        len(orders_values) >= 58
    ), f"Expected >= 58 values for /orders, got {len(orders_values)}"
    count_steady_orders = sum(
        1 for v in orders_values if v["value"] == stable_orders_value
    )
    assert (
        count_steady_orders >= 55
    ), f"Expected >= 55 steady {time_aggregation} values ({stable_orders_value}) for /orders, got {count_steady_orders}"
    # check for counter reset effects - there should be some non-standard values
    non_standard_orders = [
        v["value"] for v in orders_values if v["value"] != stable_orders_value
    ]
    assert (
        len(non_standard_orders) >= 2
    ), f"Expected >= 2 non-standard values due to counter reset, got {non_standard_orders}"
    # post-reset value should be higher (new counter value / interval)
    high_rate_orders = [v for v in non_standard_orders if v > stable_orders_value]
    assert (
        len(high_rate_orders) >= 1
    ), f"Expected at least one high {time_aggregation} value after counter reset, got {non_standard_orders}"

    # /users: 56 data points (t05-t60), sparse +1 every 5 minutes
    users_values = endpoint_values["/users"]
    assert (
        len(users_values) >= 54
    ), f"Expected >= 54 values for /users, got {len(users_values)}"
    count_zero_users = sum(1 for v in users_values if v["value"] == 0)
    # most values should be 0 (flat periods between increments)
    assert (
        count_zero_users >= 40
    ), f"Expected >= 40 zero {time_aggregation} values for /users (sparse data), got {count_zero_users}"
    # non-zero values should be 0.0167 (1/60 increment rate)
    non_zero_users = [v["value"] for v in users_values if v["value"] != 0]
    count_increment_rate = sum(1 for v in non_zero_users if v == spike_users_value)
    assert (
        count_increment_rate >= 8
    ), f"Expected >= 8 increment {time_aggregation} values ({spike_users_value}) for /users, got {count_increment_rate}"


@pytest.mark.parametrize(
    "time_aggregation, expected_value_at_30th_minute, expected_value_at_31st_minute, value_at_switch",
    [
        ("rate", 0.183, 0.183, 0.25),
        ("increase", 11, 12, 15),
    ],
)
def test_for_service_with_switch(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    time_aggregation: str,
    expected_value_at_30th_minute: float,
    expected_value_at_31st_minute: float,
    value_at_switch: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{time_aggregation}_count"

    metrics = Metrics.load_from_file(
        MULTI_TEMPORALITY_FILE,
        base_time=now - timedelta(minutes=60),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        time_aggregation,
        "sum",
        filter_expression='service = "api"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) >= 59
    assert result_values[29]["value"] == expected_value_at_30th_minute  # 0.183
    assert result_values[30]["value"] == expected_value_at_31st_minute  # 0.183
    assert result_values[37]["value"] == value_at_switch  # 0.25
    assert (
        result_values[38]["value"] == value_at_switch  # 0.25
    )  # 39th minute is when cumulative shifts to delta
    # All rates should be non-negative (stale periods = 0 rate)
    for v in result_values:
        assert (
            v["value"] >= 0
        ), f"{time_aggregation} should not be negative: {v['value']}"


@pytest.mark.parametrize(
    "time_aggregation, expected_value",
    [
        ("rate", 0.0122),
        ("increase", 22),
    ],
)
def test_for_week_long_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    time_aggregation: str,
    expected_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(days=7)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{time_aggregation}_" + hex(random.getrandbits(32))[2:]

    metrics = Metrics.load_from_file(
        MULTI_TEMPORALITY_FILE_10h,
        base_time=now - timedelta(minutes=600),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        time_aggregation,
        "sum",
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    # the zeroth value may not cover the whole time range
    for value in result_values[1:]:
        assert value["value"] == expected_value


@pytest.mark.parametrize(
    "time_aggregation, expected_value",
    [
        ("rate", 0.0122),
        ("increase", 110),
    ],
)
def test_for_month_long_time_range(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
    time_aggregation: str,
    expected_value: float,
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(days=31)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = f"test_{time_aggregation}_" + hex(random.getrandbits(32))[2:]

    metrics = Metrics.load_from_file(
        MULTI_TEMPORALITY_FILE_24h,
        base_time=now - timedelta(minutes=1441),
        metric_name_override=metric_name,
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        time_aggregation,
        "sum",
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    ## the zeroth and last values may not cover the whole 9000 seconds
    for value in result_values[1:-1]:
        assert value["value"] == expected_value
