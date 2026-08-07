"""Pins the keyless-row contract for filter operators, per signal.

The contract (deliberate product semantics, enforced by
`FilterOperator.AddDefaultExistsFilter` in
pkg/types/querybuildertypes/querybuildertypesv5/builder_elements.go):

  - Negative operators (!=, NOT IN, NOT LIKE, NOT CONTAINS, ...) are a set
    complement over ALL rows: a row that does not carry the key at all MUST
    match. Users opt into presence explicitly with `AND key EXISTS`.
  - Positive operators carry an implicit existence guard: a keyless row must
    NOT match `key = ''`-style comparisons against sentinel defaults.
  - EXISTS / NOT EXISTS partition rows exactly by key presence.
  - Numeric attributes inherit the map-default sentinel: a missing key reads
    as 0, so `num != 0` excludes keyless rows while `num != 5` includes them.
    This conflation is deliberate and pinned here as the reference for any
    value-expression change (for example coalesce tails in semconv families).

Any implementation change that makes these assertions fail is a behavior
break, not a cleanup. Family-field behavior must mirror this matrix; see
queriertraces/13_semconv_evolution.py.

The attribute names used here are deliberately outside every semantic
convention family so this file pins the base contract regardless of the
semconv overlay state.
"""

from collections.abc import Callable, Generator
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.querier import (
    BuilderQuery,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    aligned_epoch,
    build_builder_query,
    get_all_series,
    get_column_data_from_response,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

PREFIX = "keyless-sem"
STRING_KEY = "tenant.tier"
NUMBER_KEY = "retry.count"
METRIC_NAME = "keyless_semantics_gauge"
METRIC_LABEL = "tenant_tier"

# Row identities, keyed by which value of the string key they carry.
GOLD = f"{PREFIX}-gold"
SILVER = f"{PREFIX}-silver"
NONE = f"{PREFIX}-none"  # carries neither the string nor the number key

# One matrix, three signals. Each case: (filter over the string key, expected
# row identities). The keyless row's membership is the point of every case.
STRING_MATRIX = [
    pytest.param("{key} = 'gold'", {GOLD}, id="eq_excludes_keyless"),
    pytest.param("{key} != 'gold'", {SILVER, NONE}, id="neq_includes_keyless"),
    pytest.param("{key} NOT IN ['gold', 'silver']", {NONE}, id="not_in_includes_keyless"),
    pytest.param("NOT {key} LIKE '%gold%'", {SILVER, NONE}, id="not_like_includes_keyless"),
    pytest.param("{key} NOT CONTAINS 'gol'", {SILVER, NONE}, id="not_contains_includes_keyless"),
    pytest.param("{key} EXISTS", {GOLD, SILVER}, id="exists_partitions"),
    pytest.param("{key} NOT EXISTS", {NONE}, id="not_exists_partitions"),
    # The documented idiom for "present and not X": composition, not a new
    # operator semantic.
    pytest.param("{key} != 'gold' AND {key} EXISTS", {SILVER}, id="neq_composed_with_exists"),
]

# Numeric attributes read the map default (0) for missing keys. `!= 0` is the
# deliberate blind spot: a keyless row is indistinguishable from a stored 0.
NUMBER_MATRIX = [
    pytest.param("{key} = 0", {GOLD}, id="numeric_eq_zero_excludes_keyless"),
    pytest.param("{key} != 5", {GOLD, NONE}, id="numeric_neq_includes_keyless"),
    pytest.param("{key} != 0", {SILVER}, id="numeric_neq_zero_sentinel_conflation"),
]


@pytest.fixture(name="keyless_rows")
def keyless_rows(
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> Generator[datetime]:
    now = datetime.now(tz=UTC).replace(microsecond=0) - timedelta(minutes=1)

    def resources(identity: str, tier: str | None) -> dict:
        base = {"service.name": identity}
        if tier is not None:
            base[STRING_KEY] = tier
        return base

    def attributes(tier: str | None, retries: int | None) -> dict:
        attrs: dict = {}
        if tier is not None:
            attrs[STRING_KEY] = tier
        if retries is not None:
            attrs[NUMBER_KEY] = retries
        return attrs

    rows = [
        (GOLD, "gold", 0, timedelta(seconds=3)),
        (SILVER, "silver", 5, timedelta(seconds=2)),
        (NONE, None, None, timedelta(seconds=1)),
    ]

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
                resources=resources(identity, tier),
                attributes=attributes(tier, retries),
            )
            for identity, tier, retries, offset in rows
        ]
    )
    insert_logs(
        [
            Logs(
                timestamp=now - offset,
                body=identity,
                resources=resources(identity, tier),
                attributes=attributes(tier, retries),
            )
            for identity, tier, retries, offset in rows
        ]
    )
    yield now


@pytest.fixture(name="keyless_series")
def keyless_series(insert_metrics: Callable[[list[Metrics]], None]) -> Generator[tuple[int, int]]:
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


def _matching_rows(
    signoz: types.SigNoz,
    token: str,
    now: datetime,
    signal: str,
    identity_field: str,
    identity_column: str,
    expression: str,
) -> set[str]:
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((now + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            BuilderQuery(
                signal=signal,
                name="A",
                limit=100,
                filter_expression=expression,
                select_fields=[TelemetryFieldKey(identity_field)],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "asc")],
            ).to_dict()
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    # Set semantics keep the assertions stable when the shared stack is reused
    # across runs and older rows with the same identities are still present.
    return {
        value
        for value in get_column_data_from_response(response.json(), identity_column)
        if isinstance(value, str) and value.startswith(PREFIX)
    }


@pytest.mark.parametrize("expression_template,expected", STRING_MATRIX)
@pytest.mark.parametrize("context", ["resource", "attribute"])
@pytest.mark.parametrize(
    "signal,identity_field,identity_column",
    [
        pytest.param("traces", "span.name", "name", id="traces"),
        pytest.param("logs", "body", "body", id="logs"),
    ],
)
def test_negative_operators_include_keyless_rows(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    keyless_rows: datetime,
    signal: str,
    identity_field: str,
    identity_column: str,
    context: str,
    expression_template: str,
    expected: set[str],
) -> None:
    """Negative operators are a set complement over all rows; presence is an
    explicit EXISTS opt-in. Holds identically for resource and attribute
    contexts on traces and logs."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"{context}.{STRING_KEY}")
    assert (
        _matching_rows(signoz, token, keyless_rows, signal, identity_field, identity_column, expression) == expected
    ), expression


@pytest.mark.parametrize("expression_template,expected", NUMBER_MATRIX)
@pytest.mark.parametrize(
    "signal,identity_field,identity_column",
    [
        pytest.param("traces", "span.name", "name", id="traces"),
        pytest.param("logs", "body", "body", id="logs"),
    ],
)
def test_numeric_sentinel_semantics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    keyless_rows: datetime,
    signal: str,
    identity_field: str,
    identity_column: str,
    expression_template: str,
    expected: set[str],
) -> None:
    """A missing numeric key reads as the map default 0. `!= 0` therefore
    excludes keyless rows while every other negative comparison includes
    them. Inherited sentinel behavior, pinned on purpose."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"attribute.{NUMBER_KEY}")
    assert (
        _matching_rows(signoz, token, keyless_rows, signal, identity_field, identity_column, expression) == expected
    ), expression


def _matching_series(
    signoz: types.SigNoz,
    token: str,
    window: tuple[int, int],
    expression: str,
) -> set[str]:
    start, end = window
    response = make_query_request(
        signoz,
        token,
        start_ms=start * 1000,
        end_ms=end * 1000,
        queries=[
            build_builder_query(
                "A",
                METRIC_NAME,
                "avg",
                "sum",
                group_by=["service"],
                filter_expression=expression,
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    matched = set()
    for series in get_all_series(response.json(), "A"):
        for label in series.get("labels") or []:
            key = label.get("key")
            name = key.get("name") if isinstance(key, dict) else key
            value = label.get("value")
            if name == "service" and isinstance(value, str) and value.startswith(PREFIX):
                matched.add(value)
    return matched


@pytest.mark.parametrize("expression_template,expected", STRING_MATRIX)
def test_metrics_negative_operators_include_keyless_series(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    keyless_series: tuple[int, int],
    expression_template: str,
    expected: set[str],
) -> None:
    """The same contract holds for metric labels: a series without the label
    matches every negative filter on it, and EXISTS opts into presence."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=METRIC_LABEL)
    assert _matching_series(signoz, token, keyless_series, expression) == expected, expression
