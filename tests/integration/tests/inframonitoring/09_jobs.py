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


def test_jobs_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Assert response shape/contract + exact per-job metric values, all 4
    lifecycle counts, and phase counts against precomputed expected output.

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
    assert {r["jobName"] for r in data["records"]} == set(exp_by_name.keys())

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

        for bucket in ("pending", "running", "succeeded", "failed", "unknown"):
            assert bucket in record["podCountsByPhase"]
            assert isinstance(record["podCountsByPhase"][bucket], int)

        assert record["meta"].get("k8s.job.name") == record["jobName"]
        assert "k8s.namespace.name" in record["meta"]
        assert "k8s.cluster.name" in record["meta"]

        # Exact values.
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
            "k8s.namespace.name = 'ns-a' AND env = 'prod'",
            {"etl-a-prod", "cron-a-prod"},
            id="and",
        ),
        pytest.param(
            "k8s.job.name IN ('etl-a-prod', 'cron-b-dev')",
            {"etl-a-prod", "cron-b-dev"},
            id="in",
        ),
        # NOT IN on the partition key (k8s.job.name) returns the rest.
        # NOT IN on non-partition labels is unreliable in QB v5; covered indirectly
        # via the and_not_in combo. Same workaround as clusters/volumes/deployments/SS.
        pytest.param(
            "k8s.job.name NOT IN ('etl-a-prod', 'etl-a-dev', 'cron-a-prod', 'cron-a-dev')",
            {"etl-b-prod", "etl-b-dev", "cron-b-prod", "cron-b-dev"},
            id="not_in",
        ),
        pytest.param(
            "k8s.job.name CONTAINS 'etl'",
            {"etl-a-prod", "etl-a-dev", "etl-b-prod", "etl-b-dev"},
            id="contains",
        ),
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
def test_jobs_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    expression: str,
    expected: set,
) -> None:
    """Filter operators (=, IN, NOT IN, CONTAINS) and their AND-combinations
    return exactly the matching jobs, with undistorted per-job metric values."""
    # Every job in jobs_filter_dataset.jsonl carries the same sample pattern
    # as acc-job-1 in jobs_value_accuracy.jsonl (2 pods), so all filtered
    # records must resolve to these exact values (mirrors
    # jobs_value_accuracy_expected.json acc-job-1).
    expected_values = {
        "jobCPU": 1.0,
        "jobCPURequest": 0.5,
        "jobCPULimit": 0.4,
        "jobMemory": 300000000.0,
        "jobMemoryRequest": 0.5,
        "jobMemoryLimit": 0.4,
    }
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
    assert {r["jobName"] for r in data["records"]} == expected
    assert data["total"] == len(expected)

    # Filtering must not distort per-job aggregation values.
    for record in data["records"]:
        for field in expected_values:
            assert compare_values(record[field], expected_values[field], 1e-6), f"{record['jobName']}.{field}: got {record[field]}, expected {expected_values[field]}"


@pytest.mark.parametrize(
    "expression,err_substr",
    [
        pytest.param("k8s.job.namee = 'etl-a-prod'", "k8s.job.namee", id="bad_attr_name"),
        pytest.param("k8s.job.name =", None, id="trailing_op"),
        pytest.param("(k8s.job.name = 'etl-a-prod'", None, id="unclosed_paren"),
    ],
)
def test_jobs_filter_invalid(
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
            get_testdata_file_path("inframonitoring/jobs_filter_dataset.jsonl"),
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
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.job.name = 'pp-job'"},
        },
        timeout=5,
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
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.job.name = 'lc-job'"},
        },
        timeout=5,
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
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.job.name = 'done-job'"},
        },
        timeout=5,
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
    assert data["total"] == 1, f"expected only the real job row; got {[r['jobName'] for r in data['records']]}"
    rec = data["records"][0]
    assert rec["jobName"] == "nj-job"
    assert all(r["jobName"] != "" for r in data["records"])


# Float record fields compared with tolerance; everything else compared with ==.
_GROUPBY_FLOAT_FIELDS = {
    "jobCPU",
    "jobCPURequest",
    "jobCPULimit",
    "jobMemory",
    "jobMemoryRequest",
    "jobMemoryLimit",
}


def _phase(pending=0, running=0, succeeded=0, failed=0, unknown=0) -> dict:
    return {"pending": pending, "running": running, "succeeded": succeeded, "failed": failed, "unknown": unknown}


@pytest.mark.parametrize(
    "scenario",
    [
        # Explicit groupBy=[k8s.job.name]: one record per job, jobName populated
        # (jobs.go:28-31), response grouped_list. 1 running pod each.
        pytest.param(
            {
                "fixture": "jobs_groupby.jsonl",
                "group_by": "k8s.job.name",
                "filter": None,
                "group_meta_keys": ["k8s.job.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-job-a1": {"jobName": "gb-job-a1", "podCountsByPhase": _phase(running=1)},
                    "gb-job-a2": {"jobName": "gb-job-a2", "podCountsByPhase": _phase(running=1)},
                    "gb-job-b1": {"jobName": "gb-job-b1", "podCountsByPhase": _phase(running=1)},
                    "gb-job-b2": {"jobName": "gb-job-b2", "podCountsByPhase": _phase(running=1)},
                },
            },
            id="job_name",
        ),
        # Explicit groupBy=[k8s.namespace.name]: aggregated across each namespace's
        # 2 jobs, jobName cleared, response grouped_list. 2 running each.
        pytest.param(
            {
                "fixture": "jobs_groupby.jsonl",
                "group_by": "k8s.namespace.name",
                "filter": None,
                "group_meta_keys": ["k8s.namespace.name"],
                "expected_type": "grouped_list",
                "groups": {
                    "gb-ns-a": {"jobName": "", "podCountsByPhase": _phase(running=2)},
                    "gb-ns-b": {"jobName": "", "podCountsByPhase": _phase(running=2)},
                },
            },
            id="namespace",
        ),
        # Default groupBy (no groupBy in request) => [k8s.job.name,
        # k8s.namespace.name, k8s.cluster.name] (module.go ListJobs), response
        # list. Same workload name must NOT collapse across namespaces OR clusters;
        # the empty-cluster group (k8s.cluster.name label absent on the source pods)
        # must appear as its own row with real metrics, not be dropped. Single pod
        # per group => SpaceAggregationSum == Avg == seeded value. Fails on the
        # pre-cluster default (name+ns) — the three ns-x groups would collapse into
        # one summed row.
        pytest.param(
            {
                "fixture": "jobs_same_name_across_ns_and_clusters.jsonl",
                "group_by": None,
                "filter": "k8s.job.name = 'dup-job'",
                "group_meta_keys": ["k8s.job.name", "k8s.namespace.name", "k8s.cluster.name"],
                "expected_type": "list",
                "groups": {
                    ("dup-job", "ns-x", "cluster-a"): {
                        "jobName": "dup-job",
                        "jobCPU": 0.3,
                        "jobCPURequest": 0.6,
                        "jobCPULimit": 0.7,
                        "jobMemory": 100000000.0,
                        "jobMemoryRequest": 0.6,
                        "jobMemoryLimit": 0.7,
                        "desiredSuccessfulPods": 2,
                        "activePods": 2,
                        "failedPods": 0,
                        "successfulPods": 0,
                        "podCountsByPhase": _phase(running=1),
                    },
                    ("dup-job", "ns-y", "cluster-a"): {
                        "jobName": "dup-job",
                        "jobCPU": 0.9,
                        "jobCPURequest": 0.2,
                        "jobCPULimit": 0.3,
                        "jobMemory": 500000000.0,
                        "jobMemoryRequest": 0.2,
                        "jobMemoryLimit": 0.3,
                        "desiredSuccessfulPods": 3,
                        "activePods": 1,
                        "failedPods": 1,
                        "successfulPods": 1,
                        "podCountsByPhase": _phase(failed=1),
                    },
                    ("dup-job", "ns-x", "cluster-b"): {
                        "jobName": "dup-job",
                        "jobCPU": 0.5,
                        "jobCPURequest": 0.4,
                        "jobCPULimit": 0.5,
                        "jobMemory": 300000000.0,
                        "jobMemoryRequest": 0.4,
                        "jobMemoryLimit": 0.5,
                        "desiredSuccessfulPods": 4,
                        "activePods": 2,
                        "failedPods": 1,
                        "successfulPods": 1,
                        "podCountsByPhase": _phase(running=1),
                    },
                    # empty-cluster group: k8s.cluster.name label absent on the source pods.
                    ("dup-job", "ns-x", ""): {
                        "jobName": "dup-job",
                        "jobCPU": 0.1,
                        "jobCPURequest": 0.1,
                        "jobCPULimit": 0.1,
                        "jobMemory": 200000000.0,
                        "jobMemoryRequest": 0.1,
                        "jobMemoryLimit": 0.1,
                        "desiredSuccessfulPods": 1,
                        "activePods": 1,
                        "failedPods": 0,
                        "successfulPods": 0,
                        "podCountsByPhase": _phase(pending=1),
                    },
                },
            },
            id="default_disambiguates_ns_and_cluster",
        ),
    ],
)
def test_jobs_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    scenario: dict,
) -> None:
    """groupBy determines row identity. Explicit groupBy returns one grouped_list
    record per distinct group (jobName populated only when grouping by k8s.job.name;
    jobs.go:28-31). With no groupBy the default is [k8s.job.name, k8s.namespace.name]
    (module.go ListJobs), so same-named jobs across namespaces stay as separate,
    un-collapsed list rows. meta always surfaces the grouping key(s)."""
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


def test_jobs_pagination(
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
            get_testdata_file_path("inframonitoring/jobs_pagination.jsonl"),
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
                "filter": {"expression": "k8s.job.name CONTAINS 'page-'"},
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        seen_totals.add(data["total"])
        expected_len = max(0, min(limit, K - offset))
        assert len(data["records"]) == expected_len, f"offset={offset}: expected {expected_len}, got {len(data['records'])}"
        seen_names.extend(r["jobName"] for r in data["records"])

    assert seen_totals == {K}
    assert len(seen_names) == K
    assert set(seen_names) == {f"page-job-{i}" for i in range(1, K + 1)}


# orderBy keys per jobs_constants.go (snake_case request keys, camelCase
# response fields). k8s.job.name sorts via the metadata-name branch
# (PaginateMetadataByName) and is only allowed when groupBy is empty.
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
        pytest.param("k8s.job.name", "jobName", id="job_name"),
    ],
)
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_jobs_orderby(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
            get_testdata_file_path("inframonitoring/jobs_orderby.jsonl"),
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
            # Guards against jobs seeded by other tests in the shared backend.
            "filter": {"expression": "k8s.job.name CONTAINS 'order-'"},
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
