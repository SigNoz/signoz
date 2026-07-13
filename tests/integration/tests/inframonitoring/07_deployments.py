"""Integration tests for v2 infra-monitoring deployments endpoint."""

import json
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.inframonitoring import expected_status_counts
from fixtures.metrics import Metrics
from fixtures.querier import compare_values, get_all_warnings

ENDPOINT = "/api/v2/infra_monitoring/deployments"


def test_deployments_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert response shape/contract + exact per-deployment metric values,
    replica counts, and phase counts against precomputed expected output.

    Locks in Sum vs Avg split across pod-level metrics
    (deployments_constants.go:79-198): A/D = SpaceAggregationSum across pods;
    B/C/E/F = SpaceAggregationAvg. Replica counts (H/I) are latest-summed.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/deployments_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["deploymentName"]: r for r in expected["records"]}

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
    assert {r["deploymentName"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        for field in (
            "deploymentName",
            "deploymentCPU",
            "deploymentCPURequest",
            "deploymentCPULimit",
            "deploymentMemory",
            "deploymentMemoryRequest",
            "deploymentMemoryLimit",
            "desiredPods",
            "availablePods",
            "podCountsByPhase",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # ints (not floats) for replica counts.
        assert isinstance(record["desiredPods"], int)
        assert isinstance(record["availablePods"], int)

        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["meta"].get("k8s.deployment.name") == record["deploymentName"]
        assert "k8s.namespace.name" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]

        # Exact values.
        exp = exp_by_name[record["deploymentName"]]
        for field in (
            "deploymentCPU",
            "deploymentCPURequest",
            "deploymentCPULimit",
            "deploymentMemory",
            "deploymentMemoryRequest",
            "deploymentMemoryLimit",
        ):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['deploymentName']}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["desiredPods"] == exp["desiredPods"]
        assert record["availablePods"] == exp["availablePods"]
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


@pytest.mark.parametrize(
    "case",
    [
        # Scenario 1: required metrics were never ingested. Post-#11754 the querier
        # drops them (no hard error), so the endpoint returns 200 with the deployment
        # that DOES have data; never-seen columns are the -1 sentinel + a
        # "have never been received" warning. No formulas; pod- and deployment-level
        # metrics each map to one column.
        pytest.param(
            {
                "dataset": "deployments_missing_metrics.jsonl",  # seeds only k8s.pod.cpu.usage
                "body": {"filter": {"expression": "k8s.deployment.name = 'miss-dep'"}},
                "warn_substrings": ["never been received"],
                "warn_names": [
                    "k8s.pod.memory.working_set",
                    "k8s.deployment.desired",
                    "k8s.deployment.available",
                ],
                "data_fields": ["deploymentCPU"],
                "no_data_fields": [
                    "deploymentCPURequest",
                    "deploymentCPULimit",
                    "deploymentMemory",
                    "deploymentMemoryRequest",
                    "deploymentMemoryLimit",
                    "desiredPods",
                    "availablePods",
                ],
            },
            id="metric_never_seen",
        ),
    ],
)
def test_deployments_warnings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    case: dict,
) -> None:
    """A never-ingested metric surfaces a non-blocking warning (200 + data), not a
    hard error: the endpoint returns the entity that DOES have data and the
    never-seen columns carry the -1 sentinel. (The generic never-seen
    (metric, key)-pair-via-groupBy warning is entity-agnostic and is exercised
    once, for hosts, in 01_hosts.py.)"""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path(f"inframonitoring/{case['dataset']}"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    body: dict = {
        "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    body.update(case["body"])

    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    warnings = get_all_warnings(response.json())

    for substr in case["warn_substrings"]:
        assert any(substr in w["message"] for w in warnings), f"{substr!r} not surfaced: {warnings!r}"
    for name in case["warn_names"]:
        assert any(name in w["message"] for w in warnings), f"{name!r} not surfaced: {warnings!r}"

    assert len(data["records"]) >= 1, f"expected at least one record: {data!r}"
    if case["data_fields"] or case["no_data_fields"]:
        record = data["records"][0]
        for field in case["data_fields"]:
            assert record[field] != -1, f"expected {field} populated, got {record[field]}"
        for field in case["no_data_fields"]:
            assert record[field] == -1, f"expected {field} == -1 sentinel, got {record[field]}"


@pytest.mark.parametrize(
    "expression,expected",
    [
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND env = 'prod'",
            {"web-a-prod", "api-a-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.deployment.name IN ('web-a-prod', 'api-b-dev')",
            {"web-a-prod", "api-b-dev"},
            id="in",
        ),
        # NOT IN on the partition key (k8s.deployment.name) returns the rest.
        # NOT IN on non-partition labels is unreliable in QB v5 — covered indirectly
        # via the and_not_in combo. Same workaround as clusters/volumes.
        pytest.param(
            "k8s.deployment.name NOT IN ('web-a-prod', 'web-a-dev', 'api-a-prod', 'api-a-dev')",
            {"web-b-prod", "web-b-dev", "api-b-prod", "api-b-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.deployment.name CONTAINS 'web'",
            {"web-a-prod", "web-a-dev", "web-b-prod", "web-b-dev"},
            id="contains",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.deployment.name IN ('web-a-prod', 'api-a-prod')",
            {"web-a-prod", "api-a-prod"},
            id="and_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.deployment.name NOT IN ('web-a-prod', 'web-a-dev')",
            {"api-a-prod", "api-a-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.deployment.name CONTAINS 'web'",
            {"web-a-prod", "web-b-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.deployment.name IN ('web-a-prod', 'web-b-prod', 'api-a-prod') AND k8s.deployment.name CONTAINS 'web'",
            {"web-a-prod", "web-b-prod"},
            id="in_contains",
        ),
    ],
)
def test_deployments_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching deployments, with undistorted per-deployment
    metric values."""
    # Every deployment in deployments_filter_dataset.jsonl carries the same
    # sample pattern as acc-dep-1 in deployments_value_accuracy.jsonl (2 pods),
    # so all filtered records must resolve to these exact values (mirrors
    # deployments_value_accuracy_expected.json acc-dep-1).
    expected_values = {
        "deploymentCPU": 1.0,
        "deploymentCPURequest": 0.5,
        "deploymentCPULimit": 0.4,
        "deploymentMemory": 300000000.0,
        "deploymentMemoryRequest": 0.5,
        "deploymentMemoryLimit": 0.4,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_filter_dataset.jsonl"),
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
    assert {r["deploymentName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-deployment aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['deploymentName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.deployment.namee = 'web-a-prod'", "k8s.deployment.namee", id="bad_attr_name"),
        pytest.param("k8s.deployment.name =", None, id="trailing_op"),
        pytest.param("(k8s.deployment.name = 'web-a-prod'", None, id="unclosed_paren"),
    ],
)
def test_deployments_filter_invalid(
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
            get_testdata_file_path("inframonitoring/deployments_filter_dataset.jsonl"),
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


def test_deployments_pod_phase_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Deployment with mixed pod phases: 4 Running + 1 Pending + 2 Failed."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.deployment.name = 'pp-dep'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["deploymentName"] == "pp-dep"
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 4,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


def test_deployments_pod_status_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Deployment's pods aggregated by kubectl-style display status. Seeded states
    in deployments_pod_phases.jsonl -> what kubectl would show:
      pp-run-1/3/4 Running, pp-run-2 CrashLoopBackOff (phase Running),
      pp-fail-1 Error, pp-fail-2 Evicted (pod-level), pp-pen-1 Pending.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.deployment.name = 'pp-dep'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["deploymentName"] == "pp-dep"
    assert rec["podCountsByStatus"] == expected_status_counts(running=3, crashLoopBackOff=1, error=1, evicted=1, pending=1)
    # Phase counts unchanged by the status enrichment.
    assert rec["podCountsByPhase"] == {"pending": 1, "running": 4, "succeeded": 0, "failed": 2, "unknown": 0}
    # All status metrics present -> gate satisfied -> no status warning.
    assert all("Pod status could not be computed" not in w["message"] for w in get_all_warnings(response.json()))


def test_deployments_desired_available_counts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """desired=5, available=3 from k8s.deployment.* metrics; only 2 Running pods seeded.
    Distinguishes replica counts from phase counts (separate code paths)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_desired_available.jsonl"),
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
            "filter": {"expression": "k8s.deployment.name = 'da-dep'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["deploymentName"] == "da-dep"
    assert isinstance(rec["desiredPods"], int)
    assert isinstance(rec["availablePods"], int)
    assert rec["desiredPods"] == 5
    assert rec["availablePods"] == 3
    assert rec["podCountsByPhase"]["running"] == 2


def test_deployments_base_filter_drops_non_deployment_pods(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Locks in deploymentsBaseFilterExpr (deployments_constants.go:10, :63-69):
    standalone pods (no k8s.deployment.name) + StatefulSet pods (k8s.statefulset.name only)
    are dropped. Only the real deployment row appears, total=1, no empty-name group."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_non_deployment_pods.jsonl"),
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
    assert data["total"] == 1, f"expected only the real deployment row; got {[r['deploymentName'] for r in data['records']]}"
    rec = data["records"][0]
    assert rec["deploymentName"] == "nd-dep"
    # No empty-name group leaking through.
    assert all(r["deploymentName"] != "" for r in data["records"])


# Float record fields compared with tolerance; everything else compared with ==.
_GROUPBY_FLOAT_FIELDS = {
    "deploymentCPU",
    "deploymentCPURequest",
    "deploymentCPULimit",
    "deploymentMemory",
    "deploymentMemoryRequest",
    "deploymentMemoryLimit",
}


def _phase(pending=0, running=0, succeeded=0, failed=0, unknown=0) -> dict:
    return {"pending": pending, "running": running, "succeeded": succeeded, "failed": failed, "unknown": unknown}


@pytest.mark.parametrize(
    "scenario",
    [
        # Explicit groupBy=[k8s.deployment.name]: one record per deployment,
        # deploymentName populated (deployments.go:28-31), response grouped_list.
        # 1 running pod each.
        pytest.param(
            {
                "fixture": "deployments_groupby.jsonl",
                "group_by": "k8s.deployment.name",
                "filter": None,
                "group_meta_keys": ["k8s.deployment.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-dep-a1": {"deploymentName": "gb-dep-a1", "podCountsByPhase": _phase(running=1)},
                    "gb-dep-a2": {"deploymentName": "gb-dep-a2", "podCountsByPhase": _phase(running=1)},
                    "gb-dep-b1": {"deploymentName": "gb-dep-b1", "podCountsByPhase": _phase(running=1)},
                    "gb-dep-b2": {"deploymentName": "gb-dep-b2", "podCountsByPhase": _phase(running=1)},
                },
            },
            id="deployment_name",
        ),
        # Explicit groupBy=[k8s.namespace.name]: aggregated across each namespace's
        # 2 deployments, deploymentName cleared, response grouped_list. 2 running each.
        pytest.param(
            {
                "fixture": "deployments_groupby.jsonl",
                "group_by": "k8s.namespace.name",
                "filter": None,
                "group_meta_keys": ["k8s.namespace.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ns-a": {"deploymentName": "", "podCountsByPhase": _phase(running=2)},
                    "gb-ns-b": {"deploymentName": "", "podCountsByPhase": _phase(running=2)},
                },
            },
            id="namespace",
        ),
        # Default groupBy (no groupBy in request) => [k8s.deployment.name,
        # k8s.namespace.name, k8s.cluster.name] (module.go ListDeployments),
        # response list. Same workload name must NOT collapse across namespaces OR
        # clusters; the empty-cluster group (k8s.cluster.name label absent on the
        # source pods) must appear as its own row with real metrics, not be dropped.
        # Single pod per group => SpaceAggregationSum == Avg == seeded value.
        # Fails on the pre-cluster default (name+ns) — the three ns-x groups would
        # collapse into one summed row.
        pytest.param(
            {
                "fixture": "deployments_same_name_across_ns_and_clusters.jsonl",
                "group_by": None,
                "filter": "k8s.deployment.name = 'dup-dep'",
                "group_meta_keys": ["k8s.deployment.name", "k8s.namespace.name", "k8s.cluster.name"],
                "expected_type": "list",
                "groups": {
                    ("dup-dep", "ns-x", "cluster-a"): {
                        "deploymentName": "dup-dep",
                        "deploymentCPU": 0.3,
                        "deploymentCPURequest": 0.6,
                        "deploymentCPULimit": 0.7,
                        "deploymentMemory": 100000000.0,
                        "deploymentMemoryRequest": 0.6,
                        "deploymentMemoryLimit": 0.7,
                        "desiredPods": 2,
                        "availablePods": 2,
                        "podCountsByPhase": _phase(running=1),
                    },
                    ("dup-dep", "ns-y", "cluster-a"): {
                        "deploymentName": "dup-dep",
                        "deploymentCPU": 0.9,
                        "deploymentCPURequest": 0.2,
                        "deploymentCPULimit": 0.3,
                        "deploymentMemory": 500000000.0,
                        "deploymentMemoryRequest": 0.2,
                        "deploymentMemoryLimit": 0.3,
                        "desiredPods": 3,
                        "availablePods": 1,
                        "podCountsByPhase": _phase(failed=1),
                    },
                    ("dup-dep", "ns-x", "cluster-b"): {
                        "deploymentName": "dup-dep",
                        "deploymentCPU": 0.5,
                        "deploymentCPURequest": 0.4,
                        "deploymentCPULimit": 0.5,
                        "deploymentMemory": 300000000.0,
                        "deploymentMemoryRequest": 0.4,
                        "deploymentMemoryLimit": 0.5,
                        "desiredPods": 4,
                        "availablePods": 4,
                        "podCountsByPhase": _phase(running=1),
                    },
                    # empty-cluster group: k8s.cluster.name label absent on the source pods.
                    ("dup-dep", "ns-x", ""): {
                        "deploymentName": "dup-dep",
                        "deploymentCPU": 0.1,
                        "deploymentCPURequest": 0.1,
                        "deploymentCPULimit": 0.1,
                        "deploymentMemory": 200000000.0,
                        "deploymentMemoryRequest": 0.1,
                        "deploymentMemoryLimit": 0.1,
                        "desiredPods": 1,
                        "availablePods": 0,
                        "podCountsByPhase": _phase(pending=1),
                    },
                },
            },
            id="default_disambiguates_ns_and_cluster",
        ),
    ],
)
def test_deployments_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    scenario: dict,
) -> None:
    """groupBy determines row identity. Explicit groupBy returns one grouped_list
    record per distinct group (deploymentName populated only when grouping by
    k8s.deployment.name; deployments.go:28-31). With no groupBy the default is
    [k8s.deployment.name, k8s.namespace.name, k8s.cluster.name] (module.go
    ListDeployments), so same-named deployments across namespaces/clusters stay as
    separate, un-collapsed list rows (incl. an absent-cluster group keyed by "").
    meta always surfaces the grouping key(s)."""
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


def test_deployments_pagination(
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
            get_testdata_file_path("inframonitoring/deployments_pagination.jsonl"),
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
                "filter": {"expression": "k8s.deployment.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["deploymentName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-dep-{i}" for i in range(1, K + 1)}


# orderBy keys per deployments_constants.go:5-14 (snake_case request keys,
# camelCase response fields). k8s.deployment.name sorts via the metadata-name
# branch (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "deploymentCPU", id="cpu"),
        pytest.param("cpu_request", "deploymentCPURequest", id="cpu_request"),
        pytest.param("cpu_limit", "deploymentCPULimit", id="cpu_limit"),
        pytest.param("memory", "deploymentMemory", id="memory"),
        pytest.param("memory_request", "deploymentMemoryRequest", id="memory_request"),
        pytest.param("memory_limit", "deploymentMemoryLimit", id="memory_limit"),
        pytest.param("desired_pods", "desiredPods", id="desired_pods"),
        pytest.param("available_pods", "availablePods", id="available_pods"),
        pytest.param("k8s.deployment.name", "deploymentName", id="deployment_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_deployments_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
    entry in orderByToDeploymentsQueryNames (deployments_constants.go:47-56)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/deployments_orderby.jsonl"),
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
            # Guards against deployments seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.deployment.name CONTAINS 'order-'"},
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
                "orderBy": {"key": {"name": "k8s.deployment.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.namespace.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_depname_with_groupby",
        ),
    ],
)
def test_deployments_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableDeployments.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/deployments.go:46-97."""
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
