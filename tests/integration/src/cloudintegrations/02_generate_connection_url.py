from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_generate_connection_url(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test to generate connection URL for AWS CloudFormation stack deployment."""

    # Get authentication token for admin user
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    cloud_provider = "aws"
    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/generate-connection-url"
    )

    # Prepare request payload
    request_payload = {
        "account_config": {"regions": ["us-east-1", "us-west-2"]},
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

    # Assert successful response
    assert (
        response.status_code == HTTPStatus.OK
    ), f"Expected 200, got {response.status_code}: {response.text}"

    # Parse response JSON
    response_data = response.json()

    # Assert response structure contains expected data
    assert "data" in response_data, "Response should contain 'data' field"

    # Assert required fields in the response data
    expected_fields = ["account_id", "connection_url"]

    for field in expected_fields:
        assert (
            field in response_data["data"]
        ), f"Response data should contain '{field}' field"

    data = response_data["data"]

    # Assert account_id is a valid UUID format
    assert len(data["account_id"]) > 0, "account_id should be a non-empty string (UUID)"

    # Assert connection_url contains expected CloudFormation parameters
    connection_url = data["connection_url"]

    # Verify it's an AWS CloudFormation URL
    assert (
        "console.aws.amazon.com/cloudformation" in connection_url
    ), "connection_url should be an AWS CloudFormation URL"

    # Verify region is included
    assert (
        "region=us-east-1" in connection_url
    ), "connection_url should contain the specified region"

    # Verify required parameters are in the URL
    required_params = [
        "param_SigNozIntegrationAgentVersion=v0.0.8",
        "param_SigNozApiUrl=https%3A%2F%2Ftest-deployment.test.signoz.cloud",
        "param_SigNozApiKey=test-api-key-789",
        "param_SigNozAccountId=",  # Will be a UUID
        "param_IngestionUrl=https%3A%2F%2Fingest.test.signoz.cloud",
        "param_IngestionKey=test-ingestion-key-123456",
        "stackName=signoz-integration",
        "templateURL=https%3A%2F%2Fsignoz-integrations.s3.us-east-1.amazonaws.com%2Faws-quickcreate-template-v0.0.8.json",
    ]

    for param in required_params:
        assert (
            param in connection_url
        ), f"connection_url should contain parameter: {param}"


def test_generate_connection_url_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test that unsupported cloud providers return an error."""
    # Get authentication token for admin user
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    # Try with GCP (unsupported)
    cloud_provider = "gcp"

    endpoint = (
        f"/api/v1/cloud-integrations/{cloud_provider}/accounts/generate-connection-url"
    )

    request_payload = {
        "account_config": {"regions": ["us-central1"]},
        "agent_config": {
            "region": "us-central1",
            "ingestion_url": "https://ingest.test.signoz.cloud",
            "ingestion_key": "test-ingestion-key-123456",
            "signoz_api_url": "https://test-deployment.test.signoz.cloud",
            "signoz_api_key": "test-api-key-789",
        },
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=request_payload,
        timeout=10,
    )

    # Should return Bad Request for unsupported provider
    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400 for unsupported provider, got {response.status_code}"

    response_data = response.json()
    assert "error" in response_data, "Response should contain 'error' field"
    assert (
        "unsupported cloud provider" in response_data["error"].lower()
    ), "Error message should indicate unsupported provider"
