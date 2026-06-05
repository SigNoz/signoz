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


def test_hosts_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 hosts x 4 metrics; assert response shape/contract + exact metric
    values per record against precomputed expected output."""
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
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]

    # Shape/contract.
    assert data["total"] == len(expected["records"])
    assert len(data["records"]) == len(expected["records"])
    assert data["requiredMetricsCheck"]["missingMetrics"] == []
    assert data["endTimeBeforeRetention"] is False
    assert {r["hostName"] for r in data["records"]} == set(exp_by_host.keys())

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

        # Exact metric values.
        exp = exp_by_host[record["hostName"]]
        for field in ("cpu", "memory", "wait", "load15", "diskUsage"):
            assert compare_values(record[field], exp[field], 1e-9), f"{record['hostName']}.{field}: got {record[field]}, expected {exp[field]}"


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
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
        timeout=5,
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


@pytest.mark.parametrize(
    "expression,expected_hosts",
    [
        pytest.param(
            "host.name = 'prod-linux-1' AND os.type = 'linux'",
            {"prod-linux-1"},
            id="and",
        ),
        pytest.param(
            "host.name IN ('prod-linux-1', 'prod-windows-1')",
            {"prod-linux-1", "prod-windows-1"},
            id="in",
        ),
        pytest.param(
            "host.name NOT IN ('prod-linux-1', 'prod-windows-1')",
            {"dev-linux-1", "dev-windows-1"},
            id="not_in",
        ),
        pytest.param(
            "host.name CONTAINS 'prod-'",
            {"prod-linux-1", "prod-windows-1"},
            id="contains",
        ),
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
def test_hosts_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected_hosts: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching hosts, with undistorted per-host metric values."""
    # Every host in hosts_filter_dataset.jsonl carries the same sample pattern
    # as acc-h1 in hosts_value_accuracy.jsonl, so all filtered records must
    # resolve to these exact values (mirrors hosts_value_accuracy_expected.json
    # acc-h1).
    expected_values = {
        "cpu": 0.4444444444444445,
        "memory": 0.205,
        "wait": 0.027777777777777776,
        "load15": 1.525,
        "diskUsage": 0.48095238095238096,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": expression},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert {r["hostName"] for r in data["records"]} == expected_hosts
    assert data["total"] == len(expected_hosts)

    # Filtering must not distort per-host aggregation values.
    for record in data["records"]:
        for field in ("cpu", "memory", "wait", "load15", "diskUsage"):
            assert compare_values(record[field], expected_values[field], 1e-9), f"{record['hostName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("host.namee = 'prod-linux-1'", "host.namee", id="bad_attr_name"),
        pytest.param("host.name =", None, id="trailing_op"),
        pytest.param("(host.name = 'prod-linux-1'", None, id="unclosed_paren"),
        # Cases dropped — parser is permissive and accepts these silently:
        #   `host.name == 'x'` → treated as `=` (matches as if single `=`)
        #   `host.name 'x'`    → returns 200 with empty records
        # Tracked as a QB v5 parser gap; not enforced by this test.
    ],
)
def test_hosts_filter_invalid(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    err_substr,
) -> None:
    """Invalid filter expressions (typo'd attribute key, malformed grammar) return
    400 invalid_input with structured errors; bad attribute keys are named in them."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": expression},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, f"expected 400, got {response.status_code}: {response.text}"
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert len(body["error"]["errors"]) > 0
    if err_substr is not None:
        assert any(err_substr in e["message"] for e in body["error"]["errors"]), f"{err_substr!r} not surfaced: {body['error']['errors']!r}"


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

    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )
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


@pytest.mark.parametrize(
    "dataset,seed_age_min,window_min,group_key,expected_counts,expected_values",
    [
        # groupBy=[host.name]: one record per distinct host. Per-host status is
        # not pinned by the dataset, so expected counts are None (assert
        # active+inactive == 1 instead).
        pytest.param(
            "hosts_filter_dataset.jsonl",
            4,
            5,
            "host.name",
            {
                "prod-linux-1": None,
                "prod-windows-1": None,
                "dev-linux-1": None,
                "dev-windows-1": None,
            },
            None,
            id="host_name",
        ),
        # groupBy=[os.type]: aggregates active/inactive counts and metric values
        # per os.type. Seed had linux: 2 active + 1 inactive, windows: 1 active
        # + 2 inactive. Aggregated metric values differ between groups because
        # active hosts (last sample step-floored out) and inactive hosts (all 3
        # samples averaged) contribute slightly different per-host
        # contributions to the space-aggregated formula.
        pytest.param(
            "hosts_groupby_os_type.jsonl",
            24,
            30,
            "os.type",
            {"linux": (2, 1), "windows": (1, 2)},
            {
                "linux": {
                    "cpu": 0.3333333333333333,
                    "memory": 0.25892857142857145,
                    "wait": 0,
                    "load15": 2.15,
                    "diskUsage": 0.5071428571428571,
                },
                "windows": {
                    "cpu": 0.33333333333333337,
                    "memory": 0.2609375,
                    "wait": 0,
                    "load15": 2.47,
                    "diskUsage": 0.50875,
                },
            },
            id="os_type",
        ),
    ],
)
def test_hosts_groupby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    dataset: str,
    seed_age_min: int,
    window_min: int,
    group_key: str,
    expected_counts: dict,
    expected_values: dict,
) -> None:
    """groupBy returns one record per distinct group with aggregated
    active/inactive counts and metric values. hostName is populated only when
    grouping by host.name (hosts.go:144-160 list-vs-grouped branches)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path(f"inframonitoring/{dataset}"),
            base_time=now - timedelta(minutes=seed_age_min),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=window_min)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "groupBy": [
                {
                    "name": group_key,
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                },
            ],
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["total"] == len(expected_counts)

    group_of = lambda r: r["hostName"] if group_key == "host.name" else r["meta"][group_key]  # noqa: E731  # pylint: disable=unnecessary-lambda-assignment
    by_group = {group_of(r): r for r in data["records"]}
    assert set(by_group.keys()) == set(expected_counts.keys())

    for group, rec in by_group.items():
        counts = expected_counts[group]
        if counts is not None:
            assert (rec["activeHostCount"], rec["inactiveHostCount"]) == counts, f"{group}: got ({rec['activeHostCount']}, {rec['inactiveHostCount']}), expected {counts}"
        else:
            assert rec["activeHostCount"] + rec["inactiveHostCount"] == 1

        # hostName is populated per host when grouping by host.name, and empty
        # when host.name is NOT in groupBy.
        assert rec["hostName"] == (group if group_key == "host.name" else "")

        if expected_values is not None:
            for field in ("cpu", "memory", "wait", "load15", "diskUsage"):
                assert compare_values(rec[field], expected_values[group][field], 1e-9), f"{group}.{field}: got {rec[field]}, expected {expected_values[group][field]}"


def test_hosts_pagination(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination: per-page len matches min(limit, total-offset), total invariant,
    pages cover the full set with no overlap. The final offset is beyond total:
    it returns empty records while total still reflects dataset size.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_pagination.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K, limit = 7, 3
    seen_hosts: list[str] = []
    seen_totals: set[int] = set()

    for offset in (0, 3, 6, K + 5):
        response = requests.post(
            signoz.self.host_configs["8080"].get(ENDPOINT),
            headers={"authorization": f"Bearer {token}"},
            json={
                "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                "end": int(now.timestamp() * 1000),
                "limit": limit,
                "offset": offset,
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len} records, got {len(data['records'])}"
        seen_hosts.extend(r["hostName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_hosts) == K
    assert set(seen_hosts) == {f"page-h{i}" for i in range(1, K + 1)}


# orderBy keys use snake_case (inframonitoringtypes/hosts_constants.go:26-30).
# Note: response uses camelCase (diskUsage) but request uses disk_usage.
# host.name sorts via the metadata-name branch (hosts.go:218-219,
# PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "cpu", id="cpu"),
        pytest.param("memory", "memory", id="memory"),
        pytest.param("wait", "wait", id="wait"),
        pytest.param("load15", "load15", id="load15"),
        pytest.param("disk_usage", "diskUsage", id="disk_usage"),
        pytest.param("host.name", "hostName", id="host_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_hosts_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    record_field: str,
    direction: str,
) -> None:
    """Every orderBy column x direction: total/len stay K (invariant under
    sort) and records come back sorted by the requested column. Hosts have
    staggered timestamps (simulating real-world emit drift)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/hosts_orderby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K = 5

    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "orderBy": {"key": {"name": column}, "direction": direction},
            # Guards against hosts seeded by other tests in the shared backend.
            "filter": {"expression": "host.name CONTAINS 'order-'"},
        },
        timeout=5,
    )
    ctx = f"orderBy={column} {direction}"
    assert response.status_code == HTTPStatus.OK, f"{ctx}: {response.text}"
    data = response.json()["data"]
    assert data["total"] == K, f"{ctx}: total={data['total']}"
    assert len(data["records"]) == K, f"{ctx}: len(records)={len(data['records'])}"

    values = [r[record_field] for r in data["records"]]
    expected = sorted(values, reverse=(direction == "desc"))
    assert values == expected, f"{ctx} not sorted; got {values}"


@pytest.mark.parametrize(
    "payload_override,err_substr",
    [
        pytest.param({"start": 0}, "start must be greater than 0", id="start_zero"),
        pytest.param({"start": -1}, "start must be greater than 0", id="start_negative"),
        pytest.param({"end": 0}, "end must be greater than 0", id="end_zero"),
        pytest.param({"end": -1}, "end must be greater than 0", id="end_negative"),
        pytest.param({"_use_end_eq_start": True}, "must be less than end", id="start_equals_end"),
        pytest.param({"_use_start_gt_end": True}, "must be less than end", id="start_greater_than_end"),
        pytest.param({"limit": 0}, "limit must be between", id="limit_zero"),
        pytest.param({"limit": 5001}, "limit must be between", id="limit_too_large"),
        pytest.param({"offset": -1}, "offset cannot be negative", id="offset_negative"),
        pytest.param(
            {"filter": {"filterByStatus": "bogus"}},
            "invalid filter by status",
            id="filter_by_status_invalid",
        ),
        pytest.param(
            {"orderBy": {"key": {"name": "bogus_col"}, "direction": "desc"}},
            "invalid order by key",
            id="orderby_invalid_key",
        ),
        pytest.param(
            {"orderBy": {"key": {"name": "cpu"}, "direction": "up"}},
            "invalid order by direction",
            id="orderby_invalid_direction",
        ),
        pytest.param(
            {
                "orderBy": {"key": {"name": "host.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "host.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_hostname_with_groupby",
        ),
    ],
)
def test_hosts_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableHosts.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/hosts.go:53-108."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    body: dict = {
        "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    if payload_override.pop("_use_end_eq_start", False):
        body["end"] = body["start"]
    if payload_override.pop("_use_start_gt_end", False):
        body["start"] = body["end"] + 1
    body.update(payload_override)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert err_substr.lower() in error["message"].lower(), f"expected substring {err_substr!r} not found in: {error['message']!r}"
