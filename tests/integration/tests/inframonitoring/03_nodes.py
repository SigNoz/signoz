"""Integration tests for v2 infra-monitoring node endpoints."""

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

ENDPOINT = "/api/v2/infra_monitoring/nodes"

# Required metrics for the v2 nodes endpoint
# (pkg/modules/inframonitoring/implinframonitoring/nodes_constants.go:22-29).
REQUIRED_METRICS = {
    "k8s.node.cpu.usage",
    "k8s.node.allocatable_cpu",
    "k8s.node.memory.working_set",
    "k8s.node.allocatable_memory",
    "k8s.node.condition_ready",
    "k8s.pod.phase",
}

# Numeric values emitted by k8s.node.condition_ready.
COND_NUM = {"ready": 1, "not_ready": 0}


def test_nodes_happy_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 nodes x 5 metrics + 2 pods/node; assert response shape + both count buckets."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_happy_path.jsonl"),
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

    assert data["total"] == 2
    assert len(data["records"]) == 2
    assert data["requiredMetricsCheck"]["missingMetrics"] == []
    assert data["endTimeBeforeRetention"] is False

    assert {r["nodeName"] for r in data["records"]} == {"happy-n1", "happy-n2"}

    for record in data["records"]:
        for field in (
            "nodeName",
            "condition",
            "nodeCountsByReadiness",
            "podCountsByPhase",
            "nodeCPU",
            "nodeCPUAllocatable",
            "nodeMemory",
            "nodeMemoryAllocatable",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        for bucket in ("ready", "notReady"):
            assert bucket in record["nodeCountsByReadiness"]
        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]

        assert record["condition"] == "ready"
        assert record["nodeCountsByReadiness"] == {"ready": 1, "notReady": 0}
        # Each happy-path node hosts 2 running pods.
        assert record["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert record["podCountsByPhase"][other] == 0

        assert record["meta"].get("k8s.node.name") == record["nodeName"]
        assert "k8s.node.uid" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]


def test_nodes_value_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Exact per-node metric values, condition, and both count buckets."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/nodes_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["nodeName"]: r for r in expected["records"]}

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
    assert len(data["records"]) == len(expected["records"])

    for record in data["records"]:
        exp = exp_by_name[record["nodeName"]]
        for field in ("nodeCPU", "nodeCPUAllocatable", "nodeMemory", "nodeMemoryAllocatable"):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['nodeName']}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["condition"] == exp["condition"]
        assert record["nodeCountsByReadiness"] == exp["nodeCountsByReadiness"]
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


def test_nodes_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only k8s.node.cpu.usage; assert other 5 required metrics flagged missing."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_missing_metrics.jsonl"),
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

    assert set(data["requiredMetricsCheck"]["missingMetrics"]) == (REQUIRED_METRICS - {"k8s.node.cpu.usage"})
    assert data["records"] == []
    assert data["total"] == 0


@pytest.mark.parametrize(
    "expression,expected_nodes",
    [
        pytest.param(
            "k8s.cluster.name = 'cluster-a' AND zone = 'us'",
            {"web-a-us-1", "api-a-us-1"},
            id="and",
        ),
        pytest.param(
            "k8s.node.name IN ('web-a-us-1', 'api-b-eu-1')",
            {"web-a-us-1", "api-b-eu-1"},
            id="in",
        ),
        pytest.param(
            "k8s.cluster.name NOT IN ('cluster-a')",
            {"web-b-us-1", "web-b-eu-1", "api-b-us-1", "api-b-eu-1"},
            id="not_in",
        ),
        pytest.param(
            "k8s.node.name CONTAINS 'web'",
            {"web-a-us-1", "web-a-eu-1", "web-b-us-1", "web-b-eu-1"},
            id="contains",
        ),
        pytest.param(
            "k8s.cluster.name = 'cluster-a' AND k8s.node.name IN ('web-a-us-1', 'api-a-us-1')",
            {"web-a-us-1", "api-a-us-1"},
            id="and_in",
        ),
        pytest.param(
            "k8s.cluster.name = 'cluster-a' AND k8s.node.name NOT IN ('web-a-us-1', 'web-a-eu-1')",
            {"api-a-us-1", "api-a-eu-1"},
            id="and_not_in",
        ),
        pytest.param(
            "zone = 'us' AND k8s.node.name CONTAINS 'web'",
            {"web-a-us-1", "web-b-us-1"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.node.name IN ('web-a-us-1', 'web-b-us-1', 'api-a-us-1') AND k8s.node.name CONTAINS 'web'",
            {"web-a-us-1", "web-b-us-1"},
            id="in_contains",
        ),
    ],
)
def test_nodes_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected_nodes: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching nodes."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_filter_dataset.jsonl"),
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
    assert {r["nodeName"] for r in data["records"]} == expected_nodes
    assert data["total"] == len(expected_nodes)


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.node.namee = 'web-a-us-1'", "k8s.node.namee", id="bad_attr_name"),
        pytest.param("k8s.node.name =", None, id="trailing_op"),
        pytest.param("(k8s.node.name = 'web-a-us-1'", None, id="unclosed_paren"),
    ],
)
def test_nodes_filter_invalid(
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
            get_testdata_file_path("inframonitoring/nodes_filter_dataset.jsonl"),
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
    "node_name,expected_condition",
    [
        pytest.param("ready-n", "ready", id="ready"),
        pytest.param("notready-n", "not_ready", id="not_ready"),
    ],
)
def test_nodes_condition_list_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    node_name: str,
    expected_condition: str,
) -> None:
    """List mode: each node's record carries condition derived from latest
    k8s.node.condition_ready sample. Counts match per nodes.go:69-76."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_conditions.jsonl"),
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
            "filter": {"expression": f"k8s.node.name = '{node_name}'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["nodeName"] == node_name
    assert rec["condition"] == expected_condition
    if expected_condition == "ready":
        assert rec["nodeCountsByReadiness"] == {"ready": 1, "notReady": 0}
    else:
        assert rec["nodeCountsByReadiness"] == {"ready": 0, "notReady": 1}


def test_nodes_condition_latest_wins(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Node with condition_ready transitioning 0->1: latest argMax wins -> ready.

    Note: the dataset also seeds a phantom k8s.pod.phase sample (otherwise the
    nodes endpoint short-circuits — pod.phase is in nodesTableMetricNamesList).
    The phantom surfaces as an extra node via the metadata getter (which groups
    by k8s.node.name across ALL required-metric series, including pod-phase),
    so the test filters explicitly to the trans-n node.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_conditions_transition.jsonl"),
            base_time=now - timedelta(minutes=8),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.node.name = 'trans-n'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["nodeName"] == "trans-n"
    assert rec["condition"] == "ready"
    assert rec["nodeCountsByReadiness"] == {"ready": 1, "notReady": 0}


def test_nodes_condition_grouped_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """groupBy=[k8s.cluster.name] aggregates condition counts across nodes.
    Per the contract (nodes.go:69-76): condition stays no_data in grouped mode."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_conditions_grouped.jsonl"),
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
            "groupBy": [
                {
                    "name": "k8s.cluster.name",
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                }
            ],
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]

    # Grouped-mode invariants: per-node fields cleared.
    assert rec["nodeName"] == ""
    assert rec["condition"] == "no_data"
    # Aggregated condition counts across the cluster.
    assert rec["nodeCountsByReadiness"] == {"ready": 2, "notReady": 1}
    # Pod-phase counts aggregated: 3 running pods (one per node).
    assert rec["podCountsByPhase"]["running"] == 3
    for other in ("pending", "succeeded", "failed", "unknown"):
        assert rec["podCountsByPhase"][other] == 0
    # meta surfaces the groupBy key.
    assert rec["meta"].get("k8s.cluster.name") == "cluster-mixed"


def test_nodes_pod_phase_counts_list_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Node hosts 3 running + 2 failed pods: podCountsByPhase bucketed correctly.
    Verifies the k8s.pod.phase join via k8s.node.name in labels."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_pod_phases.jsonl"),
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
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["nodeName"] == "pp-n1"
    assert rec["podCountsByPhase"] == {
        "pending": 0,
        "running": 3,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


def test_nodes_pod_phase_counts_no_pods_on_node(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Node with no pods: podCountsByPhase all zeros, node still appears.
    Filter on the specific node to ignore the carrier phantom (see
    test_nodes_condition_latest_wins for the carrier explanation).
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_no_pods.jsonl"),
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
            "filter": {"expression": "k8s.node.name = 'no-pod-n'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["nodeName"] == "no-pod-n"
    assert rec["podCountsByPhase"] == {
        "pending": 0,
        "running": 0,
        "succeeded": 0,
        "failed": 0,
        "unknown": 0,
    }


def test_nodes_groupby_cluster(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Explicit groupBy=[k8s.cluster.name]: 2 records (one per cluster),
    aggregated node + pod counts, meta surfaces cluster.name."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_groupby.jsonl"),
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
            "groupBy": [
                {
                    "name": "k8s.cluster.name",
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                }
            ],
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 2

    clusters_seen = set()
    for rec in data["records"]:
        assert rec["nodeName"] == ""
        assert rec["condition"] == "no_data"
        # Each cluster has 2 nodes -> nodeCountsByReadiness {ready:2, notReady:0}
        assert rec["nodeCountsByReadiness"] == {"ready": 2, "notReady": 0}
        # Each cluster has 2 pods (1 per node).
        assert rec["podCountsByPhase"]["running"] == 2
        assert "k8s.cluster.name" in rec["meta"], rec["meta"]
        clusters_seen.add(rec["meta"]["k8s.cluster.name"])
    assert clusters_seen == {"gb-cluster-a", "gb-cluster-b"}


def test_nodes_pagination_sync(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination invariants across 3 offset windows."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_pagination.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K, limit = 7, 3
    seen_nodes: list[str] = []
    seen_totals: set[int] = set()

    for offset in (0, 3, 6):
        response = requests.post(
            signoz.self.host_configs["8080"].get(ENDPOINT),
            headers={"authorization": f"Bearer {token}"},
            json={
                "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                "end": int(now.timestamp() * 1000),
                "limit": limit,
                "offset": offset,
                # Exclude the dataset's carrier phantom (see test_nodes_condition_latest_wins).
                "filter": {"expression": "k8s.node.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = min(limit, K - offset)
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len} records, got {len(data['records'])}"
        seen_nodes.extend(r["nodeName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_nodes) == K
    assert set(seen_nodes) == {f"page-n{i}" for i in range(1, K + 1)}


def test_nodes_offset_beyond_total(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Offset beyond total returns empty records; total still reflects dataset size."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_pagination.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K = 7
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 3,
            "offset": K + 5,
            "filter": {"expression": "k8s.node.name CONTAINS 'page-'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["records"] == []
    assert data["total"] == K


# orderBy keys per nodes_constants.go:33-37.
@pytest.mark.parametrize(
    "column",
    ["cpu", "cpu_allocatable", "memory", "memory_allocatable"],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_nodes_total_invariant_across_orderby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    direction: str,
) -> None:
    """Total stays K across all orderBy column x direction combinations."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_orderby.jsonl"),
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
            "filter": {"expression": "k8s.node.name CONTAINS 'order-'"},
        },
        timeout=5,
    )
    ctx = f"orderBy={column} {direction}"
    assert response.status_code == HTTPStatus.OK, f"{ctx}: {response.text}"
    data = response.json()["data"]
    assert data["total"] == K, f"{ctx}: total={data['total']}"
    assert len(data["records"]) == K, f"{ctx}: len(records)={len(data['records'])}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_nodes_orderby_correctness(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """Records sorted by nodeCPU in the requested direction."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_pagination.jsonl"),
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
            "orderBy": {"key": {"name": "cpu"}, "direction": direction},
            "filter": {"expression": "k8s.node.name CONTAINS 'page-'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    cpu_values = [r["nodeCPU"] for r in data["records"]]
    expected = sorted(cpu_values, reverse=(direction == "desc"))
    assert cpu_values == expected, f"cpu {direction} not sorted; got {cpu_values}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_nodes_orderby_by_node_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """orderBy=k8s.node.name with empty groupBy returns nodes sorted alphabetically
    via the metadata-name branch (PaginateMetadataByName)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/nodes_orderby.jsonl"),
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
            "orderBy": {"key": {"name": "k8s.node.name"}, "direction": direction},
            "filter": {"expression": "k8s.node.name CONTAINS 'order-'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    names = [r["nodeName"] for r in data["records"]]
    expected = sorted(names, reverse=(direction == "desc"))
    assert names == expected, f"node.name {direction} not sorted; got {names}"


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
            {"orderBy": {"key": {"name": "condition"}, "direction": "desc"}},
            "invalid order by key",
            id="orderby_condition_rejected",
        ),
        pytest.param(
            {"orderBy": {"key": {"name": "cpu"}, "direction": "up"}},
            "invalid order by direction",
            id="orderby_invalid_direction",
        ),
        pytest.param(
            {
                "orderBy": {"key": {"name": "k8s.node.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.cluster.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_nodename_with_groupby",
        ),
    ],
)
def test_nodes_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableNodes.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/nodes.go:51-102."""
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
