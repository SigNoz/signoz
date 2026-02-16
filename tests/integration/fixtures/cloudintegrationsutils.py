"""Fixtures for cloud integration tests."""

from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def simulate_agent_checkin(
    signoz: types.SigNoz,
    admin_token: str,
    cloud_provider: str,
    account_id: str,
    cloud_account_id: str,
) -> dict:
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
