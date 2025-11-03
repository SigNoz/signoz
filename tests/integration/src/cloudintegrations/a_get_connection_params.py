from http import HTTPStatus
from typing import Callable

import requests
from wiremock.client import (
    HttpMethods,
    Mapping,
    MappingRequest,
    MappingResponse,
    WireMockMatchers,
)

from fixtures import types
from fixtures.auth import add_license
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_generate_connection_params(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list], None],
    get_token: Callable[[str, str], str],
) -> None:
    """Test to generate connection parameters for AWS SigNoz cloud integration."""
    # Get authentication token for admin user
    admin_token = get_token("admin@integration.test", "password123Z$")

    add_license(signoz, make_http_mocks, get_token)

    cloud_provider = "aws"

    # Mock the deployment info query and ingestion key operations
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

    make_http_mocks(
        signoz.gateway,
        [
            # Mock the ingestion keys search endpoint
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=aws-integration",
                ),
                response=MappingResponse(
                    status=200,
                    json_body={"status": "success", "data": []},
                ),
                persistent=False,
            ),
            # Mock the ingestion key creation endpoint
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v1/workspaces/me/keys",
                    json_body={
                        "name": "aws-integration",
                        "tags": ["integration", "aws"],
                    },
                    headers={
                        "X-Signoz-Cloud-Api-Key": {
                            WireMockMatchers.EQUAL_TO: "secret-key"
                        },
                        "X-Consumer-Username": {
                            WireMockMatchers.EQUAL_TO: "lid:00000000-0000-0000-0000-000000000000"
                        },
                        "X-Consumer-Groups": {WireMockMatchers.EQUAL_TO: "ns:default"},
                    },
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": {
                            "name": "aws-integration",
                            "value": "test-ingestion-key-123456",
                        },
                        "error": "",
                    },
                ),
                persistent=False,
            ),
        ],
    )

    endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts/generate-connection-params"

    response = requests.get(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
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
    expected_fields = [
        "ingestion_url",
        "ingestion_key",
        "signoz_api_url",
        "signoz_api_key",
    ]

    for field in expected_fields:
        assert (
            field in response_data["data"]
        ), f"Response data should contain '{field}' field"

    # Assert values for the returned fields
    data = response_data["data"]

    # ingestion_key is created by the mocked gateway and should match
    assert data["ingestion_key"] == "test-ingestion-key-123456", (
        "ingestion_key should match the mocked ingestion key"
    )

    # ingestion_url should be https://ingest.test.signoz.cloud based on the mocked deployment DNS
    assert data["ingestion_url"] == "https://ingest.test.signoz.cloud", (
        "ingestion_url should be https://ingest.test.signoz.cloud"
    )

    # signoz_api_url should be https://test-deployment.test.signoz.cloud based on the mocked deployment name and DNS
    assert data["signoz_api_url"] == "https://test-deployment.test.signoz.cloud", (
        "signoz_api_url should be https://test-deployment.test.signoz.cloud"
    )
