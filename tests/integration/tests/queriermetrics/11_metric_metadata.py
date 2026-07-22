from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics


def test_metric_metadata_returns_latest_monotonic_true(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test.metric.metadata.latest_true"

    metrics: list[Metrics] = [
        Metrics(
            metric_name=metric_name,
            labels={"series": "older"},
            timestamp=now - timedelta(minutes=20),
            value=1.0,
            temporality="Cumulative",
            type_="Sum",
            is_monotonic=False,
        ),
        Metrics(
            metric_name=metric_name,
            labels={"series": "newer"},
            timestamp=now - timedelta(minutes=2),
            value=2.0,
            temporality="Cumulative",
            type_="Sum",
            is_monotonic=True,
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/metrics/metadata"),
        params={"metricName": metric_name},
        headers={"authorization": f"Bearer {token}"},
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert response.json()["data"]["isMonotonic"] is True


def test_metric_metadata_returns_latest_monotonic_false(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_metrics: Callable[[list[Metrics]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    metric_name = "test.metric.metadata.latest_false"

    metrics: list[Metrics] = [
        Metrics(
            metric_name=metric_name,
            labels={"series": "older"},
            timestamp=now - timedelta(minutes=20),
            value=1.0,
            temporality="Cumulative",
            type_="Sum",
            is_monotonic=True,
        ),
        Metrics(
            metric_name=metric_name,
            labels={"series": "newer"},
            timestamp=now - timedelta(minutes=2),
            value=2.0,
            temporality="Cumulative",
            type_="Sum",
            is_monotonic=False,
        ),
    ]
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/metrics/metadata"),
        params={"metricName": metric_name},
        headers={"authorization": f"Bearer {token}"},
        timeout=30,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert response.json()["data"]["isMonotonic"] is False
