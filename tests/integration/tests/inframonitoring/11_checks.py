"""Integration tests for the v2 infra-monitoring checks endpoint.

GET /api/v2/infra_monitoring/checks?type=<t> reports per-tab readiness:
for each collector component it lists which required/optional metrics and
required attributes are present vs missing. `ready` is true iff every missing
list is empty (optional gaps DO block).

Presence is checked against distributed_metadata with NO time window
(pkg/modules/inframonitoring/implinframonitoring/helpers.go:423,:479): a metric
is present iff it was ever ingested; an attribute is present iff it appears as a
label on any of that type's spec metrics. So seeding here is purely "make these
(metric, label) rows exist" — no start/end, no value math. insert_metrics is
function-scoped and truncates metadata on teardown, so (serial suite) each test
sees only its own seeds.

SPECS mirrors pkg/modules/inframonitoring/implinframonitoring/checks_constants.go
and is the contract lock: if a Go spec changes, the matching assertion fails.
"""

from datetime import UTC, datetime
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

ENDPOINT = "/api/v2/infra_monitoring/checks"

# Component names (checks_constants.go:9-15) + their type + docs link.
HMR = "hostmetricsreceiver"
KSR = "kubeletstatsreceiver"
KCR = "k8sclusterreceiver"
RDP = "resourcedetectionprocessor"
KAP = "k8sattributesprocessor"

COMPONENT_TYPE = {HMR: "receiver", KSR: "receiver", KCR: "receiver", RDP: "processor", KAP: "processor"}

_PODS_OPT = [
    "k8s.pod.cpu_request_utilization",
    "k8s.pod.cpu_limit_utilization",
    "k8s.pod.memory_request_utilization",
    "k8s.pod.memory_limit_utilization",
]

# Default-off pod-status metrics (k8sclusterreceiver), optional on every tab
# that surfaces pod status counts.
_POD_STATUS_OPT = [
    "k8s.pod.status_reason",
    "k8s.container.status.reason",
]

# Mirror of checkSpecs: type -> {default|optional: {component: [metrics]}, attrs: {component: [attrs]}}.
SPECS = {
    "hosts": {
        "default": {HMR: ["system.cpu.time", "system.memory.usage", "system.cpu.load_average.15m", "system.filesystem.usage"]},
        "optional": {},
        "attrs": {RDP: ["host.name"]},
    },
    "processes": {
        "default": {HMR: ["process.cpu.time", "process.memory.usage"]},
        "optional": {},
        "attrs": {HMR: ["process.pid"]},
    },
    "pods": {
        "default": {KSR: ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"], KCR: ["k8s.pod.phase", "k8s.container.restarts"]},
        "optional": {KSR: list(_PODS_OPT), KCR: ["k8s.pod.status_reason", "k8s.container.status.reason"]},
        "attrs": {KAP: ["k8s.pod.uid"]},
    },
    "nodes": {
        "default": {
            KSR: ["k8s.node.cpu.usage", "k8s.node.memory.working_set"],
            KCR: ["k8s.node.allocatable_cpu", "k8s.node.allocatable_memory", "k8s.node.condition_ready", "k8s.pod.phase"],
        },
        "optional": {KCR: list(_POD_STATUS_OPT)},
        "attrs": {KAP: ["k8s.node.name"]},
    },
    "deployments": {
        "default": {KSR: ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"], KCR: ["k8s.pod.phase", "k8s.deployment.desired", "k8s.deployment.available"]},
        "optional": {KSR: list(_PODS_OPT), KCR: list(_POD_STATUS_OPT)},
        "attrs": {KAP: ["k8s.deployment.name", "k8s.namespace.name"], RDP: ["k8s.cluster.name"]},
    },
    "daemonsets": {
        "default": {KSR: ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"], KCR: ["k8s.pod.phase", "k8s.daemonset.desired_scheduled_nodes", "k8s.daemonset.current_scheduled_nodes", "k8s.daemonset.ready_nodes", "k8s.daemonset.misscheduled_nodes"]},
        "optional": {KSR: list(_PODS_OPT), KCR: list(_POD_STATUS_OPT)},
        "attrs": {KAP: ["k8s.daemonset.name", "k8s.namespace.name"], RDP: ["k8s.cluster.name"]},
    },
    "statefulsets": {
        "default": {KSR: ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"], KCR: ["k8s.pod.phase", "k8s.statefulset.desired_pods", "k8s.statefulset.current_pods"]},
        "optional": {KSR: list(_PODS_OPT), KCR: list(_POD_STATUS_OPT)},
        "attrs": {KAP: ["k8s.statefulset.name", "k8s.namespace.name"], RDP: ["k8s.cluster.name"]},
    },
    "jobs": {
        "default": {KSR: ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"], KCR: ["k8s.pod.phase", "k8s.job.desired_successful_pods", "k8s.job.active_pods", "k8s.job.failed_pods", "k8s.job.successful_pods"]},
        "optional": {KSR: list(_PODS_OPT), KCR: list(_POD_STATUS_OPT)},
        "attrs": {KAP: ["k8s.job.name", "k8s.namespace.name"], RDP: ["k8s.cluster.name"]},
    },
    "namespaces": {
        "default": {KSR: ["k8s.pod.cpu.usage", "k8s.pod.memory.working_set"], KCR: ["k8s.pod.phase"]},
        "optional": {KCR: list(_POD_STATUS_OPT)},
        "attrs": {KAP: ["k8s.namespace.name"], RDP: ["k8s.cluster.name"]},
    },
    "clusters": {
        "default": {KSR: ["k8s.node.cpu.usage", "k8s.node.memory.working_set"], KCR: ["k8s.node.allocatable_cpu", "k8s.node.allocatable_memory", "k8s.node.condition_ready", "k8s.pod.phase"]},
        "optional": {KCR: list(_POD_STATUS_OPT)},
        "attrs": {RDP: ["k8s.cluster.name"]},
    },
    "volumes": {
        "default": {KSR: ["k8s.volume.available", "k8s.volume.capacity", "k8s.volume.inodes", "k8s.volume.inodes.free", "k8s.volume.inodes.used"]},
        "optional": {},
        "attrs": {KAP: ["k8s.persistentvolumeclaim.name", "k8s.namespace.name"], RDP: ["k8s.cluster.name"]},
    },
    "kube_containers": {
        "default": {KSR: ["container.cpu.usage", "container.memory.working_set"], KCR: ["k8s.container.restarts", "k8s.container.ready"]},
        "optional": {
            KSR: ["k8s.container.cpu_request_utilization", "k8s.container.cpu_limit_utilization", "k8s.container.memory_request_utilization", "k8s.container.memory_limit_utilization"],
            KCR: ["k8s.container.status.state", "k8s.container.status.reason"],
        },
        "attrs": {KAP: ["k8s.pod.uid", "k8s.container.name"]},
    },
}

ALL_TYPES = list(SPECS.keys())


# --- helpers ---


def _all(d: dict) -> list:
    """Flatten a {component: [items]} map to a flat list."""
    return [x for items in d.values() for x in items]


def _all_metrics(t: str) -> list:
    return _all(SPECS[t]["default"]) + _all(SPECS[t]["optional"])


def _attr_labels(t: str, drop: str | None = None) -> dict:
    """Labels carrying every required attr (so they resolve present), minus `drop`."""
    return {a: f"v-{a}" for a in _all(SPECS[t]["attrs"]) if a != drop}


# Marker label so every seeded metric registers in distributed_metadata even when
# `labels` is empty (insert_metrics writes a metadata row per label). Non-spec, so it
# is never counted as a present required attribute.
_SEED_MARKER = {"test.seed.marker": "1"}


def _seed(insert_metrics, metric_names: list, labels: dict) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name=m, labels={**_SEED_MARKER, **labels}, timestamp=now, value=1.0) for m in metric_names])


def _request(signoz: types.SigNoz, token: str, type_: str | None):
    params = {} if type_ is None else {"type": type_}
    return requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params=params,
        timeout=5,
    )


def _grouped(entries: list, field: str) -> dict:
    """{component_name: set(items)} from a present/missing entry list; also asserts
    each entry's associatedComponent.type matches the known component type."""
    out: dict = {}
    for e in entries:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        out.setdefault(comp["name"], set()).update(e[field])
    return out


def _exp(d: dict) -> dict:
    return {comp: set(items) for comp, items in d.items()}


def _check_missing_entries(entries: list) -> None:
    """Every missing entry carries a non-empty message + a non-empty docs link
    (exact link not asserted — links are subject to change)."""
    for e in entries:
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"


# Parametrize cases derived from SPECS.
_DEFAULT_CASES = [  # one representative dropped default metric per type
    pytest.param(t, comp, ms[0], id=f"{t}-{ms[0]}") for t in ALL_TYPES for comp, ms in [next(iter(SPECS[t]["default"].items()))]
]
_OPTIONAL_CASES = [  # types that have optional metrics
    pytest.param(t, comp, ms[0], id=f"{t}-{ms[0]}") for t in ALL_TYPES for comp, ms in SPECS[t]["optional"].items() if ms
]
_ATTR_CASES = [pytest.param(t, comp, a, id=f"{t}-{a}") for t in ALL_TYPES for comp, attrs in SPECS[t]["attrs"].items() for a in attrs]


@pytest.mark.parametrize(
    "type_,err_substr",
    [
        pytest.param(None, "type is required", id="missing_type"),
        pytest.param("foo", "invalid type", id="invalid_type"),
    ],
)
def test_checks_validation_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    type_,
    err_substr: str,
) -> None:
    """Missing/unknown `type` query param → 400 invalid_input."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = _request(signoz, token, type_)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    error = response.json()["error"]
    assert error["code"] == "invalid_input"


@pytest.mark.parametrize("type_", ALL_TYPES)
def test_checks_empty_backend(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,  # noqa: ARG001  ensures metadata is truncated around this test
    type_: str,
) -> None:
    """No data ingested → not ready; every default metric + required attr reported
    missing (bucketed by component, with message + docs link); present lists empty."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    data = _request(signoz, token, type_).json()["data"]

    assert data["ready"] is False
    assert data["presentDefaultEnabledMetrics"] == []
    assert data["presentOptionalMetrics"] == []
    assert data["presentRequiredAttributes"] == []
    assert _grouped(data["missingDefaultEnabledMetrics"], "metrics") == _exp(SPECS[type_]["default"])
    assert _grouped(data["missingOptionalMetrics"], "metrics") == _exp(SPECS[type_]["optional"])
    assert _grouped(data["missingRequiredAttributes"], "attributes") == _exp(SPECS[type_]["attrs"])
    _check_missing_entries(data["missingDefaultEnabledMetrics"])
    _check_missing_entries(data["missingOptionalMetrics"])
    _check_missing_entries(data["missingRequiredAttributes"])


@pytest.mark.parametrize("type_", ALL_TYPES)
def test_checks_all_present_ready(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    type_: str,
) -> None:
    """Every default+optional metric seeded carrying all required attrs → ready;
    present buckets exactly match the spec, all missing lists empty."""
    _seed(insert_metrics, _all_metrics(type_), _attr_labels(type_))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    data = _request(signoz, token, type_).json()["data"]

    assert data["type"] == type_
    assert data["ready"] is True
    assert data["missingDefaultEnabledMetrics"] == []
    assert data["missingOptionalMetrics"] == []
    assert data["missingRequiredAttributes"] == []
    assert _grouped(data["presentDefaultEnabledMetrics"], "metrics") == _exp(SPECS[type_]["default"])
    assert _grouped(data["presentOptionalMetrics"], "metrics") == _exp(SPECS[type_]["optional"])
    assert _grouped(data["presentRequiredAttributes"], "attributes") == _exp(SPECS[type_]["attrs"])


@pytest.mark.parametrize("type_,component,metric", _DEFAULT_CASES)
def test_checks_missing_default_metric(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    type_: str,
    component: str,
    metric: str,
) -> None:
    """One default metric never ingested (everything else present) → that metric is
    in missingDefaultEnabledMetrics under its component; not ready."""
    seed = [m for m in _all_metrics(type_) if m != metric]
    _seed(insert_metrics, seed, _attr_labels(type_))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    data = _request(signoz, token, type_).json()["data"]

    assert data["ready"] is False
    assert metric in _grouped(data["missingDefaultEnabledMetrics"], "metrics").get(component, set())
    assert data["missingOptionalMetrics"] == []
    assert data["missingRequiredAttributes"] == []
    _check_missing_entries(data["missingDefaultEnabledMetrics"])


@pytest.mark.parametrize("type_,component,metric", _OPTIONAL_CASES)
def test_checks_missing_optional_metric(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    type_: str,
    component: str,
    metric: str,
) -> None:
    """One optional metric missing → reported in missingOptionalMetrics and (locked
    decision) NOT ready, even though all default metrics + attrs are present."""
    seed = [m for m in _all_metrics(type_) if m != metric]
    _seed(insert_metrics, seed, _attr_labels(type_))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    data = _request(signoz, token, type_).json()["data"]

    assert data["ready"] is False
    assert metric in _grouped(data["missingOptionalMetrics"], "metrics").get(component, set())
    assert data["missingDefaultEnabledMetrics"] == []
    assert data["missingRequiredAttributes"] == []
    _check_missing_entries(data["missingOptionalMetrics"])


@pytest.mark.parametrize("type_,component,attr", _ATTR_CASES)
def test_checks_missing_required_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token,
    insert_metrics,
    type_: str,
    component: str,
    attr: str,
) -> None:
    """All metrics present but one required attr never seen on any of them → that
    attr is in missingRequiredAttributes under its component; not ready."""
    _seed(insert_metrics, _all_metrics(type_), _attr_labels(type_, drop=attr))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    data = _request(signoz, token, type_).json()["data"]

    assert data["ready"] is False
    assert attr in _grouped(data["missingRequiredAttributes"], "attributes").get(component, set())
    assert data["missingDefaultEnabledMetrics"] == []
    assert data["missingOptionalMetrics"] == []
    _check_missing_entries(data["missingRequiredAttributes"])
