"""Seed data for the queriercommon keyless-semantics tests.

Three identities exist in every signal. GOLD and SILVER carry the test keys.
NONE carries no key at all. The tests assert which identities a filter
returns, so the membership of NONE is the point of every case.

The attribute names are outside every semantic-convention family, so the
seeded data pins base behavior with any semconv overlay state.
"""

from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta

import pytest

from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import aligned_epoch
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

PREFIX = "keyless-sem"
STRING_KEY = "tenant.tier"
NUMBER_KEY = "retry.count"
METRIC_NAME = "keyless_semantics_gauge"
METRIC_LABEL = "tenant_tier"

# Row identities, keyed by the value of the string key that each row carries.
GOLD = f"{PREFIX}-gold"
SILVER = f"{PREFIX}-silver"
NONE = f"{PREFIX}-none"  # carries no string key and no number key

# (identity, string-key value, number-key value, insert offset)
_ROWS = [
    (GOLD, "gold", 0, timedelta(seconds=3)),
    (SILVER, "silver", 5, timedelta(seconds=2)),
    (NONE, None, None, timedelta(seconds=1)),
]


def _resources(identity: str, tier: str | None) -> dict:
    base = {"service.name": identity}
    if tier is not None:
        base[STRING_KEY] = tier
    return base


def _attributes(tier: str | None, retries: int | None) -> dict:
    attrs: dict = {}
    if tier is not None:
        attrs[STRING_KEY] = tier
    if retries is not None:
        attrs[NUMBER_KEY] = retries
    return attrs


@pytest.fixture(name="keyless_rows", scope="function")
def keyless_rows(
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> Generator[datetime]:
    """Inserts one span and one log per identity: GOLD (string "gold",
    number 0), SILVER (string "silver", number 5), and NONE (no keys).
    Yields the base timestamp. Span name and log body are the identity."""
    now = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(minutes=1)

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
                resources=_resources(identity, tier),
                attributes=_attributes(tier, retries),
            )
            for identity, tier, retries, offset in _ROWS
        ]
    )
    insert_logs(
        [
            Logs(
                timestamp=now - offset,
                body=identity,
                resources=_resources(identity, tier),
                attributes=_attributes(tier, retries),
            )
            for identity, tier, retries, offset in _ROWS
        ]
    )
    yield now


@pytest.fixture(name="keyless_series", scope="function")
def keyless_series(insert_metrics: Callable[[list[Metrics]], None]) -> Generator[tuple[int, int]]:
    """Inserts three gauge series: GOLD and SILVER carry the metric label,
    NONE does not. The `service` label is the identity. Yields the
    (start, end) epoch-second window that covers the points."""
    start = aligned_epoch(timedelta(minutes=30))
    points = 5

    def labels(identity: str, tier: str | None) -> dict:
        base = {"service": identity}
        if tier is not None:
            base[METRIC_LABEL] = tier
        return base

    insert_metrics(
        [
            Metrics(
                metric_name=METRIC_NAME,
                labels=labels(identity, tier),
                timestamp=datetime.fromtimestamp(start + minute * 60, tz=UTC),
                value=10.0,
                type_="Gauge",
                is_monotonic=False,
            )
            for identity, tier in ((GOLD, "gold"), (SILVER, "silver"), (NONE, None))
            for minute in range(points)
        ]
    )
    yield start, start + points * 60
