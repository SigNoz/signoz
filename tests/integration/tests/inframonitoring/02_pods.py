"""Integration tests for v2 infra-monitoring pod endpoints."""

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
from fixtures.time import parse_timestamp

ENDPOINT = "/api/v2/infra_monitoring/pods"

# Required metrics for the v2 pods endpoint
# (pkg/modules/inframonitoring/implinframonitoring/pods_constants.go:24-32).
REQUIRED_METRICS = {
    "k8s.pod.cpu.usage",
    "k8s.pod.cpu_request_utilization",
    "k8s.pod.cpu_limit_utilization",
    "k8s.pod.memory.working_set",
    "k8s.pod.memory_request_utilization",
    "k8s.pod.memory_limit_utilization",
    "k8s.pod.phase",
}

# Numeric values emitted by the k8s.pod.phase metric (OTel kubeletstatsreceiver).
PHASE_NUM = {"pending": 1, "running": 2, "succeeded": 3, "failed": 4, "unknown": 5}

# Placeholder in JSONL labels that gets substituted with a runtime ISO string.
START_TIME_PLACEHOLDER = "__START_TIME__"


def _load_pods_metrics(
    file_relpath: str,
    base_time: datetime,
    start_time: datetime | None = None,
) -> list[Metrics]:
    """Load pod metrics JSONL with optional k8s.pod.start_time substitution.

    Mirrors Metrics.load_from_file's base_time rebase logic but adds a hook
    for the start_time label. Lines carrying ``k8s.pod.start_time =
    __START_TIME__`` get rewritten to ``start_time.isoformat()`` before
    construction, ensuring podAge is deterministic across runs.
    """
    path = get_testdata_file_path(file_relpath)
    start_time_iso = start_time.isoformat() if start_time else None
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            data = json.loads(line)
            labels = data.get("labels", {})
            if start_time_iso and labels.get("k8s.pod.start_time") == START_TIME_PLACEHOLDER:
                labels["k8s.pod.start_time"] = start_time_iso
            rows.append(data)
    if not rows:
        return []
    earliest = min(parse_timestamp(r["timestamp"]) for r in rows)
    offset = base_time - earliest
    metrics = []
    for r in rows:
        ts = parse_timestamp(r["timestamp"]) + offset
        r["timestamp"] = ts.isoformat()
        metrics.append(Metrics.from_dict(r))
    return metrics


def test_pods_happy_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 pods x 7 metrics; assert response shape + counts + podCountsByPhase buckets."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    start_time = now - timedelta(minutes=10)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_happy_path.jsonl",
            base_time=now - timedelta(minutes=4),
            start_time=start_time,
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

    assert {r["meta"]["k8s.pod.name"] for r in data["records"]} == {
        "happy-p1",
        "happy-p2",
    }

    for record in data["records"]:
        for field in (
            "podUID",
            "podCPU",
            "podCPURequest",
            "podCPULimit",
            "podMemory",
            "podMemoryRequest",
            "podMemoryLimit",
            "podPhase",
            "podCountsByPhase",
            "podAge",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # Five phase buckets always present, integer-typed.
        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"], f"missing phase bucket {bucket} in {record['podCountsByPhase']!r}"
            assert isinstance(record["podCountsByPhase"][bucket], int)

        # All happy-path pods are running.
        assert record["podPhase"] == "running"
        assert record["podCountsByPhase"]["running"] == 1
        for bucket in ("pending", "succeeded", "failed", "unknown"):
            assert record["podCountsByPhase"][bucket] == 0


def test_pods_value_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert exact per-pod metric values, podAge, and podCountsByPhase against
    precomputed expected output. Locks in numerical determinism."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    start_time = now - timedelta(minutes=10)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_value_accuracy.jsonl",
            base_time=now - timedelta(minutes=4),
            start_time=start_time,
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/pods_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["podName"]: r for r in expected["records"]}

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    req_end_ms = int(now.timestamp() * 1000)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": req_end_ms,
            "limit": 50,
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert len(data["records"]) == len(expected["records"])

    # podAge = req.End - k8s.pod.start_time (in milliseconds). Verified equal to
    # the precise expected value computed from the test's known start_time.
    expected_age_ms = req_end_ms - int(start_time.timestamp() * 1000)

    for record in data["records"]:
        pod_name = record["meta"]["k8s.pod.name"]
        exp = exp_by_name[pod_name]
        for field in (
            "podCPU",
            "podCPURequest",
            "podCPULimit",
            "podMemory",
            "podMemoryRequest",
            "podMemoryLimit",
        ):
            assert compare_values(record[field], exp[field], 1e-9), f"{pod_name}.{field}: got {record[field]}, expected {exp[field]}"
        assert record["podPhase"] == exp["podPhase"]
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]
        assert record["podAge"] == expected_age_ms, f"{pod_name}.podAge: got {record['podAge']}, expected {expected_age_ms}"


def test_pods_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only k8s.pod.cpu.usage; assert other 6 required metrics flagged missing.

    The endpoint short-circuits and returns empty records + total=0 when any
    required metric is missing (module.go:192-197).
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_missing_metrics.jsonl",
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
    "expression,expected_pods",
    [
        pytest.param(
            "k8s.namespace.name = 'ns-prod' AND k8s.deployment.name = 'web'",
            {"web-prod-1", "web-prod-2"},
            id="and",
        ),
        pytest.param(
            "k8s.pod.name IN ('web-prod-1', 'api-dev-1')",
            {"web-prod-1", "api-dev-1"},
            id="in",
        ),
        pytest.param(
            "k8s.deployment.name NOT IN ('api')",
            {"web-prod-1", "web-prod-2", "web-dev-1", "web-dev-2"},
            id="not_in",
        ),
        pytest.param(
            "k8s.pod.name CONTAINS 'web'",
            {"web-prod-1", "web-prod-2", "web-dev-1", "web-dev-2"},
            id="contains",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-prod' AND k8s.pod.name IN ('web-prod-1', 'api-prod-1')",
            {"web-prod-1", "api-prod-1"},
            id="and_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-prod' AND k8s.pod.name NOT IN ('web-prod-1', 'web-prod-2')",
            {"api-prod-1", "api-prod-2"},
            id="and_not_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-dev' AND k8s.pod.name CONTAINS 'web'",
            {"web-dev-1", "web-dev-2"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.pod.name IN ('web-prod-1', 'web-dev-1', 'api-dev-1') AND k8s.pod.name CONTAINS 'web'",
            {"web-prod-1", "web-dev-1"},
            id="in_contains",
        ),
    ],
)
def test_pods_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected_pods: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching pods."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_filter_dataset.jsonl",
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
    assert {r["meta"]["k8s.pod.name"] for r in data["records"]} == expected_pods
    assert data["total"] == len(expected_pods)


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.pod.namee = 'web-prod-1'", "k8s.pod.namee", id="bad_attr_name"),
        pytest.param("k8s.pod.name =", None, id="trailing_op"),
        pytest.param("(k8s.pod.name = 'web-prod-1'", None, id="unclosed_paren"),
    ],
)
def test_pods_filter_invalid(
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
        _load_pods_metrics(
            "inframonitoring/pods_filter_dataset.jsonl",
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


# Pod names per phase in pods_phases.jsonl (generated by tests/gen_pods_datasets.py).
_PHASE_TO_POD_NAME = {
    "pending": "pend-p",
    "running": "run-p",
    "succeeded": "succ-p",
    "failed": "fail-p",
    "unknown": "unk-p",
}


@pytest.mark.parametrize(
    "phase_name",
    [
        pytest.param("pending", id="pending"),
        pytest.param("running", id="running"),
        pytest.param("succeeded", id="succeeded"),
        pytest.param("failed", id="failed"),
        pytest.param("unknown", id="unknown"),
    ],
)
def test_pods_phase_counts_list_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    phase_name: str,
) -> None:
    """List mode (no groupBy): each pod's record carries podPhase derived from its
    latest k8s.pod.phase sample, AND podCountsByPhase has exactly that bucket=1
    with all others 0. Verifies the phase-derivation logic at pods.go:82-94.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_phases.jsonl",
            base_time=now - timedelta(minutes=4),
        )
    )

    pod_name = _PHASE_TO_POD_NAME[phase_name]
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": f"k8s.pod.name = '{pod_name}'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["meta"]["k8s.pod.name"] == pod_name
    assert rec["podPhase"] == phase_name
    assert rec["podCountsByPhase"][phase_name] == 1
    for other in {"pending", "running", "succeeded", "failed", "unknown"} - {phase_name}:
        assert rec["podCountsByPhase"][other] == 0, f"expected {other}=0 when latest phase={phase_name}, got {rec['podCountsByPhase']}"


def test_pods_phase_counts_latest_wins(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pod with k8s.pod.phase transitioning pending->running across the window:
    podPhase reflects the LATEST sample (running) via argMax, not the earliest.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_phases_transition.jsonl",
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
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["meta"]["k8s.pod.name"] == "trans-p"
    assert rec["podPhase"] == "running"
    assert rec["podCountsByPhase"]["running"] == 1
    assert rec["podCountsByPhase"]["pending"] == 0


def test_pods_phase_counts_grouped_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """groupBy=[k8s.namespace.name] aggregates phase counts across all pods in
    the group. podPhase becomes "no_data" because no single pod identifies the
    group, and per-pod fields (podUID, podAge, meta) clear out.
    Dataset: ns-mixed contains 3 running + 2 failed + 1 pending.
    See pods.go:80-95 (list-vs-grouped phase handling).
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_phases_grouped.jsonl",
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
                    "name": "k8s.namespace.name",
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

    # Grouped-mode invariants: per-pod fields cleared, but meta surfaces the
    # groupBy key so the client can identify the group.
    assert rec["podUID"] == ""
    assert rec["podAge"] == -1
    assert rec["podPhase"] == "no_data"
    assert rec["meta"].get("k8s.namespace.name") == "ns-mixed"

    # Aggregated phase counts across the namespace.
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 3,
        "succeeded": 0,
        "failed": 2,
        "unknown": 0,
    }


def test_pods_groupby_namespace(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Explicit groupBy=[k8s.namespace.name] aggregates 2 pods per namespace
    into one record. Per-pod identity fields (uid, age) are cleared, but meta
    must surface the groupBy key so the client can identify each group.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_groupby.jsonl",
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
                    "name": "k8s.namespace.name",
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
    assert len(data["records"]) == 2

    namespaces_seen = set()
    for rec in data["records"]:
        assert rec["podUID"] == ""
        assert rec["podPhase"] == "no_data"
        assert rec["podAge"] == -1
        # meta surfaces the groupBy key so the client can identify the group.
        assert "k8s.namespace.name" in rec["meta"], rec["meta"]
        namespaces_seen.add(rec["meta"]["k8s.namespace.name"])
        # Each namespace has 2 running pods.
        assert rec["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert rec["podCountsByPhase"][other] == 0
    assert namespaces_seen == {"gns-a", "gns-b"}


def test_pods_groupby_deployment(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """groupBy=[k8s.deployment.name] returns one record per deployment with
    aggregated counts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_groupby.jsonl",
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
                    "name": "k8s.deployment.name",
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
    for rec in data["records"]:
        assert rec["podCountsByPhase"]["running"] == 2


def test_pods_pagination_sync(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination: per-page len matches min(limit, total-offset), total invariant,
    pages cover the full set with no overlap."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_pagination.jsonl",
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K, limit = 7, 3
    seen_pods: list[str] = []
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
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = min(limit, K - offset)
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len} records, got {len(data['records'])}"
        seen_pods.extend(r["meta"]["k8s.pod.name"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_pods) == K
    assert set(seen_pods) == {f"page-p{i}" for i in range(1, K + 1)}


def test_pods_offset_beyond_total(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Offset beyond total returns empty records; total still reflects dataset size."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_pagination.jsonl",
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
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["records"] == []
    assert data["total"] == K


# orderBy keys per pods_constants.go:42-48.
@pytest.mark.parametrize(
    "column",
    ["cpu", "cpu_request", "cpu_limit", "memory", "memory_request", "memory_limit"],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_pods_total_invariant_across_orderby(
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
        _load_pods_metrics(
            "inframonitoring/pods_orderby.jsonl",
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
        },
        timeout=5,
    )
    ctx = f"orderBy={column} {direction}"
    assert response.status_code == HTTPStatus.OK, f"{ctx}: {response.text}"
    data = response.json()["data"]
    assert data["total"] == K, f"{ctx}: total={data['total']}"
    assert len(data["records"]) == K, f"{ctx}: len(records)={len(data['records'])}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_pods_orderby_correctness(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """Records sorted by podCPU in the requested direction."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_pagination.jsonl",
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
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    cpu_values = [r["podCPU"] for r in data["records"]]
    expected = sorted(cpu_values, reverse=(direction == "desc"))
    assert cpu_values == expected, f"cpu {direction} not sorted; got {cpu_values}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_pods_orderby_by_pod_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """orderBy=k8s.pod.name with empty groupBy returns pods sorted alphabetically
    via the metadata-name branch (PaginateMetadataByName)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_orderby.jsonl",
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
            "orderBy": {"key": {"name": "k8s.pod.name"}, "direction": direction},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    names = [r["meta"]["k8s.pod.name"] for r in data["records"]]
    expected = sorted(names, reverse=(direction == "desc"))
    assert names == expected, f"pod.name {direction} not sorted; got {names}"


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
            {"orderBy": {"key": {"name": "phase"}, "direction": "desc"}},
            "invalid order by key",
            id="orderby_phase_rejected",
        ),
        pytest.param(
            {"orderBy": {"key": {"name": "cpu"}, "direction": "up"}},
            "invalid order by direction",
            id="orderby_invalid_direction",
        ),
        pytest.param(
            {
                "orderBy": {
                    "key": {"name": "k8s.pod.name"},
                    "direction": "desc",
                },
                "groupBy": [
                    {
                        "name": "k8s.namespace.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_podname_with_groupby",
        ),
    ],
)
def test_pods_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostablePods.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/pods.go:56-107."""
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
