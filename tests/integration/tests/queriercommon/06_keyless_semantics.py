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

Seed data lives in fixtures/queriercommon.py: GOLD and SILVER carry the
keys, NONE carries none. Every case asserts which identities a filter
returns, so the membership of NONE is the point of each case.
"""

from collections.abc import Callable
from datetime import datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_builder_query,
    build_order_by,
    build_raw_query,
    get_all_series,
    get_column_data_from_response,
    make_query_request,
)
from fixtures.queriercommon import (
    GOLD,
    METRIC_LABEL,
    METRIC_NAME,
    NONE,
    NUMBER_KEY,
    PREFIX,
    SILVER,
    STRING_KEY,
)

STRING_MATRIX = [
    pytest.param("{key} = 'gold'", {GOLD}, id="eq_excludes_keyless"),
    pytest.param("{key} != 'gold'", {SILVER, NONE}, id="neq_includes_keyless"),
    pytest.param("{key} NOT IN ['gold', 'silver']", {NONE}, id="not_in_includes_keyless"),
    pytest.param("NOT {key} LIKE '%gold%'", {SILVER, NONE}, id="not_like_includes_keyless"),
    pytest.param("{key} NOT CONTAINS 'gol'", {SILVER, NONE}, id="not_contains_includes_keyless"),
    pytest.param("{key} EXISTS", {GOLD, SILVER}, id="exists_partitions"),
    pytest.param("{key} NOT EXISTS", {NONE}, id="not_exists_partitions"),
    # "Present and not X" is a composition. It is not a new operator
    # semantic.
    pytest.param("{key} != 'gold' AND {key} EXISTS", {SILVER}, id="neq_composed_with_exists"),
]

NUMBER_MATRIX = [
    pytest.param("{key} = 0", {GOLD}, id="numeric_eq_zero_excludes_keyless"),
    pytest.param("{key} != 5", {GOLD, NONE}, id="numeric_neq_includes_keyless"),
    pytest.param("{key} != 0", {SILVER}, id="numeric_neq_zero_sentinel_conflation"),
]

SIGNALS = [
    pytest.param("traces", "span.name", "name", id="traces"),
    pytest.param("logs", "body", "body", id="logs"),
]


@pytest.mark.parametrize("expression_template,expected", STRING_MATRIX)
@pytest.mark.parametrize("context", ["resource", "attribute"])
@pytest.mark.parametrize("signal,identity_field,identity_column", SIGNALS)
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
    """A negative operator is a set complement over all rows. Presence is an
    explicit EXISTS opt-in. The contract holds the same way for resource and
    attribute contexts, on traces and on logs."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"{context}.{STRING_KEY}")

    response = make_query_request(
        signoz,
        token,
        start_ms=int((keyless_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((keyless_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                signal,
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": identity_field}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    # Sets keep the assertion stable when the shared stack is reused and
    # older rows with the same identities remain.
    matched = {name for name in get_column_data_from_response(response.json(), identity_column) if name.startswith(PREFIX)}
    assert matched == expected, expression


@pytest.mark.parametrize("expression_template,expected", NUMBER_MATRIX)
@pytest.mark.parametrize("signal,identity_field,identity_column", SIGNALS)
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
    excludes rows without the key, and every other negative comparison
    includes them. This is inherited sentinel behavior, pinned on purpose."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"attribute.{NUMBER_KEY}")

    response = make_query_request(
        signoz,
        token,
        start_ms=int((keyless_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((keyless_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                signal,
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": identity_field}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    matched = {name for name in get_column_data_from_response(response.json(), identity_column) if name.startswith(PREFIX)}
    assert matched == expected, expression


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
    start, end = keyless_series

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

    matched = {label["value"] for series in get_all_series(response.json(), "A") for label in series["labels"] if label["key"]["name"] == "service" and label["value"].startswith(PREFIX)}
    assert matched == expected, expression
