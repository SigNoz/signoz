"""Fixtures for cloud integration tests."""
from typing import Callable
from http import HTTPStatus

import pytest
import requests
from sqlalchemy import text

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture
def cleanup_cloud_accounts(signoz: types.SigNoz) -> None:
    # Optional: pre-test cleanup to start from a clean slate
    try:
        with signoz.sqlstore.conn.connect() as conn:
            conn.execute(text("DELETE FROM cloud_integration"))
            conn.commit()
            logger.info("Pre-test cleanup: cloud_integration table cleared")
    except Exception:  # pylint: disable=broad-except
        logger.info("Pre-test cleanup skipped or partial")

    # Yield to run the test
    yield

    # Post-test cleanup to ensure isolation
    try:
        with signoz.sqlstore.conn.connect() as conn:
            conn.execute(text("DELETE FROM cloud_integration"))
            conn.commit()
            logger.info("Post-test cleanup: cloud_integration table cleared")
    except Exception:  # pylint: disable=broad-except
        logger.info("Post-test cleanup skipped or partial")


@pytest.fixture
def simulate_agent_checkin(
    signoz: types.SigNoz,
) -> Callable[[str, str, str, str], dict]:
    """Simulate an agent check-in to mark the account as connected."""

    def _simulate(
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
                "Agent check-in failed: %s, response: %s",
                response.status_code,
                response.text,
            )

        assert (
            response.status_code == HTTPStatus.OK
        ), f"Agent check-in failed: {response.status_code}"

        response_data = response.json()
        return response_data.get("data", response_data)

    return _simulate


@pytest.fixture
def create_test_account(
    signoz: types.SigNoz,
) -> Callable[[str, str], dict]:
    """Create a test account via generate-connection-url."""

    def _create(
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

    return _create
