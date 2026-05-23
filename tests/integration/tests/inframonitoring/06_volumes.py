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
from fixtures.querier import compare_values

ENDPOINT = "/api/v2/infra_monitoring/pvcs"

# Required metrics for the v2 volumes endpoint
# (pkg/modules/inframonitoring/implinframonitoring/volumes_constants.go:20-27).
REQUIRED_METRICS = {
    "k8s.volume.available",
    "k8s.volume.capacity",
    "k8s.volume.inodes",
    "k8s.volume.inodes.free",
    "k8s.volume.inodes.used",
}


def _post(signoz: types.SigNoz, token: str, body: dict) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )


def test_volumes_happy_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """2 PVCs in 1 namespace; assert shape, 7 record fields, formula spot check, meta."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_happy_path.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]

    assert data["total"] == 2
    assert len(data["records"]) == 2
    assert data["requiredMetricsCheck"]["missingMetrics"] == []
    assert data["endTimeBeforeRetention"] is False

    assert {r["persistentVolumeClaimName"] for r in data["records"]} == {"happy-pvc-1", "happy-pvc-2"}

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


def test_volumes_value_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Exact per-PVC metric values + formula verification.

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
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert len(data["records"]) == len(expected["records"])

    for record in data["records"]:
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


def test_volumes_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only k8s.volume.available; other 4 required metrics flagged missing."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_missing_metrics.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]

    assert set(data["requiredMetricsCheck"]["missingMetrics"]) == (REQUIRED_METRICS - {"k8s.volume.available"})
    assert data["records"] == []
    assert data["total"] == 0


def test_volumes_filter_and(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """AND of two attribute clauses returns only the matching PVCs."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.namespace.name = 'ns-a' AND env = 'prod'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == {"data-ns-a-prod", "logs-ns-a-prod"}
    assert data["total"] == 2


def test_volumes_filter_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """IN (...) returns exactly the listed PVCs."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.persistentvolumeclaim.name IN ('data-ns-a-prod', 'logs-ns-b-dev')"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == {"data-ns-a-prod", "logs-ns-b-dev"}
    assert data["total"] == 2


def test_volumes_filter_not_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """NOT IN on the partition key returns the rest.
    NOT IN on non-partition labels is unreliable in QB v5 (see clusters test);
    use partition key here, combo path covers NOT IN with non-partition labels."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": ("k8s.persistentvolumeclaim.name NOT IN ('data-ns-a-prod', 'data-ns-a-dev', 'data-ns-b-prod', 'data-ns-b-dev')")},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == {
        "logs-ns-a-prod",
        "logs-ns-a-dev",
        "logs-ns-b-prod",
        "logs-ns-b-dev",
    }


def test_volumes_filter_contains(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """CONTAINS performs substring match on the attribute value."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'data'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == {
        "data-ns-a-prod",
        "data-ns-a-dev",
        "data-ns-b-prod",
        "data-ns-b-dev",
    }


@pytest.mark.parametrize(
    "expression,expected",
    [
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
def test_volumes_filter_combos(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """AND-combined pairs of filter operators return the correct intersection."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": expression},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["persistentVolumeClaimName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)


def test_volumes_filter_bad_attr_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Filter with a typo'd attribute key returns 400 invalid_input."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.persistentvolumeclaim.namee = 'data-ns-a-prod'"},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert any("k8s.persistentvolumeclaim.namee" in e["message"] for e in body["error"]["errors"]), f"bad attr name not surfaced: {body['error']['errors']!r}"


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("k8s.persistentvolumeclaim.name =", id="trailing_op"),
        pytest.param("(k8s.persistentvolumeclaim.name = 'data-ns-a-prod'", id="unclosed_paren"),
    ],
)
def test_volumes_filter_bad_grammar(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
) -> None:
    """Malformed filter expressions return 400 invalid_input."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_filter_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": expression},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, f"expected 400, got {response.status_code}: {response.text}"
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert len(body["error"]["errors"]) > 0


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
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.persistentvolumeclaim.name = 'uf-pvc'"},
        },
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
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["persistentVolumeClaimName"] == "np-real-pvc"


def test_volumes_groupby_namespace(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """groupBy=[k8s.namespace.name]: 2 records, aggregated metrics per namespace,
    persistentVolumeClaimName cleared, meta surfaces k8s.namespace.name."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_groupby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "groupBy": [
                {
                    "name": "k8s.namespace.name",
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                }
            ],
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 2

    namespaces_seen = set()
    for rec in data["records"]:
        # Per-row PVC identity is cleared; only the groupBy field surfaces.
        assert rec["persistentVolumeClaimName"] == ""
        assert "k8s.namespace.name" in rec["meta"], rec["meta"]
        namespaces_seen.add(rec["meta"]["k8s.namespace.name"])
    assert namespaces_seen == {"gb-ns-a", "gb-ns-b"}


def test_volumes_pagination_sync(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination invariants across 3 offset windows."""
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

    for offset in (0, 3, 6):
        response = _post(
            signoz,
            token,
            {
                "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                "end": int(now.timestamp() * 1000),
                "limit": limit,
                "offset": offset,
                "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'page-'"},
            },
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = min(limit, K - offset)
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["persistentVolumeClaimName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-pvc-{i}" for i in range(1, K + 1)}


def test_volumes_offset_beyond_total(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Offset beyond total returns empty records; total still reflects dataset size."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_pagination.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K = 7
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 3,
            "offset": K + 5,
            "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'page-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["records"] == []
    assert data["total"] == K


def test_volumes_total_invariant_across_orderby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Total stays K across all 6 orderBy metric columns x 2 directions = 12 calls."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_orderby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K = 5

    # orderBy keys per volumes_constants.go (6 metric columns).
    for column in ("available", "capacity", "usage", "inodes", "inodes_free", "inodes_used"):
        for direction in ("asc", "desc"):
            response = _post(
                signoz,
                token,
                {
                    "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                    "end": int(now.timestamp() * 1000),
                    "limit": 50,
                    "orderBy": {"key": {"name": column}, "direction": direction},
                    "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'order-'"},
                },
            )
            ctx = f"orderBy={column} {direction}"
            assert response.status_code == HTTPStatus.OK, f"{ctx}: {response.text}"
            data = response.json()["data"]
            assert data["total"] == K, f"{ctx}: total={data['total']}"
            assert len(data["records"]) == K, f"{ctx}: len(records)={len(data['records'])}"


@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("available", "volumeAvailable", id="available"),
        pytest.param("capacity", "volumeCapacity", id="capacity"),
        pytest.param("usage", "volumeUsage", id="usage"),
        pytest.param("inodes", "volumeInodes", id="inodes"),
        pytest.param("inodes_free", "volumeInodesFree", id="inodes_free"),
        pytest.param("inodes_used", "volumeInodesUsed", id="inodes_used"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_volumes_orderby_correctness(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    record_field: str,
    direction: str,
) -> None:
    """Records sorted by the chosen metric column in the requested direction.
    The 'usage' orderBy exercises the F1 ranking-dependency path
    (volumes_constants.go:41-52: usage needs A, B, F1)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_orderby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "orderBy": {"key": {"name": column}, "direction": direction},
            "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'order-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    values = [r[record_field] for r in data["records"]]
    expected = sorted(values, reverse=(direction == "desc"))
    assert values == expected, f"{column} {direction} not sorted; got {values}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_volumes_orderby_by_pvc_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """orderBy=k8s.persistentvolumeclaim.name with empty groupBy returns PVCs
    sorted alphabetically via the metadata-name branch (PaginateMetadataByName)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/volumes_orderby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "orderBy": {"key": {"name": "k8s.persistentvolumeclaim.name"}, "direction": direction},
            "filter": {"expression": "k8s.persistentvolumeclaim.name CONTAINS 'order-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    names = [r["persistentVolumeClaimName"] for r in data["records"]]
    expected = sorted(names, reverse=(direction == "desc"))
    assert names == expected, f"pvc.name {direction} not sorted; got {names}"


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
    response = _post(signoz, token, body)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert err_substr.lower() in error["message"].lower(), f"expected substring {err_substr!r} not found in: {error['message']!r}"


@pytest.mark.parametrize(
    "auth_state,expected_status",
    [
        pytest.param("none", HTTPStatus.UNAUTHORIZED, id="no_token"),
        pytest.param("admin", HTTPStatus.OK, id="admin_token"),
    ],
)
def test_volumes_auth(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    auth_state: str,
    expected_status: int,
) -> None:
    """Auth required: no Authorization header -> 401; admin Bearer -> 200."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    body = {
        "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    headers: dict = {}
    if auth_state == "admin":
        token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
        headers["authorization"] = f"Bearer {token}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers=headers,
        json=body,
        timeout=5,
    )
    assert response.status_code == expected_status, response.text
