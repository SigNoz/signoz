from http import HTTPStatus
from typing import Callable
import uuid

import pytest
import requests
from sqlalchemy import text
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def cleanup_cloud_accounts(postgres: types.TestContainerSQL) -> None:
    try:
        with postgres.conn.connect() as conn:
            # Try to delete all records instead of truncate in case table exists
            conn.execute(text("DELETE FROM cloud_integration"))
            conn.commit()
            logger.info("Cleaned up cloud_integration table")
    except Exception:  # pylint: disable=broad-except
        # Table might not exist, which is fine
        logger.info("Cleanup skipped or partial")


def generate_unique_cloud_account_id() -> str:
    """Generate a unique cloud account ID for testing."""
    # Use last 12 digits of UUID to simulate AWS account ID format
    return str(uuid.uuid4().int)[:12]


def simulate_agent_checkin(
    signoz: types.SigNoz,
    admin_token: str,
    cloud_provider: str,
    account_id: str,
    cloud_account_id: str,
) -> dict:
    """Simulate an agent check-in to mark the account as connected.

    Returns:
        dict with the response from check-in
    """
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/agent-check-in"
    )

    checkin_payload = {
        "account_id": account_id,
        "cloud_account_id": cloud_account_id,
        "data": {},
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=checkin_payload,
        timeout=10,
    )

    if response.status_code != HTTPStatus.OK:
        logger.error("Agent check-in failed: %s, response: %s", response.status_code, response.text)

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Agent check-in failed: {response.status_code}"

    response_data = response.json()
    return response_data.get("data", response_data)


def create_test_account(
    signoz: types.SigNoz,
    admin_token: str,
    cloud_provider: str = "aws",
) -> dict:
    """Create a test account via generate-connection-url.

    Returns the data as-is from the API response. Caller is responsible for
    doing agent check-in if needed to mark the account as connected.

    Returns:
        dict with account_id and connection_url from the API
    """
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/generate-connection-url"
    )

    request_payload = {
        "account_config": {"regions": ["us-east-1"]},
        "agent_config": {
            "region": "us-east-1",
            "ingestion_url": "https://ingest.test.signoz.cloud",
            "ingestion_key": "test-ingestion-key-123456",
            "signoz_api_url": "https://test-deployment.test.signoz.cloud",
            "signoz_api_key": "test-api-key-789",
            "version": "v0.0.8",
        },
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=request_payload,
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Failed to create test account: {response.status_code}"

    response_data = response.json()
    # API returns data wrapped in {'status': 'success', 'data': {...}}
    data = response_data.get("data", response_data)

    return data


def test_list_connected_accounts_empty(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test listing connected accounts when there are none."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

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
    # API returns data wrapped in {'status': 'success', 'data': {...}}
    data = response_data.get("data", response_data)
    assert "accounts" in data, "Response should contain 'accounts' field"
    assert isinstance(data["accounts"], list), "Accounts should be a list"


def test_list_connected_accounts_with_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test listing connected accounts after creating one."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    # Mock the deployment info query
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/deployments/me",
                    headers={
                        "X-Signoz-Cloud-Api-Key": {
                            WireMockMatchers.EQUAL_TO: "secret-key"
                        }
                    },
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "name": "test-deployment",
                            "cluster": {"region": {"dns": "test.signoz.cloud"}},
                        },
                    },
                ),
                persistent=False,
            )
        ],
    )

    # Create a test account
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Simulate agent check-in to mark as connected
    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(signoz, admin_token, cloud_provider, account_id, cloud_account_id)

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
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test getting the status of a specific account."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    # Mock the deployment info query
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/deployments/me",
                    headers={
                        "X-Signoz-Cloud-Api-Key": {
                            WireMockMatchers.EQUAL_TO: "secret-key"
                        }
                    },
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "name": "test-deployment",
                            "cluster": {"region": {"dns": "test.signoz.cloud"}},
                        },
                    },
                ),
                persistent=False,
            )
        ],
    )

    # Create a test account (no check-in needed for status check)
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
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
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test getting status for a non-existent account."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

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
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test updating account configuration."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    # Mock the deployment info query
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/deployments/me",
                    headers={
                        "X-Signoz-Cloud-Api-Key": {
                            WireMockMatchers.EQUAL_TO: "secret-key"
                        }
                    },
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "name": "test-deployment",
                            "cluster": {"region": {"dns": "test.signoz.cloud"}},
                        },
                    },
                ),
                persistent=False,
            )
        ],
    )

    # Create a test account
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Simulate agent check-in to mark as connected
    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(signoz, admin_token, cloud_provider, account_id, cloud_account_id)

    # Update account configuration
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{account_id}/config"
    )

    updated_config = {
        "config": {"regions": ["us-east-1", "us-west-2", "eu-west-1"]}
    }

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
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test disconnecting an account."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    # Mock the deployment info query
    make_http_mocks(
        signoz.zeus,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v2/deployments/me",
                    headers={
                        "X-Signoz-Cloud-Api-Key": {
                            WireMockMatchers.EQUAL_TO: "secret-key"
                        }
                    },
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "name": "test-deployment",
                            "cluster": {"region": {"dns": "test.signoz.cloud"}},
                        },
                    },
                ),
                persistent=False,
            )
        ],
    )

    # Create a test account
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    # Simulate agent check-in to mark as connected
    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(signoz, admin_token, cloud_provider, account_id, cloud_account_id)

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
    assert disconnected_account is None, f"Account {account_id} should be removed from connected accounts"


def test_disconnect_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test disconnecting a non-existent account."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "aws"
    fake_account_id = "00000000-0000-0000-0000-000000000000"

    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{fake_account_id}/disconnect"
    )

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
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test listing accounts for an unsupported cloud provider."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

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
