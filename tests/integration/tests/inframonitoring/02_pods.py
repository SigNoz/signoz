"""Integration tests for v2 infra-monitoring pod endpoints."""

import json
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.inframonitoring import STATUS_BUCKETS, STATUS_TO_BUCKET
from fixtures.metrics import Metrics
from fixtures.querier import compare_values, get_all_warnings
from fixtures.time import parse_timestamp

ENDPOINT = "/api/v2/infra_monitoring/pods"

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


def test_pods_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed 2 pods x 7 metrics; assert response shape/contract + exact per-pod
    metric values, podAge, and podCountsByPhase against precomputed expected
    output. Locks in numerical determinism."""
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

    # Shape/contract.
    assert data["total"] == len(expected["records"])
    assert len(data["records"]) == len(expected["records"])
    # Full data present -> no warnings surfaced.
    assert get_all_warnings(response.json()) == []
    assert data["endTimeBeforeRetention"] is False
    assert {r["meta"]["k8s.pod.name"] for r in data["records"]} == set(exp_by_name.keys())

    # podAge = req.End - k8s.pod.start_time (in milliseconds). Verified equal to
    # the precise expected value computed from the test's known start_time.
    expected_age_ms = req_end_ms - int(start_time.timestamp() * 1000)

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
            "podStatus",
            "podCountsByStatus",
            "podRestarts",
            "podAge",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # Five phase buckets always present, integer-typed.
        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"], f"missing phase bucket {bucket} in {record['podCountsByPhase']!r}"
            assert isinstance(record["podCountsByPhase"][bucket], int)

        # All status buckets always present, integer-typed.
        for bucket in STATUS_BUCKETS:
            assert bucket in record["podCountsByStatus"], f"missing status bucket {bucket} in {record['podCountsByStatus']!r}"
            assert isinstance(record["podCountsByStatus"][bucket], int)

        # Exact values.
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
        assert record["podStatus"] == exp["podStatus"], f"{pod_name}.podStatus: got {record['podStatus']}, expected {exp['podStatus']}"
        assert record["podCountsByStatus"] == exp["podCountsByStatus"], f"{pod_name}.podCountsByStatus mismatch: got {record['podCountsByStatus']}"
        assert record["podRestarts"] == exp["podRestarts"], f"{pod_name}.podRestarts: got {record['podRestarts']}, expected {exp['podRestarts']}"
        assert record["podAge"] == expected_age_ms, f"{pod_name}.podAge: got {record['podAge']}, expected {expected_age_ms}"


@pytest.mark.parametrize(
    "case",
    [
        # Scenario 1: required metrics were never ingested. Post-#11754 the querier
        # drops them (no hard error), so the endpoint returns 200 with the pod that
        # DOES have data; never-seen columns are the -1 sentinel and a
        # "have never been received" warning is surfaced. Pods has no formulas, so
        # each missing metric maps straight to one -1 column.
        pytest.param(
            {
                "dataset": "pods_missing_metrics.jsonl",  # seeds only k8s.pod.cpu.usage
                "body": {"filter": {"expression": "k8s.pod.name = 'miss-p1'"}},
                "warn_substrings": ["never been received"],
                "warn_names": [
                    "k8s.pod.cpu_request_utilization",
                    "k8s.pod.cpu_limit_utilization",
                    "k8s.pod.memory.working_set",
                    "k8s.pod.memory_request_utilization",
                    "k8s.pod.memory_limit_utilization",
                ],
                # podCPU derives from the present k8s.pod.cpu.usage; the rest from
                # never-seen metrics -> -1 sentinel.
                "data_fields": ["podCPU"],
                "no_data_fields": [
                    "podCPURequest",
                    "podCPULimit",
                    "podMemory",
                    "podMemoryRequest",
                    "podMemoryLimit",
                ],
            },
            id="metric_never_seen",
        ),
    ],
)
def test_pods_warnings(
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
        _load_pods_metrics(
            f"inframonitoring/{case['dataset']}",
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
    return exactly the matching pods, with undistorted per-pod metric values."""
    # Every pod in pods_filter_dataset.jsonl carries the same sample pattern
    # as acc-p1 in pods_value_accuracy.jsonl, so all filtered records must
    # resolve to these exact values (mirrors pods_value_accuracy_expected.json
    # acc-p1).
    expected_values = {
        "podCPU": 0.5,
        "podCPURequest": 0.25,
        "podCPULimit": 0.5,
        "podMemory": 524288000.0,
        "podMemoryRequest": 0.5,
        "podMemoryLimit": 0.25,
    }
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

    # Filtering must not distort per-pod aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-9), f"{record['meta']['k8s.pod.name']}.{field}: got {record[field]}, expected {expected_values[field]}"


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


# Pod names per phase, as seeded in pods_phases.jsonl.
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


@pytest.mark.parametrize(
    "group_key,expected_groups",
    [
        pytest.param("k8s.namespace.name", {"gns-a", "gns-b"}, id="namespace"),
        pytest.param("k8s.deployment.name", {"gdep-x", "gdep-y"}, id="deployment"),
    ],
)
def test_pods_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    group_key: str,
    expected_groups: set,
) -> None:
    """groupBy aggregates 2 pods per group into one record. Per-pod identity
    fields (uid, age, phase) are cleared, but meta must surface the groupBy
    key so the client can identify each group.
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
    assert data["total"] == len(expected_groups)
    assert len(data["records"]) == len(expected_groups)

    groups_seen = set()
    for rec in data["records"]:
        assert rec["podUID"] == ""
        assert rec["podPhase"] == "no_data"
        assert rec["podAge"] == -1
        # meta surfaces the groupBy key so the client can identify the group.
        assert group_key in rec["meta"], rec["meta"]
        groups_seen.add(rec["meta"][group_key])
        # Each group has 2 running pods.
        assert rec["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert rec["podCountsByPhase"][other] == 0
    assert groups_seen == expected_groups


def test_pods_pagination(
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
        _load_pods_metrics(
            "inframonitoring/pods_pagination.jsonl",
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K, limit = 7, 3
    seen_pods: list[str] = []
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
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len} records, got {len(data['records'])}"
        seen_pods.extend(r["meta"]["k8s.pod.name"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_pods) == K
    assert set(seen_pods) == {f"page-p{i}" for i in range(1, K + 1)}


# orderBy keys per pods_constants.go:42-48 (snake_case request keys, camelCase
# response fields). k8s.pod.name sorts via the metadata-name branch
# (PaginateMetadataByName) and is only allowed when groupBy is empty.
@pytest.mark.parametrize(
    "column,record_field",
    [
        pytest.param("cpu", "podCPU", id="cpu"),
        pytest.param("cpu_request", "podCPURequest", id="cpu_request"),
        pytest.param("cpu_limit", "podCPULimit", id="cpu_limit"),
        pytest.param("memory", "podMemory", id="memory"),
        pytest.param("memory_request", "podMemoryRequest", id="memory_request"),
        pytest.param("memory_limit", "podMemoryLimit", id="memory_limit"),
        pytest.param("k8s.pod.name", None, id="pod_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_pods_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    record_field,
    direction: str,
) -> None:
    """Every orderBy column x direction: total/len stay K (invariant under
    sort) and records come back sorted by the requested column."""
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
            # Guards against pods seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.pod.name CONTAINS 'order-'"},
        },
        timeout=5,
    )
    ctx = f"orderBy={column} {direction}"
    assert response.status_code == HTTPStatus.OK, f"{ctx}: {response.text}"
    data = response.json()["data"]
    assert data["total"] == K, f"{ctx}: total={data['total']}"
    assert len(data["records"]) == K, f"{ctx}: len(records)={len(data['records'])}"

    # record_field None => pod name lives in meta, not a top-level field.
    values = [r["meta"]["k8s.pod.name"] if record_field is None else r[record_field] for r in data["records"]]
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


@pytest.mark.parametrize(
    "pod_name,expected_status",
    [
        # Expectations are what `kubectl get pods` STATUS would show for the
        # seeded K8s state in pods_phases.jsonl (not the query internals).
        pytest.param("pend-p", "pending", id="pending_phase_fallback"),
        pytest.param("run-p", "crashloopbackoff", id="container_reason_beats_running_phase"),
        pytest.param("succ-p", "completed", id="completed_terminated_reason"),
        pytest.param("fail-p", "evicted", id="pod_reason_beats_phase"),
        pytest.param("unk-p", "crashloopbackoff", id="multi_container_priority"),
    ],
)
def test_pods_status_list_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    pod_name: str,
    expected_status: str,
) -> None:
    """List mode: podStatus is the kubectl-style display status derived from
    k8s.pod.phase + k8s.pod.status_reason + k8s.container.status.reason.

    Seeded states -> what kubectl would print:
      pend-p  Pending          (unscheduled; phase fallback, no container reason)
      run-p   CrashLoopBackOff (container crashlooping; phase still Running)
      succ-p  Completed        (container terminated Completed; phase Succeeded)
      fail-p  Evicted          (pod-level Status.Reason overrides phase)
      unk-p   CrashLoopBackOff (2 containers: OOMKilled + CrashLoopBackOff)

    NOTE unk-p: a multi-container pod. kubectl picks the reason by container
    order; we pick by reason priority (waiting>terminated), so CrashLoopBackOff
    wins over OOMKilled. Documented divergence for multi-container pods — metrics
    carry no container ordering.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_phases.jsonl",
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
            "filter": {"expression": f"k8s.pod.name = '{pod_name}'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["meta"]["k8s.pod.name"] == pod_name
    assert rec["podStatus"] == expected_status

    # List mode: pod is its own group -> exactly its status bucket is 1.
    bucket = STATUS_TO_BUCKET[expected_status]
    assert rec["podCountsByStatus"][bucket] == 1
    for other in STATUS_BUCKETS:
        if other != bucket:
            assert rec["podCountsByStatus"][other] == 0, f"expected {other}=0 when status={expected_status}, got {rec['podCountsByStatus']}"


@pytest.mark.parametrize(
    "pod_name,expected_restarts",
    [
        # Mirrors kubectl RESTARTS (sum across the pod's containers).
        pytest.param("run-p", 5, id="single_container"),
        pytest.param("succ-p", 0, id="zero_restarts"),
        pytest.param("unk-p", 10, id="multi_container_sum"),  # 2 + 8
        pytest.param("pend-p", -1, id="no_series_sentinel"),  # unscheduled -> no metric -> -1
    ],
)
def test_pods_restarts_list_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    pod_name: str,
    expected_restarts: int,
) -> None:
    """podRestarts is the sum of k8s.container.restarts across the pod's
    containers (kubectl RESTARTS). pend-p never scheduled so emits no restart
    series -> -1 no-data sentinel (kubectl would show 0)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        _load_pods_metrics(
            "inframonitoring/pods_phases.jsonl",
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
            "filter": {"expression": f"k8s.pod.name = '{pod_name}'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["meta"]["k8s.pod.name"] == pod_name
    assert rec["podRestarts"] == expected_restarts


def test_pods_status_latest_wins(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """A stale container reason from an old incarnation must not win. trans-p's
    first incarnation (container.id=aaa) reported CrashLoopBackOff, then it
    recovered in a new incarnation (container.id=bbb, CrashLoopBackOff=0) while
    phase went Running. kubectl shows Running; the frozen stale series is
    ignored via argMax-by-latest-timestamp per (pod, container, reason)."""
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
    assert rec["podStatus"] == "running"


def test_pods_restarts_latest_wins(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """restartCount is cumulative per container. Across incarnations
    (container.id=aaa reported 1, then container.id=bbb reported 5) podRestarts
    is the LATEST value 5 (kubectl RESTARTS), not the sum 6 — incarnations must
    not be double-counted."""
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
    assert rec["podRestarts"] == 5


def test_pods_status_grouped_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """groupBy=[k8s.namespace.name] aggregates each pod's display status across
    ns-mixed. podStatus is no-data (no single pod identifies the group). Seeded
    states -> kubectl: g-run-1/g-run-3 Running, g-run-2 CrashLoopBackOff,
    g-fail-1 Error, g-fail-2 Evicted, g-pend-1 Pending."""
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
    assert rec["meta"].get("k8s.namespace.name") == "ns-mixed"
    assert rec["podStatus"] == "no_data"

    expected_counts = {bucket: 0 for bucket in STATUS_BUCKETS}
    expected_counts.update(
        {
            "running": 2,
            "crashLoopBackOff": 1,
            "error": 1,
            "evicted": 1,
            "pending": 1,
        }
    )
    assert rec["podCountsByStatus"] == expected_counts


def test_pods_restarts_grouped_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Grouped podRestarts is the sum of restarts across all pods in the group.
    In ns-mixed only g-run-2 has restarts (3); all others 0 -> group total 3."""
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
    assert rec["meta"].get("k8s.namespace.name") == "ns-mixed"
    assert rec["podRestarts"] == 3


def test_pods_status_missing_metric_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """When the status metrics were never ingested, the status query is gated
    off: a warning naming the missing metric(s) is surfaced, podStatus is the
    no-data sentinel, and all status buckets are 0. (pods_missing_metrics.jsonl
    seeds only k8s.pod.cpu.usage.)"""
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
            "filter": {"expression": "k8s.pod.name = 'miss-p1'"},
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    body = response.json()
    data = body["data"]

    # Collect primary + additional warning messages.
    warning = data.get("warning") or {}
    msgs = ([warning["message"]] if warning.get("message") else []) + [w["message"] for w in warning.get("warnings", [])]
    assert any("Pod status could not be computed" in m for m in msgs), f"status-gate warning missing: {msgs!r}"
    assert any("k8s.container.status.reason" in m for m in msgs), f"missing metric not named: {msgs!r}"

    rec = data["records"][0]
    assert rec["meta"]["k8s.pod.name"] == "miss-p1"
    assert rec["podStatus"] == "no_data"
    for bucket in STATUS_BUCKETS:
        assert rec["podCountsByStatus"][bucket] == 0, f"expected {bucket}=0 when gated off, got {rec['podCountsByStatus']}"
    assert rec["podRestarts"] == -1
