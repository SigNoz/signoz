import uuid
from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.cloudintegrationsutils import simulate_agent_checkin
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_list_connected_accounts_empty(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test listing connected accounts when there are none."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    cloud_provider = "aws"
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts"

    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    response_data = response.json()
    data = response_data.get("data", response_data)
    assert "accounts" in data, "Response should contain 'accounts' field"
    assert isinstance(data["accounts"], list), "Accounts should be a list"
    assert (
        len(data["accounts"]) == 0
    ), "Accounts list should be empty when no accounts are connected"


def test_list_connected_accounts_with_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test listing connected accounts after creating one."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a test account
    cloud_provider = "aws"
    account_data = create_cloud_integration_account(admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Simulate agent check-in to mark as connected
    cloud_account_id = str(uuid.uuid4())
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # List accounts
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts"
    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    response_data = response.json()
    data = response_data.get("data", response_data)
    assert "accounts" in data, "Response should contain 'accounts' field"
    assert isinstance(data["accounts"], list), "Accounts should be a list"

    # Find our account in the list (there may be leftover accounts from previous test runs)
    account = next((a for a in data["accounts"] if a["id"] == account_id), None)
    assert account is not None, f"Account {account_id} should be found in list"
    assert account["id"] == account_id, "Account ID should match"
    assert "config" in account, "Account should have config field"
    assert "status" in account, "Account should have status field"


def test_get_account_status(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test getting the status of a specific account."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    # Create a test account (no check-in needed for status check)
    cloud_provider = "aws"
    account_data = create_cloud_integration_account(admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Get account status
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{account_id}/status"
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    response_data = response.json()
    data = response_data.get("data", response_data)
    assert "id" in data, "Response should contain 'id' field"
    assert data["id"] == account_id, "Account ID should match"
    assert "status" in data, "Response should contain 'status' field"
    assert "integration" in data["status"], "Status should contain 'integration' field"


def test_get_account_status_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test getting status for a non-existent account."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    cloud_provider = "aws"
    fake_account_id = "00000000-0000-0000-0000-000000000000"

    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{fake_account_id}/status"
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"


def test_update_account_config(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test updating account configuration."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a test account
    cloud_provider = "aws"
    account_data = create_cloud_integration_account(admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Simulate agent check-in to mark as connected
    cloud_account_id = str(uuid.uuid4())
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # Update account configuration
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{account_id}/config"
    )

    updated_config = {"config": {"regions": ["us-east-1", "us-west-2", "eu-west-1"]}}

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=updated_config,
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    response_data = response.json()
    data = response_data.get("data", response_data)
    assert "id" in data, "Response should contain 'id' field"
    assert data["id"] == account_id, "Account ID should match"

    # Verify the update by listing accounts
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_response_data = list_response.json()
    list_data = list_response_data.get("data", list_response_data)
    account = next((a for a in list_data["accounts"] if a["id"] == account_id), None)
    assert account is not None, "Account should be found in list"
    assert "config" in account, "Account should have config"
    assert "regions" in account["config"], "Config should have regions"
    assert len(account["config"]["regions"]) == 3, "Should have 3 regions"
    assert set(account["config"]["regions"]) == {
        "us-east-1",
        "us-west-2",
        "eu-west-1",
    }, "Regions should match updated config"


def test_disconnect_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test disconnecting an account."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a test account
    cloud_provider = "aws"
    account_data = create_cloud_integration_account(admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Simulate agent check-in to mark as connected
    cloud_account_id = str(uuid.uuid4())
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # Disconnect the account
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{account_id}/disconnect"
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    # Verify our specific account is no longer in the connected list
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_response_data = list_response.json()
    list_data = list_response_data.get("data", list_response_data)

    # Check that our specific account is not in the list
    disconnected_account = next(
        (a for a in list_data["accounts"] if a["id"] == account_id), None
    )
    assert (
        disconnected_account is None
    ), f"Account {account_id} should be removed from connected accounts"


def test_disconnect_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test disconnecting a non-existent account."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    cloud_provider = "aws"
    fake_account_id = "00000000-0000-0000-0000-000000000000"

    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{fake_account_id}/disconnect"

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"


def test_list_accounts_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test listing accounts for an unsupported cloud provider."""

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    cloud_provider = "gcp"  # Unsupported provider
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts"

    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400, got {response.status_code}"
