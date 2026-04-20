"""Fixtures for cloud integration tests."""

from http import HTTPStatus
from typing import Callable

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(scope="function")
def deprecated_create_cloud_integration_account(
    request: pytest.FixtureRequest,
    signoz: types.SigNoz,
) -> Callable[[str, str], dict]:
    created_accounts: list[tuple[str, str]] = []

    def _create(
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

        data = response.json().get("data", response.json())
        created_accounts.append((data.get("account_id"), cloud_provider))

        return data

    # Yield factory to the test
    yield _create

    # Post-test cleanup: disconnect all created accounts
    if created_accounts:
        get_token = request.getfixturevalue("get_token")
        try:
            admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
            for account_id, cloud_provider in created_accounts:
                disconnect_endpoint = f"/api/v1/cloud-integrations/{cloud_provider}/accounts/{account_id}/disconnect"
                r = requests.post(
                    signoz.self.host_configs["8080"].get(disconnect_endpoint),
                    headers={"Authorization": f"Bearer {admin_token}"},
                    timeout=10,
                )
                if r.status_code != HTTPStatus.OK:
                    logger.info(
                        "Disconnect cleanup returned %s for account %s",
                        r.status_code,
                        account_id,
                    )
                logger.info("Cleaned up test account: %s", account_id)
        except Exception as exc:  # pylint: disable=broad-except
            logger.info("Post-test disconnect cleanup failed: %s", exc)


@pytest.fixture(scope="function")
def create_cloud_integration_account(
    request: pytest.FixtureRequest,
    signoz: types.SigNoz,
) -> Callable[[str, str], dict]:
    created_accounts: list[tuple[str, str]] = []

    def _create(
        admin_token: str,
        cloud_provider: str = "aws",
        deployment_region: str = "us-east-1",
        regions: list[str] | None = None,
    ) -> dict:
        if regions is None:
            regions = ["us-east-1"]

        endpoint = f"/api/v1/cloud_integrations/{cloud_provider}/accounts"

        request_payload = {
            "config": {
                cloud_provider: {
                    "deploymentRegion": deployment_region,
                    "regions": regions,
                }
            },
            "credentials": {
                "sigNozApiURL": "https://test-deployment.test.signoz.cloud",
                "sigNozApiKey": "test-api-key-789",
                "ingestionUrl": "https://ingest.test.signoz.cloud",
                "ingestionKey": "test-ingestion-key-123456",
            },
        }

        response = requests.post(
            signoz.self.host_configs["8080"].get(endpoint),
            headers={"Authorization": f"Bearer {admin_token}"},
            json=request_payload,
            timeout=10,
        )

        assert (
            response.status_code == HTTPStatus.CREATED
        ), f"Failed to create test account: {response.status_code}: {response.text}"

        data = response.json()["data"]
        created_accounts.append((data["id"], cloud_provider))

        return data

    yield _create

    if created_accounts:
        get_token = request.getfixturevalue("get_token")
        try:
            admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
            for account_id, cloud_provider in created_accounts:
                delete_endpoint = (
                    f"/api/v1/cloud_integrations/{cloud_provider}/accounts/{account_id}"
                )
                r = requests.delete(
                    signoz.self.host_configs["8080"].get(delete_endpoint),
                    headers={"Authorization": f"Bearer {admin_token}"},
                    timeout=10,
                )
                if r.status_code != HTTPStatus.NO_CONTENT:
                    logger.info(
                        "Delete cleanup returned %s for account %s",
                        r.status_code,
                        account_id,
                    )
                logger.info("Cleaned up test account: %s", account_id)
        except Exception as exc:  # pylint: disable=broad-except
            logger.info("Post-test delete cleanup failed: %s", exc)
