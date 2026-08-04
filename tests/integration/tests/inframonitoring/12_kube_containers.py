"""Integration tests for the v2 infra-monitoring kube_containers endpoint."""

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

ENDPOINT = "/api/v2/infra_monitoring/kube_containers"


def test_kube_containers_accuracy(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Exact per-container usage/utilization values against precomputed expected
    output. (Status metrics are intentionally absent here, so status is no_data
    and a status warning is surfaced — this test asserts only the numeric fields.)"""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_value_accuracy.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )
    with open(
        get_testdata_file_path("inframonitoring/kube_containers_value_accuracy_expected.json"),
        encoding="utf-8",
    ) as f:
        expected = json.load(f)
    exp_by_name = {r["podName"]: r for r in expected["records"]}

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "filter": {"expression": "k8s.namespace.name = 'ns-acc'"},
            "limit": 50,
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["total"] == len(expected["records"])
    assert {r["meta"]["k8s.pod.name"] for r in data["records"]} == set(exp_by_name.keys())

    for record in data["records"]:
        exp = exp_by_name[record["meta"]["k8s.pod.name"]]
        for field in (
            "cpu",
            "cpuRequestUtilization",
            "cpuLimitUtilization",
            "memory",
            "memoryRequestUtilization",
            "memoryLimitUtilization",
        ):
            assert compare_values(record[field], exp[field], 1e-9), f"{record['meta']['k8s.pod.name']}.{field}: got {record[field]}, expected {exp[field]}"


def test_kube_containers_status_health_and_base_set(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """List mode: per-container status / ready / restarts derived from the
    k8s_cluster health metrics, AND the base-set union — containers with only
    health metrics and NO kubeletstats usage (ImagePullBackOff / Completed /
    OOMKilled) still appear, with cpu = -1 sentinel."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )
    # pod name -> (status, ready, restarts, has_usage)
    expected = {
        "crun": ("running", "ready", 0, True),
        "cnr": ("running", "not_ready", 0, True),
        "cclo": ("crashloopbackoff", "not_ready", 5, True),
        "cimg": ("imagepullbackoff", "not_ready", 0, False),
        "ccomp": ("completed", "not_ready", 0, False),
        "coom": ("oomkilled", "not_ready", 3, False),
    }

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
    by_pod = {r["meta"]["k8s.pod.name"]: r for r in data["records"]}

    assert set(expected).issubset(set(by_pod)), f"missing containers: {set(expected) - set(by_pod)}"
    for pod, (status, ready, restarts, has_usage) in expected.items():
        rec = by_pod[pod]
        assert rec["status"] == status, f"{pod}.status: got {rec['status']}, expected {status}"
        assert rec["ready"] == ready, f"{pod}.ready: got {rec['ready']}, expected {ready}"
        assert rec["restarts"] == restarts, f"{pod}.restarts: got {rec['restarts']}, expected {restarts}"
        if has_usage:
            assert rec["cpu"] != -1, f"{pod}: expected cpu populated, got {rec['cpu']}"
        else:
            assert rec["cpu"] == -1, f"{pod}: expected cpu -1 sentinel (base-set-only), got {rec['cpu']}"

    # filterByContainerStatus (secondary filter): matching status keeps the
    # container; a mismatched status filters it out. Wire value is
    # case-insensitive (valuer lowercases): "running" == "Running".
    crun_running = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.pod.name = 'crun'", "filterByContainerStatus": ["running"]},
        },
        timeout=5,
    )
    assert crun_running.status_code == HTTPStatus.OK, crun_running.text
    cr = crun_running.json()["data"]
    assert cr["total"] == 1
    assert cr["records"][0]["meta"]["k8s.pod.name"] == "crun"

    cclo_clbo = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.pod.name = 'cclo'", "filterByContainerStatus": ["CrashLoopBackOff"]},
        },
        timeout=5,
    )
    assert cclo_clbo.status_code == HTTPStatus.OK, cclo_clbo.text
    assert cclo_clbo.json()["data"]["total"] == 1

    # crun is Running, not CrashLoopBackOff -> filtered out.
    crun_mismatch = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.pod.name = 'crun'", "filterByContainerStatus": ["CrashLoopBackOff"]},
        },
        timeout=5,
    )
    assert crun_mismatch.status_code == HTTPStatus.OK, crun_mismatch.text
    assert crun_mismatch.json()["data"]["total"] == 0

    # Multi-select is OR: a set containing the container's status keeps it; a set
    # with none of its statuses drops it.
    crun_or_keep = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.pod.name = 'crun'", "filterByContainerStatus": ["running", "CrashLoopBackOff"]},
        },
        timeout=5,
    )
    assert crun_or_keep.status_code == HTTPStatus.OK, crun_or_keep.text
    assert crun_or_keep.json()["data"]["total"] == 1

    crun_all_mismatch = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"expression": "k8s.pod.name = 'crun'", "filterByContainerStatus": ["CrashLoopBackOff", "OOMKilled"]},
        },
        timeout=5,
    )
    assert crun_all_mismatch.status_code == HTTPStatus.OK, crun_all_mismatch.text
    assert crun_all_mismatch.json()["data"]["total"] == 0


def test_kube_containers_status_counts_grouped_mode(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Grouped mode (groupBy namespace): per-group counts of distinct containers
    by status and readiness."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_dataset.jsonl"),
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
            "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "limit": 50,
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["type"] == "grouped_list"
    by_ns = {r["meta"]["k8s.namespace.name"]: r for r in data["records"]}

    assert {"ns-a", "ns-b"}.issubset(set(by_ns))
    ns_a = by_ns["ns-a"]["containerCountsByStatus"]
    assert ns_a["running"] == 2
    assert ns_a["crashLoopBackOff"] == 1
    assert ns_a["imagePullBackOff"] == 1
    assert by_ns["ns-a"]["containerCountsByReady"] == {"ready": 1, "notReady": 3}

    ns_b = by_ns["ns-b"]["containerCountsByStatus"]
    assert ns_b["completed"] == 1
    assert ns_b["oomKilled"] == 1
    assert by_ns["ns-b"]["containerCountsByReady"] == {"ready": 0, "notReady": 2}

    # filterByContainerStatus in grouped mode: keep only groups with a matching
    # container, only that bucket populated; a group with none is dropped.
    running = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "limit": 50,
            "filter": {"filterByContainerStatus": ["running"]},
        },
        timeout=5,
    )
    assert running.status_code == HTTPStatus.OK, running.text
    rdata = running.json()["data"]
    # ns-a has running containers, ns-b has none -> only ns-a.
    assert {r["meta"]["k8s.namespace.name"] for r in rdata["records"]} == {"ns-a"}
    assert rdata["records"][0]["containerCountsByStatus"]["running"] == 2

    oom = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "limit": 50,
            "filter": {"filterByContainerStatus": ["OOMKilled"]},
        },
        timeout=5,
    )
    assert oom.status_code == HTTPStatus.OK, oom.text
    odata = oom.json()["data"]
    assert {r["meta"]["k8s.namespace.name"] for r in odata["records"]} == {"ns-b"}
    assert odata["records"][0]["containerCountsByStatus"]["oomKilled"] == 1

    # A status absent from every group -> empty page.
    absent = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "limit": 50,
            "filter": {"filterByContainerStatus": ["Terminated"]},
        },
        timeout=5,
    )
    assert absent.status_code == HTTPStatus.OK, absent.text
    assert absent.json()["data"]["total"] == 0

    # Multi-select is OR: keeps every group with any matching container (union
    # across groups); a fully-absent set drops all.
    union = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "limit": 50,
            "filter": {"filterByContainerStatus": ["running", "OOMKilled"]},
        },
        timeout=5,
    )
    assert union.status_code == HTTPStatus.OK, union.text
    udata = union.json()["data"]
    u_by_ns = {r["meta"]["k8s.namespace.name"]: r for r in udata["records"]}
    assert set(u_by_ns) == {"ns-a", "ns-b"}
    assert u_by_ns["ns-a"]["containerCountsByStatus"]["running"] == 2
    assert u_by_ns["ns-b"]["containerCountsByStatus"]["oomKilled"] == 1

    absent_multi = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            "limit": 50,
            "filter": {"filterByContainerStatus": ["Terminated", "Waiting"]},
        },
        timeout=5,
    )
    assert absent_multi.status_code == HTTPStatus.OK, absent_multi.text
    assert absent_multi.json()["data"]["total"] == 0


def test_kube_containers_status_recency(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Status derivation is by recency, not priority. A container that
    CrashLoopBackOff'd earlier in the window (restarts=5) but is Running now
    (state flipped to running, reason series flipped to 0) must report the
    CURRENT status 'running' — while restarts=5 preserves the crash history.
    A priority/argMax-on-reason bug would wrongly surface 'crashloopbackoff'."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_recency.jsonl"),
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
    by_pod = {r["meta"]["k8s.pod.name"]: r for r in data["records"]}
    assert "crec" in by_pod, f"recency container missing: {list(by_pod)}"
    rec = by_pod["crec"]
    assert rec["status"] == "running", f"recency: expected current status running, got {rec['status']}"
    assert rec["ready"] == "ready", f"recency: expected ready, got {rec['ready']}"
    assert rec["restarts"] == 5, f"recency: expected restarts=5 (history preserved), got {rec['restarts']}"


def test_kube_containers_status_state_only_fallback(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """When a container has a state but NO active reason, display status falls
    through to the state itself: state='terminated' -> 'terminated',
    state='waiting' -> 'waiting'. Exercises the state-fallback branches of the
    multiIf and the container_reason LEFT-JOIN miss (containers.go:410)."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_state_fallback.jsonl"),
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
    by_pod = {r["meta"]["k8s.pod.name"]: r for r in data["records"]}
    assert {"cterm", "cwait"}.issubset(set(by_pod)), f"fallback containers missing: {list(by_pod)}"
    assert by_pod["cterm"]["status"] == "terminated", f"terminated fallback: got {by_pod['cterm']['status']}"
    assert by_pod["cwait"]["status"] == "waiting", f"waiting fallback: got {by_pod['cwait']['status']}"


def test_kube_containers_status_warning_missing_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Status metrics (k8s.container.status.state/reason) never ingested: the
    container still appears (usage present), status gates to 'no_data' with a
    non-blocking warning naming the missing metrics, while the independent
    ready / restarts health signals are still computed correctly."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_missing_status.jsonl"),
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
    body = response.json()
    data = body["data"]
    by_pod = {r["meta"]["k8s.pod.name"]: r for r in data["records"]}
    assert "cwarn" in by_pod, f"container missing: {list(by_pod)}"
    rec = by_pod["cwarn"]
    assert rec["status"] == "no_data", f"expected status no_data (metrics disabled), got {rec['status']}"
    assert rec["ready"] == "ready", f"ready should still compute, got {rec['ready']}"
    assert rec["restarts"] == 2, f"restarts should still compute, got {rec['restarts']}"
    assert rec["cpu"] != -1, f"usage present, cpu should be populated, got {rec['cpu']}"

    warnings = get_all_warnings(body)
    assert any("status.state" in w["message"] and "status.reason" in w["message"] for w in warnings), f"status warning naming the missing metrics not surfaced: {warnings!r}"

    # filterByContainerStatus + missing status metrics: the up-front gate returns
    # the warning and an empty page (Total 0) rather than silently filtering
    # everything out.
    filtered = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        json={
            "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "limit": 50,
            "filter": {"filterByContainerStatus": ["Running"]},
        },
        timeout=5,
    )
    assert filtered.status_code == HTTPStatus.OK, filtered.text
    fdata = filtered.json()["data"]
    assert fdata["total"] == 0
    assert fdata["records"] == []
    # The gate warning on the filtered path is surfaced at the top-level
    # warning.message (the up-front early return sets it directly); collect both
    # that and any nested warnings.
    fwarn = fdata.get("warning") or {}
    fmsgs = ([fwarn["message"]] if fwarn.get("message") else []) + [w["message"] for w in fwarn.get("warnings", [])]
    assert any("status.state" in m and "status.reason" in m for m in fmsgs), f"gate warning missing on filtered call: {fmsgs!r}"


def test_kube_containers_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """Filter expression narrows the result set by resource attribute."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def pods_for(expr: str) -> set[str]:
        response = requests.post(
            signoz.self.host_configs["8080"].get(ENDPOINT),
            headers={"authorization": f"Bearer {token}"},
            json={
                "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                "end": int(now.timestamp() * 1000),
                "filter": {"expression": expr},
                "limit": 50,
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        data = response.json()["data"]
        pods = {r["meta"]["k8s.pod.name"] for r in data["records"]}
        assert data["total"] == len(pods)
        return pods

    assert pods_for("k8s.namespace.name = 'ns-a'") == {"crun", "cnr", "cclo", "cimg"}
    assert pods_for("k8s.namespace.name = 'ns-b'") == {"ccomp", "coom"}
    assert pods_for("k8s.pod.name = 'crun'") == {"crun"}


def test_kube_containers_orderby_and_pagination(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
) -> None:
    """orderBy cpu desc ranks usage containers by cpu (crun>cnr>cclo) with the
    usage-less base-set (cpu=-1) backfilled last; pagination walks the full set
    (total=6) in non-overlapping pages preserving that order."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics(
        Metrics.load_from_file(
            get_testdata_file_path("inframonitoring/kube_containers_dataset.jsonl"),
            base_time=now - timedelta(minutes=4),
        )
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def page(limit: int, offset: int) -> dict:
        response = requests.post(
            signoz.self.host_configs["8080"].get(ENDPOINT),
            headers={"authorization": f"Bearer {token}"},
            json={
                "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
                "end": int(now.timestamp() * 1000),
                "orderBy": {"key": {"name": "cpu"}, "direction": "desc"},
                "limit": limit,
                "offset": offset,
            },
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        return response.json()["data"]

    full = page(50, 0)
    assert full["total"] == 6
    order = [r["meta"]["k8s.pod.name"] for r in full["records"]]
    assert order[:3] == ["crun", "cnr", "cclo"], f"cpu-desc ranking wrong: {order}"
    assert set(order) == {"crun", "cnr", "cclo", "cimg", "ccomp", "coom"}

    # Paginate 2 at a time; pages must be disjoint, cover everything, keep order.
    seen: list[str] = []
    for off in (0, 2, 4):
        p = page(2, off)
        assert p["total"] == 6, f"total must stay 6 at offset {off}, got {p['total']}"
        pods = [r["meta"]["k8s.pod.name"] for r in p["records"]]
        assert len(pods) == 2, f"offset {off}: expected 2 records, got {pods}"
        seen.extend(pods)
    assert seen == order, f"paginated sequence {seen} != full-page order {order}"


@pytest.mark.parametrize(
    ("payload_override", "err_substr"),
    [
        pytest.param({"limit": 0}, "limit must be between", id="limit_zero"),
        pytest.param({"limit": 5001}, "limit must be between", id="limit_too_large"),
        pytest.param({"offset": -1}, "offset cannot be negative", id="offset_negative"),
        pytest.param(
            {"orderBy": {"key": {"name": "bogus"}, "direction": "desc"}},
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
                "orderBy": {"key": {"name": "k8s.container.name"}, "direction": "asc"},
                "groupBy": [{"name": "k8s.namespace.name", "fieldDataType": "string", "fieldContext": "resource"}],
            },
            "is only allowed when groupBy is empty",
            id="orderby_container_name_with_groupby",
        ),
        pytest.param(
            {"filter": {"filterByContainerStatus": ["bogus"]}},
            "invalid filter by container status",
            id="filter_by_container_status_invalid",
        ),
        pytest.param(
            {"filter": {"filterByContainerStatus": ["no_data"]}},
            "invalid filter by container status",
            id="filter_by_container_status_no_data",
        ),
    ],
)
def test_kube_containers_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    payload_override: dict,
    err_substr: str,
) -> None:
    """PostableContainers.Validate() rules reject with 400 + descriptive error."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    body: dict = {
        "start": int((now - timedelta(minutes=5)).timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "limit": 50,
    }
    body.update(payload_override)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(signoz.self.host_configs["8080"].get(ENDPOINT), headers={"authorization": f"Bearer {token}"}, json=body, timeout=5)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert err_substr.lower() in error["message"].lower(), f"expected {err_substr!r} in: {error['message']!r}"
