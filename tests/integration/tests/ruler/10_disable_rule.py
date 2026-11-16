import json
import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests
from sqlalchemy import sql

from fixtures.alerts import get_rule
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/rules"

ENABLED_RULE_PATH = "ruler/test_scenarios/threshold_above_at_least_once/rule.json"


def test_disable_rule(
    signoz: SigNoz,
    create_alert_rule_with_channel: Callable[[str], str],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = create_alert_rule_with_channel(ENABLED_RULE_PATH)

    response = requests.post(signoz.self.host_configs["8080"].get(f"{BASE_URL}/{rule_id}/disable"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    rule = get_rule(signoz, token, rule_id)
    assert rule["disabled"] is True
    assert rule["state"] == "disabled"
    assert rule["updatedBy"] == USER_ADMIN_EMAIL

    # disabling an already disabled rule succeeds
    response = requests.post(signoz.self.host_configs["8080"].get(f"{BASE_URL}/{rule_id}/disable"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_disable_rule_with_unknown_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}/disable"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text

    response = requests.post(signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid/disable"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_disable_rule_with_undecodable_stored_data(
    signoz: SigNoz,
    create_alert_rule_with_channel: Callable[[str], str],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = create_alert_rule_with_channel(ENABLED_RULE_PATH)

    with signoz.sqlstore.conn.begin() as conn:
        conn.execute(
            sql.text("UPDATE rule SET data = :data WHERE id = :id"),
            {"data": json.dumps({"alert": "undecodable", "condition": "not an object", "disabled": False}), "id": rule_id},
        )

    response = requests.post(signoz.self.host_configs["8080"].get(f"{BASE_URL}/{rule_id}/disable"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # every key other than disabled stays as stored
    with signoz.sqlstore.conn.connect() as conn:
        stored = conn.execute(sql.text("SELECT data FROM rule WHERE id = :id"), {"id": rule_id}).fetchone()
    assert stored is not None
    assert json.loads(stored[0]) == {"alert": "undecodable", "condition": "not an object", "disabled": True}
