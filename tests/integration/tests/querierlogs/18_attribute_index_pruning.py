from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_order_by,
    build_raw_query,
    get_preview_selected_granules,
    get_preview_skip_indexes,
    make_preview_query_request,
)

# The attribute maps carry a bloom filter over mapValues, but the subscript a comparison reads
# matches no index expression. mapContains prunes on the key alone, so these use a key every row
# carries to isolate what the value predicate contributes.
ATTRIBUTE_NUMBER_VALUE_INDEX = "attributes_number_idx_val"
ATTRIBUTE_STRING_VALUE_INDEX = "attributes_string_idx_val"


@pytest.mark.parametrize(
    "expression,prunes_every_granule",
    [
        pytest.param("attribute.resp_code = 503", False, id="value_present"),
        pytest.param("attribute.resp_code = 60599", True, id="value_absent"),
        # IN delegates to the equalities, so every arm carries its own membership assertion
        pytest.param("attribute.resp_code IN (503, 200)", False, id="in_present_values"),
        pytest.param("attribute.resp_code IN (60599, 60600)", True, id="in_absent_values"),
    ],
)
def test_attribute_number_equality_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    prunes_every_granule: bool,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "api"}, attributes={"resp_code": code}) for i, code in enumerate([200, 200, 503])])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_preview_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            build_raw_query(
                "A",
                "logs",
                filter_expression=expression,
                order=[build_order_by("timestamp", "desc"), build_order_by("id", "desc")],
                limit=100,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    skip_indexes = get_preview_skip_indexes(response, "A")
    assert ATTRIBUTE_NUMBER_VALUE_INDEX in skip_indexes, f"mapValues filter not consulted, only: {sorted(skip_indexes)}"

    selected = get_preview_selected_granules(response, "A")
    if prunes_every_granule:
        assert selected == 0, f"expected every granule pruned, {selected} survived"
    else:
        assert selected > 0, "the granule holding the match must survive"


# The mapValues filter indexes the values raw, so a case-insensitive match reaches it only for a
# pattern holding no ASCII letter, where LOWER changes nothing. A letter leaves it unconsulted.
@pytest.mark.parametrize(
    "expression,value_index_consulted,prunes_every_granule",
    [
        pytest.param("attribute.client.ip CONTAINS '192.168.77'", True, False, id="letter_free_value_present"),
        pytest.param("attribute.client.ip CONTAINS '192.168.99'", True, True, id="letter_free_value_absent"),
        pytest.param("attribute.env CONTAINS 'production'", False, False, id="letters_leave_it_unconsulted"),
        # the filter is consulted for any letter-free pattern, but a run below the index ngram
        # leaves it nothing to check
        pytest.param("attribute.client.ip CONTAINS '.7'", True, False, id="run_shorter_than_the_ngram"),
    ],
)
def test_attribute_letter_free_match_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    value_index_consulted: bool,
    prunes_every_granule: bool,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": "api"},
                attributes={"client.ip": ip, "env": "production"},
            )
            for i, ip in enumerate(["10.0.0.1", "10.0.0.2", "192.168.77.31"])
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_preview_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            build_raw_query(
                "A",
                "logs",
                filter_expression=expression,
                order=[build_order_by("timestamp", "desc"), build_order_by("id", "desc")],
                limit=100,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    skip_indexes = get_preview_skip_indexes(response, "A")
    assert (ATTRIBUTE_STRING_VALUE_INDEX in skip_indexes) == value_index_consulted, f"consulted: {sorted(skip_indexes)}"

    selected = get_preview_selected_granules(response, "A")
    if prunes_every_granule:
        assert selected == 0, f"expected every granule pruned, {selected} survived"
    else:
        assert selected > 0, "the granule holding the match must survive"
