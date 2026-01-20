from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any, Callable, Dict, List, Optional

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import DEFAULT_STEP_INTERVAL, QUERY_TIMEOUT


def build_logs_query(
    name: str,
    *,
    filter_expression: Optional[str] = None,
    step_interval: int = DEFAULT_STEP_INTERVAL,
    group_by: Optional[List[Dict]] = None,
    aggregations: Optional[List[Dict]] = None,
    disabled: bool = False,
) -> Dict[str, Any]:
    spec: Dict[str, Any] = {
        "name": name,
        "signal": "logs",
        "stepInterval": step_interval,
        "disabled": disabled,
        "having": {"expression": ""},
        "aggregations": aggregations or [{"expression": "count()"}],
    }

    if filter_expression:
        spec["filter"] = {"expression": filter_expression}

    if group_by:
        spec["groupBy"] = group_by

    return {"type": "builder_query", "spec": spec}


def make_substitute_vars_request(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    queries: List[Dict],
    variables: Dict[str, Any],
    timeout: int = QUERY_TIMEOUT,
) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/substitute_vars"),
        timeout=timeout,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": start_ms,
            "end": end_ms,
            "requestType": "time_series",
            "compositeQuery": {"queries": queries},
            "variables": variables,
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )


def test_substitute_vars_standalone_variable(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="service.name = $service")],
        variables={"service": {"type": "query", "value": "auth-service"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "service.name = 'auth-service'"


def test_substitute_vars_variable_in_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="cluster_name = '$environment-xyz'")],
        variables={"environment": {"type": "custom", "value": "prod"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "cluster_name = 'prod-xyz'"


def test_substitute_vars_multiple_variables(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_logs_query(
                "A", filter_expression="service.name = $service AND env = $environment"
            )
        ],
        variables={
            "service": {"type": "text", "value": "auth-service"},
            "environment": {"type": "query", "value": "production"},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "service.name = 'auth-service' AND env = 'production'"


def test_substitute_vars_array_variable(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="service.name IN $services")],
        variables={
            "services": {"type": "query", "value": ["auth-service", "api-service"]}
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "service.name IN ['auth-service', 'api-service']"


def test_substitute_vars_like_pattern(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="service.name LIKE '$env%'")],
        variables={"env": {"type": "text", "value": "prod"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "service.name LIKE 'prod%'"


def test_substitute_vars_variable_without_quotes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="cluster_name = $environment-xyz")],
        variables={"environment": {"type": "dynamic", "value": "staging"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "cluster_name = 'staging-xyz'"


def test_substitute_vars_all_value_standalone(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="service.name = $service")],
        variables={"service": {"type": "dynamic", "value": "__all__"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    # expression should be empty when __all__ is used
    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == ""


def test_substitute_vars_all_value_in_composed_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [build_logs_query("A", filter_expression="cluster_name = '$environment-xyz'")],
        variables={"environment": {"type": "dynamic", "value": "__all__"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    # expression should be empty when __all__ is used
    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == ""


def test_substitute_vars_all_value_partial(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_substitute_vars_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_logs_query(
                "A", filter_expression="service.name = $service AND env = $env"
            )
        ],
        variables={
            "service": {"type": "dynamic", "value": "__all__"},
            "env": {"type": "dynamic", "value": "production"},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    data = response.json()["data"]
    queries = data["compositeQuery"]["queries"]
    assert len(queries) == 1

    # only env condition should remain
    filter_expr = queries[0]["spec"]["filter"]["expression"]
    assert filter_expr == "env = 'production'"
