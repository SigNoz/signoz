import json
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
    get_rows,
    make_preview_query_request,
    make_query_request,
)

# The legacy body holds the text the producer wrote, so the same value reaches ClickHouse under
# different encodings: PHP escapes `/`, Go escapes `&` `<` `>`, Python escapes non-ASCII. The
# LOWER(body) predicates the filters carry for the bloom filters must find all of them.
BODIES = {
    "plain": '{"tag":"plain","url":"https://signoz.io/docs","user_id":4242,"status":"timeout_error"}',
    "php": '{"tag":"php","url":"https:\\/\\/signoz.io\\/docs"}',
    "go": '{"tag":"go","note":"connection reset \\u0026 retry aborted"}',
    "python": '{"tag":"python","city":"caf\\u00e9 municipal district"}',
    "other_case": '{"tag":"other_case","status":"TIMEOUT_ERROR"}',
    "no_user_id": '{"tag":"no_user_id","status":"ok","url":"https://signoz.io/pricing"}',
    "tagged": '{"tag":"tagged","labels":["production","webserver"]}',
    "tagged_escaped": '{"tag":"tagged_escaped","labels":["batch \\u0026 stream","webserver"]}',
}


@pytest.mark.parametrize(
    "expression,expected_tags",
    [
        pytest.param("body.user_id = 4242", {"plain"}, id="numeric_equality"),
        pytest.param("body.user_id EXISTS", {"plain"}, id="exists"),
        # a negated comparison matches the rows without the path, so it carries no predicate
        pytest.param("body.user_id != 4242", set(BODIES) - {"plain"}, id="not_equal_keeps_pathless_rows"),
        pytest.param("body.status NOT EXISTS", {"php", "go", "python", "tagged", "tagged_escaped"}, id="not_exists"),
        pytest.param("body.url = 'https://signoz.io/docs'", {"plain", "php"}, id="equality_escaped_slashes"),
        pytest.param("body.url CONTAINS 'signoz.io/docs'", {"plain", "php"}, id="contains_escaped_slashes"),
        pytest.param("body.note = 'connection reset & retry aborted'", {"go"}, id="equality_escaped_ampersand"),
        pytest.param("body.city = 'café municipal district'", {"python"}, id="equality_escaped_non_ascii"),
        # the value predicate is case-insensitive where the equality is not
        pytest.param("body.status = 'timeout_error'", {"plain"}, id="equality_underscore"),
        pytest.param("body.status = 'TIMEOUT_ERROR'", {"other_case"}, id="equality_other_case"),
        pytest.param("body.status IN ('timeout_error', 'ok')", {"plain", "no_user_id"}, id="in_carries_one_value_per_arm"),
        # has and hasAll assert every element, hasAny only one of them
        pytest.param("has(body.labels[*], 'production')", {"tagged"}, id="has_element"),
        pytest.param("has(body.labels[*], 'batch & stream')", {"tagged_escaped"}, id="has_escaped_element"),
        pytest.param("hasAll(body.labels[*], ['production', 'webserver'])", {"tagged"}, id="has_all_needs_every_element"),
        pytest.param(
            "hasAny(body.labels[*], ['production', 'batch & stream'])",
            {"tagged", "tagged_escaped"},
            id="has_any_needs_one_element",
        ),
        # 'webserver' is in both, so an ORed literal set must not exclude either row
        pytest.param(
            "hasAny(body.labels[*], ['webserver', 'nothing here'])",
            {"tagged", "tagged_escaped"},
            id="has_any_across_both",
        ),
    ],
)
def test_logs_body_json_index_predicates(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_tags: set[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": "api"},
                body=body,
            )
            for i, body in enumerate(BODIES.values())
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
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
    assert response.json()["status"] == "success"
    assert {json.loads(row["data"]["body"])["tag"] for row in get_rows(response)} == expected_tags


# JSON_VALUE matches no index expression, so the literals are what get the bloom filters consulted
# at all; the read funnel is what catches one that stops matching.
BODY_BLOOM_FILTERS = {"body_index_v2_token", "body_index_v2_ngram"}


@pytest.mark.parametrize(
    "expression,prunes_every_granule",
    [
        pytest.param("body.status = 'timeout_error'", False, id="value_needle_present"),
        pytest.param("body.status = 'zz_no_seeded_body_holds_this'", True, id="value_needle_absent"),
        pytest.param("body.zz_no_seeded_body_holds_this EXISTS", True, id="path_needle_absent"),
        # a number is compared after JSONExtract parses it, so it carries no value literal - only
        # its path, which every row holding the key satisfies
        pytest.param("body.user_id = 999999", False, id="number_carries_only_its_path"),
    ],
)
def test_logs_body_json_index_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    prunes_every_granule: bool,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": "api"},
                body=body,
            )
            for i, body in enumerate(BODIES.values())
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
    assert BODY_BLOOM_FILTERS <= set(skip_indexes), f"body bloom filters not consulted, only: {sorted(skip_indexes)}"

    selected = get_preview_selected_granules(response, "A")
    if prunes_every_granule:
        assert selected == 0, f"expected every granule pruned, {selected} survived"
    else:
        assert selected > 0, "the granule holding the match must survive"


# `body = ?` matches no index expression on its own; the lowered companion is what the filters
# prune on, so its absence from the funnel is the regression this catches.
@pytest.mark.parametrize(
    "expression,prunes_every_granule",
    [
        pytest.param("body = 'alpha'", False, id="equality_present_value"),
        pytest.param("body = 'zz_no_seeded_body_holds_this'", True, id="equality_absent_value"),
        # IN delegates to the equalities, so every arm carries its own companion
        pytest.param("body IN ('alpha', 'beta')", False, id="in_present_values"),
        pytest.param("body IN ('zz_absent_one', 'zz_absent_two')", True, id="in_absent_values"),
    ],
)
def test_logs_body_equality_prunes_granules(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    prunes_every_granule: bool,
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "api"}, body=body) for i, body in enumerate(["alpha", "ALPHA", "beta"])])

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
    assert BODY_BLOOM_FILTERS <= set(skip_indexes), f"body bloom filters not consulted, only: {sorted(skip_indexes)}"

    selected = get_preview_selected_granules(response, "A")
    if prunes_every_granule:
        assert selected == 0, f"expected every granule pruned, {selected} survived"
    else:
        assert selected > 0, "the granule holding the match must survive"


# The attribute maps carry a bloom filter over mapValues, which the subscript the comparison reads
# matches no more than the body column did. mapContains prunes on the key alone, so these use a key
# every row carries to isolate what the value predicate contributes.
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
