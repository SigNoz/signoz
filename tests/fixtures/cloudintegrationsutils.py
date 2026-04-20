"""Fixtures for cloud integration tests."""

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
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def deprecated_simulate_agent_checkin(
    signoz: types.SigNoz,
    admin_token: str,
    cloud_provider: str,
    account_id: str,
    cloud_account_id: str,
) -> requests.Response:
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

    if not response.ok:
        logger.error(
            "Agent check-in failed: %s, response: %s",
            response.status_code,
            response.text,
        )

    return response


def setup_create_account_mocks(
    signoz: types.SigNoz,
    make_http_mocks: Callable,
) -> None:
    """Set up Zeus and Gateway mocks required by the CreateAccount endpoint."""
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
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.GET,
                    url="/v1/workspaces/me/keys/search?name=aws-integration&page=1&per_page=10",
                ),
                response=MappingResponse(
                    status=200,
                    json_body={
                        "status": "success",
                        "data": [],
                        "_pagination": {"page": 1, "per_page": 10, "total": 0},
                    },
                ),
                persistent=False,
            ),
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url="/v1/workspaces/me/keys",
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


def simulate_agent_checkin(
    signoz: types.SigNoz,
    admin_token: str,
    cloud_provider: str,
    account_id: str,
    cloud_account_id: str,
    data: dict | None = None,
) -> requests.Response:
    endpoint = f"/api/v1/cloud_integrations/{cloud_provider}/accounts/check_in"

    checkin_payload = {
        "cloudIntegrationId": account_id,
        "providerAccountId": cloud_account_id,
        "data": data or {},
    }

    response = requests.post(
        signoz.self.host_configs["8080"].get(endpoint),
        headers={"Authorization": f"Bearer {admin_token}"},
        json=checkin_payload,
        timeout=10,
    )

    if not response.ok:
        logger.error(
            "Agent check-in failed: %s, response: %s",
            response.status_code,
            response.text,
        )

    return response
