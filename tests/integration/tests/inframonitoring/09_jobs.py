"""Integration tests for v2 infra-monitoring jobs endpoint."""

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

ENDPOINT = "/api/v2/infra_monitoring/jobs"

# Required metrics for the v2 jobs endpoint
# (pkg/modules/inframonitoring/implinframonitoring/jobs_constants.go:24-36).
REQUIRED_METRICS = {
    "k8s.pod.phase",
    "k8s.pod.cpu.usage",
    "k8s.pod.cpu_request_utilization",
    "k8s.pod.cpu_limit_utilization",
    "k8s.pod.memory.working_set",
    "k8s.pod.memory_request_utilization",
    "k8s.pod.memory_limit_utilization",
    "k8s.job.active_pods",
    "k8s.job.failed_pods",
    "k8s.job.successful_pods",
    "k8s.job.desired_successful_pods",
}


def _post(signoz: types.SigNoz, token: str, body: dict) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json=body,
        timeout=5,
    )


def test_jobs_happy_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """2 jobs x 2 pods/job, all Running; assert response shape + counts."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_happy_path.jsonl"),
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

    assert {r["jobName"] for r in data["records"]} == {"happy-job-1", "happy-job-2"}

    for record in data["records"]:
        for field in (
            "jobName",
            "jobCPU",
            "jobCPURequest",
            "jobCPULimit",
            "jobMemory",
            "jobMemoryRequest",
            "jobMemoryLimit",
            "desiredSuccessfulPods",
            "activePods",
            "failedPods",
            "successfulPods",
            "podCountsByPhase",
            "meta",
        ):
            assert field in record, f"missing {field} in {record!r}"

        # All 4 lifecycle counts must be ints (not floats).
        for int_field in ("desiredSuccessfulPods", "activePods", "failedPods", "successfulPods"):
            assert isinstance(record[int_field], int), f"{int_field} should be int, got {type(record[int_field]).__name__}"

        # Seeded: active=2, failed=0, successful=0, desired_successful=2.
        assert record["desiredSuccessfulPods"] == 2
        assert record["activePods"] == 2
        assert record["failedPods"] == 0
        assert record["successfulPods"] == 0

        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert record["podCountsByPhase"][other] == 0

        assert record["meta"].get("k8s.job.name") == record["jobName"]
        assert "k8s.namespace.name" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]


def test_jobs_value_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Exact per-job metric values + all 4 lifecycle counts + phase counts.

    Locks in Sum vs Avg split across pod-level metrics
    (jobs_constants.go:81-198): A/D = SpaceAggregationSum across pods;
    B/C/E/F = SpaceAggregationAvg. All 4 job-level counts (H/I/J/K) use
    TimeAggregationLatest + SpaceAggregationSum + ReduceToLast.
    """
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    with open(
        get_testdata_file_path("inframonitoring/jobs_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["jobName"]: r for r in expected["records"]}

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
        exp = exp_by_name[record["jobName"]]
        for field in (
            "jobCPU",
            "jobCPURequest",
            "jobCPULimit",
            "jobMemory",
            "jobMemoryRequest",
            "jobMemoryLimit",
        ):
            assert compare_values(record[field], exp[field], 1e-6), f"{record['jobName']}.{field}: got {record[field]}, expected {exp[field]}"
        for int_field in ("desiredSuccessfulPods", "activePods", "failedPods", "successfulPods"):
            assert record[int_field] == exp[int_field], f"{record['jobName']}.{int_field}: got {record[int_field]}, expected {exp[int_field]}"
        assert record["podCountsByPhase"] == exp["podCountsByPhase"]


def test_jobs_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Seed only k8s.pod.cpu.usage; assert other 10 required metrics flagged missing."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_missing_metrics.jsonl"),
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

    assert set(data["requiredMetricsCheck"]["missingMetrics"]) == (REQUIRED_METRICS - {"k8s.pod.cpu.usage"})
    assert data["records"] == []
    assert data["total"] == 0


def test_jobs_filter_and(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """AND of two attribute clauses returns only the matching jobs."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
    assert {r["jobName"] for r in data["records"]} == {"etl-a-prod", "cron-a-prod"}
    assert data["total"] == 2


def test_jobs_filter_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """IN (...) returns exactly the listed jobs."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.job.name IN ('etl-a-prod', 'cron-b-dev')"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["jobName"] for r in data["records"]} == {"etl-a-prod", "cron-b-dev"}
    assert data["total"] == 2


def test_jobs_filter_not_in(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """NOT IN on the partition key (k8s.job.name) returns the rest.
    NOT IN on non-partition labels is unreliable in QB v5; covered indirectly
    via the and_not_in combo. Same workaround as clusters/volumes/deployments/SS."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.job.name NOT IN ('etl-a-prod', 'etl-a-dev', 'cron-a-prod', 'cron-a-dev')"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["jobName"] for r in data["records"]} == {
        "etl-b-prod",
        "etl-b-dev",
        "cron-b-prod",
        "cron-b-dev",
    }


def test_jobs_filter_contains(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """CONTAINS performs substring match on the attribute value."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.job.name CONTAINS 'etl'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert {r["jobName"] for r in data["records"]} == {
        "etl-a-prod",
        "etl-a-dev",
        "etl-b-prod",
        "etl-b-dev",
    }


@pytest.mark.parametrize(
    "expression,expected",
    [
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.job.name IN ('etl-a-prod', 'cron-a-prod')",
            {"etl-a-prod", "cron-a-prod"},
            id="and_in",
        ),
        pytest.param(
            "k8s.namespace.name = 'ns-a' AND k8s.job.name NOT IN ('etl-a-prod', 'etl-a-dev')",
            {"cron-a-prod", "cron-a-dev"},
            id="and_not_in",
        ),
        pytest.param(
            "env = 'prod' AND k8s.job.name CONTAINS 'etl'",
            {"etl-a-prod", "etl-b-prod"},
            id="and_contains",
        ),
        pytest.param(
            "k8s.job.name IN ('etl-a-prod', 'etl-b-prod', 'cron-a-prod') AND k8s.job.name CONTAINS 'etl'",
            {"etl-a-prod", "etl-b-prod"},
            id="in_contains",
        ),
    ],
)
def test_jobs_filter_combos(
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
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
    assert {r["jobName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)


def test_jobs_filter_bad_attr_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Filter with a typo'd attribute key returns 400 invalid_input."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
            "filter": {"expression": "k8s.job.namee = 'etl-a-prod'"},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "invalid_input"
    assert any("k8s.job.namee" in e["message"] for e in body["error"]["errors"]), f"bad attr name not surfaced: {body['error']['errors']!r}"


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param("k8s.job.name =", id="trailing_op"),
        pytest.param("(k8s.job.name = 'etl-a-prod'", id="unclosed_paren"),
    ],
)
def test_jobs_filter_bad_grammar(
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
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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


def test_jobs_pod_phase_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Job with mixed pod phases: 2 Running + 3 Succeeded + 1 Failed (in-progress)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_pod_phases.jsonl"),
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
            "filter": {"expression": "k8s.job.name = 'pp-job'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["jobName"] == "pp-job"
    assert rec["podCountsByPhase"] == {
        "pending": 0,
        "running": 2,
        "succeeded": 3,
        "failed": 1,
        "unknown": 0,
    }


def test_jobs_lifecycle_counts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Lifecycle counters (active=2, failed=1, successful=3, desired_successful=4)
    are independent of pod phase counts. Seed deliberately mismatches: 1 Pending pod
    only. Validates the 4 int counters come straight from k8s.job.* metrics, not
    derived from observable pod phases (cumulative counters vs latest phase)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_lifecycle.jsonl"),
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
            "filter": {"expression": "k8s.job.name = 'lc-job'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["jobName"] == "lc-job"
    for int_field in ("desiredSuccessfulPods", "activePods", "failedPods", "successfulPods"):
        assert isinstance(rec[int_field], int), f"{int_field} should be int"
    assert rec["desiredSuccessfulPods"] == 4
    assert rec["activePods"] == 2
    assert rec["failedPods"] == 1
    assert rec["successfulPods"] == 3
    # Pod phase counts deliberately disagree: only 1 Pending pod seeded.
    assert rec["podCountsByPhase"] == {
        "pending": 1,
        "running": 0,
        "succeeded": 0,
        "failed": 0,
        "unknown": 0,
    }


def test_jobs_completed_job(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Terminal-state job (active=0, failed=0, successful=3, desired_successful=3).
    Asserts activePods==0 and failedPods==0 are real zeros, not the -1 'no data'
    sentinel that buildJobRecords (jobs.go:30-43) initializes."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_completed.jsonl"),
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
            "filter": {"expression": "k8s.job.name = 'done-job'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == 1
    rec = data["records"][0]
    assert rec["jobName"] == "done-job"
    assert rec["activePods"] == 0, f"activePods=0 leaked sentinel: {rec['activePods']}"
    assert rec["failedPods"] == 0, f"failedPods=0 leaked sentinel: {rec['failedPods']}"
    assert rec["successfulPods"] == 3
    assert rec["desiredSuccessfulPods"] == 3
    assert rec["podCountsByPhase"]["succeeded"] == 3


def test_jobs_base_filter_drops_non_job_pods(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Locks in jobsBaseFilterExpr (jobs_constants.go:10, :67-72):
    standalone pods (no k8s.job.name), Deployment pods (k8s.deployment.name only),
    and StatefulSet pods (k8s.statefulset.name only) are all dropped.
    Only the real job row appears, total=1, no empty-name group."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_non_job_pods.jsonl"),
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
    assert data["total"] == 1, f"expected only the real job row; got {[r['jobName'] for r in data['records']]}"
    rec = data["records"][0]
    assert rec["jobName"] == "nj-job"
    assert all(r["jobName"] != "" for r in data["records"])


def test_jobs_groupby_namespace(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """groupBy=[k8s.namespace.name]: 2 records, jobName cleared,
    phase counts aggregate per namespace, meta surfaces k8s.namespace.name."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_groupby.jsonl"),
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
        # Per-row job identity is cleared; only the groupBy field surfaces.
        assert rec["jobName"] == ""
        # Each ns has 2 jobs x 1 Running pod = 2 Running pods.
        assert rec["podCountsByPhase"]["running"] == 2
        for other in ("pending", "succeeded", "failed", "unknown"):
            assert rec["podCountsByPhase"][other] == 0
        assert "k8s.namespace.name" in rec["meta"], rec["meta"]
        namespaces_seen.add(rec["meta"]["k8s.namespace.name"])
    assert namespaces_seen == {"gb-ns-a", "gb-ns-b"}


def test_jobs_pagination_sync(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Pagination invariants across 3 offset windows."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_pagination.jsonl"),
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
                "filter": {"expression": "k8s.job.name CONTAINS 'page-'"},
            },
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = min(limit, K - offset)
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["jobName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-job-{i}" for i in range(1, K + 1)}


def test_jobs_offset_beyond_total(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Offset beyond total returns empty records; total still reflects dataset size."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_pagination.jsonl"),
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
            "filter": {"expression": "k8s.job.name CONTAINS 'page-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["records"] == []
    assert data["total"] == K


def test_jobs_total_invariant_across_orderby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Total stays K across all 10 orderBy metric columns x 2 directions = 20 calls."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_orderby.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    K = 5

    # orderBy keys per jobs_constants.go:5-16.
    for column in (
        "cpu",
        "cpu_request",
        "cpu_limit",
        "memory",
        "memory_request",
        "memory_limit",
        "desired_successful_pods",
        "active_pods",
        "failed_pods",
        "successful_pods",
    ):
        for direction in ("asc", "desc"):
            response = _post(
                signoz,
                token,
                {
                    "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                    "end": int(now.timestamp() * 1000),
                    "limit": 50,
                    "orderBy": {"key": {"name": column}, "direction": direction},
                    "filter": {"expression": "k8s.job.name CONTAINS 'order-'"},
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
        pytest.param("cpu", "jobCPU", id="cpu"),
        pytest.param("cpu_request", "jobCPURequest", id="cpu_request"),
        pytest.param("cpu_limit", "jobCPULimit", id="cpu_limit"),
        pytest.param("memory", "jobMemory", id="memory"),
        pytest.param("memory_request", "jobMemoryRequest", id="memory_request"),
        pytest.param("memory_limit", "jobMemoryLimit", id="memory_limit"),
        pytest.param("desired_successful_pods", "desiredSuccessfulPods", id="desired_successful_pods"),
        pytest.param("active_pods", "activePods", id="active_pods"),
        pytest.param("failed_pods", "failedPods", id="failed_pods"),
        pytest.param("successful_pods", "successfulPods", id="successful_pods"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_jobs_orderby_correctness(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    column: str,
    record_field: str,
    direction: str,
) -> None:
    """Records sorted by the chosen metric column in the requested direction.
    Covers each entry in orderByToJobsQueryNames (jobs_constants.go:49-60)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_orderby.jsonl"),
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
            "filter": {"expression": "k8s.job.name CONTAINS 'order-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    values = [r[record_field] for r in data["records"]]
    expected = sorted(values, reverse=(direction == "desc"))
    assert values == expected, f"{column} {direction} not sorted; got {values}"


@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_jobs_orderby_by_job_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    direction: str,
) -> None:
    """orderBy=k8s.job.name with empty groupBy returns jobs sorted
    alphabetically via the metadata-name branch (PaginateMetadataByName)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_orderby.jsonl"),
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
            "orderBy": {"key": {"name": "k8s.job.name"}, "direction": direction},
            "filter": {"expression": "k8s.job.name CONTAINS 'order-'"},
        },
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    names = [r["jobName"] for r in data["records"]]
    expected = sorted(names, reverse=(direction == "desc"))
    assert names == expected, f"job.name {direction} not sorted; got {names}"


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
                "orderBy": {"key": {"name": "k8s.job.name"}, "direction": "desc"},
                "groupBy": [
                    {
                        "name": "k8s.namespace.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            },
            "is only allowed when groupBy is empty",
            id="orderby_jobname_with_groupby",
        ),
    ],
)
def test_jobs_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """All PostableJobs.Validate() rules reject with 400 + descriptive error.
    See pkg/types/inframonitoringtypes/jobs.go:48-99."""
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
def test_jobs_auth(
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
