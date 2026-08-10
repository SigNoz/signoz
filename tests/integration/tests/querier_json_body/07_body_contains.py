from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import build_order_by, build_raw_query, get_rows, make_query_request

SLASH = "GET /api/v1/users"
SUPERSTRING = "GET /api/v1/users/42"
QUOTE = 'say "hi" now'
BACKSLASH = "C:\\tmp\\log"
LIKE_META = "100% _off"
NON_ASCII = "Mixed CASE Ünïcode"
TAB = "tab\there"
CTRL = "ctrl\x01here"

BODIES = [SLASH, SUPERSTRING, QUOTE, BACKSLASH, LIKE_META, NON_ASCII, TAB, CTRL]


# CONTAINS and LIKE on body_v2 carry a needle over lower(toString(body_v2)), built by
# ClickHouse's own toJSONString so it matches the escapes the column stores — a term holding
# `/` or `"` finds nothing without them. The needle only ever narrows, never widens, so a
# term that should miss must still miss.
@pytest.mark.parametrize(
    "expression,expected_bodies",
    [
        pytest.param("body CONTAINS '/api/v1'", {SLASH, SUPERSTRING}, id="contains_slash"),
        pytest.param("body CONTAINS '\"hi\"'", {QUOTE}, id="contains_quote"),
        pytest.param(r"body CONTAINS 'C:\\tmp'", {BACKSLASH}, id="contains_backslash"),
        pytest.param("body CONTAINS 'CASE Ünïcode'", {NON_ASCII}, id="contains_non_ascii"),
        pytest.param("body CONTAINS 'here'", {TAB, CTRL}, id="contains_beside_control_chars"),
        pytest.param("body CONTAINS 'nothing here'", set(), id="contains_no_match"),
        # a run shorter than the ngram size gets no needle, so the match alone decides
        pytest.param("body CONTAINS 'ab'", {TAB}, id="contains_run_below_ngram_size"),
        # a `\%` the user wrote has to stay a literal `%` through unescape and re-escape
        pytest.param(r"body LIKE '%100\% \_off%'", {LIKE_META}, id="like_user_escaped_wildcards"),
        pytest.param(r"body LIKE '%100\%\_off%'", set(), id="like_escaped_wildcards_are_not_wildcards"),
        pytest.param("body LIKE 'GET /api/v1/users%'", {SLASH, SUPERSTRING}, id="like_trailing_wildcard"),
        pytest.param("body LIKE '%CASE Ünïcode'", {NON_ASCII}, id="like_leading_wildcard"),
    ],
)
def test_logs_body_contains_json(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_bodies: set[str],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": "api"},
                body=body,
            )
            for i, body in enumerate(BODIES)
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
    # body_v2 comes back parsed; a plain-string body is {"message": <body>}.
    assert {row["data"]["body"]["message"] for row in get_rows(response)} == expected_bodies
