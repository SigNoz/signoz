from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import build_order_by, build_raw_query, get_rows, make_query_request

LOWER = "alpha"
UPPER = "ALPHA"
PLAIN = "beta"
NON_ASCII = "Mixed CASE Ünïcode"
SLASH = "GET /api/v1/users"
SUPERSTRING = "GET /api/v1/users/42"
QUOTE = 'say "hi" now'
BACKSLASH = "C:\\tmp\\log"
LIKE_META = "100% _off"
TAB = "tab\there"
CTRL = "ctrl\x01here"

BODIES = [LOWER, UPPER, PLAIN, NON_ASCII, SLASH, SUPERSTRING, QUOTE, BACKSLASH, LIKE_META, TAB, CTRL]


# querierlogs/16_body_equality.py with use_json_body on: `body` resolves to body_v2.message,
# which the lower(body) companion skips, and the same expressions must still answer alike.
@pytest.mark.parametrize(
    "expression,expected_bodies",
    [
        pytest.param(f"body = '{LOWER}'", {LOWER}, id="equality_exact"),
        pytest.param(f"body = '{UPPER}'", {UPPER}, id="equality_other_case"),
        pytest.param("body = 'Alpha'", set(), id="equality_case_must_match"),
        pytest.param(f"body = '{NON_ASCII}'", {NON_ASCII}, id="equality_non_ascii"),
        pytest.param("body = 'gamma'", set(), id="equality_no_match"),
        pytest.param(f"body = '{SLASH}'", {SLASH}, id="equality_slash"),
        pytest.param("body = 'say \"hi\" now'", {QUOTE}, id="equality_quote"),
        pytest.param(r"body = 'C:\\tmp\\log'", {BACKSLASH}, id="equality_backslash"),
        pytest.param(f"body = '{LIKE_META}'", {LIKE_META}, id="equality_like_metacharacters"),
        pytest.param("body = 'tab\there'", {TAB}, id="equality_tab"),
        pytest.param("body = 'ctrl\x01here'", {CTRL}, id="equality_control_char"),
        pytest.param("body = 'GET /api/v1'", set(), id="equality_prefix_does_not_match"),
        pytest.param(f"body IN ('{LOWER}', '{PLAIN}')", {LOWER, PLAIN}, id="in_excludes_other_case"),
        pytest.param(f"body IN ('{SLASH}', '{LIKE_META}')", {SLASH, LIKE_META}, id="in_escaped_values"),
        pytest.param(f"body NOT IN ('{LOWER}', '{UPPER}')", set(BODIES) - {LOWER, UPPER}, id="not_in"),
    ],
)
def test_logs_body_equality_json(
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
