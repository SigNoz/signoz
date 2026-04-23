from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.meter import MeterSample, make_meter_samples
from fixtures.querier import (
    build_builder_query,
    get_series_values,
    make_query_request,
)


def test_query_range_cost_meter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_meter_samples: Callable[[List[MeterSample]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    metric_name = "signoz_cost_test_query_range"
    labels = {"service": "test-service", "environment": "production"}

    samples = make_meter_samples(
        metric_name,
        labels,
        now,
        count=60,
        base_value=100.0,
        temporality="Delta",
        type_="Sum",
        is_monotonic=True,
    )
    insert_meter_samples(samples)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query = build_builder_query(
        "A",
        metric_name,
        "sum",
        "sum",
        source="meter",
        temporality="delta",
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query])
    assert response.status_code == HTTPStatus.OK

    data = response.json()
    result_values = get_series_values(data, "A")
    assert len(result_values) > 0, f"Expected non-empty results, got: {data}"

    for val in result_values:
        assert val["value"] >= 0, f"Expected non-negative value, got: {val['value']}"


def test_list_meter_metric_names(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_meter_samples: Callable[[List[MeterSample]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    start_ms = int((now - timedelta(minutes=65)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    metric_name = "cost_test_list_metrics"
    labels = {"service": "billing-service"}

    samples = make_meter_samples(
        metric_name,
        labels,
        now,
        count=5,
        base_value=50.0,
        temporality="Delta",
        type_="Sum",
        is_monotonic=True,
    )
    insert_meter_samples(samples)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/metrics"),
        params={
            "start": start_ms,
            "end": end_ms,
            "limit": 100,
            "searchText": "cost_test_list",
            "source": "meter",
        },
        headers={"authorization": f"Bearer {token}"},
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK

    data = response.json()
    metrics = data.get("data", {}).get("metrics", [])
    metric_names = [m["metricName"] for m in metrics]
    assert (
        metric_name in metric_names
    ), f"Expected {metric_name} in metric names, got: {metric_names}"


# Verify /api/v1/fields/values with source=meter filters label values by metricNamespace
# prefix. Inserts meter-source metrics under ns.a and ns.b, then asserts a specific
# prefix returns only matching values while a common prefix returns both.
def test_metric_namespace_meter_values_filtering(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_meter_samples: Callable[[List[MeterSample]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)

    samples_a = make_meter_samples(
        "meter.ns.a.cost",
        {"service": "billing-a"},
        now,
        count=5,
        base_value=10.0,
        temporality="Delta",
        type_="Sum",
        is_monotonic=True,
    )
    samples_b = make_meter_samples(
        "meter.ns.b.cost",
        {"service": "billing-b"},
        now,
        count=5,
        base_value=20.0,
        temporality="Delta",
        type_="Sum",
        is_monotonic=True,
    )
    insert_meter_samples(samples_a + samples_b)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Specific prefix: metricNamespace=meter.ns.a should return only billing-a
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "source": "meter",
            "name": "service",
            "searchText": "",
            "metricNamespace": "meter.ns.a",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "billing-a" in values
    assert "billing-b" not in values

    # Common prefix: metricNamespace=meter.ns should return both
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "source": "meter",
            "name": "service",
            "searchText": "",
            "metricNamespace": "meter.ns",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "billing-a" in values
    assert "billing-b" in values
