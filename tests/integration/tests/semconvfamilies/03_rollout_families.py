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
    build_traces_scalar_query,
    get_column_data_from_response,
    get_scalar_columns,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.semconvfamilies import (
    ROLLOUT_BOTH,
    ROLLOUT_FAMILIES,
    ROLLOUT_NEITHER,
    ROLLOUT_NEW,
    ROLLOUT_OLD,
    ROLLOUT_OTHER,
    ROLLOUT_PREFIX,
    ROLLOUT_VALUES,
)

FILTER_MATRIX = [
    pytest.param("{key} = {match}", {ROLLOUT_OLD, ROLLOUT_NEW, ROLLOUT_BOTH}, id="eq_matches_either_spelling"),
    pytest.param("{key} != {match}", {ROLLOUT_OTHER, ROLLOUT_NEITHER}, id="neq_keeps_keyless"),
    pytest.param("{key} EXISTS", {ROLLOUT_OLD, ROLLOUT_NEW, ROLLOUT_BOTH, ROLLOUT_OTHER}, id="exists_is_any_member"),
    pytest.param("{key} NOT EXISTS", {ROLLOUT_NEITHER}, id="not_exists_is_no_member"),
]

FAMILY_PARAMS = [pytest.param(family, id=family[0]) for family in ROLLOUT_FAMILIES]


@pytest.mark.parametrize("expression_template,expected", FILTER_MATRIX)
@pytest.mark.parametrize("spelling", ["current", "old"])
@pytest.mark.parametrize("family", FAMILY_PARAMS)
def test_rollout_family_filters(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    rollout_fleet: datetime,
    family: tuple[str, str, str],
    spelling: str,
    expression_template: str,
    expected: set[str],
) -> None:
    current, old, data_type = family
    requested = current if spelling == "current" else old
    match = "'match'" if data_type == "string" else str(ROLLOUT_VALUES["match"])
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    expression = expression_template.format(key=f"attribute.{requested}", match=match)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((rollout_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((rollout_fleet + timedelta(minutes=1)).timestamp() * 1000),
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
    matched = {name for name in get_column_data_from_response(response.json(), "name") if name.startswith(ROLLOUT_PREFIX)}
    assert matched == expected, expression

    resolutions = response.json()["data"]["meta"]["semconvResolutions"]
    resolution = next(item for item in resolutions if item["requested"] == requested)
    assert resolution["current"] == current, resolution
    assert old in resolution["members"], resolution


@pytest.mark.parametrize("spelling", ["current", "old"])
@pytest.mark.parametrize("family", FAMILY_PARAMS)
def test_rollout_group_by_merges_and_echoes_requested_spelling(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    rollout_fleet: datetime,
    family: tuple[str, str, str],
    spelling: str,
) -> None:
    current, old, data_type = family
    requested = current if spelling == "current" else old
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((rollout_fleet - timedelta(minutes=2)).timestamp() * 1000),
        end_ms=int((rollout_fleet + timedelta(minutes=1)).timestamp() * 1000),
        request_type=RequestType.SCALAR,
        queries=[
            build_traces_scalar_query(
                [build_aggregation("count_distinct(name)")],
                filter_expression=f"service.name LIKE '{ROLLOUT_PREFIX}%'",
                group_by=[build_group_by_field(requested, data_type, "attribute")],
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK, response.text

    group_column = get_scalar_columns(response.json())[0]
    assert group_column["name"] == requested, group_column

    # OLD, NEW and BOTH merge into match, OTHER stays apart and NEITHER has no
    # spelling at all. Group values come back as strings.
    match, other = ("match", "other") if data_type == "string" else (str(ROLLOUT_VALUES["match"]), str(ROLLOUT_VALUES["other"]))
    groups = {tuple(row) for row in get_scalar_table_data(response.json())}
    assert groups == {(match, 3), (other, 1), (None, 1)}, groups


@pytest.mark.parametrize("spelling", ["current", "old"])
@pytest.mark.parametrize("family", FAMILY_PARAMS)
def test_rollout_field_values_union_the_family(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    rollout_fleet: datetime,
    family: tuple[str, str, str],
    spelling: str,
) -> None:
    current, old, data_type = family
    requested = current if spelling == "current" else old
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = get_field_values(
        signoz,
        token,
        {"signal": "traces", "name": requested, "fieldContext": "attribute", "fieldDataType": data_type},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    values = response.json()["data"]["values"]
    # legacy exists only under the old spelling and match only under the
    # current one on the BOTH row, so only the family union reaches all three.
    if data_type == "string":
        assert set(ROLLOUT_VALUES).issubset(set(values.get("stringValues") or [])), values
    else:
        assert set(ROLLOUT_VALUES.values()).issubset({int(value) for value in values.get("numberValues") or []}), values


@pytest.mark.parametrize("family", FAMILY_PARAMS)
def test_rollout_field_keys_list_every_spelling(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    rollout_fleet: datetime,
    family: tuple[str, str, str],
) -> None:
    """The keys endpoint stays literal: each stored spelling is listed on its own."""
    current, old, _ = family
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    for requested in (current, old):
        response = get_field_keys(signoz, token, {"signal": "traces", "searchText": requested})
        assert response.status_code == HTTPStatus.OK, response.text
        assert requested in response.json()["data"]["keys"], requested
