"""Fixtures for cloud integration tests."""
from typing import Callable, Optional
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

@pytest.fixture(name="create_test_account", scope="function")
def create_test_account(
    signoz: types.SigNoz,
) -> Callable[[str, str], dict]:
    """Factory to create a test cloud account via generate-connection-url.

    Yields the factory to the test. After the test completes, if the factory was
    used, the created account is disconnected using the same admin_token and
    cloud_provider that were used to create it.
    """
    created_account_id: Optional[str] = None
    admin_token_shared: Optional[str] = None
    cloud_provider_shared: Optional[str] = None

    def _create(
        admin_token: str,
        cloud_provider: str = "aws",
    ) -> dict:
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
        data = response_data.get("data", response_data)

        # Save only account_id; share admin_token/cloud_provider via closure
        nonlocal created_account_id, admin_token_shared, cloud_provider_shared
        created_account_id = data.get("account_id")
        admin_token_shared = admin_token
        cloud_provider_shared = cloud_provider

        return data

    def _disconnect(admin_token: str, cloud_provider: str = "aws") -> requests.Response:
        """Disconnect the created account using provided admin_token/cloud_provider."""
        assert created_account_id
        endpoint = (
            f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{created_account_id}/disconnect"
        )
        return requests.post(
            signoz.self.host_configs["8080"].get(endpoint),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10,
        )

    # Yield factory to the test
    yield _create

    # Post-test cleanup: disconnect the created account if any
    if created_account_id:
        r = _disconnect(admin_token_shared, cloud_provider_shared)
        if r.status_code != HTTPStatus.OK:
            logger.info(
                "Disconnect cleanup returned %s for account %s", r.status_code, created_account_id
            )
