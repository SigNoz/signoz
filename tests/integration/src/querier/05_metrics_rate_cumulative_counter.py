"""
Look at the cumulative_counters_1h.jsonl file for the relevant data
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
CUMULATIVE_COUNTERS_FILE = os.path.join(TESTDATA_DIR, "cumulative_counters_1h.jsonl")


def test_rate_with_steady_values_and_reset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_rate_stale"

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=60),
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
        filter_expression='endpoint = "/orders"',
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = sorted(get_series_values(data, "A"), key=lambda x: x["timestamp"])
    assert len(result_values) >= 59
    # the counter reset happened at 31st minute
    assert (
        result_values[30]["value"] == 0.0167
    )  # i.e 2/120 i.e 29th to 31st minute changes
    assert (
        result_values[31]["value"] == 0.133
    )  # i.e 10/60 i.e 31st to 32nd minute changes
    count_of_steady_rate = sum(1 for v in result_values if v["value"] == 0.0833)
    assert (
        count_of_steady_rate >= 56
    )  # 59 - (1 reset + 1 high rate + 1 at the beginning)
    # All rates should be non-negative (stale periods = 0 rate)
    for v in result_values:
        assert v["value"] >= 0, f"Rate should not be negative: {v['value']}"


def test_rate_group_by_endpoint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[List[Metrics]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    metric_name = "test_rate_groupby"

    metrics = Metrics.load_from_file(
        CUMULATIVE_COUNTERS_FILE,
        base_time=now - timedelta(minutes=60),
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
    # rate = 10/60 = 0.167
    health_values = endpoint_values["/health"]
    assert (
        len(health_values) >= 58
    ), f"Expected >= 58 values for /health, got {len(health_values)}"
    count_steady_health = sum(1 for v in health_values if v["value"] == 0.167)
    assert (
        count_steady_health >= 57
    ), f"Expected >= 57 steady rate values (0.167) for /health, got {count_steady_health}"
    # all /health rates should be 0.167 except possibly first/last due to boundaries
    for v in health_values[1:-1]:
        assert v["value"] == 0.167, f"Expected /health rate 0.167, got {v['value']}"

    # /products: 51 data points with 10-minute gap (t20-t29 missing), steady +20/min
    # rate = 20/60 = 0.333, gap causes lower averaged rate at boundary
    products_values = endpoint_values["/products"]
    assert (
        len(products_values) >= 49
    ), f"Expected >= 49 values for /products, got {len(products_values)}"
    count_steady_products = sum(1 for v in products_values if v["value"] == 0.333)

    # most values should be 0.333, some boundary values differ due to 10-min gap
    assert (
        count_steady_products >= 46
    ), f"Expected >= 46 steady rate values (0.333) for /products, got {count_steady_products}"

    # check that non-0.333 values are due to gap averaging (should be lower)
    gap_boundary_values = [v["value"] for v in products_values if v["value"] != 0.333]
    for val in gap_boundary_values:
        assert (
            0 < val < 0.333
        ), f"Gap boundary values should be between 0 and 0.333, got {val}"

    # /checkout: 61 data points (t00-t60), +1/min normal, +50/min spike at t40-t44
    # normal rate = 1/60 = 0.0167, spike rate = 50/60 = 0.833
    checkout_values = endpoint_values["/checkout"]
    assert (
        len(checkout_values) >= 59
    ), f"Expected >= 59 values for /checkout, got {len(checkout_values)}"
    count_steady_checkout = sum(1 for v in checkout_values if v["value"] == 0.0167)
    assert (
        count_steady_checkout >= 53
    ), f"Expected >= 53 steady rate values (0.0167) for /checkout, got {count_steady_checkout}"
    # check that spike values exist (traffic spike +50/min at t40-t44)
    count_spike_checkout = sum(1 for v in checkout_values if v["value"] == 0.833)
    assert (
        count_spike_checkout >= 4
    ), f"Expected >= 4 spike rate values (0.833) for /checkout, got {count_spike_checkout}"

    # spike values should be consecutive
    spike_indices = [
        i for i, v in enumerate[Any](checkout_values) if v["value"] == 0.833
    ]
    assert len(spike_indices) >= 4, f"Expected >= 4 spike indices, got {spike_indices}"
    # consecutiveness
    for i in range(1, len(spike_indices)):
        assert (
            spike_indices[i] == spike_indices[i - 1] + 1
        ), f"Spike indices should be consecutive, got {spike_indices}"

    # /orders: 60 data points (t00-t60) with gap at t30, counter reset at t31 (150->2)
    # rate = 5/60 = 0.0833
    # reset at t31 causes: rate at t30 includes gap (lower), t31 has high rate after reset
    orders_values = endpoint_values["/orders"]
    assert (
        len(orders_values) >= 58
    ), f"Expected >= 58 values for /orders, got {len(orders_values)}"
    count_steady_orders = sum(1 for v in orders_values if v["value"] == 0.0833)
    assert (
        count_steady_orders >= 55
    ), f"Expected >= 55 steady rate values (0.0833) for /orders, got {count_steady_orders}"
    # check for counter reset effects - there should be some non-standard values
    non_standard_orders = [v["value"] for v in orders_values if v["value"] != 0.0833]
    assert (
        len(non_standard_orders) >= 2
    ), f"Expected >= 2 non-standard values due to counter reset, got {non_standard_orders}"
    # post-reset value should be higher (new counter value / interval)
    high_rate_orders = [v for v in non_standard_orders if v > 0.0833]
    assert (
        len(high_rate_orders) >= 1
    ), f"Expected at least one high rate value after counter reset, got {non_standard_orders}"

    # /users: 56 data points (t05-t60), sparse +1 every 5 minutes
    # Rate = 1/60 = 0.0167 during increment, 0 during flat periods
    users_values = endpoint_values["/users"]
    assert (
        len(users_values) >= 54
    ), f"Expected >= 54 values for /users, got {len(users_values)}"
    count_zero_users = sum(1 for v in users_values if v["value"] == 0)
    # most values should be 0 (flat periods between increments)
    assert (
        count_zero_users >= 40
    ), f"Expected >= 40 zero rate values for /users (sparse data), got {count_zero_users}"
    # non-zero values should be 0.0167 (1/60 increment rate)
    non_zero_users = [v["value"] for v in users_values if v["value"] != 0]
    count_increment_rate = sum(1 for v in non_zero_users if v == 0.0167)
    assert (
        count_increment_rate >= 8
    ), f"Expected >= 8 increment rate values (0.0167) for /users, got {count_increment_rate}"
