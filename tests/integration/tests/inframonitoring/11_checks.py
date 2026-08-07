from datetime import UTC, datetime
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metrics import Metrics

# GET /api/v2/infra_monitoring/checks?type=<t> reports per-tab readiness: for each
# collector component it lists which required/optional metrics and required
# attributes are present vs missing. `ready` is true iff every missing list is
# empty (optional gaps DO block).
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
# Mirrors pkg/modules/inframonitoring/implinframonitoring/checks_constants.go and is
# the contract lock: if a Go spec changes, the matching assertion fails.
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

# Marker label so every seeded metric registers in distributed_metadata even when
# `labels` is empty (insert_metrics writes a metadata row per label). Non-spec, so it
# is never counted as a present required attribute.
#
# Presence is checked against distributed_metadata with NO time window
# (pkg/modules/inframonitoring/implinframonitoring/helpers.go:423,:479): a metric is
# present iff it was ever ingested; an attribute is present iff it appears as a label
# on any of that type's spec metrics. So seeding is purely "make these (metric, label)
# rows exist" — no start/end, no value math. insert_metrics is function-scoped and
# truncates metadata on teardown, so (serial suite) each test sees only its own seeds.
_SEED_MARKER = {"test.seed.marker": "1"}


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
    response = requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params={} if type_ is None else {"type": type_},
        timeout=5,
    )

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
    response = requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params={"type": type_},
        timeout=5,
    )
    data = response.json()["data"]

    assert data["ready"] is False
    assert data["presentDefaultEnabledMetrics"] == []
    assert data["presentOptionalMetrics"] == []
    assert data["presentRequiredAttributes"] == []

    # Every missing entry carries a non-empty message + a non-empty docs link
    # (exact link not asserted — links are subject to change).
    missing_default: dict = {}
    for e in data["missingDefaultEnabledMetrics"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"
        missing_default.setdefault(comp["name"], set()).update(e["metrics"])
    assert missing_default == {comp: set(ms) for comp, ms in SPECS[type_]["default"].items()}

    missing_optional: dict = {}
    for e in data["missingOptionalMetrics"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"
        missing_optional.setdefault(comp["name"], set()).update(e["metrics"])
    assert missing_optional == {comp: set(ms) for comp, ms in SPECS[type_]["optional"].items()}

    missing_attrs: dict = {}
    for e in data["missingRequiredAttributes"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"
        missing_attrs.setdefault(comp["name"], set()).update(e["attributes"])
    assert missing_attrs == {comp: set(attrs) for comp, attrs in SPECS[type_]["attrs"].items()}


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
    # Labels carrying every required attr (so they resolve present).
    labels = {a: f"v-{a}" for attrs in SPECS[type_]["attrs"].values() for a in attrs}
    metric_names = [m for ms in SPECS[type_]["default"].values() for m in ms] + [m for ms in SPECS[type_]["optional"].values() for m in ms]
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name=m, labels={**_SEED_MARKER, **labels}, timestamp=now, value=1.0) for m in metric_names])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params={"type": type_},
        timeout=5,
    )
    data = response.json()["data"]

    assert data["type"] == type_
    assert data["ready"] is True
    assert data["missingDefaultEnabledMetrics"] == []
    assert data["missingOptionalMetrics"] == []
    assert data["missingRequiredAttributes"] == []

    present_default: dict = {}
    for e in data["presentDefaultEnabledMetrics"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        present_default.setdefault(comp["name"], set()).update(e["metrics"])
    assert present_default == {comp: set(ms) for comp, ms in SPECS[type_]["default"].items()}

    present_optional: dict = {}
    for e in data["presentOptionalMetrics"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        present_optional.setdefault(comp["name"], set()).update(e["metrics"])
    assert present_optional == {comp: set(ms) for comp, ms in SPECS[type_]["optional"].items()}

    present_attrs: dict = {}
    for e in data["presentRequiredAttributes"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        present_attrs.setdefault(comp["name"], set()).update(e["attributes"])
    assert present_attrs == {comp: set(attrs) for comp, attrs in SPECS[type_]["attrs"].items()}


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
    labels = {a: f"v-{a}" for attrs in SPECS[type_]["attrs"].values() for a in attrs}
    all_metrics = [m for ms in SPECS[type_]["default"].values() for m in ms] + [m for ms in SPECS[type_]["optional"].values() for m in ms]
    seed = [m for m in all_metrics if m != metric]
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name=m, labels={**_SEED_MARKER, **labels}, timestamp=now, value=1.0) for m in seed])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params={"type": type_},
        timeout=5,
    )
    data = response.json()["data"]

    assert data["ready"] is False

    missing_default: dict = {}
    for e in data["missingDefaultEnabledMetrics"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"
        missing_default.setdefault(comp["name"], set()).update(e["metrics"])
    assert metric in missing_default.get(component, set())
    assert data["missingOptionalMetrics"] == []
    assert data["missingRequiredAttributes"] == []


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
    labels = {a: f"v-{a}" for attrs in SPECS[type_]["attrs"].values() for a in attrs}
    all_metrics = [m for ms in SPECS[type_]["default"].values() for m in ms] + [m for ms in SPECS[type_]["optional"].values() for m in ms]
    seed = [m for m in all_metrics if m != metric]
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name=m, labels={**_SEED_MARKER, **labels}, timestamp=now, value=1.0) for m in seed])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params={"type": type_},
        timeout=5,
    )
    data = response.json()["data"]

    assert data["ready"] is False

    missing_optional: dict = {}
    for e in data["missingOptionalMetrics"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"
        missing_optional.setdefault(comp["name"], set()).update(e["metrics"])
    assert metric in missing_optional.get(component, set())
    assert data["missingDefaultEnabledMetrics"] == []
    assert data["missingRequiredAttributes"] == []


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
    labels = {a: f"v-{a}" for attrs in SPECS[type_]["attrs"].values() for a in attrs if a != attr}
    metric_names = [m for ms in SPECS[type_]["default"].values() for m in ms] + [m for ms in SPECS[type_]["optional"].values() for m in ms]
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_metrics([Metrics(metric_name=m, labels={**_SEED_MARKER, **labels}, timestamp=now, value=1.0) for m in metric_names])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        headers={"authorization": f"Bearer {token}"},
        params={"type": type_},
        timeout=5,
    )
    data = response.json()["data"]

    assert data["ready"] is False

    missing_attrs: dict = {}
    for e in data["missingRequiredAttributes"]:
        comp = e["associatedComponent"]
        assert comp["type"] == COMPONENT_TYPE[comp["name"]], f"wrong type for {comp!r}"
        assert e["message"], f"empty message: {e!r}"
        assert e["documentationLink"], f"empty doc link: {e!r}"
        missing_attrs.setdefault(comp["name"], set()).update(e["attributes"])
    assert attr in missing_attrs.get(component, set())
    assert data["missingDefaultEnabledMetrics"] == []
    assert data["missingOptionalMetrics"] == []
