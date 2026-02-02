from http import HTTPStatus
from typing import Callable

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="create_alert_rule", scope="function")
def create_alert_rule(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> Callable[[dict], str]:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule_ids = []

    def _create_alert_rule(rule_data: dict) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/rules"),
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert (
            response.status_code == HTTPStatus.OK
        ), f"Failed to create rule, api returned {response.status_code} with response: {response.text}"
        rule_id = response.json()["data"]["id"]
        rule_ids.append(rule_id)
        return rule_id

    def _delete_alert_rule(rule_id: str):
        logger.info("Deleting rule: %s", {"rule_id": rule_id})
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/rules/{rule_id}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        if response.status_code != HTTPStatus.OK:
            raise Exception(  # pylint: disable=broad-exception-raised
                f"Failed to delete rule, api returned {response.status_code} with response: {response.text}"
            )

    yield _create_alert_rule
    # delete the rule on cleanup
    for rule_id in rule_ids:
        try:
            _delete_alert_rule(rule_id)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error deleting rule: %s", {"rule_id": rule_id, "error": e})
