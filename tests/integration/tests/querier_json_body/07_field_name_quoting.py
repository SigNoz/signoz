import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import build_aggregation, build_raw_query, build_scalar_query, get_rows, get_scalar_table_data, make_query_request

SERVICE = "quoting-json-svc"

NESTED_KEY = "us`er.na'me"
DOLLAR_KEY = "a$0b"
SLASH_KEY = "sl\\ash"
INJECT_KEY = "x` OR 1=1 --"

BODIES = {
    "alice": json.dumps({"us`er": {"na'me": "alice"}, DOLLAR_KEY: 7, SLASH_KEY: "alice-slash", INJECT_KEY: "alice-inject", "plain": "alice"}),
    "bob": json.dumps({"us`er": {"na'me": "bob"}, DOLLAR_KEY: 8, SLASH_KEY: "bob-slash", INJECT_KEY: "bob-inject", "plain": "bob"}),
    "carol": json.dumps({"plain": "carol"}),
}


@pytest.mark.parametrize(
    "key,expected",
    [
        pytest.param(NESTED_KEY, {"alice": 1, "bob": 1}, id="backtick_parent_quote_leaf"),
        pytest.param(SLASH_KEY, {"alice-slash": 1, "bob-slash": 1}, id="backslash"),
        pytest.param(INJECT_KEY, {"alice-inject": 1, "bob-inject": 1}, id="injection"),
    ],
)
def test_body_json_group_by_and_select_hostile_key(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
    key: str,
    expected: dict[str, int],
) -> None:
    now = datetime.now(tz=UTC)
    logs = [Logs(timestamp=now - timedelta(seconds=3 - i), resources={"service.name": SERVICE}, body_v2=body, body_promoted="") for i, body in enumerate(BODIES.values())]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)
    field = {"name": key, "fieldContext": "body", "fieldDataType": "string"}

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_scalar_query("A", "logs", [build_aggregation("count()")], group_by=[field], order=[{"key": {"name": key}, "direction": "asc"}], filter_expression=f"service.name = '{SERVICE}'")],
        request_type="scalar",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = [row for row in get_scalar_table_data(response.json()) if len(row) >= 2 and row[0]]
    assert {str(row[0]): int(row[-1]) for row in rows} == expected, response.text
    assert [str(row[0]) for row in rows] == sorted(expected), response.text

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_raw_query("A", "logs", limit=100, filter_expression=f"service.name = '{SERVICE}'", order=[{"key": {"name": "timestamp"}, "direction": "asc"}], select_fields=[field])],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 3, response.text
    assert [row["data"].get(key) for row in rows][:2] == sorted(expected), response.text


def test_body_json_filter_with_dollar_in_key(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    logs = [Logs(timestamp=now - timedelta(seconds=3 - i), resources={"service.name": SERVICE}, body_v2=body, body_promoted="") for i, body in enumerate(BODIES.values())]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=2)).timestamp() * 1000)
    end_ms = int((now + timedelta(seconds=1)).timestamp() * 1000)

    for expression, expected in [
        (f"{DOLLAR_KEY} = 7", {"alice"}),
        (f"{DOLLAR_KEY} > 7", {"bob"}),
        (f"{DOLLAR_KEY} EXISTS", {"alice", "bob"}),
        (f"{DOLLAR_KEY} NOT EXISTS AND service.name = '{SERVICE}'", {"carol"}),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms,
            end_ms,
            [build_raw_query("A", "logs", limit=100, filter_expression=expression, order=[{"key": {"name": "timestamp"}, "direction": "asc"}])],
            request_type="raw",
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert {row["data"]["body"]["plain"] for row in get_rows(response)} == expected, f"{expression}: {response.text}"
