"""Integration tests for v2 infra-monitoring namespace endpoints."""

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

ENDPOINT = "/api/v2/infra_monitoring/namespaces"

# Required metrics for the v2 namespaces endpoint
# (pkg/modules/inframonitoring/implinframonitoring/namespaces_constants.go:22-26).
REQUIRED_METRICS = {
    "k8s.pod.cpu.usage",
    "k8s.pod.memory.working_set",
    "k8s.pod.phase",
}


def test_namespaces_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 namespaces x 3 metrics; assert response shape/contract + exact
    per-namespace metric values and podCountsByPhase.

    Tests v1-parity expectation: SpaceAggregationSum across pods within a
    namespace (pods_query.go A=cpu, D=memory both use Sum, namespaces.go:225
    clones PodsTableListQuery; v2 namespaces_constants.go:54,73 use Sum too).
    Predicted: acc-ns-1 (2 pods @ cpu=0.5,mem=1e8) -> cpu=1.0, mem=2e8;
    acc-ns-2 (3 pods @ cpu=0.75,mem=2e8) -> cpu=2.25, mem=6e8.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/namespaces_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["namespaceName"]: r for r in expected["records"]}

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
    assert {r["namespaceName"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        for field in (
            "namespaceName",
            "namespaceCPU",
            "namespaceMemory",
            "podCountsByPhase",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["meta"].get("k8s.namespace.name") == record["namespaceName"]
        assert "k8s.cluster.name" in record["meta"]

        # Exact values.
        exp = exp_by_name[record["namespaceName"]]
        for field in ("namespaceCPU", "namespaceMemory"):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['namespaceName']}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


def test_namespaces_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only k8s.pod.cpu.usage; assert other 2 required metrics flagged missing."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_missing_metrics.jsonl"),
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
            "k8s.cluster.name = 'cluster-a' AND env = 'prod'",
            {"web-a-prod", "api-a-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.namespace.name IN ('web-a-prod', 'api-b-dev')",
            {"web-a-prod", "api-b-dev"},
            id="in",
        ),
        pytest.param(
            "k8s.cluster.name NOT IN ('cluster-a')",
            {"web-b-prod", "web-b-dev", "api-b-prod", "api-b-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.namespace.name CONTAINS 'web'",
            {"web-a-prod", "web-a-dev", "web-b-prod", "web-b-dev"},
            id="contains",
        ),
        pytest.param(
            "k8s.cluster.name = 'cluster-a' AND k8s.namespace.name IN ('web-a-prod', 'api-a-prod')",
            {"web-a-prod", "api-a-prod"},
            id="and_in",
        ),
        pytest.param(
            "k8s.cluster.name = 'cluster-a' AND k8s.namespace.name NOT IN ('web-a-prod', 'web-a-dev')",
            {"api-a-prod", "api-a-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.namespace.name CONTAINS 'web'",
            {"web-a-prod", "web-b-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.namespace.name IN ('web-a-prod', 'web-b-prod', 'api-a-prod') AND k8s.namespace.name CONTAINS 'web'",
            {"web-a-prod", "web-b-prod"},
            id="in_contains",
        ),
    ],
)
def test_namespaces_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching namespaces, with undistorted per-namespace
    metric values."""
    # Every namespace in namespaces_filter_dataset.jsonl carries the same
    # sample pattern as acc-ns-1 in namespaces_value_accuracy.jsonl (2 pods),
    # so all filtered records must resolve to these exact values (mirrors
    # namespaces_value_accuracy_expected.json acc-ns-1).
    expected_values = {
        "namespaceCPU": 1.0,
        "namespaceMemory": 200000000.0,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
    assert {r["namespaceName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-namespace aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['namespaceName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.namespace.namee = 'web-a-prod'", "k8s.namespace.namee", id="bad_attr_name"),
        pytest.param("k8s.namespace.name =", None, id="trailing_op"),
        pytest.param("(k8s.namespace.name = 'web-a-prod'", None, id="unclosed_paren"),
    ],
)
def test_namespaces_filter_invalid(
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
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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


def test_namespaces_pod_phase_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Namespace with mixed pod phases: podCountsByPhase aggregates correctly.
    Dataset: 4 running + 1 pending + 2 failed pods all in pp-ns."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.namespace.name = 'pp-ns'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["namespaceName"] == "pp-ns"
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 4,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


@pytest.mark.parametrize(
    "group_key,expected_running",
    [
        # groupBy=[k8s.namespace.name]: one record per namespace, namespaceName
        # populated (namespaces.go:27-30). Each namespace has 1 running pod.
        pytest.param(
            "k8s.namespace.name",
            {"gb-ns-1": 1, "gb-ns-2": 1, "gb-ns-3": 1, "gb-ns-4": 1},
            id="namespace_name",
        ),
        # groupBy=[k8s.cluster.name]: aggregated across each cluster's 2
        # namespaces, namespaceName empty. Each cluster has 2 x 1 = 2 running pods.
        pytest.param(
            "k8s.cluster.name",
            {"gb-cluster-a": 2, "gb-cluster-b": 2},
            id="cluster",
        ),
    ],
)
def test_namespaces_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    group_key: str,
    expected_running: dict,
) -> None:
    """groupBy returns one record per distinct group with aggregated pod-phase
    counts. namespaceName is populated only when grouping by k8s.namespace.name
    (namespaces.go:27-30 list-vs-grouped branch); meta surfaces the groupBy key."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_groupby.jsonl"),
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
    assert data["total"] == len(expected_running)

    group_of = lambda r: r["namespaceName"] if group_key == "k8s.namespace.name" else r["meta"][group_key]  # noqa: E731  # pylint: disable=unnecessary-lambda-assignment
    by_group = {group_of(r): r for r in data["records"]}
    assert set(by_group.keys()) == set(expected_running.keys())

    for group, running in expected_running.items():
        rec = by_group[group]
        # namespaceName populated per namespace when grouping by k8s.namespace.name,
        # empty otherwise.
        assert rec["namespaceName"] == (group if group_key == "k8s.namespace.name" else "")
        assert rec["podCountsByPhase"]["running"] == running
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert rec["podCountsByPhase"][other] == 0
        assert group_key in rec["meta"], rec["meta"]


def test_namespaces_pagination(
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
            get_testdata_file_path("inframonitoring/namespaces_pagination.jsonl"),
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
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["namespaceName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-ns-{i}" for i in range(1, K + 1)}


# orderBy keys per namespaces_constants.go (cpu, memory only).
# k8s.namespace.name sorts via the metadata-name branch (PaginateMetadataByName)
# and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "namespaceCPU", id="cpu"),
        pytest.param("memory", "namespaceMemory", id="memory"),
        pytest.param("k8s.namespace.name", "namespaceName", id="namespace_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_namespaces_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
            get_testdata_file_path("inframonitoring/namespaces_orderby.jsonl"),
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
            # Guards against namespaces seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.namespace.name CONTAINS 'order-'"},
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
                "orderBy": {"key": {"name": "k8s.namespace.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.cluster.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_nsname_with_groupby",
        ),
    ],
)
def test_namespaces_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableNamespaces.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/namespaces.go:40-91."""
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
