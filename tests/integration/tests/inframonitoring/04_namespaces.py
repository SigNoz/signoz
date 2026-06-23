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


# Float record fields compared with tolerance; everything else compared with ==.
_GROUPBY_FLOAT_FIELDS = {
    "namespaceCPU",
    "namespaceMemory",
}


def _phase(pending=0, running=0, succeeded=0, failed=0, unknown=0) -> dict:
    return {"pending": pending, "running": running, "succeeded": succeeded, "failed": failed, "unknown": unknown}


@pytest.mark.parametrize(
    "scenario",
    [
        # Explicit groupBy=[k8s.namespace.name]: one record per namespace,
        # namespaceName populated (namespaces.go:27-30), response grouped_list.
        # Each namespace has 1 running pod.
        pytest.param(
            {
                "fixture": "namespaces_groupby.jsonl",
                "group_by": "k8s.namespace.name",
                "filter": None,
                "group_meta_keys": ["k8s.namespace.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ns-1": {"namespaceName": "gb-ns-1", "podCountsByPhase": _phase(running=1)},
                    "gb-ns-2": {"namespaceName": "gb-ns-2", "podCountsByPhase": _phase(running=1)},
                    "gb-ns-3": {"namespaceName": "gb-ns-3", "podCountsByPhase": _phase(running=1)},
                    "gb-ns-4": {"namespaceName": "gb-ns-4", "podCountsByPhase": _phase(running=1)},
                },
            },
            id="namespace_name",
        ),
        # Explicit groupBy=[k8s.cluster.name]: aggregated across each cluster's 2
        # namespaces, namespaceName empty, response grouped_list. 2 running each.
        pytest.param(
            {
                "fixture": "namespaces_groupby.jsonl",
                "group_by": "k8s.cluster.name",
                "filter": None,
                "group_meta_keys": ["k8s.cluster.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-cluster-a": {"namespaceName": "", "podCountsByPhase": _phase(running=2)},
                    "gb-cluster-b": {"namespaceName": "", "podCountsByPhase": _phase(running=2)},
                },
            },
            id="cluster",
        ),
        # Default groupBy (no groupBy in request) => [k8s.namespace.name,
        # k8s.cluster.name] (module.go ListNamespaces), response list. Namespaces
        # are cluster-scoped, so a same-named namespace must NOT collapse across
        # clusters; the empty-cluster group (k8s.cluster.name label absent on the
        # source pods) must appear as its own row with real metrics, not be dropped.
        # Single pod per group => SpaceAggregationSum == seeded value.
        # Fails on the pre-cluster default (name only) — the three groups would
        # collapse into one summed row.
        pytest.param(
            {
                "fixture": "namespaces_same_name_across_clusters.jsonl",
                "group_by": None,
                "filter": "k8s.namespace.name = 'dup-ns'",
                "group_meta_keys": ["k8s.namespace.name", "k8s.cluster.name"],
                "expected_type": "list",
                "groups": {
                    ("dup-ns", "cluster-a"): {
                        "namespaceName": "dup-ns",
                        "namespaceCPU": 0.3,
                        "namespaceMemory": 100000000.0,
                        "podCountsByPhase": _phase(running=1),
                    },
                    ("dup-ns", "cluster-b"): {
                        "namespaceName": "dup-ns",
                        "namespaceCPU": 0.5,
                        "namespaceMemory": 300000000.0,
                        "podCountsByPhase": _phase(failed=1),
                    },
                    # empty-cluster group: k8s.cluster.name label absent on the source pods.
                    ("dup-ns", ""): {
                        "namespaceName": "dup-ns",
                        "namespaceCPU": 0.1,
                        "namespaceMemory": 200000000.0,
                        "podCountsByPhase": _phase(pending=1),
                    },
                },
            },
            id="default_disambiguates_cluster",
        ),
    ],
)
def test_namespaces_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    scenario: dict,
) -> None:
    """groupBy determines row identity. Explicit groupBy returns one grouped_list
    record per distinct group (namespaceName populated only when grouping by
    k8s.namespace.name; namespaces.go:27-30). With no groupBy the default is
    [k8s.namespace.name, k8s.cluster.name] (module.go ListNamespaces), so
    same-named namespaces across clusters stay as separate, un-collapsed list rows
    (incl. an absent-cluster group keyed by ""). meta always surfaces the grouping
    key(s)."""
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
