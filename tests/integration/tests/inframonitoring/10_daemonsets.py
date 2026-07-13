"""Integration tests for v2 infra-monitoring daemonsets endpoint."""

import json
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.metrics import Metrics
from fixtures.querier import compare_values, get_all_warnings

ENDPOINT = "/api/v2/infra_monitoring/daemonsets"


def test_daemonsets_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert response shape/contract + exact per-DS metric values, node
    counts, and phase counts against precomputed expected output.

    Locks in Sum vs Avg split across pod-level metrics
    (daemonsets_constants.go:79-198): A/D = SpaceAggregationSum across pods;
    B/C/E/F = SpaceAggregationAvg. Node counts (H/I) are latest-summed.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/daemonsets_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["daemonSetName"]: r for r in expected["records"]}

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
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]

    # Shape/contract.
    assert data["total"] == len(expected["records"])
    assert len(data["records"]) == len(expected["records"])
    # Full data present -> no warnings surfaced.
    assert get_all_warnings(response.json()) == []
    assert data["endTimeBeforeRetention"] is False
    assert {r["daemonSetName"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        for field in (
            "daemonSetName",
            "daemonSetCPU",
            "daemonSetCPURequest",
            "daemonSetCPULimit",
            "daemonSetMemory",
            "daemonSetMemoryRequest",
            "daemonSetMemoryLimit",
            "desiredNodes",
            "currentNodes",
            "readyNodes",
            "misscheduledNodes",
            "podCountsByPhase",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # ints (not floats) for node counts.
        assert isinstance(record["desiredNodes"], int)
        assert isinstance(record["currentNodes"], int)
        assert isinstance(record["readyNodes"], int)
        assert isinstance(record["misscheduledNodes"], int)

        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["meta"].get("k8s.daemonset.name") == record["daemonSetName"]
        assert "k8s.namespace.name" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]

        # Exact values.
        exp = exp_by_name[record["daemonSetName"]]
        for field in (
            "daemonSetCPU",
            "daemonSetCPURequest",
            "daemonSetCPULimit",
            "daemonSetMemory",
            "daemonSetMemoryRequest",
            "daemonSetMemoryLimit",
        ):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['daemonSetName']}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["desiredNodes"] == exp["desiredNodes"]
        assert record["currentNodes"] == exp["currentNodes"]
        assert record["readyNodes"] == exp["readyNodes"]
        assert record["misscheduledNodes"] == exp["misscheduledNodes"]
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


@pytest.mark.parametrize(
    "expression,expected",
    [
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND env = 'prod'",
            {"logs-a-prod", "metrics-a-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.daemonset.name IN ('logs-a-prod', 'metrics-b-dev')",
            {"logs-a-prod", "metrics-b-dev"},
            id="in",
        ),
        # NOT IN on the partition key (k8s.daemonset.name) returns the rest.
        # NOT IN on non-partition labels is unreliable in QB v5; covered indirectly
        # via the and_not_in combo. Same workaround as clusters/volumes/deployments/SS/jobs.
        pytest.param(
            "k8s.daemonset.name NOT IN ('logs-a-prod', 'logs-a-dev', 'metrics-a-prod', 'metrics-a-dev')",
            {"logs-b-prod", "logs-b-dev", "metrics-b-prod", "metrics-b-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.daemonset.name CONTAINS 'logs'",
            {"logs-a-prod", "logs-a-dev", "logs-b-prod", "logs-b-dev"},
            id="contains",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.daemonset.name IN ('logs-a-prod', 'metrics-a-prod')",
            {"logs-a-prod", "metrics-a-prod"},
            id="and_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.daemonset.name NOT IN ('logs-a-prod', 'logs-a-dev')",
            {"metrics-a-prod", "metrics-a-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.daemonset.name CONTAINS 'logs'",
            {"logs-a-prod", "logs-b-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.daemonset.name IN ('logs-a-prod', 'logs-b-prod', 'metrics-a-prod') AND k8s.daemonset.name CONTAINS 'logs'",
            {"logs-a-prod", "logs-b-prod"},
            id="in_contains",
        ),
    ],
)
def test_daemonsets_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching daemonsets, with undistorted per-DS metric
    values."""
    # Every daemonset in daemonsets_filter_dataset.jsonl carries the same
    # sample pattern as acc-ds-1 in daemonsets_value_accuracy.jsonl (2 pods),
    # so all filtered records must resolve to these exact values (mirrors
    # daemonsets_value_accuracy_expected.json acc-ds-1).
    expected_values = {
        "daemonSetCPU": 1.0,
        "daemonSetCPURequest": 0.5,
        "daemonSetCPULimit": 0.4,
        "daemonSetMemory": 300000000.0,
        "daemonSetMemoryRequest": 0.5,
        "daemonSetMemoryLimit": 0.4,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_filter_dataset.jsonl"),
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
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["daemonSetName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-daemonset aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['daemonSetName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.daemonset.namee = 'logs-a-prod'", "k8s.daemonset.namee", id="bad_attr_name"),
        pytest.param("k8s.daemonset.name =", None, id="trailing_op"),
        pytest.param("(k8s.daemonset.name = 'logs-a-prod'", None, id="unclosed_paren"),
    ],
)
def test_daemonsets_filter_invalid(
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
            get_testdata_file_path("inframonitoring/daemonsets_filter_dataset.jsonl"),
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


def test_daemonsets_pod_phase_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """DaemonSet with mixed pod phases: 4 Running + 1 Pending + 2 Failed."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.daemonset.name = 'pp-ds'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["daemonSetName"] == "pp-ds"
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 4,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


def test_daemonsets_desired_current_counts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """desired=5, current=3 from k8s.daemonset.* metrics; 2 Running pods seeded.
    Models node-scheduling lag (DS targets 5 nodes, 3 currently scheduled,
    pod metrics from 2 of them only). Distinguishes node counts from phase counts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_desired_current.jsonl"),
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
            "filter": {"expression": "k8s.daemonset.name = 'dc-ds'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["daemonSetName"] == "dc-ds"
    assert isinstance(rec["desiredNodes"], int)
    assert isinstance(rec["currentNodes"], int)
    assert rec["desiredNodes"] == 5
    assert rec["currentNodes"] == 3
    assert rec["podCountsByPhase"]["running"] == 2


def test_daemonsets_base_filter_drops_non_daemonset_pods(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Locks in daemonSetsBaseFilterExpr (daemonsets_constants.go:10, :63-69):
    standalone pods (no k8s.daemonset.name), Deployment pods (k8s.deployment.name only),
    and StatefulSet pods (k8s.statefulset.name only) are all dropped.
    Only the real DS row appears, total=1, no empty-name group."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_non_ds_pods.jsonl"),
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
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1, f"expected only the real DS row; got {[r['daemonSetName'] for r in data['records']]}"
    rec = data["records"][0]
    assert rec["daemonSetName"] == "nd-ds"
    assert all(r["daemonSetName"] != "" for r in data["records"])


# Float record fields compared with tolerance; everything else compared with ==.
_GROUPBY_FLOAT_FIELDS = {
    "daemonSetCPU",
    "daemonSetCPURequest",
    "daemonSetCPULimit",
    "daemonSetMemory",
    "daemonSetMemoryRequest",
    "daemonSetMemoryLimit",
}


def _phase(pending=0, running=0, succeeded=0, failed=0, unknown=0) -> dict:
    return {"pending": pending, "running": running, "succeeded": succeeded, "failed": failed, "unknown": unknown}


@pytest.mark.parametrize(
    "scenario",
    [
        # Explicit groupBy=[k8s.daemonset.name]: one record per daemonset,
        # daemonSetName populated (daemonsets.go:28-31), response grouped_list.
        # 1 running pod each.
        pytest.param(
            {
                "fixture": "daemonsets_groupby.jsonl",
                "group_by": "k8s.daemonset.name",
                "filter": None,
                "group_meta_keys": ["k8s.daemonset.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ds-a1": {"daemonSetName": "gb-ds-a1", "podCountsByPhase": _phase(running=1)},
                    "gb-ds-a2": {"daemonSetName": "gb-ds-a2", "podCountsByPhase": _phase(running=1)},
                    "gb-ds-b1": {"daemonSetName": "gb-ds-b1", "podCountsByPhase": _phase(running=1)},
                    "gb-ds-b2": {"daemonSetName": "gb-ds-b2", "podCountsByPhase": _phase(running=1)},
                },
            },
            id="daemonset_name",
        ),
        # Explicit groupBy=[k8s.namespace.name]: aggregated across each namespace's
        # 2 daemonsets, daemonSetName cleared, response grouped_list. 2 running each.
        pytest.param(
            {
                "fixture": "daemonsets_groupby.jsonl",
                "group_by": "k8s.namespace.name",
                "filter": None,
                "group_meta_keys": ["k8s.namespace.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ns-a": {"daemonSetName": "", "podCountsByPhase": _phase(running=2)},
                    "gb-ns-b": {"daemonSetName": "", "podCountsByPhase": _phase(running=2)},
                },
            },
            id="namespace",
        ),
        # Default groupBy (no groupBy in request) => [k8s.daemonset.name,
        # k8s.namespace.name, k8s.cluster.name] (module.go ListDaemonSets),
        # response list. Same workload name must NOT collapse across namespaces OR
        # clusters; the empty-cluster group (k8s.cluster.name label absent on the
        # source pods) must appear as its own row with real metrics, not be dropped.
        # Single pod per group => SpaceAggregationSum == Avg == seeded value.
        # Fails on the pre-cluster default (name+ns) — the three ns-x groups would
        # collapse into one summed row.
        pytest.param(
            {
                "fixture": "daemonsets_same_name_across_ns_and_clusters.jsonl",
                "group_by": None,
                "filter": "k8s.daemonset.name = 'dup-ds'",
                "group_meta_keys": ["k8s.daemonset.name", "k8s.namespace.name", "k8s.cluster.name"],
                "expected_type": "list",
                "groups": {
                    ("dup-ds", "ns-x", "cluster-a"): {
                        "daemonSetName": "dup-ds",
                        "daemonSetCPU": 0.3,
                        "daemonSetCPURequest": 0.6,
                        "daemonSetCPULimit": 0.7,
                        "daemonSetMemory": 100000000.0,
                        "daemonSetMemoryRequest": 0.6,
                        "daemonSetMemoryLimit": 0.7,
                        "desiredNodes": 2,
                        "currentNodes": 2,
                        "podCountsByPhase": _phase(running=1),
                    },
                    ("dup-ds", "ns-y", "cluster-a"): {
                        "daemonSetName": "dup-ds",
                        "daemonSetCPU": 0.9,
                        "daemonSetCPURequest": 0.2,
                        "daemonSetCPULimit": 0.3,
                        "daemonSetMemory": 500000000.0,
                        "daemonSetMemoryRequest": 0.2,
                        "daemonSetMemoryLimit": 0.3,
                        "desiredNodes": 3,
                        "currentNodes": 1,
                        "podCountsByPhase": _phase(failed=1),
                    },
                    ("dup-ds", "ns-x", "cluster-b"): {
                        "daemonSetName": "dup-ds",
                        "daemonSetCPU": 0.5,
                        "daemonSetCPURequest": 0.4,
                        "daemonSetCPULimit": 0.5,
                        "daemonSetMemory": 300000000.0,
                        "daemonSetMemoryRequest": 0.4,
                        "daemonSetMemoryLimit": 0.5,
                        "desiredNodes": 4,
                        "currentNodes": 4,
                        "podCountsByPhase": _phase(running=1),
                    },
                    # empty-cluster group: k8s.cluster.name label absent on the source pods.
                    ("dup-ds", "ns-x", ""): {
                        "daemonSetName": "dup-ds",
                        "daemonSetCPU": 0.1,
                        "daemonSetCPURequest": 0.1,
                        "daemonSetCPULimit": 0.1,
                        "daemonSetMemory": 200000000.0,
                        "daemonSetMemoryRequest": 0.1,
                        "daemonSetMemoryLimit": 0.1,
                        "desiredNodes": 1,
                        "currentNodes": 0,
                        "podCountsByPhase": _phase(pending=1),
                    },
                },
            },
            id="default_disambiguates_ns_and_cluster",
        ),
    ],
)
def test_daemonsets_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    scenario: dict,
) -> None:
    """groupBy determines row identity. Explicit groupBy returns one grouped_list
    record per distinct group (daemonSetName populated only when grouping by
    k8s.daemonset.name; daemonsets.go:28-31). With no groupBy the default is
    [k8s.daemonset.name, k8s.namespace.name] (module.go ListDaemonSets), so
    same-named daemonsets across namespaces stay as separate, un-collapsed list
    rows. meta always surfaces the grouping key(s)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path(f"inframonitoring/{scenario['fixture']}"),
            base_time=now - timedelta(minutes=4),
        )
    )

    body: dict = {
        "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    if scenario["group_by"] is not None:
        body["groupBy"] = [{"name": scenario["group_by"], "fieldDataType": "string", "fieldContext": "resource"}]
    if scenario["filter"] is not None:
        body["filter"] = {"expression": scenario["filter"]}

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]

    groups = scenario["groups"]
    meta_keys = scenario["group_meta_keys"]
    assert data["type"] == scenario["expected_type"]
    assert data["total"] == len(groups)

    def _gid(rec: dict):
        vals = [rec["meta"][k] for k in meta_keys]
        return vals[0] if len(vals) == 1 else tuple(vals)

    by_group = {_gid(r): r for r in data["records"]}
    assert set(by_group.keys()) == set(groups.keys())

    for gid, exp in groups.items():
        rec = by_group[gid]
        for k in meta_keys:
            assert k in rec["meta"], rec["meta"]
        for field, val in exp.items():
            if field in _GROUPBY_FLOAT_FIELDS:
                assert compare_values(rec[field], val, 1e-6), f"{gid}.{field}: got {rec[field]}, expected {val}"
            else:
                assert rec[field] == val, f"{gid}.{field}: got {rec[field]}, expected {val}"


def test_daemonsets_pagination(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination: per-page len matches min(limit, total-offset), total invariant,
    pages cover the full set with no overlap. The final offset is beyond total:
    it returns empty records while total still reflects dataset size."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_pagination.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K, limit = 7, 3
    seen_names: list[str] = []
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
                "filter": {"expression": "k8s.daemonset.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["daemonSetName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-ds-{i}" for i in range(1, K + 1)}


# orderBy keys per daemonsets_constants.go:5-14 (snake_case request keys,
# camelCase response fields). k8s.daemonset.name sorts via the metadata-name
# branch (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "daemonSetCPU", id="cpu"),
        pytest.param("cpu_request", "daemonSetCPURequest", id="cpu_request"),
        pytest.param("cpu_limit", "daemonSetCPULimit", id="cpu_limit"),
        pytest.param("memory", "daemonSetMemory", id="memory"),
        pytest.param("memory_request", "daemonSetMemoryRequest", id="memory_request"),
        pytest.param("memory_limit", "daemonSetMemoryLimit", id="memory_limit"),
        pytest.param("desired_nodes", "desiredNodes", id="desired_nodes"),
        pytest.param("current_nodes", "currentNodes", id="current_nodes"),
        pytest.param("ready_nodes", "readyNodes", id="ready_nodes"),
        pytest.param("misscheduled_nodes", "misscheduledNodes", id="misscheduled_nodes"),
        pytest.param("k8s.daemonset.name", "daemonSetName", id="daemonset_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_daemonsets_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    record_field: str,
    direction: str,
) -> None:
    """Every orderBy column x direction: total/len stay K (invariant under
    sort) and records come back sorted by the requested column."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/daemonsets_orderby.jsonl"),
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
            # Guards against daemonsets seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.daemonset.name CONTAINS 'order-'"},
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
                "orderBy": {"key": {"name": "k8s.daemonset.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.namespace.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_dsname_with_groupby",
        ),
    ],
)
def test_daemonsets_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableDaemonSets.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/daemonsets.go:46-97."""
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
