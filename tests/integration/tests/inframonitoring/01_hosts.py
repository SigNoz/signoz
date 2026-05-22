"""Integration tests for v2 infra-monitoring host endpoints."""

from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics

ENDPOINT = "/api/v2/infra_monitoring/hosts"


def _post(signoz: types.SigNoz, token: str, body: dict) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )


def test_hosts_happy_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 hosts x 4 metrics; assert response shape + counts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    metrics = Metrics.load_from_file(
        get_testdata_file_path("inframonitoring/hosts_happy_path.jsonl"),
        base_time=now - timedelta(minutes=4),
    )
    insert_metrics(metrics)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]

    assert data["total"] == 2
    assert len(data["records"]) == 2
    assert data["requiredMetricsCheck"]["missingMetrics"] == []
    assert data["endTimeBeforeRetention"] is False

    assert {r["hostName"] for r in data["records"]} == {"happy-h1", "happy-h2"}

    for record in data["records"]:
        for field in (
            "hostName",
            "status",
            "cpu",
            "memory",
            "wait",
            "load15",
            "diskUsage",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"
