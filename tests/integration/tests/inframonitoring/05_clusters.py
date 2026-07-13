"""Integration tests for v2 infra-monitoring cluster endpoints."""

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

ENDPOINT = "/api/v2/infra_monitoring/clusters"


def test_clusters_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert response shape/contract + exact per-cluster metric sums + node
    readiness + pod phase counts.

    SpaceAggregationSum across nodes per cluster (clusters_constants.go:62,82,100,119).
    acc-cluster-1: 2 nodes @ cpu=0.5, alloc_cpu=4, mem=1e9, alloc_mem=8e9
        -> clusterCPU=1.0, clusterCPUAllocatable=8.0, clusterMemory=2e9, clusterMemoryAllocatable=16e9
    acc-cluster-2: 3 nodes @ cpu=1.0, alloc_cpu=8, mem=2e9, alloc_mem=16e9
        -> clusterCPU=3.0, clusterCPUAllocatable=24.0, clusterMemory=6e9, clusterMemoryAllocatable=48e9
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/clusters_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/clusters_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["clusterName"]: r for r in expected["records"]}

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
    assert {r["clusterName"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        for field in (
            "clusterName",
            "clusterCPU",
            "clusterCPUAllocatable",
            "clusterMemory",
            "clusterMemoryAllocatable",
            "nodeCountsByReadiness",
            "podCountsByPhase",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        for bucket in ("ready", "notReady"):
            assert bucket in record["nodeCountsByReadiness"]
            assert isinstance(record["nodeCountsByReadiness"][bucket], int)
        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["meta"].get("k8s.cluster.name") == record["clusterName"]

        # Exact values.
        exp = exp_by_name[record["clusterName"]]
        for field in (
            "clusterCPU",
            "clusterCPUAllocatable",
            "clusterMemory",
            "clusterMemoryAllocatable",
        ):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['clusterName']}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["nodeCountsByReadiness"] == exp["nodeCountsByReadiness"]
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


@pytest.mark.parametrize(
    "case",
    [
        # Scenario 1: a required metric was never ingested. Post-#11754 the querier
        # drops it (no hard error), so the endpoint returns 200 with the cluster
        # that DOES have data; never-seen columns are the -1 sentinel + a
        # "have never been received" warning. Clusters has no formulas
        # (clusterCPU=A, clusterCPUAllocatable=B, clusterMemory=C,
        # clusterMemoryAllocatable=D).
        pytest.param(
            {
                "dataset": "clusters_missing_metrics.jsonl",  # seeds only k8s.node.cpu.usage
                "body": {"filter": {"expression": "k8s.cluster.name = 'miss-cluster'"}},
                "warn_substrings": ["never been received"],
                "warn_names": [
                    "k8s.node.allocatable_cpu",
                    "k8s.node.memory.working_set",
                    "k8s.node.allocatable_memory",
                ],
                "data_fields": ["clusterCPU"],
                "no_data_fields": ["clusterCPUAllocatable", "clusterMemory", "clusterMemoryAllocatable"],
            },
            id="metric_never_seen",
        ),
    ],
)
def test_clusters_warnings(
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
            "cloud.provider = 'gcp' AND env = 'prod'",
            {"web-gcp-prod", "api-gcp-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.cluster.name IN ('web-gcp-prod', 'api-aws-dev')",
            {"web-gcp-prod", "api-aws-dev"},
            id="in",
        ),
        # NOT IN on the partition key returns the rest. NOT IN on a
        # non-partition label (e.g. cloud.provider) is unreliable — likely a
        # QB v5 label-extraction gap; covered indirectly via the and_not_in combo.
        pytest.param(
            "k8s.cluster.name NOT IN ('web-gcp-prod', 'web-gcp-dev', 'api-gcp-prod', 'api-gcp-dev')",
            {"web-aws-prod", "web-aws-dev", "api-aws-prod", "api-aws-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.cluster.name CONTAINS 'web'",
            {"web-gcp-prod", "web-gcp-dev", "web-aws-prod", "web-aws-dev"},
            id="contains",
        ),
        pytest.param(
            "cloud.provider = 'gcp' AND k8s.cluster.name IN ('web-gcp-prod', 'api-gcp-prod')",
            {"web-gcp-prod", "api-gcp-prod"},
            id="and_in",
        ),
        pytest.param(
            "cloud.provider = 'gcp' AND k8s.cluster.name NOT IN ('web-gcp-prod', 'web-gcp-dev')",
            {"api-gcp-prod", "api-gcp-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.cluster.name CONTAINS 'web'",
            {"web-gcp-prod", "web-aws-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.cluster.name IN ('web-gcp-prod', 'web-aws-prod', 'api-gcp-prod') AND k8s.cluster.name CONTAINS 'web'",
            {"web-gcp-prod", "web-aws-prod"},
            id="in_contains",
        ),
    ],
)
def test_clusters_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching clusters, with undistorted per-cluster metric
    values."""
    # Every cluster in clusters_filter_dataset.jsonl carries the same sample
    # pattern as acc-cluster-1 in clusters_value_accuracy.jsonl (2 nodes), so
    # all filtered records must resolve to these exact values (mirrors
    # clusters_value_accuracy_expected.json acc-cluster-1).
    expected_values = {
        "clusterCPU": 1.0,
        "clusterCPUAllocatable": 8.0,
        "clusterMemory": 2000000000.0,
        "clusterMemoryAllocatable": 16000000000.0,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/clusters_filter_dataset.jsonl"),
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
    assert {r["clusterName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-cluster aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['clusterName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.cluster.namee = 'web-gcp-prod'", "k8s.cluster.namee", id="bad_attr_name"),
        pytest.param("k8s.cluster.name =", None, id="trailing_op"),
        pytest.param("(k8s.cluster.name = 'web-gcp-prod'", None, id="unclosed_paren"),
    ],
)
def test_clusters_filter_invalid(
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
            get_testdata_file_path("inframonitoring/clusters_filter_dataset.jsonl"),
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


def test_clusters_node_readiness_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Cluster with mixed node readiness: 3 ready + 2 not_ready -> {ready:3, notReady:2}."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/clusters_node_readiness.jsonl"),
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
            "filter": {"expression": "k8s.cluster.name = 'rn-cluster'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["clusterName"] == "rn-cluster"
    assert rec["nodeCountsByReadiness"] == {"ready": 3, "notReady": 2}


def test_clusters_pod_phase_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Cluster with mixed pod phases: 4 running + 1 pending + 2 failed."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/clusters_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.cluster.name = 'pp-cluster'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["clusterName"] == "pp-cluster"
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 4,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


def test_clusters_pod_status_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Cluster's pods aggregated by kubectl-style display status. Seeded states
    in clusters_pod_phases.jsonl -> what kubectl would show:
      pp-run-1/3/4 Running, pp-run-2 CrashLoopBackOff (phase Running),
      pp-fail-1 Error, pp-fail-2 Evicted (pod-level), pp-pend-1 Pending.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/clusters_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.cluster.name = 'pp-cluster'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["clusterName"] == "pp-cluster"
    assert rec["podCountsByStatus"] == expected_status_counts(running=3, crashLoopBackOff=1, error=1, evicted=1, pending=1)
    # Phase counts unchanged by the status enrichment.
    assert rec["podCountsByPhase"] == {"pending": 1, "running": 4, "succeeded": 0, "failed": 2, "unknown": 0}
    # All status metrics present -> gate satisfied -> no status warning.
    assert all("Pod status could not be computed" not in w["message"] for w in get_all_warnings(response.json()))


@pytest.mark.parametrize(
    "group_key,expected",
    [
        # groupBy=[k8s.cluster.name]: one record per cluster, clusterName
        # populated (clusters.go:29-32). Each cluster has 1 ready node, 1 pod.
        pytest.param(
            "k8s.cluster.name",
            {
                "gb-gcp-1": {"readiness": {"ready": 1, "notReady": 0}, "running": 1},
                "gb-gcp-2": {"readiness": {"ready": 1, "notReady": 0}, "running": 1},
                "gb-aws-1": {"readiness": {"ready": 1, "notReady": 0}, "running": 1},
                "gb-aws-2": {"readiness": {"ready": 1, "notReady": 0}, "running": 1},
            },
            id="cluster_name",
        ),
        # groupBy=[cloud.provider]: aggregated across each provider's 2 clusters,
        # clusterName empty (custom-groupBy branch).
        pytest.param(
            "cloud.provider",
            {
                "gcp": {"readiness": {"ready": 2, "notReady": 0}, "running": 2},
                "aws": {"readiness": {"ready": 2, "notReady": 0}, "running": 2},
            },
            id="cloud_provider",
        ),
    ],
)
def test_clusters_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    group_key: str,
    expected: dict,
) -> None:
    """groupBy returns one record per distinct group with aggregated readiness
    and pod-phase counts. clusterName is populated only when grouping by
    k8s.cluster.name (clusters.go:29-32 list-vs-grouped branch); meta surfaces
    the groupBy key."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/clusters_groupby.jsonl"),
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

    group_of = lambda r: r["clusterName"] if group_key == "k8s.cluster.name" else r["meta"][group_key]  # noqa: E731  # pylint: disable=unnecessary-lambda-assignment
    by_group = {group_of(r): r for r in data["records"]}
    assert set(by_group.keys()) == set(expected.keys())

    for group, exp in expected.items():
        rec = by_group[group]
        # clusterName populated per cluster when grouping by k8s.cluster.name,
        # empty otherwise.
        assert rec["clusterName"] == (group if group_key == "k8s.cluster.name" else "")
        assert rec["nodeCountsByReadiness"] == exp["readiness"]
        assert rec["podCountsByPhase"]["running"] == exp["running"]
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert rec["podCountsByPhase"][other] == 0
        assert group_key in rec["meta"], rec["meta"]


def test_clusters_pagination(
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
            get_testdata_file_path("inframonitoring/clusters_pagination.jsonl"),
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
                "filter": {"expression": "k8s.cluster.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["clusterName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-c{i}" for i in range(1, K + 1)}


# orderBy keys per clusters_constants.go (cpu, cpu_allocatable, memory,
# memory_allocatable). k8s.cluster.name sorts via the metadata-name branch
# (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "clusterCPU", id="cpu"),
        pytest.param("cpu_allocatable", "clusterCPUAllocatable", id="cpu_allocatable"),
        pytest.param("memory", "clusterMemory", id="memory"),
        pytest.param("memory_allocatable", "clusterMemoryAllocatable", id="memory_allocatable"),
        pytest.param("k8s.cluster.name", "clusterName", id="cluster_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_clusters_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
            get_testdata_file_path("inframonitoring/clusters_orderby.jsonl"),
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
            # Guards against clusters seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.cluster.name CONTAINS 'order-'"},
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
                "orderBy": {"key": {"name": "k8s.cluster.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "cloud.provider",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_clustername_with_groupby",
        ),
    ],
)
def test_clusters_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableClusters.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/clusters.go:45-97."""
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
