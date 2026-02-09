"""
Look at the multi_temporality_counters_1h.jsonl file for the relevant data
"""

import os
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any, Callable, List

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics
from fixtures.querier import (
    build_builder_query,
    get_all_series,
    get_series_values,
    make_query_request,
)

TESTDATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "testdata")
MULTI_TEMPORALITY_FILE = os.path.join(TESTDATA_DIR, "multi_temporality_counters_1h.jsonl")


def test_increase_with_steady_values_and_reset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_increase_stale"

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
        "increase",
        "sum",
        filter_expression='endpoint = "/orders"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) >= 59
    # the counter reset happened at 31st minute
    assert (
        result_values[30]["value"] == 2
    )  # i.e 2/120 i.e 29th to 31st minute changes
    assert (
        result_values[31]["value"] == 8
    )  # i.e 10/60 i.e 31st to 32nd minute changes
    assert (
        result_values[39]["value"] == 5
    ) # 39th minute is when cumulative shifts to delta
    count_of_steady_increase = sum(1 for v in result_values if v["value"] == 5)
    assert (
        count_of_steady_increase >= 56
    )  # 59 - (1 reset + 1 high increase + 1 at the beginning)
    # All increases should be non-negative (stale periods = 0 increase)
    for v in result_values:
        assert v["value"] >= 0, f"increase should not be negative: {v['value']}"


def test_increase_group_by_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_increase_groupby"

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
        "increase",
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

    # at no point increase should be negative
    for endpoint, values in endpoint_values.items():
        for v in values:
            assert (
                v["value"] >= 0
            ), f"increase for {endpoint} should not be negative: {v['value']}"

    # /health: 60 data points (t01-t60), steady +10/min
    health_values = endpoint_values["/health"]
    assert (
        len(health_values) >= 58
    ), f"Expected >= 58 values for /health, got {len(health_values)}"
    count_steady_health = sum(1 for v in health_values if v["value"] == 10)
    assert (
        count_steady_health >= 57
    ), f"Expected >= 57 steady increase values (10) for /health, got {count_steady_health}"
    # all /health increases should be 10 except possibly first/last due to boundaries
    for v in health_values[1:-1]:
        assert v["value"] == 10, f"Expected /health increase 10, got {v['value']}"

    # /products: 51 data points with 10-minute gap (t20-t29 missing), steady +20/min
    products_values = endpoint_values["/products"]
    assert (
        len(products_values) >= 49
    ), f"Expected >= 49 values for /products, got {len(products_values)}"
    count_steady_products = sum(1 for v in products_values if v["value"] == 20)

    # most values should be 20, some boundary values differ due to 10-min gap
    assert (
        count_steady_products >= 46
    ), f"Expected >= 46 steady increase values (20) for /products, got {count_steady_products}"

    # check that the gap value is also 20
    assert (
        products_values[30]["value"] == 20
    ), f"Expected Gap value to be 20, got {products_values[30]["value"]}"

    # /checkout: 61 data points (t00-t60), +1/min normal, +50/min spike at t40-t44
    # normal increase = 1, increase in spike perios = 50
    checkout_values = endpoint_values["/checkout"]
    assert (
        len(checkout_values) >= 59
    ), f"Expected >= 59 values for /checkout, got {len(checkout_values)}"
    count_steady_checkout = sum(1 for v in checkout_values if v["value"] == 1)
    assert (
        count_steady_checkout >= 53
    ), f"Expected >= 53 steady increase values (1) for /checkout, got {count_steady_checkout}"
    # check that spike values exist (traffic spike +50/min at t40-t44)
    count_spike_checkout = sum(1 for v in checkout_values if v["value"] == 50)
    assert (
        count_spike_checkout >= 4
    ), f"Expected >= 4 spike increase values (50) for /checkout, got {count_spike_checkout}"

    # spike values should be consecutive
    spike_indices = [
        i for i, v in enumerate[Any](checkout_values) if v["value"] == 50
    ]
    assert len(spike_indices) >= 4, f"Expected >= 4 spike indices, got {spike_indices}"
    # consecutiveness
    for i in range(1, len(spike_indices)):
        assert (
            spike_indices[i] == spike_indices[i - 1] + 1
        ), f"Spike indices should be consecutive, got {spike_indices}"

    # /orders: 60 data points (t00-t60) with gap at t30, counter reset at t31 (150->2)
    orders_values = endpoint_values["/orders"]
    assert (
        len(orders_values) >= 58
    ), f"Expected >= 58 values for /orders, got {len(orders_values)}"
    count_steady_orders = sum(1 for v in orders_values if v["value"] == 5)
    assert (
        count_steady_orders >= 55
    ), f"Expected >= 55 steady increase values (5) for /orders, got {count_steady_orders}"
    # check for counter reset effects - there should be some non-standard values
    non_standard_orders = [v["value"] for v in orders_values if v["value"] != 5]
    assert (
        len(non_standard_orders) >= 2
    ), f"Expected >= 2 non-standard values due to counter reset, got {non_standard_orders}"
    # post-reset value should be higher (new counter value / interval)
    high_increase_orders = [v for v in non_standard_orders if v > 5]
    assert (
        len(high_increase_orders) >= 1
    ), f"Expected at least one high increase value after counter reset, got {non_standard_orders}"

    # /users: 56 data points (t05-t60), sparse +1 every 5 minutes
    # Increase = 1 during increment, 0 during flat periods
    users_values = endpoint_values["/users"]
    assert (
        len(users_values) >= 54
    ), f"Expected >= 54 values for /users, got {len(users_values)}"
    count_zero_users = sum(1 for v in users_values if v["value"] == 0)
    # most values should be 0 (flat periods between increments)
    assert (
        count_zero_users >= 40
    ), f"Expected >= 40 zero increase values for /users (sparse data), got {count_zero_users}"
    # non-zero values should be 1
    non_zero_users = [v["value"] for v in users_values if v["value"] != 0]
    count_increment_inc = sum(1 for v in non_zero_users if v == 1)
    assert (
        count_increment_inc >= 8
    ), f"Expected >= 8 increment increase values (1) for /users, got {count_increment_inc}"

def test_increase_for_service_with_switch(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_increase_count"

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
        "increase",
        "sum",
        filter_expression='service = "api"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) >= 60
    assert (
        result_values[30]["value"] == 11
    ) 
    assert (
        result_values[31]["value"] == 12
    )
    assert (
        result_values[39]["value"] == 15
    ) # 39th minute is when cumulative shifts to delta
    # All increases should be non-negative (stale periods = 0 increase)
    for v in result_values:
        assert v["value"] >= 0, f"increase should not be negative: {v['value']}"
