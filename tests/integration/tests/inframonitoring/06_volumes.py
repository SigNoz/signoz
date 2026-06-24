"""Integration tests for v2 infra-monitoring volumes (pvcs) endpoints."""

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

ENDPOINT = "/api/v2/infra_monitoring/pvcs"


def test_volumes_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert response shape/contract (7 record fields, meta attrs, usage
    formula) + exact per-PVC metric values against precomputed expected output.

    TimeAggregationAvg + SpaceAggregationSum across pod-mounts.
    With 1 pod per PVC, expected values == seeded values.
    Usage = capacity - available (F1, volumes_constants.go:54-189).
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/volumes_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["persistentVolumeClaimName"]: r for r in expected["records"]}

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
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        for field in (
            "persistentVolumeClaimName",
            "volumeAvailable",
            "volumeCapacity",
            "volumeUsage",
            "volumeInodes",
            "volumeInodesFree",
            "volumeInodesUsed",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # Spot check formula: usage == capacity - available.
        assert compare_values(record["volumeUsage"], record["volumeCapacity"] - record["volumeAvailable"], 1e-6), f"usage formula failed: {record!r}"

        # Meta carries the 7 hardcoded attrs (volumes_constants.go:31-39).
        meta = record["meta"]
        assert meta.get("k8s.persistentvolumeclaim.name") == record["persistentVolumeClaimName"]
        for key in (
            "k8s.pod.uid",
            "k8s.pod.name",
            "k8s.namespace.name",
            "k8s.node.name",
            "k8s.cluster.name",
            "k8s.statefulset.name",
        ):
            assert key in meta, f"missing meta key {key!r} in {meta!r}"

        # Exact values.
        exp = exp_by_name[record["persistentVolumeClaimName"]]
        for field in (
            "volumeAvailable",
            "volumeCapacity",
            "volumeUsage",
            "volumeInodes",
            "volumeInodesFree",
            "volumeInodesUsed",
        ):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['persistentVolumeClaimName']}.{field}: got {record[field]}, expected {exp[field]}"


@pytest.mark.parametrize(
    "case",
    [
        # Scenario 1: a metric was never ingested. Post-#11754 the querier drops it
        # (no hard error), so the endpoint returns 200 with whatever flowed; the
        # never-seen column is the -1 sentinel + a "have never been received"
        # warning. Here we omit the FORMULA OPERAND k8s.volume.available
        # (volumeUsage = capacity - available): since A uses TimeAggregationAvg it is
        # NOT zero-defaultable, so the formula drops the group -> volumeUsage == -1
        # (it does NOT fall back to capacity). capacity + inodes stay real.
        pytest.param(
            {
                "dataset": "volumes_formula_operand_missing.jsonl",
                "body": {"filter": {"expression": "k8s.persistentvolumeclaim.name = 'fop-pvc'"}},
                "warn_substrings": ["never been received", "k8s.volume.available"],
                "warn_names": [],
                "data_fields": ["volumeCapacity", "volumeInodes", "volumeInodesFree", "volumeInodesUsed"],
                "no_data_fields": ["volumeAvailable", "volumeUsage"],
            },
            id="metric_never_seen",
        ),
    ],
)
def test_volumes_warnings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    case: dict,
) -> None:
    """A never-ingested metric surfaces a non-blocking warning (200 + data), not a
    hard error. Here the never-seen metric is the FORMULA OPERAND
    k8s.volume.available (volumeUsage = capacity - available): since A uses
    TimeAggregationAvg it is NOT zero-defaultable, so the formula drops the group
    -> volumeUsage == -1 (it does NOT fall back to capacity); capacity + inodes
    stay real. (The generic never-seen (metric, key)-pair-via-groupBy warning is
    entity-agnostic and is exercised once, for hosts, in 01_hosts.py.)"""
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
            {"data-ns-a-prod", "logs-ns-a-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.persistentvolumeclaim.name IN ('data-ns-a-prod', 'logs-ns-b-dev')",
            {"data-ns-a-prod", "logs-ns-b-dev"},
            id="in",
        ),
        # NOT IN on the partition key returns the rest. NOT IN on non-partition
        # labels is unreliable in QB v5 (see clusters test); the and_not_in
        # combo covers NOT IN alongside non-partition labels.
        pytest.param(
            "k8s.persistentvolumeclaim.name NOT IN ('data-ns-a-prod', 'data-ns-a-dev', 'data-ns-b-prod', 'data-ns-b-dev')",
            {"logs-ns-a-prod", "logs-ns-a-dev", "logs-ns-b-prod", "logs-ns-b-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.persistentvolumeclaim.name CONTAINS 'data'",
            {"data-ns-a-prod", "data-ns-a-dev", "data-ns-b-prod", "data-ns-b-dev"},
            id="contains",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.persistentvolumeclaim.name IN ('data-ns-a-prod', 'logs-ns-a-prod')",
            {"data-ns-a-prod", "logs-ns-a-prod"},
            id="and_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.persistentvolumeclaim.name NOT IN ('data-ns-a-prod', 'data-ns-a-dev')",
            {"logs-ns-a-prod", "logs-ns-a-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.persistentvolumeclaim.name CONTAINS 'data'",
            {"data-ns-a-prod", "data-ns-b-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.persistentvolumeclaim.name IN ('data-ns-a-prod', 'logs-ns-a-prod', 'data-ns-b-prod') AND k8s.persistentvolumeclaim.name CONTAINS 'data'",
            {"data-ns-a-prod", "data-ns-b-prod"},
            id="in_contains",
        ),
    ],
)
def test_volumes_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching PVCs, with undistorted per-PVC metric values."""
    # Every PVC in volumes_filter_dataset.jsonl carries the same sample
    # pattern as acc-pvc-1 in volumes_value_accuracy.jsonl, so all filtered
    # records must resolve to these exact values (mirrors
    # volumes_value_accuracy_expected.json acc-pvc-1).
    expected_values = {
        "volumeAvailable": 30000000000.0,
        "volumeCapacity": 100000000000.0,
        "volumeUsage": 70000000000.0,
        "volumeInodes": 1000000.0,
        "volumeInodesFree": 800000.0,
        "volumeInodesUsed": 200000.0,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
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
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-PVC aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['persistentVolumeClaimName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param(
            "k8s.persistentvolumeclaim.namee = 'data-ns-a-prod'",
            "k8s.persistentvolumeclaim.namee",
            id="bad_attr_name",
        ),
        pytest.param("k8s.persistentvolumeclaim.name =", None, id="trailing_op"),
        pytest.param("(k8s.persistentvolumeclaim.name = 'data-ns-a-prod'", None, id="unclosed_paren"),
    ],
)
def test_volumes_filter_invalid(
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
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
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


def test_volumes_usage_formula(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """volumeUsage = capacity - available (F1, volumes_constants.go:54-189).
    capacity=100GB, available=30GB -> volumeUsage=70GB."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_usage_formula.jsonl"),
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
            "filter": {"expression": "k8s.persistentvolumeclaim.name = 'uf-pvc'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["persistentVolumeClaimName"] == "uf-pvc"
    assert compare_values(rec["volumeCapacity"], 100.0e9, 1e-6)
    assert compare_values(rec["volumeAvailable"], 30.0e9, 1e-6)
    assert compare_values(rec["volumeUsage"], 70.0e9, 1e-6)


def test_volumes_non_pvc_volume_filtered(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Volumes with empty k8s.persistentvolumeclaim.name (emptyDir/configMap/etc.)
    are silently dropped by volumesBaseFilterExpr (volumes_constants.go:57-63).
    Dataset has 1 real PVC + 1 empty-pvc row; only the real PVC should appear."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_non_pvc_volume.jsonl"),
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
    assert rec["persistentVolumeClaimName"] == "np-real-pvc"


# Float record fields compared with tolerance; everything else compared with ==.
_GROUPBY_FLOAT_FIELDS = {
    "volumeAvailable",
    "volumeCapacity",
    "volumeUsage",
    "volumeInodes",
    "volumeInodesFree",
    "volumeInodesUsed",
}


@pytest.mark.parametrize(
    "scenario",
    [
        # Explicit groupBy=[k8s.persistentvolumeclaim.name]: one record per PVC,
        # persistentVolumeClaimName populated (volumes.go:26-29), response grouped_list.
        pytest.param(
            {
                "fixture": "volumes_groupby.jsonl",
                "group_by": "k8s.persistentvolumeclaim.name",
                "filter": None,
                "group_meta_keys": ["k8s.persistentvolumeclaim.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-pvc-a1": {"persistentVolumeClaimName": "gb-pvc-a1"},
                    "gb-pvc-a2": {"persistentVolumeClaimName": "gb-pvc-a2"},
                    "gb-pvc-b1": {"persistentVolumeClaimName": "gb-pvc-b1"},
                    "gb-pvc-b2": {"persistentVolumeClaimName": "gb-pvc-b2"},
                },
            },
            id="pvc_name",
        ),
        # Explicit groupBy=[k8s.namespace.name]: aggregated per namespace,
        # persistentVolumeClaimName cleared, response grouped_list.
        pytest.param(
            {
                "fixture": "volumes_groupby.jsonl",
                "group_by": "k8s.namespace.name",
                "filter": None,
                "group_meta_keys": ["k8s.namespace.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ns-a": {"persistentVolumeClaimName": ""},
                    "gb-ns-b": {"persistentVolumeClaimName": ""},
                },
            },
            id="namespace",
        ),
        # Default groupBy (no groupBy in request) => [k8s.persistentvolumeclaim.name,
        # k8s.namespace.name, k8s.cluster.name] (module.go ListVolumes), response list.
        # Same PVC name must NOT collapse across namespaces OR clusters; the
        # empty-cluster group (k8s.cluster.name label absent on the source series)
        # must appear as its own row with real metrics, not be dropped.
        # Single series per group => SpaceAggregationSum == seeded value.
        # Fails on the pre-cluster default (name+ns) — the three ns-x groups would
        # collapse into one summed row.
        pytest.param(
            {
                "fixture": "volumes_same_name_across_ns_and_clusters.jsonl",
                "group_by": None,
                "filter": "k8s.persistentvolumeclaim.name = 'dup-pvc'",
                "group_meta_keys": ["k8s.persistentvolumeclaim.name", "k8s.namespace.name", "k8s.cluster.name"],
                "expected_type": "list",
                "groups": {
                    ("dup-pvc", "ns-x", "cluster-a"): {
                        "persistentVolumeClaimName": "dup-pvc",
                        "volumeCapacity": 100.0,
                        "volumeAvailable": 60.0,
                        "volumeUsage": 40.0,
                        "volumeInodes": 1000.0,
                        "volumeInodesFree": 600.0,
                        "volumeInodesUsed": 400.0,
                    },
                    ("dup-pvc", "ns-y", "cluster-a"): {
                        "persistentVolumeClaimName": "dup-pvc",
                        "volumeCapacity": 500.0,
                        "volumeAvailable": 100.0,
                        "volumeUsage": 400.0,
                        "volumeInodes": 5000.0,
                        "volumeInodesFree": 1000.0,
                        "volumeInodesUsed": 4000.0,
                    },
                    ("dup-pvc", "ns-x", "cluster-b"): {
                        "persistentVolumeClaimName": "dup-pvc",
                        "volumeCapacity": 300.0,
                        "volumeAvailable": 50.0,
                        "volumeUsage": 250.0,
                        "volumeInodes": 3000.0,
                        "volumeInodesFree": 500.0,
                        "volumeInodesUsed": 2500.0,
                    },
                    # empty-cluster group: k8s.cluster.name label absent on the source series.
                    ("dup-pvc", "ns-x", ""): {
                        "persistentVolumeClaimName": "dup-pvc",
                        "volumeCapacity": 200.0,
                        "volumeAvailable": 0.0,
                        "volumeUsage": 200.0,
                        "volumeInodes": 2000.0,
                        "volumeInodesFree": 0.0,
                        "volumeInodesUsed": 2000.0,
                    },
                },
            },
            id="default_disambiguates_ns_and_cluster",
        ),
    ],
)
def test_volumes_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    scenario: dict,
) -> None:
    """groupBy determines row identity. Explicit groupBy returns one grouped_list
    record per distinct group (persistentVolumeClaimName populated only when
    grouping by k8s.persistentvolumeclaim.name; volumes.go:26-29). With no groupBy
    the default is [k8s.persistentvolumeclaim.name, k8s.namespace.name,
    k8s.cluster.name] (module.go ListVolumes), so same-named PVCs across
    namespaces/clusters stay as separate, un-collapsed list rows (incl. an
    absent-cluster group keyed by ""). meta always surfaces the grouping key(s)."""
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


def test_volumes_pagination(
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
            get_testdata_file_path("inframonitoring/volumes_pagination.jsonl"),
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
                "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["persistentVolumeClaimName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-pvc-{i}" for i in range(1, K + 1)}


# orderBy keys per volumes_constants.go (6 metric columns).
# k8s.persistentvolumeclaim.name sorts via the metadata-name branch
# (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("available", "volumeAvailable", id="available"),
        pytest.param("capacity", "volumeCapacity", id="capacity"),
        # The 'usage' orderBy exercises the F1 ranking-dependency path
        # (volumes_constants.go:41-52: usage needs A, B, F1).
        pytest.param("usage", "volumeUsage", id="usage"),
        pytest.param("inodes", "volumeInodes", id="inodes"),
        pytest.param("inodes_free", "volumeInodesFree", id="inodes_free"),
        pytest.param("inodes_used", "volumeInodesUsed", id="inodes_used"),
        pytest.param("k8s.persistentvolumeclaim.name", "persistentVolumeClaimName", id="pvc_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_volumes_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
            get_testdata_file_path("inframonitoring/volumes_orderby.jsonl"),
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
            # Guards against PVCs seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'order-'"},
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
            {"orderBy": {"key": {"name": "available"}, "direction": "up"}},
            "invalid order by direction",
            id="orderby_invalid_direction",
        ),
        pytest.param(
            {
                "orderBy": {"key": {"name": "k8s.persistentvolumeclaim.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.namespace.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_pvcname_with_groupby",
        ),
    ],
)
def test_volumes_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableVolumes.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/volumes.go:43-94."""
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
