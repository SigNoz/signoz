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


def _post(signoz: types.SigNoz, token: str, body: dict) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )


def test_namespaces_happy_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 namespaces x 3 metrics + 2 pods/ns; assert response shape + counts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_happy_path.jsonl"),
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

    assert {r["namespaceName"] for r in data["records"]} == {"happy-ns-1", "happy-ns-2"}

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

        # Each happy-path namespace has 2 running pods.
        assert record["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert record["podCountsByPhase"][other] == 0

        assert record["meta"].get("k8s.namespace.name") == record["namespaceName"]
        assert "k8s.cluster.name" in record["meta"]


def test_namespaces_value_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Exact per-namespace metric values + podCountsByPhase.

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
        exp = exp_by_name[record["namespaceName"]]
        for field in ("namespaceCPU", "namespaceMemory"):
            assert compare_values(record[field], exp[field], 1e-6), (
                f"{record['namespaceName']}.{field}: "
                f"got {record[field]}, expected {exp[field]}"
            )
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

    assert set(data["requiredMetricsCheck"]["missingMetrics"]) == (
        REQUIRED_METRICS - {"k8s.pod.cpu.usage"}
    )
    assert data["records"] == []
    assert data["total"] == 0


def test_namespaces_filter_and(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """AND of two attribute clauses returns only the matching namespaces."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
            "filter": {
                "expression": "k8s.cluster.name = 'cluster-a' AND env = 'prod'",
            },
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["namespaceName"] for r in data["records"]} == {"web-a-prod", "api-a-prod"}
    assert data["total"] == 2


def test_namespaces_filter_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """IN (...) returns exactly the listed namespaces."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
            "filter": {
                "expression": "k8s.namespace.name IN ('web-a-prod', 'api-b-dev')",
            },
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["namespaceName"] for r in data["records"]} == {"web-a-prod", "api-b-dev"}
    assert data["total"] == 2


def test_namespaces_filter_not_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """NOT IN excludes a cluster, returns the rest."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.cluster.name NOT IN ('cluster-a')"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["namespaceName"] for r in data["records"]} == {
        "web-b-prod", "web-b-dev", "api-b-prod", "api-b-dev",
    }


def test_namespaces_filter_contains(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """CONTAINS performs substring match on the attribute value."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.namespace.name CONTAINS 'web'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["namespaceName"] for r in data["records"]} == {
        "web-a-prod", "web-a-dev", "web-b-prod", "web-b-dev",
    }


@pytest.mark.parametrize(
    "expression,expected",
    [
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
def test_namespaces_filter_combos(
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
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
    assert {r["namespaceName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)


def test_namespaces_filter_bad_attr_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Filter with a typo'd attribute key returns 400 invalid_input."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.namespace.namee = 'web-a-prod'"},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert any(
        "k8s.namespace.namee" in e["message"] for e in body["error"]["errors"]
    ), f"bad attr name not surfaced: {body['error']['errors']!r}"


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("k8s.namespace.name =", id="trailing_op"),
        pytest.param("(k8s.namespace.name = 'web-a-prod'", id="unclosed_paren"),
    ],
)
def test_namespaces_filter_bad_grammar(
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
            get_testdata_file_path("inframonitoring/namespaces_filter_dataset.jsonl"),
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
    assert response.status_code == HTTPStatus.BAD_REQUEST, (
        f"expected 400, got {response.status_code}: {response.text}"
    )
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert len(body["error"]["errors"]) > 0


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
    response = _post(
        signoz,
        token,
        {
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.namespace.name = 'pp-ns'"},
        },
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


def test_namespaces_groupby_cluster(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Explicit groupBy=[k8s.cluster.name]: 2 records, aggregated counts per cluster,
    meta surfaces cluster.name. Each cluster has 2 namespaces with 1 running pod each."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_groupby.jsonl"),
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
                    "name": "k8s.cluster.name",
                    "fieldDataType": "string",
                    "fieldContext": "resource",
                }
            ],
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 2

    clusters_seen = set()
    for rec in data["records"]:
        # Per-row namespace identity is cleared; only the groupBy field surfaces.
        assert rec["namespaceName"] == ""
        # Each cluster has 2 namespaces x 1 pod = 2 running pods.
        assert rec["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert rec["podCountsByPhase"][other] == 0
        assert "k8s.cluster.name" in rec["meta"], rec["meta"]
        clusters_seen.add(rec["meta"]["k8s.cluster.name"])
    assert clusters_seen == {"gb-cluster-a", "gb-cluster-b"}


def test_namespaces_pagination_sync(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination invariants across 3 offset windows."""
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

    for offset in (0, 3, 6):
        response = _post(
            signoz,
            token,
            {
                "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                "end": int(now.timestamp() * 1000),
                "limit": limit,
                "offset": offset,
            },
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = min(limit, K - offset)
        assert len(data["records"]) == expected_len, (
            f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        )
        seen_names.extend(r["namespaceName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-ns-{i}" for i in range(1, K + 1)}


def test_namespaces_offset_beyond_total(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Offset beyond total returns empty records; total still reflects dataset size."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_pagination.jsonl"),
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
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["records"] == []
    assert data["total"] == K


def test_namespaces_total_invariant_across_orderby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Total stays K across all orderBy column x direction combinations."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_orderby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K = 5

    # orderBy keys per namespaces_constants.go (cpu, memory only).
    for column in ("cpu", "memory"):
        for direction in ("asc", "desc"):
            response = _post(
                signoz,
                token,
                {
                    "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                    "end": int(now.timestamp() * 1000),
                    "limit": 50,
                    "orderBy": {"key": {"name": column}, "direction": direction},
                },
            )
            ctx = f"orderBy={column} {direction}"
            assert response.status_code == HTTPStatus.OK, f"{ctx}: {response.text}"
            data = response.json()["data"]
            assert data["total"] == K, f"{ctx}: total={data['total']}"
            assert len(data["records"]) == K, (
                f"{ctx}: len(records)={len(data['records'])}"
            )


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_namespaces_orderby_correctness(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """Records sorted by namespaceCPU in the requested direction."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_pagination.jsonl"),
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
            "orderBy": {"key": {"name": "cpu"}, "direction": direction},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    cpu_values = [r["namespaceCPU"] for r in data["records"]]
    expected = sorted(cpu_values, reverse=(direction == "desc"))
    assert cpu_values == expected, f"cpu {direction} not sorted; got {cpu_values}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_namespaces_orderby_by_namespace_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """orderBy=k8s.namespace.name with empty groupBy returns namespaces sorted
    alphabetically via the metadata-name branch (PaginateMetadataByName)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/namespaces_orderby.jsonl"),
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
            "orderBy": {"key": {"name": "k8s.namespace.name"}, "direction": direction},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    names = [r["namespaceName"] for r in data["records"]]
    expected = sorted(names, reverse=(direction == "desc"))
    assert names == expected, f"namespace.name {direction} not sorted; got {names}"


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
    response = _post(signoz, token, body)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert err_substr.lower() in error["message"].lower(), (
        f"expected substring {err_substr!r} not found in: {error['message']!r}"
    )


@pytest.mark.parametrize(
    "auth_state,expected_status",
    [
        pytest.param("none", HTTPStatus.UNAUTHORIZED, id="no_token"),
        pytest.param("admin", HTTPStatus.OK, id="admin_token"),
    ],
)
def test_namespaces_auth(
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
