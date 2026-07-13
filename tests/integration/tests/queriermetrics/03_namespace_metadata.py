from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics


# Verify /api/v1/fields/values filters label values by metricNamespace prefix.
# Inserts metrics under ns.a and ns.b, then asserts a specific prefix returns
# only matching values while a common prefix returns both.
def test_metric_namespace_values_filtering(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    metrics: list[Metrics] = [
        Metrics(
            metric_name="ns.a.requests_total",
            labels={"service": "svc-a"},
            timestamp=now - timedelta(minutes=2),
            value=10.0,
        ),
        Metrics(
            metric_name="ns.b.requests_total",
            labels={"service": "svc-b"},
            timestamp=now - timedelta(minutes=2),
            value=20.0,
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Specific prefix: metricNamespace=ns.a should return only svc-a
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "name": "service",
            "searchText": "",
            "metricNamespace": "ns.a",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "svc-a" in values
    assert "svc-b" not in values

    # Common prefix: metricNamespace=ns should return both
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "name": "service",
            "searchText": "",
            "metricNamespace": "ns",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "svc-a" in values
    assert "svc-b" in values


# Verify /api/v1/fields/values with name=metric_name filters metric names by
# metricNamespace prefix. A specific prefix returns only its metric names;
# a common prefix returns metric names from all matching namespaces.
def test_metric_namespace_metric_name_values_filtering(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    metrics: list[Metrics] = [
        Metrics(
            metric_name="ns.a.cpu.utilization",
            labels={"host": "host-a"},
            timestamp=now - timedelta(minutes=2),
            value=50.0,
        ),
        Metrics(
            metric_name="ns.b.cpu.utilization",
            labels={"host": "host-b"},
            timestamp=now - timedelta(minutes=2),
            value=60.0,
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Specific prefix: metricNamespace=ns.a should return only ns.a.* metric names
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "name": "metric_name",
            "searchText": "",
            "metricNamespace": "ns.a",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "ns.a.cpu.utilization" in values
    assert "ns.b.cpu.utilization" not in values

    # Common prefix: metricNamespace=ns should return both
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "name": "metric_name",
            "searchText": "",
            "metricNamespace": "ns",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = response.json()["data"]["values"]["stringValues"]
    assert "ns.a.cpu.utilization" in values
    assert "ns.b.cpu.utilization" in values


# Verify /api/v1/fields/keys filters attribute keys by metricNamespace prefix.
# Metrics under ns.a and ns.b carry distinct labels; a specific prefix returns
# only its keys while a common prefix returns keys from both namespaces.
def test_metric_namespace_keys_filtering(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    metrics: list[Metrics] = [
        Metrics(
            metric_name="ns.a.cpu.utilization",
            labels={"a_only_label": "val-a"},
            timestamp=now - timedelta(minutes=2),
            value=10.0,
        ),
        Metrics(
            metric_name="ns.b.cpu.utilization",
            labels={"b_only_label": "val-b"},
            timestamp=now - timedelta(minutes=2),
            value=20.0,
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Specific prefix: metricNamespace=ns.a should return only a_only_label
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "searchText": "label",
            "metricNamespace": "ns.a",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    keys = response.json()["data"]["keys"]
    assert "a_only_label" in keys
    assert "b_only_label" not in keys

    # Common prefix: metricNamespace=ns should return both keys
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=5,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "metrics",
            "searchText": "label",
            "metricNamespace": "ns",
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    keys = response.json()["data"]["keys"]
    assert "a_only_label" in keys
    assert "b_only_label" in keys
