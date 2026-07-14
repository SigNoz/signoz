"""
Tests for the /api/v5/substitute_vars endpoint (GitHub issue #10008).

Variables are supported both as standalone RHS values (field = $var, field IN $var)
and composed inside values ('$env-suffix', LIKE '$env%').
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import make_substitute_vars_request

LOGS_COUNT_AGG = [{"expression": "count()"}]


def build_logs_query(filter_expression: str) -> dict:
    return {
        "type": "builder_query",
        "spec": {
            "name": "A",
            "signal": "logs",
            "stepInterval": 60,
            "disabled": False,
            "aggregations": LOGS_COUNT_AGG,
            "filter": {"expression": filter_expression},
        },
    }


def substitute(
    signoz: types.SigNoz,
    token: str,
    filter_expression: str,
    variables: dict[str, Any],
) -> Any:
    now = datetime.now(tz=UTC)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query(filter_expression)],
        variables,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    queries = response.json()["data"]["compositeQuery"]["queries"]
    assert len(queries) == 1
    return queries[0]["spec"]["filter"]["expression"]


def test_substitute_vars_standalone_variable(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    filter_expr = substitute(
        signoz,
        token,
        "service.name = $service",
        {"service": {"type": "query", "value": "auth-service"}},
    )
    assert filter_expr == "service.name = 'auth-service'"


def test_substitute_vars_variable_in_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    filter_expr = substitute(
        signoz,
        token,
        "cluster_name = '$environment-xyz'",
        {"environment": {"type": "custom", "value": "prod"}},
    )
    assert filter_expr == "cluster_name = 'prod-xyz'"


def test_substitute_vars_multiple_variables(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    filter_expr = substitute(
        signoz,
        token,
        "service.name = $service AND env = $environment",
        {
            "service": {"type": "text", "value": "auth-service"},
            "environment": {"type": "query", "value": "production"},
        },
    )
    assert filter_expr == "service.name = 'auth-service' AND env = 'production'"


def test_substitute_vars_array_variable(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    filter_expr = substitute(
        signoz,
        token,
        "service.name IN $services",
        {"services": {"type": "query", "value": ["auth-service", "api-service"]}},
    )
    assert filter_expr == "service.name IN ['auth-service', 'api-service']"


def test_substitute_vars_like_pattern(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    filter_expr = substitute(
        signoz,
        token,
        "service.name LIKE '$env%'",
        {"env": {"type": "text", "value": "prod"}},
    )
    assert filter_expr == "service.name LIKE 'prod%'"


def test_substitute_vars_variable_without_quotes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    filter_expr = substitute(
        signoz,
        token,
        "cluster_name = $environment-xyz",
        {"environment": {"type": "dynamic", "value": "staging"}},
    )
    assert filter_expr == "cluster_name = 'staging-xyz'"


def test_substitute_vars_unknown_embedded_variable_untouched(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # `env` must not match inside the longer, undefined `$environment` reference.
    # Unresolved $-prefixed values come back unquoted so they stay variable-shaped.
    filter_expr = substitute(
        signoz,
        token,
        "cluster_name = '$environment-xyz'",
        {"env": {"type": "custom", "value": "prod"}},
    )
    assert filter_expr == "cluster_name = $environment-xyz"


def test_substitute_vars_all_value_standalone(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # expression should be empty when __all__ is used
    filter_expr = substitute(
        signoz,
        token,
        "service.name = $service",
        {"service": {"type": "dynamic", "value": "__all__"}},
    )
    assert filter_expr == ""


def test_substitute_vars_all_value_in_composed_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # expression should be empty when __all__ is embedded in a composed value
    filter_expr = substitute(
        signoz,
        token,
        "cluster_name = '$environment-xyz'",
        {"environment": {"type": "dynamic", "value": "__all__"}},
    )
    assert filter_expr == ""


def test_substitute_vars_all_value_partial(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # only the env condition should remain
    filter_expr = substitute(
        signoz,
        token,
        "service.name = $service AND env = $env",
        {
            "service": {"type": "dynamic", "value": "__all__"},
            "env": {"type": "dynamic", "value": "production"},
        },
    )
    assert filter_expr == "env = 'production'"
