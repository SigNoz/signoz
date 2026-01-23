from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_scalar_query,
    get_all_series,
    get_series_values,
    make_query_request,
    sum_series_values,
)

LOGS_COUNT_AGG = [{"expression": "count()"}]


def test_query_range_with_standalone_variable(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "auth-service"},
            attributes={"env": "production"},
            body="Auth service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "api-service"},
            attributes={"env": "production"},
            body="API service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "web-service"},
            attributes={"env": "staging"},
            body="Web service log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A", "logs", LOGS_COUNT_AGG, filter_expression="service.name = $service"
            )
        ],
        variables={"service": {"type": "query", "value": "auth-service"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 1  # auth-service log


def test_query_range_with_variable_in_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "auth-service"},
            attributes={"env": "production"},
            body="Auth service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "api-service"},
            attributes={"env": "production"},
            body="API service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "web-service"},
            attributes={"env": "staging"},
            body="Web service log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="service.name IN $services",
            )
        ],
        variables={
            "services": {"type": "custom", "value": ["auth-service", "api-service"]}
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 2  # auth-service and api-service logs


def test_query_range_with_variable_composed_in_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service1"},
            attributes={"cluster_name": "prod-xyz"},
            body="Prod cluster log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service2"},
            attributes={"cluster_name": "staging-xyz"},
            body="Staging cluster log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service3"},
            attributes={"cluster_name": "dev-xyz"},
            body="Dev cluster log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="cluster_name = '$environment-xyz'",
            )
        ],
        variables={"environment": {"type": "dynamic", "value": "prod"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 1  # prod-xyz log


def test_query_range_with_variable_in_like_pattern(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "prod-auth"},
            attributes={"env": "production"},
            body="Prod auth log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "prod-api"},
            attributes={"env": "production"},
            body="Prod API log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "staging-api"},
            attributes={"env": "staging"},
            body="Staging API log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="service.name LIKE '$env%'",
            )
        ],
        variables={"env": {"type": "text", "value": "prod"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 2  # prod-auth and prod-api logs


def test_query_range_with_multiple_variables_in_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service1"},
            attributes={"path": "us-west-prod-cluster"},
            body="US West Prod log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service2"},
            attributes={"path": "us-east-prod-cluster"},
            body="US East Prod log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service3"},
            attributes={"path": "eu-west-staging-cluster"},
            body="EU West Staging log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="path = '$region-$env-cluster'",
            )
        ],
        variables={
            "region": {"type": "query", "value": "us-west"},
            "env": {"type": "custom", "value": "prod"},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 1  # us-west-prod-cluster log


def test_query_range_with_variable_prefix_and_suffix(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service1"},
            attributes={"label": "prefix-middle-suffix"},
            body="Middle label log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service2"},
            attributes={"label": "prefix-other-suffix"},
            body="Other label log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="label = 'prefix-$var-suffix'",
            )
        ],
        variables={"var": {"type": "text", "value": "middle"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 1  # prefix-middle-suffix log


def test_query_range_with_variable_without_quotes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service1"},
            attributes={"cluster_name": "staging-xyz"},
            body="Staging cluster log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service2"},
            attributes={"cluster_name": "prod-xyz"},
            body="Prod cluster log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="cluster_name = $environment-xyz",
            )
        ],
        variables={"environment": {"type": "custom", "value": "staging"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 1  # staging-xyz log


def test_query_range_time_series_with_group_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = []

    for i in range(3):
        logs.append(
            Logs(
                timestamp=now - timedelta(minutes=i + 1),
                resources={"service.name": "auth-service"},
                attributes={"cluster_name": "prod-xyz"},
                body=f"Auth service log {i}",
                severity_text="INFO",
            )
        )
        logs.append(
            Logs(
                timestamp=now - timedelta(minutes=i + 1),
                resources={"service.name": "api-service"},
                attributes={"cluster_name": "prod-xyz"},
                body=f"API service log {i}",
                severity_text="INFO",
            )
        )
        logs.append(
            Logs(
                timestamp=now - timedelta(minutes=i + 1),
                resources={"service.name": "web-service"},
                attributes={"cluster_name": "staging-xyz"},
                body=f"Web service log {i}",
                severity_text="INFO",
            )
        )

    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="cluster_name = '$env-xyz'",
                group_by=[
                    {
                        "name": "service.name",
                        "fieldDataType": "string",
                        "fieldContext": "resource",
                    }
                ],
            )
        ],
        variables={"env": {"type": "query", "value": "prod"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    all_series = get_all_series(response.json(), "A")
    assert len(all_series) == 2  # auth-service and api-service

    # 6 (3 auth-service + 3 api-service)
    total_count = sum(sum_series_values(s["values"]) for s in all_series)
    assert total_count == 6


def test_query_range_with_different_variable_types(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "auth-service"},
            attributes={"env": "production"},
            body="Auth service log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # all different variable types
    for var_type in ["query", "custom", "text", "dynamic"]:
        response = make_query_request(
            signoz,
            token,
            start_ms,
            end_ms,
            [
                build_scalar_query(
                    "A",
                    "logs",
                    LOGS_COUNT_AGG,
                    filter_expression="service.name = $service",
                )
            ],
            variables={"service": {"type": var_type, "value": "auth-service"}},
        )

        assert (
            response.status_code == HTTPStatus.OK
        ), f"Failed for variable type: {var_type}"
        assert response.json()["status"] == "success"

        values = get_series_values(response.json(), "A")
        total_count = sum_series_values(values)
        assert (
            total_count == 1
        ), f"Expected 1 log for variable type {var_type}, got {total_count}"


def test_query_range_with_all_value_standalone(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "auth-service"},
            attributes={"env": "production"},
            body="Auth service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "api-service"},
            attributes={"env": "production"},
            body="API service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "web-service"},
            attributes={"env": "staging"},
            body="Web service log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # `__all__`, the filter condition should be removed
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A", "logs", LOGS_COUNT_AGG, filter_expression="service.name = $service"
            )
        ],
        variables={"service": {"type": "dynamic", "value": "__all__"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 3


def test_query_range_with_all_value_in_composed_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service1"},
            attributes={"cluster_name": "prod-xyz"},
            body="Prod cluster log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service2"},
            attributes={"cluster_name": "staging-xyz"},
            body="Staging cluster log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "service3"},
            attributes={"cluster_name": "dev-xyz"},
            body="Dev cluster log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # `__all__` in composed string, the filter should be removed
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="cluster_name = '$environment-xyz'",
            )
        ],
        variables={"environment": {"type": "dynamic", "value": "__all__"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 3  # all logs should be returned


def test_query_range_with_all_value_partial_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "auth-service"},
            attributes={"env": "production"},
            body="Auth prod log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "api-service"},
            attributes={"env": "production"},
            body="API prod log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "web-service"},
            attributes={"env": "staging"},
            body="Web staging log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    # `__all__` for service, only env filter should apply
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="service.name = $service AND env = $env",
            )
        ],
        variables={
            "service": {"type": "dynamic", "value": "__all__"},
            "env": {"type": "dynamic", "value": "production"},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 2  # prod logs (auth + api)


def test_query_range_with_all_value_in_array(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    logs: List[Logs] = [
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "auth-service"},
            attributes={"env": "production"},
            body="Auth service log",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(minutes=1),
            resources={"service.name": "api-service"},
            attributes={"env": "production"},
            body="API service log",
            severity_text="INFO",
        ),
    ]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            build_scalar_query(
                "A",
                "logs",
                LOGS_COUNT_AGG,
                filter_expression="service.name IN $services",
            )
        ],
        variables={"services": {"type": "dynamic", "value": "__all__"}},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    values = get_series_values(response.json(), "A")
    total_count = sum_series_values(values)
    assert total_count == 2  # all logs
