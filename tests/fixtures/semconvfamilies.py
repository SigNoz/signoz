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
