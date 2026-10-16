import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/rules"

CHANNELS_URL = "/api/v2/notification_channels"

CHANNEL_NAME = f"clone-rule-channel-{uuid.uuid4()}"

SOURCE_RULE = {
    "alert": "clone me",
    "description": "source rule for clone",
    "alertType": "METRIC_BASED_ALERT",
    "ruleType": "threshold_rule",
    "condition": {
        "thresholds": {
            "kind": "basic",
            "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": [CHANNEL_NAME]}],
        },
        "compositeQuery": {
            "queryType": "builder",
            "panelType": "graph",
            "queries": [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "metrics",
                        "aggregations": [{"metricName": "clone_rule_cpu", "timeAggregation": "avg", "spaceAggregation": "max"}],
                    },
                }
            ],
        },
        "selectedQueryName": "A",
    },
    "labels": {"severity": "critical", "team": "payments"},
    "annotations": {"summary": "s", "description": "d"},
    "disabled": True,
    "evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m0s", "frequency": "1m"}},
    "notificationSettings": {
        "groupBy": [],
        "usePolicy": False,
        "renotify": {"enabled": False, "interval": "30m", "alertStates": []},
    },
    "version": "v5",
    "schemaVersion": "v2alpha1",
}


def test_clone_rule(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(CHANNELS_URL),
        json={"name": CHANNEL_NAME, "config": {"kind": "webhook", "spec": {"url": "https://webhook.test/hook"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=SOURCE_RULE,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    source_id = response.json()["data"]["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{source_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    source = response.json()["data"]

    # clone keeps everything but the id and name
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{source_id}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    clone = response.json()["data"]
    assert clone["id"] != source_id
    assert clone["alert"] == "clone me - Copy"
    for field in ["description", "alertType", "ruleType", "disabled", "labels", "annotations", "condition", "evaluation", "notificationSettings"]:
        assert clone[field] == source[field], field

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{clone['id']}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["alert"] == "clone me - Copy"
    assert response.json()["data"]["state"] == "disabled"
    assert response.json()["data"]["createdBy"] == USER_ADMIN_EMAIL

    # cloning a copy bumps the counter
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{clone['id']}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    second_clone = response.json()["data"]
    assert second_clone["alert"] == "clone me - Copy (2)"
    assert second_clone["condition"] == source["condition"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text

    for rule_id in [source_id, clone["id"], second_clone["id"]]:
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{rule_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{CHANNELS_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text
