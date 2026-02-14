"""Fixtures for cloud integration tests."""

from http import HTTPStatus
from typing import Callable, Optional

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(scope="function")
def create_cloud_integration_account(
    request: pytest.FixtureRequest,
    signoz: types.SigNoz,
) -> Callable[[str, str], dict]:
    created_account_id: Optional[str] = None
    cloud_provider_used: Optional[str] = None

    def _create(
        admin_token: str,
        cloud_provider: str = "aws",
    ) -> dict:
        nonlocal created_account_id, cloud_provider_used
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

        data = response.json().get("data", response.json())
        created_account_id = data.get("account_id")
        cloud_provider_used = cloud_provider

        return data

    def _disconnect(admin_token: str, cloud_provider: str) -> requests.Response:
        assert created_account_id
        disconnect_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{created_account_id}/disconnect"
        return requests.post(
            signoz.self.host_configs["8080"].get(disconnect_endpoint),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )

    # Yield factory to the test
    yield _create

    # Post-test cleanup: generate admin token and disconnect the created account
    if created_account_id and cloud_provider_used:
        get_token = request.getfixturevalue("get_token")
        try:
            admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
            r = _disconnect(admin_token, cloud_provider_used)
            if r.status_code != HTTPStatus.OK:
                logger.info(
                    "Disconnect cleanup returned %s for account %s",
                    r.status_code,
                    created_account_id,
                )
            logger.info("Cleaned up test account: %s", created_account_id)
        except Exception as exc:  # pylint: disable=broad-except
            logger.info("Post-test disconnect cleanup failed: %s", exc)
