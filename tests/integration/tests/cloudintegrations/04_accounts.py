import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.cloudintegrations import simulate_agent_checkin
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

CLOUD_PROVIDER = "aws"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


def test_list_accounts_empty(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """List accounts returns an empty list when no accounts have checked in."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert "accounts" in data, "Response should contain 'accounts' field"
    assert isinstance(data["accounts"], list), "accounts should be a list"
    assert len(data["accounts"]) == 0, "accounts list should be empty when no accounts have checked in"


def test_list_accounts_after_checkin(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """List accounts returns an account after it has checked in."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER, regions=["us-east-1"])
    account_id = account["id"]
    provider_account_id = str(uuid.uuid4())

    checkin = simulate_agent_checkin(signoz, admin_token, CLOUD_PROVIDER, account_id, provider_account_id)
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    found = next((a for a in data["accounts"] if a["id"] == account_id), None)
    assert found is not None, f"Account {account_id} should appear in list after check-in"
    assert found["providerAccountId"] == provider_account_id, "providerAccountId should match"
    assert found["config"]["aws"]["regions"] == ["us-east-1"], "regions should match account config"
    assert found["agentReport"] is not None, "agentReport should be present after check-in"
    assert found["removedAt"] is None, "removedAt should be null for a live account"


def test_get_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Get a specific account by ID returns the account with correct fields."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER, regions=["us-east-1", "eu-west-1"])
    account_id = account["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.OK, f"Expected 200, got {response.status_code}"

    data = response.json()["data"]
    assert data["id"] == account_id, "id should match"
    assert data["config"]["aws"]["regions"] == [
        "us-east-1",
        "eu-west-1",
    ], "regions should match"
    assert data["removedAt"] is None, "removedAt should be null"


def test_get_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Get a non-existent account returns 404."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404, got {response.status_code}"


def test_update_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Update account config and verify the change is persisted via GET."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER, regions=["us-east-1"])
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    updated_regions = ["us-east-1", "us-west-2", "eu-west-1"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"regions": updated_regions}}},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}"

    get_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert get_response.status_code == HTTPStatus.OK
    assert get_response.json()["data"]["config"]["aws"]["regions"] == updated_regions, "Regions should reflect the update"


def test_update_account_after_checkin_preserves_connected_status(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Updating config after agent check-in must not remove the account from the connected list.

    Regression test: previously, updating an account would reset account_id to NULL,
    causing the account to disappear from the connected accounts listing
    (which filters on account_id IS NOT NULL).
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # 1. Create account
    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER, regions=["us-east-1"])
    account_id = account["id"]
    provider_account_id = str(uuid.uuid4())

    # 2. Agent checks in — sets account_id and last_agent_report
    checkin = simulate_agent_checkin(signoz, admin_token, CLOUD_PROVIDER, account_id, provider_account_id)
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    # 3. Verify the account appears in the connected list
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert list_response.status_code == HTTPStatus.OK
    accounts_before = list_response.json()["data"]["accounts"]
    found_before = next((a for a in accounts_before if a["id"] == account_id), None)
    assert found_before is not None, "Account should be listed after check-in"

    # 4. Update account config
    updated_regions = ["us-east-1", "us-west-2"]
    update_response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"config": {"aws": {"regions": updated_regions}}},
        timeout=10,
    )
    assert update_response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {update_response.status_code}"

    # 5. Verify the account still appears in the connected list with correct fields
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert list_response.status_code == HTTPStatus.OK
    accounts_after = list_response.json()["data"]["accounts"]
    found_after = next((a for a in accounts_after if a["id"] == account_id), None)
    assert found_after is not None, "Account must still be listed after config update (account_id should not be reset)"
    assert found_after["providerAccountId"] == provider_account_id, "providerAccountId should be preserved after update"
    assert found_after["agentReport"] is not None, "agentReport should be preserved after update"
    assert found_after["config"]["aws"]["regions"] == updated_regions, "Config should reflect the update"
    assert found_after["removedAt"] is None, "removedAt should still be null"


def test_disconnect_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Disconnect an account removes it from the connected list."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    account = create_cloud_integration_account(admin_token, CLOUD_PROVIDER)
    account_id = account["id"]

    checkin = simulate_agent_checkin(signoz, admin_token, CLOUD_PROVIDER, account_id, str(uuid.uuid4()))
    assert checkin.status_code == HTTPStatus.OK, f"Check-in failed: {checkin.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{account_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}"

    list_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    accounts = list_response.json()["data"]["accounts"]
    assert not any(a["id"] == account_id for a in accounts), "Disconnected account should not appear in the connected list"


def test_disconnect_account_idempotent(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Disconnect on a non-existent account ID returns 204 (blind update, no existence check)."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/cloud_integrations/{CLOUD_PROVIDER}/accounts/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, f"Expected 204, got {response.status_code}"
