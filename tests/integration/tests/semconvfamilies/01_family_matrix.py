from collections.abc import Callable
from datetime import datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.metadata import get_field_keys, get_field_values
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_raw_query,
    build_scalar_query,
    build_traces_scalar_query,
    get_all_warnings,
    get_column_data_from_response,
    get_scalar_columns,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.semconvfamilies import (
    BOTH,
    CURRENT_KEY,
    NEITHER,
    NEW,
    OLD,
    OLD_KEY,
    PREFIX,
)

FILTER_MATRIX = [
    pytest.param("{key} = 'production'", {OLD, NEW}, id="eq_matches_either_spelling"),
    pytest.param("{key} = 'staging'", {BOTH}, id="eq_current_wins_on_conflict"),
    pytest.param("{key} != 'production'", {BOTH, NEITHER}, id="neq_keeps_keyless_and_conflict"),
    pytest.param("{key} IN ['production', 'staging']", {OLD, NEW, BOTH}, id="in_matches_merged_value"),
    pytest.param("{key} NOT IN ['production']", {BOTH, NEITHER}, id="not_in_keeps_keyless"),
    pytest.param("{key} LIKE '%prod%'", {OLD, NEW}, id="like_matches_merged_value"),
    pytest.param("{key} NOT LIKE '%prod%'", {BOTH, NEITHER}, id="not_like_keeps_keyless"),
    pytest.param("{key} ILIKE 'PROD%'", {OLD, NEW}, id="ilike_matches_merged_value"),
    pytest.param("{key} CONTAINS 'oduct'", {OLD, NEW}, id="contains_matches_merged_value"),
    pytest.param("{key} REGEXP '^prod.*'", {OLD, NEW}, id="regexp_matches_merged_value"),
    pytest.param("{key} NOT CONTAINS 'prod'", {BOTH, NEITHER}, id="not_contains_keeps_keyless"),
    pytest.param("{key} EXISTS", {OLD, NEW, BOTH}, id="exists_is_any_member"),
    pytest.param("{key} NOT EXISTS", {NEITHER}, id="not_exists_is_no_member"),
    pytest.param("{key} != 'production' AND {key} EXISTS", {BOTH}, id="neq_composed_with_exists"),
]

LITERAL_MATRIX = [
    pytest.param("{key} = 'production'", {NEW}, id="literal_eq_reads_one_spelling"),
    pytest.param("{key} != 'production'", {OLD, BOTH, NEITHER}, id="literal_neq_reads_one_spelling"),
]


def query_identities(
    signoz: types.SigNoz,
    token: str,
    base: datetime,
    expression: str,
    signal: str,
    identity_field: str,
    identity_column: str,
) -> set[str]:
    response = make_query_request(
        signoz,
        token,
        start_ms=int((base - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((base + timedelta(minutes=1)).timestamp() * 1000),
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
    return {name for name in get_column_data_from_response(response.json(), identity_column) if name.startswith(PREFIX)}


@pytest.mark.parametrize("expression_template,expected", FILTER_MATRIX)
@pytest.mark.parametrize("requested_key", [CURRENT_KEY, OLD_KEY], ids=["current", "old"])
@pytest.mark.parametrize("context", ["resource", "attribute"])
def test_family_filters(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
    context: str,
    requested_key: str,
    expression_template: str,
    expected: set[str],
) -> None:
    """The result set is a property of the family, not of the requested spelling."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"{context}.{requested_key}")
    matched = query_identities(signoz, token, family_fleet, expression, "traces", "span.name", "name")
    assert matched == expected, expression


@pytest.mark.parametrize("expression_template,expected", FILTER_MATRIX)
@pytest.mark.parametrize("requested_key", [CURRENT_KEY, OLD_KEY], ids=["current", "old"])
@pytest.mark.parametrize("context", ["resource", "attribute"])
def test_log_family_filters(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
    context: str,
    requested_key: str,
    expression_template: str,
    expected: set[str],
) -> None:
    """Logs resolve the family exactly like traces."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"{context}.{requested_key}")
    matched = query_identities(signoz, token, family_fleet, expression, "logs", "body", "body")
    assert matched == expected, expression


@pytest.mark.parametrize("expression_template,expected", LITERAL_MATRIX)
def test_flag_off_stays_literal(
    signoz_families_off: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
    expression_template: str,
    expected: set[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"resource.{CURRENT_KEY}")
    matched = query_identities(signoz_families_off, token, family_fleet, expression, "traces", "span.name", "name")
    assert matched == expected, expression


@pytest.mark.parametrize("requested_key", [CURRENT_KEY, OLD_KEY], ids=["current", "old"])
def test_group_by_merges_and_echoes_requested_spelling(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
    requested_key: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_traces_scalar_query(
                [build_aggregation("count_distinct(name)")],
                filter_expression=f"service.name LIKE '{PREFIX}%'",
                group_by=[build_group_by_field(requested_key, "string", "resource")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    group_column = get_scalar_columns(response.json())[0]
    assert group_column["name"] == requested_key, group_column
    assert group_column["columnType"] == "group", group_column

    # Distinct identities per group make the counts rerun-safe on a reused
    # stack: OLD and NEW merge into production, BOTH is staging, NEITHER has
    # no spelling at all.
    groups = {tuple(row) for row in get_scalar_table_data(response.json())}
    assert groups == {("production", 2), ("staging", 1), (None, 1)}, groups


@pytest.mark.parametrize("requested_key", [CURRENT_KEY, OLD_KEY], ids=["current", "old"])
def test_log_group_by_merges_and_echoes_requested_spelling(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
    requested_key: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_scalar_query(
                name="A",
                signal="logs",
                aggregations=[build_aggregation("count_distinct(body)")],
                filter_expression=f"service.name LIKE '{PREFIX}%'",
                group_by=[build_group_by_field(requested_key, "string", "resource")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    group_column = get_scalar_columns(response.json())[0]
    assert group_column["name"] == requested_key, group_column
    groups = {tuple(row) for row in get_scalar_table_data(response.json())}
    assert groups == {("production", 2), ("staging", 1), (None, 1)}, groups


def test_time_series_group_by_merges_family(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    """The request type dashboards use goes through its own two-phase SQL."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.TIME_SERIES,
        queries=[
            build_traces_scalar_query(
                [build_aggregation("count_distinct(name)")],
                filter_expression=f"service.name LIKE '{PREFIX}%'",
                group_by=[build_group_by_field(CURRENT_KEY, "string", "resource")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    series = response.json()["data"]["data"]["results"][0]["aggregations"][0]["series"]
    values_by_group = {}
    for entry in series:
        for label in entry.get("labels", []):
            if label["key"]["name"] == CURRENT_KEY:
                values_by_group[label["value"]] = max((point["value"] for point in entry["values"]), default=None)
    assert values_by_group.get("production") == 2, values_by_group
    assert values_by_group.get("staging") == 1, values_by_group


def test_raw_select_reads_merged_value(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "traces",
                limit=100,
                filter_expression=f"service.name LIKE '{PREFIX}%'",
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": "span.name"}, {"name": f"resource.{CURRENT_KEY}"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    value_by_identity = {}
    for row in rows:
        data = row["data"]
        if data.get("name", "").startswith(PREFIX):
            value_by_identity[data["name"]] = data.get(CURRENT_KEY)
    assert value_by_identity.get(OLD) == "production", value_by_identity
    assert value_by_identity.get(NEW) == "production", value_by_identity
    assert value_by_identity.get(BOTH) == "staging", value_by_identity
    assert value_by_identity.get(NEITHER) in ("", None), value_by_identity


def test_order_by_family_key_sorts_merged_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "traces",
                limit=100,
                filter_expression=f"{CURRENT_KEY} EXISTS AND service.name LIKE '{PREFIX}%'",
                order=[build_order_by(f"resource.{CURRENT_KEY}", "asc")],
                select_fields=[{"name": "span.name"}, {"name": f"resource.{CURRENT_KEY}"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    merged_values = [row["data"].get(CURRENT_KEY) for row in rows if row["data"].get("name", "").startswith(PREFIX)]
    assert merged_values == sorted(merged_values), merged_values
    assert set(merged_values) == {"production", "staging"}, merged_values


def test_qualified_family_key_emits_no_ambiguity_warning(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    """A family is one logical field and never ambiguous with itself."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "traces",
                limit=10,
                filter_expression=f"resource.{CURRENT_KEY} = 'production'",
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": "span.name"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert get_all_warnings(response.json()) == [], response.json()["data"].get("warning")


def test_bare_name_prefers_resource_and_warns(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    """Both contexts carry the family, so a bare name is ambiguous: resolution
    warns and keeps the resource side."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "traces",
                limit=100,
                filter_expression=f"{CURRENT_KEY} = 'production'",
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": "span.name"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    matched = {name for name in get_column_data_from_response(response.json(), "name") if name.startswith(PREFIX)}
    assert matched == {OLD, NEW}

    messages = " ".join(entry.get("message", "") for entry in get_all_warnings(response.json()))
    assert "ambiguous" in messages.lower(), messages


def test_field_keys_stay_literal(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    """Autocomplete keys keep both spellings apart; merging is a query concern."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_keys(signoz, token, {"signal": "traces", "searchText": "deployment.environment"})
    assert response.status_code == HTTPStatus.OK, response.text
    names = set(response.json()["data"]["keys"].keys())
    assert CURRENT_KEY in names, names
    assert OLD_KEY in names, names


def test_field_values_union_the_family(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
) -> None:
    """Values for one spelling cover rows that carry only the other spelling."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(
        signoz,
        token,
        {"signal": "traces", "name": OLD_KEY, "fieldContext": "resource"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    values = set(response.json()["data"]["values"].get("stringValues", []))
    # staging exists only under the current spelling on the BOTH row, so only
    # the family union makes it reachable from a query on the old spelling.
    assert {"production", "staging"}.issubset(values), values
