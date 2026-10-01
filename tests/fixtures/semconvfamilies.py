from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta

import pytest

from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

PREFIX = "semconv-fam"
CURRENT_KEY = "deployment.environment.name"
OLD_KEY = "deployment.environment"

# Tests compare identity sets filtered by PREFIX.
OLD = f"{PREFIX}-old"
NEW = f"{PREFIX}-new"
BOTH = f"{PREFIX}-both"  # current "staging" and old "production" - the conflict row
NEITHER = f"{PREFIX}-neither"

LABEL_METRIC = "semconv.fam.label.metric"
# A span-metrics metric, so the resource_ label layout of the span-metrics
# processor applies.
SPAN_METRIC = "signoz_calls_total"
OLD_NAME_METRIC = "k8s.pod.cpu.utilization"
CURRENT_NAME_METRIC = "k8s.pod.cpu.usage"

ROLLOUT_PREFIX = "semconv-rollout"
# (current, old, data type) for every attribute family the overlay enables
# beyond deployment.environment.name.
ROLLOUT_FAMILIES = [
    ("db.namespace", "db.name", "string"),
    ("db.operation.name", "db.operation", "string"),
    ("db.query.text", "db.statement", "string"),
    ("rpc.system.name", "rpc.system", "string"),
    ("service.peer.name", "peer.service", "string"),
    ("messaging.destination.name", "messaging.destination", "string"),
    ("messaging.operation.type", "messaging.operation", "string"),
    ("messaging.consumer.group.name", "messaging.kafka.consumer.group", "string"),
    ("messaging.client.id", "messaging.client_id", "string"),
    ("container.runtime.name", "container.runtime", "string"),
    ("code.file.path", "code.filepath", "string"),
    ("code.function.name", "code.function", "string"),
    ("code.line.number", "code.lineno", "float64"),
    ("http.request.method", "http.method", "string"),
    ("http.response.status_code", "http.status_code", "float64"),
    ("url.full", "http.url", "string"),
    ("url.scheme", "http.scheme", "string"),
    ("user_agent.original", "http.user_agent", "string"),
]
ROLLOUT_OLD = f"{ROLLOUT_PREFIX}-old"
ROLLOUT_NEW = f"{ROLLOUT_PREFIX}-new"
ROLLOUT_BOTH = f"{ROLLOUT_PREFIX}-both"  # current "match" and old "legacy" - the conflict row
ROLLOUT_OTHER = f"{ROLLOUT_PREFIX}-other"
ROLLOUT_NEITHER = f"{ROLLOUT_PREFIX}-neither"
# Numeric families store the same three identities as 200, 400 and 500.
ROLLOUT_VALUES = {"match": 200, "legacy": 400, "other": 500}

_ROWS = [
    (OLD, {OLD_KEY: "production"}, timedelta(seconds=4)),
    (NEW, {CURRENT_KEY: "production"}, timedelta(seconds=3)),
    (BOTH, {CURRENT_KEY: "staging", OLD_KEY: "production"}, timedelta(seconds=2)),
    (NEITHER, {}, timedelta(seconds=1)),
]


@pytest.fixture(name="family_fleet", scope="function")
def family_fleet(
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> Generator[datetime]:
    """Inserts one span and one log per identity and yields the base
    timestamp. The base aligns to the minute, so no row offset crosses a 60s
    time-series bucket boundary."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=1)
    insert_traces(
        [
            Traces(
                timestamp=now - offset,
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=identity,
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": identity, **family},
                attributes=dict(family),
            )
            for identity, family, offset in _ROWS
        ]
    )
    insert_logs(
        [
            Logs(
                timestamp=now - offset,
                body=identity,
                resources={"service.name": identity, **family},
                attributes=dict(family),
            )
            for identity, family, offset in _ROWS
        ]
    )
    yield now


@pytest.fixture(name="rollout_fleet", scope="function")
def rollout_fleet(insert_traces: Callable[[list[Traces]], None]) -> Generator[datetime]:
    """Inserts one span per identity carrying every rollout family under the
    old spelling, the current spelling, both, or neither, and yields the base
    timestamp."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=1)
    rows = [
        (ROLLOUT_OLD, {"old": "match"}, timedelta(seconds=5)),
        (ROLLOUT_NEW, {"current": "match"}, timedelta(seconds=4)),
        (ROLLOUT_BOTH, {"current": "match", "old": "legacy"}, timedelta(seconds=3)),
        (ROLLOUT_OTHER, {"old": "other"}, timedelta(seconds=2)),
        (ROLLOUT_NEITHER, {}, timedelta(seconds=1)),
    ]
    spans = []
    for identity, spellings, offset in rows:
        attributes: dict[str, str | int] = {}
        for current, old, data_type in ROLLOUT_FAMILIES:
            for spelling, value in spellings.items():
                key = current if spelling == "current" else old
                attributes[key] = value if data_type == "string" else ROLLOUT_VALUES[value]
        spans.append(
            Traces(
                timestamp=now - offset,
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=identity,
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": identity},
                attributes=attributes,
            )
        )
    insert_traces(spans)
    yield now


@pytest.fixture(name="metric_family_fleet", scope="function")
def metric_family_fleet(insert_metrics: Callable[[list[Metrics]], None]) -> Generator[datetime]:
    """Inserts the label and metric-name family series and yields the query
    end timestamp. Every series has a power-of-two value, so a missed member
    is a unique wrong sum."""
    now = datetime.now(tz=UTC)
    # The querier clamps very recent metric samples (flux interval), so the
    # fleet sits in the past.
    seeded = now - timedelta(minutes=10)
    gauge = {"temporality": "Unspecified", "type_": "Gauge", "is_monotonic": False}
    insert_metrics(
        [
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "staging"}, timestamp=seeded, value=1.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment": "production"}, timestamp=seeded, value=2.0, **gauge),
            Metrics(metric_name=SPAN_METRIC, labels={"resource_deployment.environment.name": "staging", "pod": "span-current"}, timestamp=seeded, value=4.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"region": "keyless"}, timestamp=seeded, value=8.0, **gauge),
            Metrics(metric_name=OLD_NAME_METRIC, labels={"pod": "a"}, timestamp=seeded, value=16.0, **gauge),
            Metrics(metric_name=CURRENT_NAME_METRIC, labels={"pod": "b"}, timestamp=seeded, value=32.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "staging", "deployment.environment": "production"}, timestamp=seeded, value=64.0, **gauge),
            Metrics(metric_name=SPAN_METRIC, labels={"resource_deployment.environment": "production", "pod": "span-old"}, timestamp=seeded, value=128.0, **gauge),
            Metrics(metric_name=SPAN_METRIC, labels={"deployment.environment": "production", "pod": "span-plain"}, timestamp=seeded, value=256.0, **gauge),
            Metrics(metric_name=LABEL_METRIC, labels={"deployment.environment.name": "production"}, timestamp=seeded, value=512.0, **gauge),
        ]
    )
    yield now
