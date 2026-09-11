from collections.abc import Callable
from datetime import datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    assert_scalar_value,
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_raw_query,
    build_scalar_query,
    get_all_warnings,
    get_column_data_from_response,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.queriercommon import (
    ATTRIBUTE_ONLY,
    BOTH,
    COLUMN_ONLY,
    EXPLICIT_PREFIX,
    IDENTITY_KEY,
    NEITHER,
    NUMBER_ATTRIBUTE,
)

# One name can exist in more than one place. `name` is a span column and a
# span attribute. `severity_text` is a log column and a log attribute.
# `service.name` is a resource attribute and a span or log attribute.
#
# Rules for a filter:
# - A key with an explicit context reads that context only.
# - A bare key that is a column and an attribute reads both. The query
#   returns an ambiguity warning.
# - A bare key that is a resource attribute and an attribute reads the
#   resource attribute. The query returns an ambiguity warning.
# - An `attribute.` key returns the warning when the attribute has two data
#   types.
# - A string operand matches a number attribute through a text cast.
# - A key under the signal's own context (`span.`, `log.`) that exists only
#   as an attribute reads the attribute. On logs it also reads the body JSON
#   path.
FILTER_MATRIX = [
    pytest.param("{contested} = '{value}'", {COLUMN_ONLY, ATTRIBUTE_ONLY, BOTH}, True, id="bare_column_and_attribute"),
    pytest.param("{own}.{contested} = '{value}'", {COLUMN_ONLY, BOTH}, False, id="own_context_column_only"),
    pytest.param("attribute.{contested} = '{value}'", {ATTRIBUTE_ONLY, BOTH}, True, id="attribute_context_warns_about_two_types"),
    pytest.param("{contested} != '{value}'", {NEITHER, NUMBER_ATTRIBUTE}, True, id="bare_negative_excludes_every_carrier"),
    pytest.param("{contested} EXISTS", {COLUMN_ONLY, ATTRIBUTE_ONLY, BOTH, NEITHER, NUMBER_ATTRIBUTE}, True, id="bare_exists_is_the_column"),
    pytest.param("{contested} NOT EXISTS", set(), True, id="bare_not_exists_is_never"),
    pytest.param("attribute.{contested} EXISTS", {ATTRIBUTE_ONLY, BOTH, NUMBER_ATTRIBUTE}, True, id="attribute_exists_spans_both_types"),
    pytest.param("attribute.{contested} NOT EXISTS", {COLUMN_ONLY, NEITHER}, True, id="attribute_not_exists"),
    pytest.param("{contested} = '42'", {NUMBER_ATTRIBUTE}, True, id="bare_string_operand_reaches_the_number_attribute"),
    pytest.param("attribute.{contested}:string = '{value}'", {ATTRIBUTE_ONLY, BOTH}, False, id="type_suffix_selects_the_string_attribute"),
    pytest.param("attribute.{contested}:float64 = 42", {NUMBER_ATTRIBUTE}, False, id="type_suffix_selects_the_number_attribute"),
    pytest.param("service.name = 'svc-a'", {COLUMN_ONLY, BOTH}, True, id="bare_resource_wins_with_warning"),
    pytest.param("service.name != 'svc-a'", {ATTRIBUTE_ONLY, NEITHER, NUMBER_ATTRIBUTE}, True, id="bare_resource_negative"),
    pytest.param("resource.service.name = 'svc-a'", {COLUMN_ONLY, BOTH}, False, id="resource_context_no_warning"),
    pytest.param("resource.service.name != 'svc-a'", {ATTRIBUTE_ONLY, NEITHER, NUMBER_ATTRIBUTE}, False, id="resource_context_negative"),
    pytest.param("attribute.service.name = 'svc-a'", {ATTRIBUTE_ONLY, BOTH}, False, id="attribute_context_no_warning"),
    pytest.param(
        "{own}.route.tag = 'checkout'",
        {"traces": {COLUMN_ONLY, BOTH}, "logs": {COLUMN_ONLY, ATTRIBUTE_ONLY, BOTH, NEITHER, NUMBER_ATTRIBUTE}},
        False,
        id="own_context_miss_corrects_to_attribute_and_on_logs_to_body",
    ),
    pytest.param("route.tag = 'checkout'", {COLUMN_ONLY, BOTH}, False, id="bare_attribute_only_key"),
]

# Traces run under both physical attribute layouts. `insert_traces` writes the
# legacy maps and the `attributes` JSON column; the backend decides which one
# the query builder reads. Logs have the maps only.
SIGNALS = [
    pytest.param("traces", "map", "span", "name", "checkout", "other", id="traces_map"),
    pytest.param("traces", "json", "span", "name", "checkout", "other", id="traces_json"),
    pytest.param("logs", "map", "log", "severity_text", "ERROR", "INFO", id="logs"),
]


@pytest.mark.parametrize("expression_template,expected,expects_ambiguity_warning", FILTER_MATRIX)
@pytest.mark.parametrize("signal,attribute_backend,own_context,contested,value,other_value", SIGNALS)
def test_filter_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ambiguous_rows: datetime,
    use_attribute_backend: Callable[[str], None],
    signal: str,
    attribute_backend: str,
    own_context: str,
    contested: str,
    value: str,
    other_value: str,  # pylint: disable=unused-argument
    expression_template: str,
    expected: set[str] | dict[str, set[str]],
    expects_ambiguity_warning: bool,
) -> None:
    use_attribute_backend(attribute_backend)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(own=own_context, contested=contested, value=value)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((ambiguous_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((ambiguous_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                signal,
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": IDENTITY_KEY}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    matched = {row for row in get_column_data_from_response(response.json(), IDENTITY_KEY) if row.startswith(EXPLICIT_PREFIX)}
    assert matched == (expected[f"{signal}_{attribute_backend}" if f"{signal}_{attribute_backend}" in expected else signal] if isinstance(expected, dict) else expected), expression

    warnings = [w["message"] for w in get_all_warnings(response.json())]
    assert any("ambiguous" in w for w in warnings) == expects_ambiguity_warning, warnings


# Rules for a group by:
# - A bare key that is a column and an attribute groups by the column only.
# - A key with an explicit context groups by that context only.
GROUP_BY_MATRIX = [
    pytest.param(None, {"{value}": 2, "{other}": 3}, id="bare_groups_by_the_column"),
    pytest.param("own", {"{value}": 2, "{other}": 3}, id="own_context_groups_by_the_column"),
    pytest.param("attribute", {"{value}": 2}, id="attribute_context_groups_by_the_attribute"),
]


@pytest.mark.parametrize("context,expected_template", GROUP_BY_MATRIX)
@pytest.mark.parametrize("signal,attribute_backend,own_context,contested,value,other_value", SIGNALS)
def test_group_by_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ambiguous_rows: datetime,
    use_attribute_backend: Callable[[str], None],
    signal: str,
    attribute_backend: str,
    own_context: str,
    contested: str,
    value: str,
    other_value: str,
    context: str | None,
    expected_template: dict[str, int],
) -> None:
    use_attribute_backend(attribute_backend)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    field_context = own_context if context == "own" else context

    response = make_query_request(
        signoz,
        token,
        start_ms=int((ambiguous_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((ambiguous_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                "A",
                signal,
                [build_aggregation("count()", "rows")],
                group_by=[build_group_by_field(contested, "string", field_context) if field_context else {"name": contested}],
                filter_expression=f"{IDENTITY_KEY} LIKE '{EXPLICIT_PREFIX}%'",
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    expected = {key.format(value=value, other=other_value): count for key, count in expected_template.items()}
    groups = {row[0]: row[1] for row in get_scalar_table_data(response.json()) if row[0] in expected}
    assert groups == expected, get_scalar_table_data(response.json())


# Rule for a raw select of a bare key that is a resource attribute and an
# attribute: each row shows the resource value. This is also true for a row
# where the attribute has a different value.
@pytest.mark.parametrize("signal,attribute_backend", [("traces", "map"), ("traces", "json"), ("logs", "map")], ids=["traces_map", "traces_json", "logs"])
def test_select_of_ambiguous_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ambiguous_rows: datetime,
    use_attribute_backend: Callable[[str], None],
    signal: str,
    attribute_backend: str,
) -> None:
    use_attribute_backend(attribute_backend)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((ambiguous_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((ambiguous_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                signal,
                limit=100,
                filter_expression=f"{IDENTITY_KEY} LIKE '{EXPLICIT_PREFIX}%'",
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": IDENTITY_KEY}, {"name": "service.name"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"] or []
    by_identity = {row["data"][IDENTITY_KEY]: row["data"]["service.name"] for row in rows if row["data"].get(IDENTITY_KEY, "").startswith(EXPLICIT_PREFIX)}
    assert by_identity == {
        COLUMN_ONLY: "svc-a",
        ATTRIBUTE_ONLY: "svc-b",
        BOTH: "svc-a",
        NEITHER: "svc-b",
        NUMBER_ATTRIBUTE: "svc-b",
    }


# Rules for an order by, descending, with the timestamp descending as the
# second key:
# - A bare key or a key under the signal's own context sorts by the column
#   only.
# - An `attribute.` key sorts by the attribute on traces. The number
#   attribute sorts as text. Rows without the attribute come last.
# - An `attribute.` key sorts by the column on logs.
BY_COLUMN = [ATTRIBUTE_ONLY, NEITHER, NUMBER_ATTRIBUTE, COLUMN_ONLY, BOTH]
ORDER_BY_MATRIX = [
    pytest.param(None, {"traces": BY_COLUMN, "logs": BY_COLUMN}, id="bare_orders_by_the_column"),
    pytest.param("own", {"traces": BY_COLUMN, "logs": BY_COLUMN}, id="own_context_orders_by_the_column"),
    pytest.param(
        "attribute",
        {"traces": [ATTRIBUTE_ONLY, BOTH, NUMBER_ATTRIBUTE, COLUMN_ONLY, NEITHER], "logs": BY_COLUMN},
        id="attribute_context_orders_by_the_attribute_on_traces_only",
    ),
]


@pytest.mark.parametrize("context,expected", ORDER_BY_MATRIX)
@pytest.mark.parametrize("signal,attribute_backend,own_context,contested,value,other_value", SIGNALS)
def test_order_by_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ambiguous_rows: datetime,
    use_attribute_backend: Callable[[str], None],
    signal: str,
    attribute_backend: str,
    own_context: str,
    contested: str,
    value: str,  # pylint: disable=unused-argument
    other_value: str,  # pylint: disable=unused-argument
    context: str | None,
    expected: dict[str, list[str]],
) -> None:
    use_attribute_backend(attribute_backend)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    prefix = f"{own_context}." if context == "own" else f"{context}." if context else ""

    response = make_query_request(
        signoz,
        token,
        start_ms=int((ambiguous_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((ambiguous_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                signal,
                limit=100,
                filter_expression=f"{IDENTITY_KEY} LIKE '{EXPLICIT_PREFIX}%'",
                order=[build_order_by(f"{prefix}{contested}", "desc"), build_order_by("timestamp", "desc")],
                select_fields=[{"name": IDENTITY_KEY}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    ordered = [row for row in get_column_data_from_response(response.json(), IDENTITY_KEY) if row.startswith(EXPLICIT_PREFIX)]
    assert ordered == expected.get(f"{signal}_{attribute_backend}", expected[signal])


# Rules for an aggregation argument:
# - A bare key counts the values of the column only.
# - An `attribute.` key counts the attribute in both data types. The number
#   attribute adds one distinct value.
AGGREGATION_MATRIX = [
    pytest.param(None, 2, id="bare_counts_the_column"),
    pytest.param("own", 2, id="own_context_counts_the_column"),
    pytest.param("attribute", 2, id="attribute_context_counts_both_attribute_types"),
]


@pytest.mark.parametrize("context,expected", AGGREGATION_MATRIX)
@pytest.mark.parametrize("signal,attribute_backend,own_context,contested,value,other_value", SIGNALS)
def test_aggregation_argument_resolution(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ambiguous_rows: datetime,
    use_attribute_backend: Callable[[str], None],
    signal: str,
    attribute_backend: str,
    own_context: str,
    contested: str,
    value: str,  # pylint: disable=unused-argument
    other_value: str,  # pylint: disable=unused-argument
    context: str | None,
    expected: int,
) -> None:
    use_attribute_backend(attribute_backend)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    prefix = f"{own_context}." if context == "own" else f"{context}." if context else ""

    response = make_query_request(
        signoz,
        token,
        start_ms=int((ambiguous_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((ambiguous_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                "A",
                signal,
                [build_aggregation(f"count_distinct({prefix}{contested})", "distinct")],
                filter_expression=f"{IDENTITY_KEY} LIKE '{EXPLICIT_PREFIX}%'",
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert_scalar_value(response, "A", expected)


# Rules for logs only:
# - A `body.` key reads the body JSON path. It does not read the attribute
#   with the same name.
# - A `log.` key reads the attribute and the body JSON path together. This
#   is also true when metadata reports the attribute.
# - A `scope.` key resolves through metadata only. When metadata does not
#   report the key, the query fails with "key not found". This is also true
#   for the declared path `scope.name` and for rows that have the scope
#   data.
LOGS_ONLY_MATRIX = [
    pytest.param("body.route.tag = 'checkout'", {ATTRIBUTE_ONLY, NEITHER, NUMBER_ATTRIBUTE}, id="body_context_reads_the_body_json"),
    pytest.param("log.route.tag = 'checkout'", {COLUMN_ONLY, ATTRIBUTE_ONLY, BOTH, NEITHER, NUMBER_ATTRIBUTE}, id="log_context_reads_attribute_and_body"),
    pytest.param("scope.name = 'scope-a'", "key `name` not found", id="scope_name_needs_metadata"),
    pytest.param("scope.env = 'prod'", "key `env` not found", id="scope_attribute_needs_metadata"),
    pytest.param("scope.env EXISTS", "key `env` not found", id="scope_attribute_exists_needs_metadata"),
]


@pytest.mark.parametrize("expression,expected", LOGS_ONLY_MATRIX)
def test_logs_body_and_scope_contexts(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    ambiguous_rows: datetime,
    expression: str,
    expected: set[str] | str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((ambiguous_rows - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((ambiguous_rows + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "logs",
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": IDENTITY_KEY}],
            )
        ],
    )

    if isinstance(expected, str):
        assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
        assert expected in response.text, response.text
        return

    assert response.status_code == HTTPStatus.OK, response.text
    matched = {row for row in get_column_data_from_response(response.json(), IDENTITY_KEY) if row.startswith(EXPLICIT_PREFIX)}
    assert matched == expected, expression
