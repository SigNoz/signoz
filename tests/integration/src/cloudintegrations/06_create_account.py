from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Apply a license so that subsequent cloud integration calls succeed."""
    add_license(signoz, make_http_mocks, get_token)


def test_create_account(
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_cloud_integration_account: Callable,
) -> None:
    """Test creating a new cloud integration account for AWS."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    cloud_provider = "aws"

    data = create_cloud_integration_account(
        admin_token,
        cloud_provider,
        deployment_region="us-east-1",
        regions=["us-east-1", "us-west-2"],
    )

    assert "id" in data, "Response data should contain 'id' field"
    assert len(data["id"]) > 0, "id should be a non-empty UUID string"

    assert (
        "connectionArtifact" in data
    ), "Response data should contain 'connectionArtifact' field"
    artifact = data["connectionArtifact"]
    assert "aws" in artifact, "connectionArtifact should contain 'aws' field"
    assert (
        "connectionUrl" in artifact["aws"]
    ), "connectionArtifact.aws should contain 'connectionUrl'"

    connection_url = artifact["aws"]["connectionUrl"]
    assert (
        "console.aws.amazon.com/cloudformation" in connection_url
    ), "connectionUrl should be an AWS CloudFormation URL"
    assert (
        "region=us-east-1" in connection_url
    ), "connectionUrl should contain the deployment region"


def test_create_account_unsupported_provider(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Test that creating an account with an unsupported cloud provider returns 400."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    cloud_provider = "gcp"
    endpoint = f"/api/v1/cloud_integrations/{cloud_provider}/accounts"

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "config": {
                "gcp": {"deploymentRegion": "us-central1", "regions": ["us-central1"]}
            },
            "credentials": {
                "sigNozApiURL": "https://test.signoz.cloud",
                "sigNozApiKey": "test-key",
                "ingestionUrl": "https://ingest.test.signoz.cloud",
                "ingestionKey": "test-ingestion-key",
            },
        },
        timeout=10,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400 for unsupported provider, got {response.status_code}"

    response_data = response.json()
    assert "error" in response_data, "Response should contain 'error' field"
