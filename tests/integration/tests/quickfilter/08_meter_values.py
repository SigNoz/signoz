from collections.abc import Callable
from datetime import UTC, datetime
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.meter import MeterSample, make_meter_samples


# Verify /api/v1/fields/values with source=meter filters label values by metricNamespace
# prefix. Inserts meter-source metrics under ns.a and ns.b, then asserts a specific
# prefix returns only matching values while a common prefix returns both.
def test_metric_namespace_meter_values_filtering(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_meter_samples: Callable[[list[MeterSample]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

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
