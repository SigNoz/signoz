"""Integration tests for v2 infra-monitoring host endpoints."""

import json
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.querier import compare_values

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


def test_hosts_value_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert exact metric values per record against precomputed expected output."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/hosts_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_host = {r["hostName"]: r for r in expected["records"]}

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
    assert len(data["records"]) == len(expected["records"])

    for record in data["records"]:
        exp = exp_by_host[record["hostName"]]
        for field in ("cpu", "memory", "wait", "load15", "diskUsage"):
            assert compare_values(record[field], exp[field], 1e-9), (
                f"{record['hostName']}.{field}: "
                f"got {record[field]}, expected {exp[field]}"
            )


def test_hosts_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only system.cpu.time; assert other 3 required metrics flagged missing."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_missing_metrics.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

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

    assert set(data["requiredMetricsCheck"]["missingMetrics"]) == {
        "system.memory.usage",
        "system.cpu.load_average.15m",
        "system.filesystem.usage",
    }
    # Endpoint short-circuits when any required metric is missing:
    # records is empty and total=0 regardless of which hosts have partial data.
    # See pkg/modules/inframonitoring/implinframonitoring/module.go:84-89.
    assert data["records"] == []
    assert data["total"] == 0
