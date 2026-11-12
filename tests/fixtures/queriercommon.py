"""Seed data for the queriercommon keyless-semantics and explicit-context tests.

Three identities exist in every signal. GOLD and SILVER carry the test keys.
NONE carries no key at all. The tests assert which identities a filter
returns, so the membership of NONE is the point of every case.

The attribute names are outside every semantic-convention family, so the
seeded data pins base behavior with any semconv overlay state.
"""

import json
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


EXPLICIT_PREFIX = "explicit-ctx"
# String attribute that identifies the row. It has one context only. Each
# assertion reads it back.
IDENTITY_KEY = "probe.id"
# Attribute with no column of the same name. It tests a key under the
# signal's own context that metadata does not know. On logs, the rows without
# the attribute have the value nested in the body JSON.
ATTRIBUTE_ONLY_KEY = "route.tag"
CONTESTED_VALUE = "checkout"

# Row identities. Each row shows where the contested value is:
# - COLUMN_ONLY: in the column (`name` on spans, `severity_text` on logs).
# - ATTRIBUTE_ONLY: in the string attribute with the same name.
# - BOTH: in the column and in the string attribute.
# - NEITHER: in none of them.
# - NUMBER_ATTRIBUTE: in a number attribute with the same name. Its data
#   type is different from the column.
COLUMN_ONLY = f"{EXPLICIT_PREFIX}-column"
ATTRIBUTE_ONLY = f"{EXPLICIT_PREFIX}-attribute"
BOTH = f"{EXPLICIT_PREFIX}-both"
NEITHER = f"{EXPLICIT_PREFIX}-neither"
NUMBER_ATTRIBUTE = f"{EXPLICIT_PREFIX}-number"
NUMBER_VALUE = 42

# (identity, value in the column, value in the string attribute, value in
#  the number attribute, resource service.name, attribute service.name,
#  has route.tag, insert offset in seconds)
ROWS = [
    (COLUMN_ONLY, True, False, False, "svc-a", None, True, 1),
    (ATTRIBUTE_ONLY, False, True, False, "svc-b", "svc-a", False, 2),
    (BOTH, True, True, False, "svc-a", "svc-a", True, 3),
    (NEITHER, False, False, False, "svc-b", "svc-b", False, 4),
    (NUMBER_ATTRIBUTE, False, False, True, "svc-b", None, False, 5),
]

# Logs only. The scope name is a declared path. A scope attribute also has
# the name `name`. A second scope attribute has a plain name.
SCOPE_NAME = "scope-a"
SCOPE_ATTRIBUTE_KEY = "env"
SCOPE_ATTRIBUTE_VALUE = "prod"


@pytest.fixture(name="ambiguous_rows", scope="function")
def ambiguous_rows(
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> Generator[datetime]:
    """Inserts one span and one log for each identity. Every row has a
    resource `service.name`. Some rows also have a span or log attribute
    `service.name` with a different value. On logs, the rows without the
    `route.tag` attribute have the value in the body JSON. Logs with the
    column value have the scope name. Logs with the attribute value have the
    scope attributes. Yields the base timestamp."""
    now = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(minutes=1)

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=offset),
                duration=timedelta(milliseconds=10),
                trace_id=TraceIdGenerator.trace_id(),
                span_id=TraceIdGenerator.span_id(),
                name=CONTESTED_VALUE if column else "other",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources={"service.name": resource_service},
                attributes={
                    IDENTITY_KEY: identity,
                    **({"name": CONTESTED_VALUE} if attribute else {}),
                    **({"name": NUMBER_VALUE} if number else {}),
                    **({"service.name": attribute_service} if attribute_service else {}),
                    **({ATTRIBUTE_ONLY_KEY: CONTESTED_VALUE} if tagged else {}),
                },
            )
            for identity, column, attribute, number, resource_service, attribute_service, tagged, offset in ROWS
        ]
    )
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=offset),
                body=json.dumps({} if tagged else {"route": {"tag": CONTESTED_VALUE}}),
                severity_text="ERROR" if column else "INFO",
                scope_name=SCOPE_NAME if column else "",
                scope_attributes={"name": CONTESTED_VALUE, SCOPE_ATTRIBUTE_KEY: SCOPE_ATTRIBUTE_VALUE} if attribute else {},
                resources={"service.name": resource_service},
                attributes={
                    IDENTITY_KEY: identity,
                    **({"severity_text": "ERROR"} if attribute else {}),
                    **({"severity_text": NUMBER_VALUE} if number else {}),
                    **({"service.name": attribute_service} if attribute_service else {}),
                    **({ATTRIBUTE_ONLY_KEY: CONTESTED_VALUE} if tagged else {}),
                },
            )
            for identity, column, attribute, number, resource_service, attribute_service, tagged, offset in ROWS
        ]
    )
    yield now
