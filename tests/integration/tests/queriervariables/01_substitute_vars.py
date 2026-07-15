"""
Tests for the /api/v5/substitute_vars endpoint (GitHub issue #10008).

Variables are supported both as standalone RHS values (field = $var, field IN $var)
and composed inside values ('$env-suffix', LIKE '$env%').
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import Aggregation, BuilderQuery, make_substitute_vars_request


@pytest.mark.parametrize(
    "expression,variables,expected",
    [
        pytest.param(
            "service.name = $service",
            {"service": {"type": "query", "value": "auth-service"}},
            "service.name = 'auth-service'",
            id="standalone_variable",
        ),
        pytest.param(
            "cluster_name = '$environment-xyz'",
            {"environment": {"type": "custom", "value": "prod"}},
            "cluster_name = 'prod-xyz'",
            id="variable_in_string",
        ),
        pytest.param(
            "service.name = $service AND env = $environment",
            {
                "service": {"type": "text", "value": "auth-service"},
                "environment": {"type": "query", "value": "production"},
            },
            "service.name = 'auth-service' AND env = 'production'",
            id="multiple_variables",
        ),
        pytest.param(
            "service.name IN $services",
            {"services": {"type": "query", "value": ["auth-service", "api-service"]}},
            "service.name IN ['auth-service', 'api-service']",
            id="array_variable",
        ),
        pytest.param(
            "service.name LIKE '$env%'",
            {"env": {"type": "text", "value": "prod"}},
            "service.name LIKE 'prod%'",
            id="like_pattern",
        ),
        pytest.param(
            "cluster_name = $environment-xyz",
            {"environment": {"type": "dynamic", "value": "staging"}},
            "cluster_name = 'staging-xyz'",
            id="variable_without_quotes",
        ),
        # `env` must not match inside the longer, undefined `$environment` reference.
        # Unresolved $-prefixed values come back unquoted so they stay variable-shaped.
        pytest.param(
            "cluster_name = '$environment-xyz'",
            {"env": {"type": "custom", "value": "prod"}},
            "cluster_name = $environment-xyz",
            id="unknown_embedded_variable_untouched",
        ),
        # expression should be empty when __all__ is used
        pytest.param(
            "service.name = $service",
            {"service": {"type": "dynamic", "value": "__all__"}},
            "",
            id="all_value_standalone",
        ),
        pytest.param(
            "cluster_name = '$environment-xyz'",
            {"environment": {"type": "dynamic", "value": "__all__"}},
            "",
            id="all_value_in_composed_string",
        ),
        # only the env condition should remain
        pytest.param(
            "service.name = $service AND env = $env",
            {
                "service": {"type": "dynamic", "value": "__all__"},
                "env": {"type": "dynamic", "value": "production"},
            },
            "env = 'production'",
            id="all_value_partial",
        ),
    ],
)
def test_substitute_vars(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
    variables: dict,
    expected: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    now = datetime.now(tz=UTC)

    response = make_substitute_vars_request(
        signoz,
        token,
        int((now - timedelta(minutes=5)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [
            BuilderQuery(
                signal="logs",
                aggregations=[Aggregation("count()")],
                step_interval=60,
                filter_expression=expression,
            ).to_dict()
        ],
        variables,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    queries = response.json()["data"]["compositeQuery"]["queries"]
    assert len(queries) == 1
    assert queries[0]["spec"]["filter"]["expression"] == expected
