from http import HTTPStatus
from typing import Callable
import uuid

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
    """Clean up cloud_integration table to avoid corrupted data issues."""
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
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/agent-check-in"

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
        logger.error(
            "Agent check-in failed: %s, response: %s", response.status_code, response.text
        )

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
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts/generate-connection-url"

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


def test_list_services_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test listing available services without specifying an account."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "aws"
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"

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
    assert "services" in data, "Response should contain 'services' field"
    assert isinstance(data["services"], list), "Services should be a list"
    assert len(data["services"]) > 0, "Should have at least one service available"

    # Verify service structure
    service = data["services"][0]
    assert "id" in service, "Service should have 'id' field"
    assert "title" in service, "Service should have 'title' field"
    assert "icon" in service, "Service should have 'icon' field"


def test_list_services_with_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test listing services for a specific connected account."""
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

    # Create a test account and do check-in
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # List services for the account
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services?cloud_account_id={cloud_account_id}"

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
    assert "services" in data, "Response should contain 'services' field"
    assert isinstance(data["services"], list), "Services should be a list"
    assert len(data["services"]) > 0, "Should have at least one service available"

    # Services should include config field (may be null if not configured)
    service = data["services"][0]
    assert "id" in service, "Service should have 'id' field"
    assert "title" in service, "Service should have 'title' field"
    assert "icon" in service, "Service should have 'icon' field"


def test_get_service_details_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test getting service details without specifying an account."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "aws"
    # First get the list of services to get a valid service ID
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_data = list_response.json().get("data", list_response.json())
    assert len(list_data["services"]) > 0, "Should have at least one service"
    service_id = list_data["services"][0]["id"]

    # Get service details
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{service_id}"
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

    # Verify service details structure
    assert "id" in data, "Service details should have 'id' field"
    assert data["id"] == service_id, "Service ID should match requested ID"
    assert "title" in data, "Service details should have 'name' field"
    assert "overview" in data, "Service details should have 'overview' field"
    # assert assets to had list of dashboards
    assert "assets" in data, "Service details should have 'assets' field"
    assert isinstance(data["assets"], dict), "Assets should be a dictionary"


def test_get_service_details_with_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test getting service details for a specific connected account."""
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

    # Create a test account and do check-in
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # Get list of services first
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_data = list_response.json().get("data", list_response.json())
    assert len(list_data["services"]) > 0, "Should have at least one service"
    service_id = list_data["services"][0]["id"]

    # Get service details with account
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{service_id}?cloud_account_id={cloud_account_id}"
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

    # Verify service details structure
    assert "id" in data, "Service details should have 'id' field"
    assert data["id"] == service_id, "Service ID should match requested ID"
    assert "title" in data, "Service details should have 'title' field"
    assert "overview" in data, "Service details should have 'overview' field"
    assert "assets" in data, "Service details should have 'assets' field"
    assert "config" in data, "Service details should have 'config' field"
    assert "status" in data, "Config should have 'status' field"


def test_get_service_details_invalid_service(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test getting details for a non-existent service."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "aws"
    fake_service_id = "non-existent-service"

    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{fake_service_id}"
    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404, got {response.status_code}"


def test_list_services_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test listing services for an unsupported cloud provider."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "gcp"  # Unsupported provider
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"

    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400, got {response.status_code}"


def test_update_service_config(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test updating service configuration for a connected account."""
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

    # Create a test account and do check-in
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # Get list of services to pick a valid service ID
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_data = list_response.json().get("data", list_response.json())
    assert len(list_data["services"]) > 0, "Should have at least one service"
    service_id = list_data["services"][0]["id"]

    # Update service configuration
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{service_id}/config"

    config_payload = {
        "cloud_account_id": cloud_account_id,
        "config": {
            "metrics": {"enabled": True},
            "logs": {"enabled": True},
        },
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=config_payload,
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}"

    response_data = response.json()
    data = response_data.get("data", response_data)

    # Verify response structure
    assert "id" in data, "Response should contain 'id' field"
    assert data["id"] == service_id, "Service ID should match"
    assert "config" in data, "Response should contain 'config' field"
    assert "metrics" in data["config"], "Config should contain 'metrics' field"
    assert "logs" in data["config"], "Config should contain 'logs' field"


def test_update_service_config_without_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test updating service config without a connected account should fail."""
    cleanup_cloud_accounts(postgres)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "aws"

    # Get a valid service ID
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_data = list_response.json().get("data", list_response.json())
    service_id = list_data["services"][0]["id"]

    # Try to update config with non-existent account
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{service_id}/config"

    fake_cloud_account_id = generate_unique_cloud_account_id()
    config_payload = {
        "cloud_account_id": fake_cloud_account_id,
        "config": {
            "metrics": {"enabled": True},
        },
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=config_payload,
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    ), f"Expected 500 for non-existent account, got {response.status_code}"


def test_update_service_config_invalid_service(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test updating config for a non-existent service should fail."""
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

    # Create a test account and do check-in
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # Try to update config for invalid service
    fake_service_id = "non-existent-service"
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{fake_service_id}/config"

    config_payload = {
        "cloud_account_id": cloud_account_id,
        "config": {
            "metrics": {"enabled": True},
        },
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=config_payload,
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.NOT_FOUND
    ), f"Expected 404 for invalid service, got {response.status_code}"


def test_update_service_config_disable_service(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
    postgres: types.TestContainerSQL,
) -> None:
    """Test disabling a service by updating config with enabled=false."""
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

    # Create a test account and do check-in
    cloud_provider = "aws"
    account_data = create_test_account(signoz, admin_token, cloud_provider)
    account_id = account_data["account_id"]

    cloud_account_id = generate_unique_cloud_account_id()
    simulate_agent_checkin(
        signoz, admin_token, cloud_provider, account_id, cloud_account_id
    )

    # Get a valid service
    list_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services"
    list_response = requests.get(
        signoz.self.host_configs["8080"].get(list_endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )

    list_data = list_response.json().get("data", list_response.json())
    service_id = list_data["services"][0]["id"]

    # First enable the service
    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/services/{service_id}/config"

    enable_payload = {
        "cloud_account_id": cloud_account_id,
        "config": {
            "metrics": {"enabled": True},
        },
    }

    enable_response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=enable_payload,
        timeout=10,
    )

    assert enable_response.status_code == HTTPStatus.OK, "Failed to enable service"

    # Now disable the service
    disable_payload = {
        "cloud_account_id": cloud_account_id,
        "config": {
            "metrics": {"enabled": False},
            "logs": {"enabled": False},
        },
    }

    disable_response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=disable_payload,
        timeout=10,
    )

    assert (
        disable_response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {disable_response.status_code}"

    response_data = disable_response.json()
    data = response_data.get("data", response_data)

    # Verify service is disabled
    assert data["config"]["metrics"]["enabled"] is False, "Metrics should be disabled"
    assert data["config"]["logs"]["enabled"] is False, "Logs should be disabled"

