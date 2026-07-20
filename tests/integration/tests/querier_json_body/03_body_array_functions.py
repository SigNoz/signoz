import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.jsontypes import JSONPathType
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_order_by,
    build_raw_query,
    get_all_warnings,
    get_rows,
    make_query_request,
)


def test_logs_json_body_has_any_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAny over a []string body array matches logs sharing any listed value."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "api", "critical"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["staging", "api", "test"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "web", "important"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasAny(body.tags, ['critical', 'test'])")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 2
    assert all(("critical" in row["data"]["body"]["tags"]) or ("test" in row["data"]["body"]["tags"]) for row in rows)


def test_logs_json_body_has_all_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAll over a []string body array matches only logs having all listed values."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "api", "critical"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "web", "important"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasAll(body.tags, ['production', 'web'])")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    tags = rows[0]["data"]["body"]["tags"]
    assert "production" in tags and "web" in tags


def test_logs_json_body_has_any_number(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAny over a []int64 body array."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"ids": [100, 200, 300]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"ids": [400, 600, 700]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasAny(body.ids, [300, 999])")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    assert 300 in rows[0]["data"]["body"]["ids"]


def test_logs_json_body_array_membership(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has(body.<array>, value) matches logs whose body array contains the value, across
    string, numeric and boolean element types."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "api", "critical"], "ids": [100, 200, 300], "flags": [True, False, True]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["staging", "api", "test"], "ids": [200, 400, 500], "flags": [False, False, True]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "web", "important"], "ids": [100, 600, 700], "flags": [True, True, False]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='has(body.tags, "production")')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 2
    assert all("production" in row["data"]["body"]["tags"] for row in rows)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.ids, 200)")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 2
    assert all(200 in row["data"]["body"]["ids"] for row in rows)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.flags, true)")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 3
    assert all(True in row["data"]["body"]["flags"] for row in rows)


def test_logs_json_body_has_token(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasToken(body, token) matches logs whose body message contains the token."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"message": "request served from production node", "tags": ["api"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"message": "request served from staging node", "tags": ["api"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='hasToken(body, "production")')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    assert "production" in rows[0]["data"]["body"]["message"]


def test_logs_json_body_function_scalar_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has/hasAny/hasAll on a scalar (non-array) body path treat the scalar as a single-element
    set: has = equals, hasAny/hasAll = membership. So has and hasAll coincide for a scalar."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"level": "info", "code": 200}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"level": "debug", "code": 500}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # Each expression matches only the first log (level=info, code=200).
    for expression in ["has(body.level, 'info')", "hasAny(body.code, [200, 999])", "hasAll(body.level, ['info'])"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200, got {response.status_code}: {response.text}"
        rows = get_rows(response)
        assert len(rows) == 1, f"{expression}: expected 1 match, got {len(rows)}"
        assert rows[0]["data"]["body"]["level"] == "info", f"{expression}: matched wrong row: {rows[0]['data']['body']}"

    # hasAll is contains-all: a scalar (single-element set) can't hold two distinct values, so nothing matches.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasAll(body.level, ['info', 'debug'])")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert get_rows(response) == [], "hasAll(scalar, [two distinct values]) should match nothing (contains-all)"


@pytest.mark.parametrize(
    "expression, expected_error",
    [
        # A has-family function on a non-body key is unsupported (same message as flag-off);
        # a not-found *body* path instead warns and queries (see test_logs_json_body_unregistered_path_warns).
        pytest.param('has(code.function, "main")', "function `has` supports only body JSON search", id="has_non_body_key"),
        pytest.param('hasToken(code.function, "main")', "function `hasToken` only supports body field as first parameter", id="hastoken_non_body_key"),
        pytest.param("hasToken(body, 123)", "expects value parameter to be a string", id="hastoken_non_string_value"),
    ],
)
def test_logs_json_body_function_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
    expected_error: str,
) -> None:
    """has/hasToken misuse (non-body key, non-string token) is rejected (400) with a message that
    names the body-only restriction rather than a generic "key not found"."""
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert expected_error in response.text, f"{expression}: expected {expected_error!r} in {response.text}"


@pytest.mark.parametrize(
    "expression, expected_error",
    [
        pytest.param('has(body.tags, "a", "b")', "expects exactly one value argument", id="has_multiple_values"),
        pytest.param('hasToken(body, "a", "b")', "expects exactly one value argument", id="hastoken_multiple_values"),
        pytest.param('has(body.tags, ["a", "b"])', "expects a single scalar value, not an array", id="has_array_value"),
        pytest.param('hasAny(body.tags, ["a"], "b")', "not a mix of the two", id="hasany_mixed_array_and_scalar"),
    ],
)
def test_logs_json_body_function_argument_shape_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
    expected_error: str,
) -> None:
    """has-family value arguments are shape-validated; mis-shaped arguments are rejected (400)."""
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, f"{expression}: expected 400, got {response.status_code}: {response.text}"
    assert expected_error in response.text, f"{expression}: expected error {expected_error!r} in {response.text}"


def test_logs_json_body_large_integer_exact(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """Large ids (> 2^53) stay exact only when QUOTED (compared as Int64). An unquoted numeric
    literal is parsed as float64 upstream, so it false-matches neighbouring ids (documented)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"id": [1234567890123456789]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"id": [1234567890123456788]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # Quoted -> Int64 -> exact: matches only the exact id.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='has(body.id, "1234567890123456789")')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    # exactly one match (the query compares as Int64); the returned body value itself is
    # float64-serialized in the response, so assert on the match count, not the echoed id.
    assert len(get_rows(response)) == 1, "quoted big id should match exactly one log"

    # Unquoted -> float64 upstream -> imprecise: false-matches the off-by-one neighbour too.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.id, 1234567890123456789)")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert len(get_rows(response)) == 2, "unquoted big id collides with neighbour (float64 precision) - quote large ids"


def test_logs_json_body_no_supertype_safety(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """A needle whose type doesn't match the body array returns 200 with no match (never a
    ClickHouse type error)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"names": ["alice", "bob"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"nums": [100, 200]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression in ["has(body.names, 200)", "has(body.nums, 'alice')"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200, got {response.status_code}: {response.text}"
        assert get_rows(response) == [], f"{expression}: type mismatch should match nothing"


def test_logs_json_body_type_isolation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """JSON-body mode is inherently free of the legacy coercion quirks (it compares typed
    dynamicElement values off body_v2): a bool needle matches only genuine booleans, and
    empty-string / zero needles never false-match array bodies. Genuine scalars still match."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body_v2=json.dumps({"nums": [100, 200, 300]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"flags": [True, False]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"names": ["a", "b"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"code": 0}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.nums, true)", 0),  # bool needle does NOT truthy-match a numeric array
        ("has(body.flags, true)", 1),  # genuine bool array matches
        ("has(body.names, '')", 0),  # empty-string does NOT false-match an array
        ("has(body.nums, 0)", 0),  # zero does NOT false-match an array without a 0
        ("has(body.code, 0)", 1),  # genuine scalar zero matches
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_dynamic_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has() over a mixed-type body array (stored as Array(Dynamic)) matches by the needle's
    type: a numeric needle matches numeric elements, a string needle matches string elements."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"mix": [100, "abc", 300]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.mix, 100)", 1),
        ("has(body.mix, 'abc')", 1),
        ("has(body.mix, 999)", 0),
        ("has(body.mix, 'xyz')", 0),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_nested_array_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has over a scalar leaf reached through an array (body.education[].name) checks each element."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"education": [{"name": "IIT"}, {"name": "MIT"}]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"education": [{"name": "Stanford"}]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [("has(body.education[].name, 'MIT')", 1), ("has(body.education[].name, 'Yale')", 0)]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_negation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """NOT of a has-family call is the boolean complement, uniformly across leaf shapes: a row
    matches the negation unless it affirmatively contains the value. Rows missing the key match
    it on BOTH leaf shapes -- an array leaf yields an empty array (false), and a scalar leaf's
    NULL comparison is coalesced to false -- as do empty-array rows."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=5), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "api"]}), body_promoted="", severity_text="ERROR"),
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["staging", "web"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"other": [1, 2]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": []}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"level": "info"}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.tags, 'production')", 1),
        ("NOT has(body.tags, 'production')", 4),  # array leaf: the 2 missing + empty + staging rows
        ("hasAny(body.tags, ['production', 'staging'])", 2),
        ("NOT hasAny(body.tags, ['production', 'staging'])", 3),
        ("hasAll(body.tags, ['production', 'api'])", 1),
        ("NOT hasAll(body.tags, ['production', 'api'])", 4),
        ("has(body.level, 'info')", 1),
        ("NOT has(body.level, 'info')", 4),  # scalar leaf: missing-`level` rows match the negation too
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_missing_empty_null(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has/hasAny/hasAll match nothing for a missing key, an empty array, or a null value; only
    the log that actually contains the value matches."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body_v2=json.dumps({"other": [1, 2]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"vals": []}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"vals": None}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"vals": ["x"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression in ["has(body.vals, 'x')", "hasAny(body.vals, ['x'])", "hasAll(body.vals, ['x'])"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        rows = get_rows(response)
        assert len(rows) == 1, f"{expression}: only the log whose vals contains 'x' matches"


def test_logs_json_body_empty_needle_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """An empty value list — hasAny(k, []) / hasAll(k, []) — is a parse-level syntax error (400),
    not a vacuous-truth match and not a ClickHouse 500."""
    now = datetime.now(tz=UTC)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    for expression in ["hasAny(body.tags, [])", "hasAll(body.tags, [])"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
            end_ms=int(now.timestamp() * 1000),
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST, f"{expression}: expected 400, got {response.status_code}: {response.text}"


def test_logs_json_body_heterogeneous_shapes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """The same key stored with different shapes across rows (scalar vs array vs number) is
    searched uniformly: has(body.val, 'a') matches both the scalar "a" row and the array
    ["a","b"] row, and a numeric needle matches the numeric row."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"val": "a"}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"val": ["a", "b"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"val": 5}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.val, 'a')", 2),  # scalar "a" AND array ["a","b"]
        ("hasAny(body.val, ['a', 'b'])", 2),
        ("has(body.val, 5)", 1),  # numeric needle -> the numeric row
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_hastoken_semantics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """In JSON mode hasToken(body, ...) searches only the body.message field, is case-insensitive,
    and matches whole tokens (not substrings). Addressing it explicitly as hasToken(body.message,
    ...) is equivalent. A value present elsewhere in the body (e.g. in tags) but not in message
    does NOT match."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"message": "Request from PRODUCTION node"}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"message": "staging deploy done"}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production"], "message": "hello world"}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("hasToken(body, 'production')", 1),  # only row1 (message); row3 has it in tags, not message
        ("hasToken(body, 'PRODUCTION')", 1),  # case-insensitive
        ("hasToken(body, 'prod')", 0),  # whole-token, not a substring
        ("hasToken(body, 'hello')", 1),  # row3 message token
        ("hasToken(body.message, 'production')", 1),  # explicit body.message == bare body
        ("hasToken(body.message, 'PRODUCTION')", 1),
        ("hasToken(body.message, 'prod')", 0),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_numeric_cross_type(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """A float needle matches an integer array element (2.0 -> 2), but a needle absent from a
    float array does not match."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"ints": [1, 2, 3]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"floats": [1.5, 2.5]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.ints, 2)", 1),
        ("has(body.ints, 2.0)", 1),  # float needle matches integer element
        ("has(body.floats, 1.5)", 1),
        ("has(body.floats, 2)", 0),
        ("hasAll(body.floats, [1.5, 2.5])", 1),  # contains-all over a float array
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_bool_false_and_missing(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has(body.flag, false) matches a genuine scalar false and false membership in a bool array.
    NOT has(body.flag, false) matches every row that isn't a scalar false, including rows missing
    the key (same complement semantics as the flag-off legacy path)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body_v2=json.dumps({"flag": True}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"flag": False}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"flags": [True, False]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"other": 1}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.flag, true)", 1),
        ("has(body.flag, false)", 1),  # genuine scalar false
        ("NOT has(body.flag, false)", 3),  # every row without a scalar false, incl. missing-key rows
        ("has(body.flags, false)", 1),  # false in a bool array
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_boolean_composition(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has-family calls compose with AND/OR, other predicates, and parentheses."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["a", "b"]}), body_promoted="", severity_text="ERROR"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["a", "c"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["x", "y"]}), body_promoted="", severity_text="ERROR"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.tags, 'a') AND severity_text = 'ERROR'", 1),
        ("(has(body.tags, 'b') OR has(body.tags, 'x'))", 2),
        ("has(body.tags, 'a') AND has(body.tags, 'c')", 1),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_special_char_and_nested_keys(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has resolves a hyphenated key (body.user-agent) and a deeply nested scalar (body.a.b.c)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"user-agent": ["curl", "wget"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"a": {"b": {"c": "deep"}}}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [("has(body.user-agent, 'curl')", 1), ("has(body.a.b.c, 'deep')", 1)]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_negative_and_special_chars(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """Negative integers and strings with spaces/special chars match correctly."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"nums": [-5, -10]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["a b", "c/d"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [('has(body.nums, "-5")', 1), ("has(body.tags, 'a b')", 1)]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_duplicate_needle_and_case(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """A duplicated value in hasAll collapses to a single membership check, and has is
    case-sensitive (unlike hasToken)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["Prod", "api"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["prod"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("hasAll(body.tags, ['api', 'api'])", 1),
        ("has(body.tags, 'prod')", 1),  # matches 'prod', not 'Prod'
        ("has(body.tags, 'PROD')", 0),  # case-sensitive
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_array_hop_syntax(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """In JSON mode the array-hop is written body.edu[].name (resolved from metadata). The legacy
    body.edu[*].name form is no longer a hard error: it is an unregistered body path, so it warns
    and queries the underlying data (200) like any other not-found body path."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"edu": [{"name": "IIT"}, {"name": "MIT"}]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"edu": [{"name": "Stanford"}]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # [] resolves the array hop.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.edu[].name, 'MIT')")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert len(get_rows(response)) == 1

    # [*] is not the JSON-mode hop syntax; it is treated as an unregistered body path and
    # warns + queries (200) rather than erroring.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.edu[*].name, 'MIT')")],
    )
    assert response.status_code == HTTPStatus.OK, response.text


def test_logs_json_body_nested_family(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAny/hasAll over a scalar leaf reached through an array hop check element-wise:
    hasAny = some element has some value, hasAll = contains-all across elements (each value found
    in SOME element of the same log). Negation over the array-hop leaf matches rows missing the
    key (empty hop array -> false -> NOT true), same as every other leaf shape."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"education": [{"name": "IIT"}, {"name": "MIT"}]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"education": [{"name": "Stanford"}]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"other": 1}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("hasAny(body.education[].name, ['MIT', 'Stanford'])", 2),
        ("hasAll(body.education[].name, ['IIT', 'MIT'])", 1),  # both names within one log
        ("hasAll(body.education[].name, ['IIT', 'Stanford'])", 0),  # split across logs -> no match
        ("NOT has(body.education[].name, 'MIT')", 2),  # Stanford row + missing-key row
        ("NOT hasAll(body.education[].name, ['IIT', 'MIT'])", 2),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_hastoken_string_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasToken over a body string ARRAY tokenizes each element; a non-string body field is
    rejected (400)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production node", "staging"], "ids": [1, 2]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["web only"], "ids": [3]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("hasToken(body.tags, 'production')", 1),  # token inside an array element
        ("hasToken(body.tags, 'node')", 1),
        ("hasToken(body.tags, 'missing')", 0),
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"

    # hasToken is string-only: a numeric body field is rejected.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasToken(body.ids, 'x')")],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_logs_json_body_degenerate_targets(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """has on a degenerate target, never a ClickHouse 500. An object leaf or an array-of-arrays has
    no primitive leaf registered in metadata, so it is a not-found body path — it warns and queries
    (200, no match), the same as any other unregistered body path. Only the bare body (a full-text
    target, not a JSON path) stays a 400."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"obj": {"b": "x"}, "matrix": [[1, 2], [3]]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # An object leaf / array-of-arrays: no primitive leaf in metadata -> warn + query (200, no match).
    for expression in ["has(body.obj, 'x')", "has(body.matrix, 1)"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200, got {response.status_code}: {response.text}"
        assert get_rows(response) == [], f"{expression}: degenerate target should match nothing"

    # The bare body is not a JSON path -> has-family is unsupported on it (400).
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body, 'x')")],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, f"has(body): expected 400, got {response.status_code}: {response.text}"
    assert "function `has` supports only body JSON search" in response.text, response.text


def test_logs_json_body_genuine_empty_and_zero_elements(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """Positive complement of type isolation: an array that genuinely contains ''/0 DOES match
    those needles (the zero-value guards must not over-filter)."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["", "a"], "nums": [0, 1]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["b"], "nums": [5]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [("has(body.tags, '')", 1), ("has(body.nums, 0)", 1)]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} rows"


def test_logs_json_body_quote_unicode_needles(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """Needles containing quotes, accents and emoji round-trip through parsing and SQL escaping."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"words": ["it's", "café", "🚀 rocket", 'say "hi"']}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression in ['has(body.words, "it\'s")', "has(body.words, 'café')", "has(body.words, '🚀 rocket')", "has(body.words, 'say \"hi\"')"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert len(get_rows(response)) == 1, f"{expression}: expected 1 row"


@pytest.mark.parametrize(
    "needle",
    [
        pytest.param("192.168.1.1", id="dotted_ip"),
        pytest.param("user_id", id="underscore"),
        pytest.param("error-code", id="hyphen"),
        pytest.param("production node", id="whitespace"),
    ],
)
def test_logs_json_body_hastoken_separator_needle_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
    needle: str,
) -> None:
    """KNOWN BUG (currently 500) — same defect as the flag-off path. In JSON mode hasToken searches
    body.message via ClickHouse hasToken(LOWER(body.message), LOWER(?)), which rejects a needle
    containing whitespace or separator characters (`.`/`_`/`-`/space) with error code 36. The needle
    is passed straight through, so the query fails at execution and the raw error surfaces as a 500
    instead of a 400 / graceful fallback. Flip to 400 (or a fallback match) once the needle is
    validated."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"message": "client 192.168.1.1 user_id error-code production node"}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=f"hasToken(body, '{needle}')")],
    )
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"{needle}: expected 500, got {response.status_code}: {response.text}"
    assert "Needle must not contain whitespace or separator characters" in response.text, response.text


def test_logs_json_body_unregistered_path_warns(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[JSONPathType]], None],
) -> None:
    """A has-family call on a body path that is absent from metadata is NOT a 400: it emits the
    key-not-found warning and queries the underlying data (200), the same as a regular filter
    operator on an unknown key. Here only `known` is registered; `unknown` is not.

    (Note: like a regular filter, a not-found *flat* body path in JSON mode currently resolves to
    no match even when the value is present — an operator-wide JSON limitation — so we assert the
    200 + warning contract rather than a match count.)"""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"known": ["a"], "unknown": ["a", "b"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types([JSONPathType("known", "[]string")])  # register only `known`
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    for expression in ["has(body.unknown, 'a')", "hasAny(body.unknown, ['a'])", "hasAll(body.unknown, ['a', 'b'])", "hasToken(body.unknown, 'a')"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
            end_ms=int(now.timestamp() * 1000),
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200, got {response.status_code}: {response.text}"
        warnings = [w.get("message", "") for w in get_all_warnings(response.json())]
        assert any("not found in metadata" in w for w in warnings), f"{expression}: expected a key-not-found warning, got {warnings}"
