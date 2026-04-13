import uuid
from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrationsutils import simulate_agent_checkin
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

CLOUD_PROVIDER = "aws"
SERVICE_ID = "rds"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


def test_list_services_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """List available services without specifying a cloud_integration_id."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert "services" in data, "Response should contain 'services' field"
    assert isinstance(data["services"], list), "services should be a list"
    assert len(data["services"]) > 0, "services list should be non-empty"

    service = data["services"][0]
    assert "id" in service, "Service should have 'id' field"
    assert "title" in service, "Service should have 'title' field"
    assert "icon" in service, "Service should have 'icon' field"
    assert "enabled" in service, "Service should have 'enabled' field"


def test_list_services_with_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """List services filtered to a specific account — all disabled by default."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services?cloud_integration_id={account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert "services" in data, "Response should contain 'services' field"
    assert len(data["services"]) > 0, "services list should be non-empty"

    for svc in data["services"]:
        assert "enabled" in svc, "Each service should have 'enabled' field"
        assert (
            svc["enabled"] is False
        ), f"Service {svc['id']} should be disabled before any config is set"


def test_get_service_details_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Get full service definition without specifying an account."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services/{SERVICE_ID}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert data["id"] == SERVICE_ID, f"id should be '{SERVICE_ID}'"
    assert "title" in data, "Service should have 'title'"
    assert "overview" in data, "Service should have 'overview' (markdown)"
    assert "assets" in data, "Service should have 'assets'"
    assert isinstance(
        data["assets"]["dashboards"], list
    ), "assets.dashboards should be a list"
    assert (
        "telemetryCollectionStrategy" in data
    ), "Service should have 'telemetryCollectionStrategy'"
    assert (
        data["cloudIntegrationService"] is None
    ), "cloudIntegrationService should be null without account context"


def test_get_service_details_with_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Get service details with account context — cloudIntegrationService is null before first UpdateService."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services/{SERVICE_ID}"
            f"?cloud_integration_id={account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert data["id"] == SERVICE_ID
    assert (
        data["cloudIntegrationService"] is None
    ), "cloudIntegrationService should be null before any service config is set"


def test_get_service_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Get a non-existent service ID returns 400 (invalid service ID is a bad request)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services/non-existent-service"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400, got {response.status_code}"


def test_update_service_config(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Enable a service and verify the config is persisted via GET."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    put_response = requests.put(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}/services/{SERVICE_ID}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {"aws": {"metrics": {"enabled": True}, "logs": {"enabled": True}}}
        },
        timeout=10,
    )

    assert (
        put_response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204, got {put_response.status_code}: {put_response.text}"

    get_response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services/{SERVICE_ID}"
            f"?cloud_integration_id={account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert get_response.status_code == HTTPStatus.OK
    data = get_response.json()["data"]
    svc = data["cloudIntegrationService"]
    assert (
        svc is not None
    ), "cloudIntegrationService should be non-null after UpdateService"
    assert (
        svc["config"]["aws"]["metrics"]["enabled"] is True
    ), "metrics should be enabled"
    assert svc["config"]["aws"]["logs"]["enabled"] is True, "logs should be enabled"
    assert (
        svc["cloudIntegrationId"] == account_id
    ), "cloudIntegrationId should match the account"


def test_update_service_config_disable(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Enable then disable a service — config change is persisted."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    endpoint = signoz.self.host_configs["8080"].get(
        f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}/services/{SERVICE_ID}"
    )

    # Enable
    r = requests.put(
        endpoint,
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {"aws": {"metrics": {"enabled": True}, "logs": {"enabled": True}}}
        },
        timeout=10,
    )
    assert (
        r.status_code == HTTPStatus.NO_CONTENT
    ), f"Enable failed: {r.status_code}: {r.text}"

    # Disable
    r = requests.put(
        endpoint,
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {
                "aws": {"metrics": {"enabled": False}, "logs": {"enabled": False}}
            }
        },
        timeout=10,
    )
    assert (
        r.status_code == HTTPStatus.NO_CONTENT
    ), f"Disable failed: {r.status_code}: {r.text}"

    get_response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services/{SERVICE_ID}"
            f"?cloud_integration_id={account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert get_response.status_code == HTTPStatus.OK
    svc = get_response.json()["data"]["cloudIntegrationService"]
    assert (
        svc is not None
    ), "cloudIntegrationService should still be present after disable"
    assert (
        svc["config"]["aws"]["metrics"]["enabled"] is False
    ), "metrics should be disabled"
    assert svc["config"]["aws"]["logs"]["enabled"] is False, "logs should be disabled"


def test_update_service_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """PUT with a non-existent account UUID returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{uuid.uuid4()}/services/{SERVICE_ID}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"metrics": {"enabled": True}}}},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"


def test_list_services_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """List services for an unsupported cloud provider returns 400."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/cloud_integrations/gcp/services"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400, got {response.status_code}"


def test_list_services_account_removed(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """List services with a cloud_integration_id for a deleted account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    delete_response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert (
        delete_response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204 on delete, got {delete_response.status_code}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services?cloud_integration_id={account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"


def test_get_service_details_account_removed(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Get service details with a cloud_integration_id for a deleted account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    delete_response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert (
        delete_response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204 on delete, got {delete_response.status_code}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/services/{SERVICE_ID}"
            f"?cloud_integration_id={account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"


def test_update_service_account_removed(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """PUT service config for a deleted account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(
        signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4())
    )
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    delete_response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert (
        delete_response.status_code == HTTPStatus.NO_CONTENT
    ), f"Expected 204 on delete, got {delete_response.status_code}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}/services/{SERVICE_ID}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"metrics": {"enabled": True}}}},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"
