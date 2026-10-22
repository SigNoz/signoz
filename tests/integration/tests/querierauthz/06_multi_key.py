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
env_role = "telemetry-scope-env"
env_email = "scope-env@telemetry.test"
two_services_role = "telemetry-scope-two-services"
two_services_email = "scope-two-services@telemetry.test"
two_keys_role = "telemetry-scope-two-keys"
two_keys_email = "scope-two-keys@telemetry.test"
mixed_role = "telemetry-scope-mixed"
mixed_email = "scope-mixed@telemetry.test"
key_wild_role = "telemetry-scope-key-wild"
key_wild_email = "scope-key-wild@telemetry.test"

two_lists = "resource.service.name IN ('checkout', 'frontend') AND signoz.workspace.key.id IN ('k1', 'k2')"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for role, email, selectors in [
        (service_role, service_email, ["builder_query/resource.service.name/checkout"]),
        (env_role, env_email, ["builder_query/resource.deployment.environment.name/prod"]),
        (two_services_role, two_services_email, ["builder_query/resource.service.name/checkout", "builder_query/resource.service.name/frontend"]),
        (two_keys_role, two_keys_email, ["builder_query/signoz.workspace.key.id/k1", "builder_query/signoz.workspace.key.id/k2"]),
        (mixed_role, mixed_email, ["builder_query/resource.service.name/checkout", "builder_query/signoz.workspace.key.id/k2"]),
        (key_wild_role, key_wild_email, ["builder_query/signoz.workspace.key.id/*"]),
    ]:
        create_role(admin_token, role, [transaction_group("read", "telemetryresource", "logs", selectors)])
        user_id = create_active_user(signoz, admin_token, email=email, role="signoz-viewer", password=user_password)
        change_user_role(signoz, admin_token, user_id, "signoz-viewer", role)


@pytest.fixture(name="seed_logs")
def seed_logs_fixture(insert_logs: Callable[[list[Logs]], None]) -> datetime:
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "checkout", "signoz.workspace.key.id": "k1", "deployment.environment.name": "prod"}, body="checkout-k1"),
            Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "frontend", "signoz.workspace.key.id": "k2", "deployment.environment.name": "prod"}, body="frontend-k2"),
        ]
    )
    return now


@pytest.mark.parametrize(
    ("email", "expression"),
    [
        (service_email, "resource.service.name = 'checkout'"),
        (service_email, "resource.service.name IN ('checkout')"),
        (service_email, "resource.service.name = 'checkout' AND severity_text = 'ERROR'"),
        # any granted atom selects the query; the other atoms only narrow it
        (service_email, "resource.service.name = 'checkout' AND resource.deployment.environment.name = 'prod'"),
        (env_email, "resource.service.name = 'checkout' AND resource.deployment.environment.name = 'prod'"),
        (service_email, "resource.service.name IN ('checkout') AND signoz.workspace.key.id IN ('k1', 'k2')"),
        # a single list is a union: every value, or another granted atom, covers it
        (two_services_email, "resource.service.name IN ('checkout', 'frontend') AND signoz.workspace.key.id IN ('k1')"),
        (two_keys_email, "resource.service.name IN ('checkout') AND signoz.workspace.key.id IN ('k1', 'k2')"),
        # two lists are not expanded: only a key wildcard covers them
        (key_wild_email, two_lists),
    ],
)
def test_allowed(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    seed_logs: datetime,
    email: str,
    expression: str,
) -> None:
    response = make_query_request(
        signoz,
        get_token(email, user_password),
        int((seed_logs - timedelta(minutes=10)).timestamp() * 1000),
        int(seed_logs.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=expression)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text


@pytest.mark.parametrize(
    ("email", "expression", "denied_resource"),
    [
        (service_email, "service.name = 'checkout'", "builder_query/*"),  # bare customer key never selects
        (service_email, "resource.deployment.environment.name = 'prod'", "builder_query/resource.deployment.environment.name = 'prod'"),
        (service_email, "resource.service.name = 'frontend'", "builder_query/resource.service.name = 'frontend'"),
        (env_email, "resource.service.name = 'checkout'", "builder_query/resource.service.name = 'checkout'"),
        (
            service_email,
            "resource.service.name IN ('checkout', 'frontend') AND resource.deployment.environment.name = 'prod'",
            "builder_query/resource.deployment.environment.name = 'prod' AND resource.service.name = 'frontend'",
        ),
        # two lists are not expanded, so value grants never cover them
        (two_services_email, two_lists, "builder_query/resource.service.name IN ('checkout', 'frontend') AND signoz.workspace.key.id IN ('k1', 'k2')"),
        (two_keys_email, two_lists, "builder_query/resource.service.name IN ('checkout', 'frontend') AND signoz.workspace.key.id IN ('k1', 'k2')"),
        (mixed_email, two_lists, "builder_query/resource.service.name IN ('checkout', 'frontend') AND signoz.workspace.key.id IN ('k1', 'k2')"),
    ],
)
def test_denied(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    seed_logs: datetime,
    email: str,
    expression: str,
    denied_resource: str,
) -> None:
    response = make_query_request(
        signoz,
        get_token(email, user_password),
        int((seed_logs - timedelta(minutes=10)).timestamp() * 1000),
        int(seed_logs.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=expression)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert denied_resource in response.text
