from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, change_user_role, create_active_user
from fixtures.logs import Logs
from fixtures.querier import build_raw_query, make_query_request
from fixtures.role import transaction_group

user_password = "password123Z$"
service_role = "telemetry-scope-service"
service_email = "scope-service@telemetry.test"
service_env_role = "telemetry-scope-service-env"
service_env_email = "scope-service-env@telemetry.test"

seed_resources = {"service.name": "checkout", "deployment.environment.name": "prod"}


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_role(admin_token, service_role, [transaction_group("read", "telemetryresource", "logs", ["builder_query/resource.service.name/checkout"])])
    service_user = create_active_user(signoz, admin_token, email=service_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, service_user, "signoz-viewer", service_role)

    create_role(
        admin_token,
        service_env_role,
        [transaction_group("read", "telemetryresource", "logs", ["builder_query/resource.service.name/checkout", "builder_query/resource.deployment.environment.name/prod"])],
    )
    service_env_user = create_active_user(signoz, admin_token, email=service_env_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, service_env_user, "signoz-viewer", service_env_role)


@pytest.mark.parametrize(
    "expression",
    [
        "resource.service.name = 'checkout'",
        "resource.service.name IN ('checkout')",
        "resource.service.name = 'checkout' AND severity_text = 'ERROR'",
    ],
)
def test_service_grant_allows_service_filter(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources=seed_resources, body="checkout-0")])

    response = make_query_request(
        signoz,
        get_token(service_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=expression)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text


@pytest.mark.parametrize(
    ("expression", "denied_resource"),
    [
        ("service.name = 'checkout'", "builder_query/*"),  # bare customer key never scopes
        ("resource.deployment.environment.name = 'prod'", "builder_query/resource.deployment.environment.name/prod"),
        # every top-level grant-key atom needs its own grant, so narrowing by a second key is denied
        ("resource.service.name = 'checkout' AND resource.deployment.environment.name = 'prod'", "builder_query/resource.deployment.environment.name/prod"),
        ("resource.service.name = 'frontend'", "builder_query/resource.service.name/frontend"),
    ],
)
def test_service_grant_denies_other_keys(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    denied_resource: str,
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources=seed_resources, body="checkout-0")])

    response = make_query_request(
        signoz,
        get_token(service_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=expression)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert denied_resource in response.text


def test_grants_on_both_keys_allow_conjunction(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources=seed_resources, body="checkout-0")])

    response = make_query_request(
        signoz,
        get_token(service_env_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression="resource.service.name = 'checkout' AND resource.deployment.environment.name = 'prod'")],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text
