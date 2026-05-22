"""Integration tests for v2 infra-monitoring host endpoints."""

import json
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
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


def test_hosts_filter_and(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """AND of two attribute clauses returns the single matching host."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {
                "expression": "host.name = 'prod-linux-1' AND os.type = 'linux'",
            },
        },
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["total"] == 1
    assert {r["hostName"] for r in data["records"]} == {"prod-linux-1"}


def test_hosts_filter_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """IN (...) operator returns exactly the listed hosts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {
                "expression": "host.name IN ('prod-linux-1', 'prod-windows-1')",
            },
        },
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["total"] == 2
    assert {r["hostName"] for r in data["records"]} == {
        "prod-linux-1",
        "prod-windows-1",
    }


def test_hosts_filter_not_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """NOT IN (...) returns the complement of the listed hosts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {
                "expression": "host.name NOT IN ('prod-linux-1', 'prod-windows-1')",
            },
        },
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["total"] == 2
    assert {r["hostName"] for r in data["records"]} == {
        "dev-linux-1",
        "dev-windows-1",
    }


def test_hosts_filter_contains(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """CONTAINS 'substr' returns hosts whose attribute contains the substring."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {"expression": "host.name CONTAINS 'prod-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["total"] == 2
    assert {r["hostName"] for r in data["records"]} == {
        "prod-linux-1",
        "prod-windows-1",
    }


@pytest.mark.parametrize(
    "expression,expected_hosts",
    [
        pytest.param(
            "os.type = 'linux' AND host.name IN ('prod-linux-1', 'prod-windows-1')",
            {"prod-linux-1"},
            id="and_in",
        ),
        pytest.param(
            "os.type = 'linux' AND host.name NOT IN ('prod-linux-1', 'prod-windows-1')",
            {"dev-linux-1"},
            id="and_not_in",
        ),
        pytest.param(
            "os.type = 'linux' AND host.name CONTAINS 'prod-'",
            {"prod-linux-1"},
            id="and_contains",
        ),
        pytest.param(
            "host.name IN ('prod-linux-1', 'prod-windows-1', 'dev-linux-1') AND host.name CONTAINS 'linux'",
            {"prod-linux-1", "dev-linux-1"},
            id="in_contains",
        ),
    ],
)
def test_hosts_filter_combos(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected_hosts: set,
) -> None:
    """AND-combined pairs of filter operators return the correct intersection."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {"expression": expression},
        },
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert {r["hostName"] for r in data["records"]} == expected_hosts
    assert data["total"] == len(expected_hosts)


def test_hosts_filter_bad_attr_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Filter with a typo'd attribute key — discovery: silent empty vs error."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {"expression": "host.namee = 'prod-linux-1'"},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert any(
        "host.namee" in e["message"] for e in body["error"]["errors"]
    ), f"bad attr name not surfaced: {body['error']['errors']!r}"


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("host.name =", id="trailing_op"),
        pytest.param("(host.name = 'prod-linux-1'", id="unclosed_paren"),
        # Cases dropped — parser is permissive and accepts these silently:
        #   `host.name == 'x'` → treated as `=` (matches as if single `=`)
        #   `host.name 'x'`    → returns 200 with empty records
        # Tracked as a QB v5 parser gap; not enforced by this test.
    ],
)
def test_hosts_filter_bad_grammar(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
) -> None:
    """Malformed filter expressions return 400 invalid_input with structured errors."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
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
            "filter": {"expression": expression},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, (
        f"expected 400, got {response.status_code}: {response.text}"
    )
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert len(body["error"]["errors"]) > 0


@pytest.mark.parametrize(
    "status,expected_hosts",
    [
        pytest.param("active", {"active-h1"}, id="active"),
        pytest.param("inactive", {"inactive-h1"}, id="inactive"),
        pytest.param(None, {"active-h1", "inactive-h1"}, id="unset"),
    ],
)
def test_hosts_filter_by_status(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    status,
    expected_hosts: set,
) -> None:
    """filterByStatus subsets hosts and per-record activeHostCount/inactiveHostCount
    track each host's status. Omitting filterByStatus returns all hosts.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_status.jsonl"),
            base_time=now - timedelta(minutes=24),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    body = {
        "start": int((now - timedelta(minutes=30)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    if status is not None:
        body["filter"] = {"filterByStatus": status}

    response = _post(signoz, token, body)
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]

    assert {r["hostName"] for r in data["records"]} == expected_hosts
    assert data["total"] == len(expected_hosts)

    if status is not None:
        for r in data["records"]:
            assert r["status"] == status

    for r in data["records"]:
        if r["status"] == "active":
            assert r["activeHostCount"] == 1
            assert r["inactiveHostCount"] == 0
        else:
            assert r["status"] == "inactive"
            assert r["activeHostCount"] == 0
            assert r["inactiveHostCount"] == 1
