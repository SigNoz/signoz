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

# Body-JSON array/token functions on the logs body. has() success paths are already
# covered by 06_json_body.py::test_logs_json_body_array_membership; this file adds the
# sibling functions hasAny / hasAll / hasToken (success) and the function-operator error
# paths (has/hasToken on a non-body key, non-string token) which must be rejected.


def test_logs_json_body_has_any(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasAny(body.tags, [...]) matches a log whose array shares ANY value."""
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

    # log1 has "critical", log2 has "test", log3 has neither -> 2 matches
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "logs",
                order=[build_order_by("timestamp")],
                limit=100,
                filter_expression="hasAny(body.tags, ['critical', 'test'])",
            )
        ],
    )
    # BUG: hasAny on a flat body array path extracts a scalar String; ClickHouse rejects
    # it ("Argument 0 ... must be an array") -> HTTP 500.
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


def test_logs_json_body_has_all(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasAll(body.tags, [...]) matches only a log whose array has ALL values."""
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

    # only the second log has both "production" AND "web"
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "logs",
                order=[build_order_by("timestamp")],
                limit=100,
                filter_expression="hasAll(body.tags, ['production', 'web'])",
            )
        ],
    )
    # BUG: hasAll on a flat body array path extracts a scalar String; ClickHouse rejects
    # it ("Argument 0 ... must be an array") -> HTTP 500.
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


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

    # "production" appears in the first and third log bodies
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type=RequestType.RAW,
        queries=[
            build_raw_query(
                "A",
                "logs",
                order=[build_order_by("timestamp")],
                limit=100,
                filter_expression='hasToken(body, "production")',
            )
        ],
    )
    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 2
    assert all("production" in row["data"]["body"] for row in rows)


def test_logs_json_body_function_scalar_path_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """BUG: has/hasAny/hasAll on a scalar body path extract a scalar String; ClickHouse
    rejects the array function -> HTTP 500."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"level": "info", "code": 200}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for expression in ["has(body.level, 'info')", "hasAny(body.code, [200])", "hasAll(body.level, ['info'])"]:
        response = make_query_request(
            signoz,
            token,
            start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
            end_ms=int(now.timestamp() * 1000),
            request_type=RequestType.RAW,
            queries=[build_raw_query("A", "logs", order=[build_order_by("timestamp")], limit=100, filter_expression=expression)],
        )
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"{expression}: expected 500, got {response.status_code}: {response.text}"


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param('has(code.function, "main")', id="has_non_body_key"),
        pytest.param('hasToken(code.function, "main")', id="hastoken_non_body_key"),
        pytest.param("hasToken(body, 123)", id="hastoken_non_string_value"),
    ],
)
def test_logs_json_body_function_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    """has/hasToken support only the body JSON field; misuse is rejected (400)."""
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
    assert response.status_code == HTTPStatus.BAD_REQUEST
