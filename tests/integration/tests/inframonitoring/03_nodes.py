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


def test_nodes_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 nodes x 5 metrics + pods; assert response shape/contract + exact
    per-node metric values, condition, and both count buckets against
    precomputed expected output."""
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

    # Shape/contract.
    assert data["total"] == len(expected["records"])
    assert len(data["records"]) == len(expected["records"])
    assert data["requiredMetricsCheck"]["missingMetrics"] == []
    assert data["endTimeBeforeRetention"] is False
    assert {r["nodeName"] for r in data["records"]} == set(exp_by_name.keys())

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

        assert record["meta"].get("k8s.node.name") == record["nodeName"]
        assert "k8s.node.uid" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]

        # Exact values.
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
    return exactly the matching nodes, with undistorted per-node metric values."""
    # Every node in nodes_filter_dataset.jsonl carries the same sample pattern
    # as acc-n1 in nodes_value_accuracy.jsonl, so all filtered records must
    # resolve to these exact values (mirrors nodes_value_accuracy_expected.json
    # acc-n1).
    expected_values = {
        "nodeCPU": 1.0,
        "nodeCPUAllocatable": 4.0,
        "nodeMemory": 2000000000.0,
        "nodeMemoryAllocatable": 8000000000.0,
    }
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

    # Filtering must not distort per-node aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['nodeName']}.{field}: got {record[field]}, expected {expected_values[field]}"


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


@pytest.mark.parametrize(
    "dataset,node_name,filter_expr,expected_counts",
    [
        # Node hosts 3 running + 2 failed pods: phase buckets aggregate correctly.
        pytest.param(
            "nodes_pod_phases.jsonl",
            "pp-n1",
            None,
            {"pending": 0, "running": 3, "succeeded": 0, "failed": 2, "unknown": 0},
            id="mixed_phases",
        ),
        # Node with no pods: all-zero buckets, node still appears. Filter on the
        # node to ignore the carrier phantom (see test_nodes_condition_latest_wins).
        pytest.param(
            "nodes_no_pods.jsonl",
            "no-pod-n",
            "k8s.node.name = 'no-pod-n'",
            {"pending": 0, "running": 0, "succeeded": 0, "failed": 0, "unknown": 0},
            id="no_pods",
        ),
    ],
)
def test_nodes_pod_phase_counts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    dataset: str,
    node_name: str,
    filter_expr,
    expected_counts: dict,
) -> None:
    """podCountsByPhase per node aggregates the pods scheduled on it (k8s.pod.phase
    joined via k8s.node.name). A node with no pods reports all-zero buckets and
    still appears in the result."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path(f"inframonitoring/{dataset}"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    body = {
        "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    if filter_expr is not None:
        body["filter"] = {"expression": filter_expr}
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["nodeName"] == node_name
    assert rec["podCountsByPhase"] == expected_counts


@pytest.mark.parametrize(
    "group_key,expected",
    [
        # groupBy=[k8s.node.name]: one record per node, nodeName populated and
        # condition derived per node (isNodeNameInGroupBy branch, nodes.go:69-76).
        pytest.param(
            "k8s.node.name",
            {
                "gb-a-us": {"condition": "ready", "readiness": {"ready": 1, "notReady": 0}, "running": 1},
                "gb-a-eu": {"condition": "ready", "readiness": {"ready": 1, "notReady": 0}, "running": 1},
                "gb-b-us": {"condition": "ready", "readiness": {"ready": 1, "notReady": 0}, "running": 1},
                "gb-b-eu": {"condition": "ready", "readiness": {"ready": 1, "notReady": 0}, "running": 1},
            },
            id="node_name",
        ),
        # groupBy=[k8s.cluster.name]: aggregated across each cluster's 2 nodes,
        # nodeName empty and condition stays no_data (custom-groupBy branch).
        pytest.param(
            "k8s.cluster.name",
            {
                "gb-cluster-a": {"condition": "no_data", "readiness": {"ready": 2, "notReady": 0}, "running": 2},
                "gb-cluster-b": {"condition": "no_data", "readiness": {"ready": 2, "notReady": 0}, "running": 2},
            },
            id="cluster",
        ),
    ],
)
def test_nodes_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    group_key: str,
    expected: dict,
) -> None:
    """groupBy returns one record per distinct group with aggregated readiness
    and pod-phase counts. nodeName is populated and condition is derived only
    when grouping by k8s.node.name (nodes.go:69-76 list-vs-grouped branch)."""
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
                    "name": group_key,
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                }
            ],
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == len(expected)

    group_of = lambda r: r["nodeName"] if group_key == "k8s.node.name" else r["meta"][group_key]  # noqa: E731  # pylint: disable=unnecessary-lambda-assignment
    by_group = {group_of(r): r for r in data["records"]}
    assert set(by_group.keys()) == set(expected.keys())

    for group, exp in expected.items():
        rec = by_group[group]
        # nodeName populated per node when grouping by k8s.node.name, empty otherwise.
        assert rec["nodeName"] == (group if group_key == "k8s.node.name" else "")
        assert rec["condition"] == exp["condition"]
        assert rec["nodeCountsByReadiness"] == exp["readiness"]
        assert rec["podCountsByPhase"]["running"] == exp["running"]
        assert group_key in rec["meta"], rec["meta"]


def test_nodes_pagination(
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
            get_testdata_file_path("inframonitoring/nodes_pagination.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K, limit = 7, 3
    seen_nodes: list[str] = []
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
                # Exclude the dataset's carrier phantom (see test_nodes_condition_latest_wins).
                "filter": {"expression": "k8s.node.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len} records, got {len(data['records'])}"
        seen_nodes.extend(r["nodeName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_nodes) == K
    assert set(seen_nodes) == {f"page-n{i}" for i in range(1, K + 1)}


# orderBy keys per nodes_constants.go:33-37 (snake_case request keys,
# camelCase response fields). k8s.node.name sorts via the metadata-name branch
# (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "nodeCPU", id="cpu"),
        pytest.param("cpu_allocatable", "nodeCPUAllocatable", id="cpu_allocatable"),
        pytest.param("memory", "nodeMemory", id="memory"),
        pytest.param("memory_allocatable", "nodeMemoryAllocatable", id="memory_allocatable"),
        pytest.param("k8s.node.name", "nodeName", id="node_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_nodes_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
            # Guards against nodes seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.node.name CONTAINS 'order-'"},
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
