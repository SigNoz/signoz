from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest

from fixtures import types
from fixtures.logs import Logs, insert_logs_to_clickhouse
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, insert_traces_to_clickhouse

PREFIX = "semconv-fam"
CURRENT_KEY = "deployment.environment.name"
OLD_KEY = "deployment.environment"

# Tests compare identity sets filtered by PREFIX, so reruns on a reused stack
# with leftover rows stay stable.
OLD = f"{PREFIX}-old"
NEW = f"{PREFIX}-new"
BOTH = f"{PREFIX}-both"  # current "staging" and old "production" - the conflict row
NEITHER = f"{PREFIX}-neither"

_ROWS = [
    (OLD, {OLD_KEY: "production"}, timedelta(seconds=4)),
    (NEW, {CURRENT_KEY: "production"}, timedelta(seconds=3)),
    (BOTH, {CURRENT_KEY: "staging", OLD_KEY: "production"}, timedelta(seconds=2)),
    (NEITHER, {}, timedelta(seconds=1)),
]


@pytest.fixture(name="family_fleet", scope="package")
def family_fleet(clickhouse: types.TestContainerClickhouse) -> Generator[datetime]:
    """Yields the base timestamp of the inserted rows. Seeds through the pure
    insert functions: the callable fixtures are function-scoped, and one seed
    serves the whole package. The base aligns to the minute so the per-row
    offsets never straddle a 60s time-series bucket boundary."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0) - timedelta(minutes=1)

    def insert_traces(traces: list[Traces]) -> None:
        insert_traces_to_clickhouse(clickhouse.conn, traces)

    def insert_logs(logs: list[Logs]) -> None:
        insert_logs_to_clickhouse(clickhouse.conn, logs)

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
