from collections.abc import Callable
from datetime import datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    RequestType,
    build_aggregation,
    build_group_by_field,
    build_order_by,
    build_raw_query,
    build_traces_scalar_query,
    get_column_data_from_response,
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
    pytest.param("{key} EXISTS", {OLD, NEW, BOTH}, id="exists_is_any_member"),
    pytest.param("{key} NOT EXISTS", {NEITHER}, id="not_exists_is_no_member"),
    pytest.param("{key} != 'production' AND {key} EXISTS", {BOTH}, id="neq_composed_with_exists"),
]

LITERAL_MATRIX = [
    pytest.param("{key} = 'production'", {NEW}, id="literal_eq_reads_one_spelling"),
    pytest.param("{key} != 'production'", {OLD, BOTH, NEITHER}, id="literal_neq_reads_one_spelling"),
]


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
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": "span.name"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    matched = {name for name in get_column_data_from_response(response.json(), "name") if name.startswith(PREFIX)}
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
    response = make_query_request(
        signoz_families_off,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "traces",
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": "span.name"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    matched = {name for name in get_column_data_from_response(response.json(), "name") if name.startswith(PREFIX)}
    assert matched == expected, expression


@pytest.mark.parametrize("expression_template,expected", LITERAL_MATRIX)
def test_logs_stay_literal_with_flag_on(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    family_fleet: datetime,
    expression_template: str,
    expected: set[str],
) -> None:
    """Only traces have family support today."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"resource.{CURRENT_KEY}")
    response = make_query_request(
        signoz,
        token,
        start_ms=int((family_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((family_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "logs",
                limit=100,
                filter_expression=expression,
                order=[build_order_by("timestamp", "asc")],
                select_fields=[{"name": "body"}],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    matched = {body for body in get_column_data_from_response(response.json(), "body") if body.startswith(PREFIX)}
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
                [build_aggregation("count()")],
                filter_expression=f"service.name LIKE '{PREFIX}%'",
                group_by=[build_group_by_field(requested_key, "string", "resource")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    result = response.json()["data"]["data"]["results"][0]
    group_column = result["columns"][0]
    assert group_column["name"] == requested_key, group_column
    assert group_column["columnType"] == "group", group_column

    groups = {row[0] for row in result["data"]}
    assert {"production", "staging"}.issubset(groups), groups
    assert None in groups, groups


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

    warning = response.json()["data"].get("warning") or {}
    messages = " ".join(entry.get("message", "") for entry in warning.get("warnings", []))
    assert "ambiguous" in messages.lower(), messages
