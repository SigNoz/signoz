"""Fixtures for cloud integration tests."""

from http import HTTPStatus
from typing import Callable

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.cloudintegrationsutils import setup_create_account_mocks
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(scope="function")
def create_cloud_integration_account(
    request: pytest.FixtureRequest,
    signoz: types.SigNoz,
) -> Callable[[str, str], dict]:
    created_accounts: list[tuple[str, str]] = []

    make_http_mocks = request.getfixturevalue("make_http_mocks")

    def _create(
        admin_token: str,
        cloud_provider: str = "aws",
        deployment_region: str = "us-east-1",
        regions: list[str] | None = None,
    ) -> dict:
        if regions is None:
            regions = ["us-east-1"]

        setup_create_account_mocks(signoz, make_http_mocks)

        endpoint = f"/api/v1/cloud_integrations/{cloud_provider}/accounts"

        request_payload = {
            cloud_provider: {
                "deploymentRegion": deployment_region,
                "regions": regions,
            }
        }

        response = requests.post(
            signoz.self.host_configs["8080"].get(endpoint),
            headers={"Authorization": f"Bearer {admin_token}"},
            json=request_payload,
            timeout=10,
        )

        assert (
            response.status_code == HTTPStatus.OK
        ), f"Failed to create test account: {response.status_code}: {response.text}"

        data = response.json()["data"]
        created_accounts.append((data["id"], cloud_provider))

        return data

    # Yield factory to the test
    yield _create

    # Post-test cleanup: delete all created accounts
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
