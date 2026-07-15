"""
End-to-end tests for variables in /api/v5/query_range filter expressions
(GitHub issue #10008): standalone ($var, IN $var), composed inside values
('$env-suffix', LIKE '$env%'), and the special __all__ value.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    BuilderQuery,
    OrderBy,
    TelemetryFieldKey,
    get_column_data_from_response,
    get_scalar_table_data,
    make_query_request,
)


@pytest.mark.parametrize(
    "expression,variables,expected_logs",
    [
        pytest.param(
            "service.name = $service",
            {"service": {"type": "query", "value": "auth-service"}},
            {"auth-prod-log"},
            id="standalone_variable",
        ),
        pytest.param(
            "service.name IN $services",
            {"services": {"type": "custom", "value": ["auth-service", "api-service"]}},
            {"auth-prod-log", "api-prod-log"},
            id="array_variable",
        ),
        pytest.param(
            "cluster_name = '$environment-xyz'",
            {"environment": {"type": "dynamic", "value": "prod"}},
            {"auth-prod-log", "api-prod-log"},
            id="variable_composed_in_string",
        ),
        pytest.param(
            "cluster_name LIKE '$env%'",
            {"env": {"type": "text", "value": "prod"}},
            {"auth-prod-log", "api-prod-log"},
            id="variable_in_like_pattern",
        ),
        pytest.param(
            "path = '$region-$env-cluster'",
            {
                "region": {"type": "query", "value": "us-west"},
                "env": {"type": "custom", "value": "prod"},
            },
            {"auth-prod-log"},
            id="multiple_variables_in_string",
        ),
        pytest.param(
            "label = 'prefix-$var-suffix'",
            {"var": {"type": "text", "value": "middle"}},
            {"auth-prod-log"},
            id="variable_with_prefix_and_suffix",
        ),
        pytest.param(
            "cluster_name = $environment-xyz",
            {"environment": {"type": "custom", "value": "staging"}},
            {"web-staging-log"},
            id="variable_without_quotes",
        ),
        pytest.param(
            "service.name = $service",
            {"service": {"type": "query", "value": "auth-service"}},
            {"auth-prod-log"},
            id="query_variable_type",
        ),
        pytest.param(
            "service.name = $service",
            {"service": {"type": "custom", "value": "auth-service"}},
            {"auth-prod-log"},
            id="custom_variable_type",
        ),
        pytest.param(
            "service.name = $service",
            {"service": {"type": "text", "value": "auth-service"}},
            {"auth-prod-log"},
            id="text_variable_type",
        ),
        pytest.param(
            "service.name = $service",
            {"service": {"type": "dynamic", "value": "auth-service"}},
            {"auth-prod-log"},
            id="dynamic_variable_type",
        ),
        # `__all__` removes the filter condition entirely → all logs match
        pytest.param(
            "service.name = $service",
            {"service": {"type": "dynamic", "value": "__all__"}},
            {"auth-prod-log", "api-prod-log", "web-staging-log"},
            id="all_value_standalone",
        ),
        pytest.param(
            "cluster_name = '$environment-xyz'",
            {"environment": {"type": "dynamic", "value": "__all__"}},
            {"auth-prod-log", "api-prod-log", "web-staging-log"},
            id="all_value_in_composed_string",
        ),
        pytest.param(
            "service.name IN $services",
            {"services": {"type": "dynamic", "value": "__all__"}},
            {"auth-prod-log", "api-prod-log", "web-staging-log"},
            id="all_value_in_array",
        ),
        # `__all__` for service drops only that condition; env filter still applies
        pytest.param(
            "service.name = $service AND env = $env",
            {
                "service": {"type": "dynamic", "value": "__all__"},
                "env": {"type": "dynamic", "value": "production"},
            },
            {"auth-prod-log", "api-prod-log"},
            id="all_value_partial_filter",
        ),
    ],
)
def test_variable_in_query(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    variables: dict,
    expected_logs: set[str],
) -> None:
    """
    Runs a raw logs query with the filter expression and variables, then checks the
    set of matching log bodies.

    Canonical dataset:
    auth-prod-log:   service.name=auth-service, env=production, cluster_name=prod-xyz,
                     path=us-west-prod-cluster, label=prefix-middle-suffix
    api-prod-log:    service.name=api-service,  env=production, cluster_name=prod-xyz,
                     path=us-east-prod-cluster, label=prefix-other-suffix
    web-staging-log: service.name=web-service,  env=staging,    cluster_name=staging-xyz,
                     path=eu-west-staging-cluster
    """
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=5),
                body="auth-prod-log",
                resources={"service.name": "auth-service"},
                attributes={
                    "env": "production",
                    "cluster_name": "prod-xyz",
                    "path": "us-west-prod-cluster",
                    "label": "prefix-middle-suffix",
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=4),
                body="api-prod-log",
                resources={"service.name": "api-service"},
                attributes={
                    "env": "production",
                    "cluster_name": "prod-xyz",
                    "path": "us-east-prod-cluster",
                    "label": "prefix-other-suffix",
                },
            ),
            Logs(
                timestamp=now - timedelta(seconds=3),
                body="web-staging-log",
                resources={"service.name": "web-service"},
                attributes={
                    "env": "staging",
                    "cluster_name": "staging-xyz",
                    "path": "eu-west-staging-cluster",
                },
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    now = datetime.now(tz=UTC)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            BuilderQuery(
                signal="logs",
                limit=100,
                filter_expression=expression,
                order=[
                    OrderBy(key=TelemetryFieldKey(name="timestamp"), direction="desc"),
                    OrderBy(key=TelemetryFieldKey(name="id"), direction="desc"),
                ],
            ).to_dict()
        ],
        variables=variables,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    assert set(get_column_data_from_response(response.json(), "body")) == expected_logs


def test_variable_in_query_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    A composed variable in the filter works together with groupBy: count logs
    with cluster_name = '$env-xyz' grouped by service.name.
    """
    now = datetime.now(tz=UTC)
    logs: list[Logs] = []
    for i in range(3):
        for service, cluster in [
            ("auth-service", "prod-xyz"),
            ("api-service", "prod-xyz"),
            ("web-service", "staging-xyz"),
        ]:
            logs.append(
                Logs(
                    timestamp=now - timedelta(seconds=i + 1),
                    body=f"{service} log {i}",
                    resources={"service.name": service},
                    attributes={"cluster_name": cluster},
                )
            )
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    now = datetime.now(tz=UTC)

    # BuilderQuery has no groupBy field, so the spec is built inline
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="scalar",
        queries=[
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "logs",
                    "disabled": False,
                    "filter": {"expression": "cluster_name = '$env-xyz'"},
                    "groupBy": [{"name": "service.name", "fieldContext": "resource"}],
                    "aggregations": [{"expression": "count()"}],
                },
            }
        ],
        variables={"env": {"type": "query", "value": "prod"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    rows = get_scalar_table_data(response.json())
    assert sorted(rows) == [["api-service", 3], ["auth-service", 3]]
