import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    RequestType,
    build_order_by,
    build_raw_query,
    get_rows,
    make_query_request,
)


def test_logs_json_body_array_membership(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """has(body.<array>[*], value) matches logs whose body array contains the value, across
    string, numeric and boolean element types."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"], "ids": [100, 200, 300], "flags": [True, False, True]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["staging", "api", "test"], "ids": [200, 400, 500], "flags": [False, False, True]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"], "ids": [100, 600, 700], "flags": [True, True, False]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='has(body.tags[*], "production")')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 2
    assert all("production" in json.loads(row["data"]["body"])["tags"] for row in rows)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.ids[*], 200)")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 2
    assert all(200 in json.loads(row["data"]["body"])["ids"] for row in rows)

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.flags[*], true)")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 3
    assert all(True in json.loads(row["data"]["body"])["flags"] for row in rows)


def test_logs_json_body_has_type_collision(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A numeric-looking string needle matches a numeric body array (the needle is coerced to a number)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"ids": [100, 200, 300]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"ids": [400, 500]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='has(body.ids, "200")')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    assert 200 in json.loads(rows[0]["data"]["body"])["ids"]


def test_logs_json_body_has_mixed_type_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """has() over a mixed-type body array must not error (no ClickHouse "no supertype"). The
    needle's type selects the view: a numeric needle matches numeric elements (non-numeric →
    NULL, skipped), a string needle matches every element rendered as text."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"ids": [100, "abc", 300]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.ids, 100)", 1),  # numeric needle → matches the numeric element
        ("has(body.ids, 999)", 0),  # numeric needle → no match, non-numeric "abc" is NULL not 0
        ("has(body.ids, 'abc')", 1),  # string needle → matches the string element
    ]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200, got {response.status_code}: {response.text}"
        assert len(get_rows(response)) == expected, f"{expression}: expected {expected} match(es)"


def test_logs_json_body_has_any(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasAny(body.tags, [...]) matches a log whose array shares any listed value."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["staging", "api", "test"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"]}),
                severity_text="INFO",
            ),
        ]
    )
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
    assert all(("critical" in json.loads(row["data"]["body"])["tags"]) or ("test" in json.loads(row["data"]["body"])["tags"]) for row in rows)


def test_logs_json_body_has_all(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasAll(body.tags, [...]) matches only a log whose array has all listed values."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"]}),
                severity_text="INFO",
            ),
        ]
    )
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
    tags = json.loads(rows[0]["data"]["body"])["tags"]
    assert "production" in tags and "web" in tags


def test_logs_json_body_has_token(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasToken(body, 'token') matches logs whose body text contains the token."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["staging", "api", "test"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='hasToken(body, "production")')],
    )
    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 2
    assert all("production" in row["data"]["body"] for row in rows)


def test_logs_json_body_function_scalar_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """has/hasAny/hasAll on a scalar (non-array) body path treat the scalar as a single-element
    set: has = equals, hasAny/hasAll = membership. So has and hasAll coincide for a scalar."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"level": "info", "code": 200}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"level": "debug", "code": 500}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Each expression matches only the first log (level=info, code=200).
    for expression in ["has(body.level, 'info')", "hasAny(body.code, [200, 999])", "hasAll(body.level, ['info'])"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
            end_ms=int(now.timestamp() * 1000),
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200, got {response.status_code}: {response.text}"
        rows = get_rows(response)
        assert len(rows) == 1, f"{expression}: expected 1 match, got {len(rows)}"
        assert json.loads(rows[0]["data"]["body"])["level"] == "info", f"{expression}: matched wrong row"

    # hasAll is contains-all: a scalar (single-element set) can't hold two distinct values, so nothing matches.
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasAll(body.level, ['info', 'debug'])")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert get_rows(response) == [], "hasAll(scalar, [two distinct values]) should match nothing (contains-all)"


@pytest.mark.parametrize(
    "expression, expected_error",
    [
        # A has-family function on a non-body key is unsupported (not merely "key not found"):
        # the error names the body-only restriction so the user knows to prefix with `body.`.
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
    """has/hasToken support only the body JSON field; misuse is rejected (400) with a message that
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


def test_logs_json_body_type_match_by_needle(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """The element type is inferred from the needle (legacy has no schema): a string needle
    searches as String, a quoted-integer needle as Int64, a decimal needle as Float64. A
    numeric-string body array (["100","200"]) is parsed, so numeric needles still match it."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body=json.dumps({"vals": ["prod", "api"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body=json.dumps({"vals": [100, 200, 300]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"vals": [1.5, 2.5]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"vals": ["100", "200"]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.vals, 'prod')", 1),  # String -> only the string array
        ('has(body.vals, "200")', 2),  # quoted Int64 -> [100,200,300] and ["100","200"]
        ("has(body.vals, 1.5)", 1),  # Float64 -> only the float array
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


def test_logs_json_body_large_integer_exact(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Large ids (> 2^53) stay exact only when QUOTED (extracted as Int64). An unquoted numeric
    literal is parsed as float64 upstream, so it false-matches neighbouring ids (documented)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"id": [1234567890123456789]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"id": [1234567890123456788]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # Quoted -> Int64 -> exact: matches only the exact id, not the neighbour.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='has(body.id, "1234567890123456789")')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1, "quoted big id should match exactly one log"
    assert json.loads(rows[0]["data"]["body"])["id"] == [1234567890123456789]

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
) -> None:
    """A needle whose type doesn't match the body array must never raise a ClickHouse "no
    supertype" error (code 386): it returns 200 with no match (Nullable extraction -> NULL)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"names": ["alice", "bob"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"nums": [100, 200]}), severity_text="INFO"),
        ]
    )
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
        assert response.status_code == HTTPStatus.OK, f"{expression}: expected 200 (no supertype error), got {response.status_code}: {response.text}"
        assert get_rows(response) == [], f"{expression}: type mismatch should match nothing"


def test_logs_json_body_mixed_needle_args(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A value list mixing types (e.g. [200, "abc"]) is NOT rejected; it falls back to a string
    comparison (safe, no error). Numbers render to their text form, so both logs match."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"vals": [100, 200, 300]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"vals": ["abc", "xyz"]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression='hasAny(body.vals, [200, "abc"])')],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert len(get_rows(response)) == 2, "mixed-type args fall back to string comparison; both logs match"


def test_logs_json_body_nested_array_path(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """has over a path that traverses arrays (body.edu[*].names) searches the flattened leaf."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"edu": [{"names": ["IIT", "MIT"]}, {"names": ["CMU"]}]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"edu": [{"names": ["Stanford"]}]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [("has(body.edu[*].names, 'MIT')", 1), ("has(body.edu[*].names, 'Yale')", 0)]:
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
) -> None:
    """has matches nothing for a missing key, an empty array, or a null value (only the log
    that actually contains the value matches)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body=json.dumps({"other": [1, 2]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body=json.dumps({"vals": []}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"vals": None}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"vals": ["x"]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.vals, 'x')")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1, "only the log whose vals contains 'x' matches"
    assert json.loads(rows[0]["data"]["body"])["vals"] == ["x"]


def test_logs_json_body_negative_and_special_chars(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Negative integers and strings with spaces/special chars match correctly."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"nums": [-5, -10]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["a b", "c/d"]}), severity_text="INFO"),
        ]
    )
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


def test_logs_json_body_type_isolation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Type isolation (regression guard). A bool needle matches only genuine booleans, not
    "truthy" numbers/strings; an empty-string or zero needle does not false-match array bodies;
    genuine scalar bool / zero / empty-string bodies still match (the single-element-set path)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=5), resources={"service.name": "app-service"}, body=json.dumps({"nums": [100, 200, 300]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body=json.dumps({"flags": [True, False]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["a", "b"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"flag": True}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"code": 0}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.nums, true)", 0),  # bool needle does NOT truthy-match a numeric array
        ("has(body.flags, true)", 1),  # genuine bool array matches
        ("has(body.flag, true)", 1),  # genuine scalar bool matches
        ("has(body.tags, '')", 0),  # empty-string does NOT false-match an array body
        ("has(body.nums, 0)", 0),  # zero does NOT false-match an array body without a 0
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


def test_logs_json_body_negation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """NOT has/hasAny/hasAll/hasToken is the boolean complement over the queried rows: a row
    matches the negation unless it affirmatively contains the value. Rows missing the key and
    rows with an empty array therefore MATCH the negation (they don't contain the value)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["production", "api"]}), severity_text="ERROR"),
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["staging", "web"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"other": [1, 2]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"tags": []}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # positive count, then its negation over the same 4 rows (missing-key + empty-array rows
    # fall into the negation).
    for expression, expected in [
        ("has(body.tags, 'production')", 1),
        ("NOT has(body.tags, 'production')", 3),
        ("hasAny(body.tags, ['production', 'staging'])", 2),
        ("NOT hasAny(body.tags, ['production', 'staging'])", 2),
        ("hasAll(body.tags, ['production', 'api'])", 1),
        ("NOT hasAll(body.tags, ['production', 'api'])", 3),
        ("hasToken(body, 'production')", 1),
        ("NOT hasToken(body, 'production')", 3),
        # numeric needle: missing-key rows match the negation (NULL coalesced to false)
        ("has(body.other, 2)", 1),
        ("NOT has(body.other, 2)", 3),
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


def test_logs_json_body_empty_needle_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """An empty value list — hasAny(k, []) / hasAll(k, []) — is a parse-level syntax error (400),
    not an empty-set / vacuous-truth match and not a ClickHouse 500."""
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


def test_logs_json_body_hastoken_semantics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasToken over the body is case-insensitive (both sides lowered) and matches whole tokens,
    not substrings. In flag-off mode hasToken only accepts the bare `body`; a body sub-path is
    rejected (400)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"message": "Request from PRODUCTION node"}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"message": "staging deploy done"}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("hasToken(body, 'production')", 1),  # case-insensitive: matches "PRODUCTION"
        ("hasToken(body, 'PRODUCTION')", 1),
        ("hasToken(body, 'prod')", 0),  # whole-token match, not a substring of "production"
        ("hasToken(body, 'staging')", 1),
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

    # legacy hasToken only searches the bare body string; a body sub-path is rejected up front.
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="hasToken(body.message, 'production')")],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_logs_json_body_numeric_cross_type(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A float needle matches an integer array (both compared as Float64), but an integer/float
    needle absent from a float array does not match."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"ints": [1, 2, 3]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"floats": [1.5, 2.5]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.ints, 2)", 1),
        ("has(body.ints, 2.0)", 1),  # float needle matches the integer element 2
        ("has(body.floats, 1.5)", 1),
        ("has(body.floats, 2)", 0),  # 2 is not present in [1.5, 2.5]
        ("has(body.floats, 2.0)", 0),
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
) -> None:
    """has(body.flag, false) matches a genuine scalar false (not just true), and false membership
    works over a bool array. NOT has(body.flag, false) matches every row that isn't a scalar
    false, including rows missing the key."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "app-service"}, body=json.dumps({"flag": True}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body=json.dumps({"flag": False}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"flags": [True, False]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"other": 1}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.flag, true)", 1),
        ("has(body.flag, false)", 1),  # genuine scalar false matches
        ("NOT has(body.flag, false)", 3),  # everything except the scalar-false row
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
) -> None:
    """has-family calls compose with AND/OR and other predicates and with parentheses."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["a", "b"]}), severity_text="ERROR"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["a", "c"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["x", "y"]}), severity_text="ERROR"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.tags, 'a') AND severity_text = 'ERROR'", 1),  # only the ERROR row with 'a'
        ("(has(body.tags, 'b') OR has(body.tags, 'x'))", 2),
        ("has(body.tags, 'a') AND has(body.tags, 'c')", 1),  # both tokens on one row
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
) -> None:
    """has resolves a hyphenated key (body.user-agent) and a deeply nested scalar (body.a.b.c)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"user-agent": ["curl", "wget"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"a": {"b": {"c": "deep"}}}), severity_text="INFO"),
        ]
    )
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


def test_logs_json_body_nested_scalar_leaf_limitation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Legacy limitation: a scalar leaf reached THROUGH an array hop (body.edu[*].name) does not
    match in flag-off mode, even when the value is present -- the JSON_QUERY array extraction only
    resolves an array leaf (see test_logs_json_body_nested_array_path, which uses edu[*].names).
    Documented so the behaviour is visible; flag-on mode (03_body_array_functions) resolves it."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"edu": [{"name": "IIT"}, {"name": "MIT"}]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"edu": [{"name": "Stanford"}]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression in ["has(body.edu[*].name, 'MIT')", "has(body.edu[*].name, 'Yale')"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert get_rows(response) == [], f"{expression}: legacy scalar-leaf-through-array does not match"


def test_logs_json_body_non_json_body(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A non-JSON (plain text) body: has(body.<path>, ...) matches nothing without erroring, while
    hasToken(body, ...) still tokenizes the raw text."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body="plain text with production token", severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body="another staging line", severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("has(body.tags, 'production')", 0),  # no JSON path -> no match, no error
        ("hasToken(body, 'production')", 1),  # raw text still tokenizes
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


def test_logs_json_body_duplicate_needle_and_case(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A duplicated value in hasAll collapses to a single membership check, and has is
    case-sensitive (unlike hasToken)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["Prod", "api"]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["prod"]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression, expected in [
        ("hasAll(body.tags, ['api', 'api'])", 1),  # duplicate needle == single membership
        ("has(body.tags, 'prod')", 1),  # matches lowercase 'prod', not 'Prod'
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


def test_logs_json_body_degenerate_targets(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """has on an unsupported target: an object leaf or array-of-arrays silently matches nothing
    in flag-off mode (no metadata to reject it up front, no ClickHouse error); the bare body is
    rejected (400)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"obj": {"b": "x"}, "matrix": [[1, 2], [3]]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    for expression in ["has(body.obj, 'x')", "has(body.matrix, 1)"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
        assert get_rows(response) == [], f"{expression}: unsupported target matches nothing"

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body, 'x')")],
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_logs_json_body_genuine_empty_and_zero_elements(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Positive complement of type isolation: an array that genuinely contains ''/0 DOES match
    those needles (the JSONType/Nullable guards must not over-filter)."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["", "a"], "nums": [0, 1]}), severity_text="INFO"),
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"tags": ["b"], "nums": [5]}), severity_text="INFO"),
        ]
    )
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
) -> None:
    """Needles containing quotes, accents and emoji round-trip through parsing and SQL escaping."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"words": ["it's", "café", "🚀 rocket", 'say "hi"']}), severity_text="INFO"),
        ]
    )
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
    needle: str,
) -> None:
    """KNOWN BUG (currently 500). hasToken maps to ClickHouse hasToken(LOWER(body), LOWER(?)),
    which rejects a needle containing whitespace or separator characters (`.`/`_`/`-`/space) with
    error code 36 ("Needle must not contain whitespace or separator characters"). The querier
    passes the user needle straight through, so the query fails during execution and the raw CH
    error surfaces as a 500 rather than a 400 / graceful fallback. Common needles like an IP,
    `user_id` or a UUID hit this. Flip this to 400 (or a fallback match) once the needle is
    validated."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"message": "client 192.168.1.1 user_id error-code production node"}), severity_text="INFO"),
        ]
    )
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


@pytest.mark.parametrize(
    "func",
    [
        pytest.param("hasAny", id="hasany"),
        pytest.param("hasAll", id="hasall"),
    ],
)
def test_logs_json_body_hasany_hasall_large_quoted_int_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    func: str,
) -> None:
    """KNOWN BUG (currently 500). A quoted integer needle >= 2^32 in hasAny/hasAll fails with
    ClickHouse code 386 ("no supertype for types UInt64, Int64") -> 500. The body array is
    extracted as Array(Nullable(Int64)), but the needle array is bound as Array(UInt64) for values
    that don't fit UInt32, and CH has no Int64/UInt64 supertype at the array-vs-array type level.
    Single has() is unaffected because scalar-vs-array coercion is value-level (asserted below as a
    contrast). When fixed (bind the needle array as Int64) this should return 200 with an exact
    match like has()."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body=json.dumps({"id": [9007199254740993]}), severity_text="INFO"),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # hasAny/hasAll with a quoted big int (>= 2^32) -> 500 (no supertype).
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=f"{func}(body.id, ['9007199254740993'])")],
    )
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"{func}: expected 500, got {response.status_code}: {response.text}"

    # Contrast: single has() with the same quoted big int works (exact Int64 match, 1 row).
    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
        queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression="has(body.id, '9007199254740993')")],
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert len(get_rows(response)) == 1, "single has() with a quoted big int should match exactly one log"
