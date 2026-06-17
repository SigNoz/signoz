"""Integration tests for v2 infra-monitoring statefulsets endpoint."""

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

ENDPOINT = "/api/v2/infra_monitoring/statefulsets"

# Required metrics for the v2 statefulsets endpoint
# (pkg/modules/inframonitoring/implinframonitoring/statefulsets_constants.go:24-34).
REQUIRED_METRICS = {
    "k8s.pod.phase",
    "k8s.pod.cpu.usage",
    "k8s.pod.cpu_request_utilization",
    "k8s.pod.cpu_limit_utilization",
    "k8s.pod.memory.working_set",
    "k8s.pod.memory_request_utilization",
    "k8s.pod.memory_limit_utilization",
    "k8s.statefulset.desired_pods",
    "k8s.statefulset.current_pods",
}


def test_statefulsets_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert response shape/contract + exact per-SS metric values, replica
    counts, and phase counts against precomputed expected output.

    Locks in Sum vs Avg split across pod-level metrics
    (statefulsets_constants.go:79-198): A/D = SpaceAggregationSum across pods;
    B/C/E/F = SpaceAggregationAvg. Replica counts (H/I) are latest-summed.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/statefulsets_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["statefulSetName"]: r for r in expected["records"]}

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
    assert data["requiredMetricsCheck"]["missingMetrics"] == []
    assert data["endTimeBeforeRetention"] is False
    assert {r["statefulSetName"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        for field in (
            "statefulSetName",
            "statefulSetCPU",
            "statefulSetCPURequest",
            "statefulSetCPULimit",
            "statefulSetMemory",
            "statefulSetMemoryRequest",
            "statefulSetMemoryLimit",
            "desiredPods",
            "currentPods",
            "podCountsByPhase",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # ints (not floats) for replica counts.
        assert isinstance(record["desiredPods"], int)
        assert isinstance(record["currentPods"], int)

        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["meta"].get("k8s.statefulset.name") == record["statefulSetName"]
        assert "k8s.namespace.name" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]

        # Exact values.
        exp = exp_by_name[record["statefulSetName"]]
        for field in (
            "statefulSetCPU",
            "statefulSetCPURequest",
            "statefulSetCPULimit",
            "statefulSetMemory",
            "statefulSetMemoryRequest",
            "statefulSetMemoryLimit",
        ):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['statefulSetName']}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["desiredPods"] == exp["desiredPods"]
        assert record["currentPods"] == exp["currentPods"]
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


def test_statefulsets_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only k8s.pod.cpu.usage; assert other 8 required metrics flagged missing."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_missing_metrics.jsonl"),
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

    assert set(data["requiredMetricsCheck"]["missingMetrics"]) == (REQUIRED_METRICS - {"k8s.pod.cpu.usage"})
    assert data["records"] == []
    assert data["total"] == 0


@pytest.mark.parametrize(
    "expression,expected",
    [
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND env = 'prod'",
            {"web-a-prod", "api-a-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.statefulset.name IN ('web-a-prod', 'api-b-dev')",
            {"web-a-prod", "api-b-dev"},
            id="in",
        ),
        # NOT IN on the partition key (k8s.statefulset.name) returns the rest.
        # NOT IN on non-partition labels is unreliable in QB v5; covered indirectly
        # via the and_not_in combo. Same workaround as clusters/volumes/deployments.
        pytest.param(
            "k8s.statefulset.name NOT IN ('web-a-prod', 'web-a-dev', 'api-a-prod', 'api-a-dev')",
            {"web-b-prod", "web-b-dev", "api-b-prod", "api-b-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.statefulset.name CONTAINS 'web'",
            {"web-a-prod", "web-a-dev", "web-b-prod", "web-b-dev"},
            id="contains",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.statefulset.name IN ('web-a-prod', 'api-a-prod')",
            {"web-a-prod", "api-a-prod"},
            id="and_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.statefulset.name NOT IN ('web-a-prod', 'web-a-dev')",
            {"api-a-prod", "api-a-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.statefulset.name CONTAINS 'web'",
            {"web-a-prod", "web-b-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.statefulset.name IN ('web-a-prod', 'web-b-prod', 'api-a-prod') AND k8s.statefulset.name CONTAINS 'web'",
            {"web-a-prod", "web-b-prod"},
            id="in_contains",
        ),
    ],
)
def test_statefulsets_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching statefulsets, with undistorted per-SS metric
    values."""
    # Every statefulset in statefulsets_filter_dataset.jsonl carries the same
    # sample pattern as acc-ss-1 in statefulsets_value_accuracy.jsonl (2 pods),
    # so all filtered records must resolve to these exact values (mirrors
    # statefulsets_value_accuracy_expected.json acc-ss-1).
    expected_values = {
        "statefulSetCPU": 1.0,
        "statefulSetCPURequest": 0.5,
        "statefulSetCPULimit": 0.4,
        "statefulSetMemory": 300000000.0,
        "statefulSetMemoryRequest": 0.5,
        "statefulSetMemoryLimit": 0.4,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_filter_dataset.jsonl"),
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
    assert {r["statefulSetName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-statefulset aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['statefulSetName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.statefulset.namee = 'web-a-prod'", "k8s.statefulset.namee", id="bad_attr_name"),
        pytest.param("k8s.statefulset.name =", None, id="trailing_op"),
        pytest.param("(k8s.statefulset.name = 'web-a-prod'", None, id="unclosed_paren"),
    ],
)
def test_statefulsets_filter_invalid(
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
            get_testdata_file_path("inframonitoring/statefulsets_filter_dataset.jsonl"),
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


def test_statefulsets_pod_phase_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """StatefulSet with mixed pod phases: 4 Running + 1 Pending + 2 Failed."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.statefulset.name = 'pp-ss'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["statefulSetName"] == "pp-ss"
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 4,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


def test_statefulsets_desired_current_counts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """desired=5, current=3 from k8s.statefulset.* metrics; only 2 Running pods seeded.
    Distinguishes replica counts from phase counts (separate code paths)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_desired_current.jsonl"),
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
            "filter": {"expression": "k8s.statefulset.name = 'dc-ss'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["statefulSetName"] == "dc-ss"
    assert isinstance(rec["desiredPods"], int)
    assert isinstance(rec["currentPods"], int)
    assert rec["desiredPods"] == 5
    assert rec["currentPods"] == 3
    assert rec["podCountsByPhase"]["running"] == 2


def test_statefulsets_base_filter_drops_non_statefulset_pods(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Locks in statefulSetsBaseFilterExpr (statefulsets_constants.go:10, :63-69):
    standalone pods (no k8s.statefulset.name) + Deployment pods (k8s.deployment.name only)
    are dropped. Only the real SS row appears, total=1, no empty-name group."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_non_ss_pods.jsonl"),
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
    assert data["total"] == 1, f"expected only the real SS row; got {[r['statefulSetName'] for r in data['records']]}"
    rec = data["records"][0]
    assert rec["statefulSetName"] == "ns-ss"
    # No empty-name group leaking through.
    assert all(r["statefulSetName"] != "" for r in data["records"])


# Float record fields compared with tolerance; everything else compared with ==.
_GROUPBY_FLOAT_FIELDS = {
    "statefulSetCPU",
    "statefulSetCPURequest",
    "statefulSetCPULimit",
    "statefulSetMemory",
    "statefulSetMemoryRequest",
    "statefulSetMemoryLimit",
}


def _phase(pending=0, running=0, succeeded=0, failed=0, unknown=0) -> dict:
    return {"pending": pending, "running": running, "succeeded": succeeded, "failed": failed, "unknown": unknown}


@pytest.mark.parametrize(
    "scenario",
    [
        # Explicit groupBy=[k8s.statefulset.name]: one record per statefulset,
        # statefulSetName populated (statefulsets.go:28-31), response grouped_list.
        # 1 running pod each.
        pytest.param(
            {
                "fixture": "statefulsets_groupby.jsonl",
                "group_by": "k8s.statefulset.name",
                "filter": None,
                "group_meta_keys": ["k8s.statefulset.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ss-a1": {"statefulSetName": "gb-ss-a1", "podCountsByPhase": _phase(running=1)},
                    "gb-ss-a2": {"statefulSetName": "gb-ss-a2", "podCountsByPhase": _phase(running=1)},
                    "gb-ss-b1": {"statefulSetName": "gb-ss-b1", "podCountsByPhase": _phase(running=1)},
                    "gb-ss-b2": {"statefulSetName": "gb-ss-b2", "podCountsByPhase": _phase(running=1)},
                },
            },
            id="statefulset_name",
        ),
        # Explicit groupBy=[k8s.namespace.name]: aggregated across each namespace's
        # 2 statefulsets, statefulSetName cleared, response grouped_list. 2 running each.
        pytest.param(
            {
                "fixture": "statefulsets_groupby.jsonl",
                "group_by": "k8s.namespace.name",
                "filter": None,
                "group_meta_keys": ["k8s.namespace.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ns-a": {"statefulSetName": "", "podCountsByPhase": _phase(running=2)},
                    "gb-ns-b": {"statefulSetName": "", "podCountsByPhase": _phase(running=2)},
                },
            },
            id="namespace",
        ),
        # Default groupBy (no groupBy in request) => [k8s.statefulset.name,
        # k8s.namespace.name, k8s.cluster.name] (module.go ListStatefulSets),
        # response list. Same workload name must NOT collapse across namespaces OR
        # clusters; the empty-cluster group (k8s.cluster.name label absent on the
        # source pods) must appear as its own row with real metrics, not be dropped.
        # Single pod per group => SpaceAggregationSum == Avg == seeded value.
        # Fails on the pre-cluster default (name+ns) — the three ns-x groups would
        # collapse into one summed row.
        pytest.param(
            {
                "fixture": "statefulsets_same_name_across_ns_and_clusters.jsonl",
                "group_by": None,
                "filter": "k8s.statefulset.name = 'dup-ss'",
                "group_meta_keys": ["k8s.statefulset.name", "k8s.namespace.name", "k8s.cluster.name"],
                "expected_type": "list",
                "groups": {
                    ("dup-ss", "ns-x", "cluster-a"): {
                        "statefulSetName": "dup-ss",
                        "statefulSetCPU": 0.3,
                        "statefulSetCPURequest": 0.6,
                        "statefulSetCPULimit": 0.7,
                        "statefulSetMemory": 100000000.0,
                        "statefulSetMemoryRequest": 0.6,
                        "statefulSetMemoryLimit": 0.7,
                        "desiredPods": 2,
                        "currentPods": 2,
                        "podCountsByPhase": _phase(running=1),
                    },
                    ("dup-ss", "ns-y", "cluster-a"): {
                        "statefulSetName": "dup-ss",
                        "statefulSetCPU": 0.9,
                        "statefulSetCPURequest": 0.2,
                        "statefulSetCPULimit": 0.3,
                        "statefulSetMemory": 500000000.0,
                        "statefulSetMemoryRequest": 0.2,
                        "statefulSetMemoryLimit": 0.3,
                        "desiredPods": 3,
                        "currentPods": 1,
                        "podCountsByPhase": _phase(failed=1),
                    },
                    ("dup-ss", "ns-x", "cluster-b"): {
                        "statefulSetName": "dup-ss",
                        "statefulSetCPU": 0.5,
                        "statefulSetCPURequest": 0.4,
                        "statefulSetCPULimit": 0.5,
                        "statefulSetMemory": 300000000.0,
                        "statefulSetMemoryRequest": 0.4,
                        "statefulSetMemoryLimit": 0.5,
                        "desiredPods": 4,
                        "currentPods": 4,
                        "podCountsByPhase": _phase(running=1),
                    },
                    # empty-cluster group: k8s.cluster.name label absent on the source pods.
                    ("dup-ss", "ns-x", ""): {
                        "statefulSetName": "dup-ss",
                        "statefulSetCPU": 0.1,
                        "statefulSetCPURequest": 0.1,
                        "statefulSetCPULimit": 0.1,
                        "statefulSetMemory": 200000000.0,
                        "statefulSetMemoryRequest": 0.1,
                        "statefulSetMemoryLimit": 0.1,
                        "desiredPods": 1,
                        "currentPods": 0,
                        "podCountsByPhase": _phase(pending=1),
                    },
                },
            },
            id="default_disambiguates_ns_and_cluster",
        ),
    ],
)
def test_statefulsets_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    scenario: dict,
) -> None:
    """groupBy determines row identity. Explicit groupBy returns one grouped_list
    record per distinct group (statefulSetName populated only when grouping by
    k8s.statefulset.name; statefulsets.go:28-31). With no groupBy the default is
    [k8s.statefulset.name, k8s.namespace.name] (module.go ListStatefulSets), so
    same-named statefulsets across namespaces stay as separate, un-collapsed list
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


def test_statefulsets_pagination(
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
            get_testdata_file_path("inframonitoring/statefulsets_pagination.jsonl"),
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
                "filter": {"expression": "k8s.statefulset.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["statefulSetName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-ss-{i}" for i in range(1, K + 1)}


# orderBy keys per statefulsets_constants.go:5-14 (snake_case request keys,
# camelCase response fields). k8s.statefulset.name sorts via the metadata-name
# branch (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "statefulSetCPU", id="cpu"),
        pytest.param("cpu_request", "statefulSetCPURequest", id="cpu_request"),
        pytest.param("cpu_limit", "statefulSetCPULimit", id="cpu_limit"),
        pytest.param("memory", "statefulSetMemory", id="memory"),
        pytest.param("memory_request", "statefulSetMemoryRequest", id="memory_request"),
        pytest.param("memory_limit", "statefulSetMemoryLimit", id="memory_limit"),
        pytest.param("desired_pods", "desiredPods", id="desired_pods"),
        pytest.param("current_pods", "currentPods", id="current_pods"),
        pytest.param("k8s.statefulset.name", "statefulSetName", id="statefulset_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_statefulsets_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    record_field: str,
    direction: str,
) -> None:
    """Every orderBy column x direction: total/len stay K (invariant under
    sort) and records come back sorted by the requested column. Covers each
    entry in orderByToStatefulSetsQueryNames (statefulsets_constants.go:47-56)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/statefulsets_orderby.jsonl"),
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
            # Guards against statefulsets seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.statefulset.name CONTAINS 'order-'"},
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
                "orderBy": {"key": {"name": "k8s.statefulset.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.namespace.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_ssname_with_groupby",
        ),
    ],
)
def test_statefulsets_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableStatefulSets.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/statefulsets.go:46-97."""
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
