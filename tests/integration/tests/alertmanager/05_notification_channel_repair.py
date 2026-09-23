import uuid
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
)

TIMEOUT = 10

V2_BASE_URL = "/api/v2/notification_channels"


def test_repair_reports_nothing_for_a_readable_channel(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v2-healthy-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X", "channel": "#alerts"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}/repair"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    repair = response.json()["data"]
    assert repair["id"] == channel_id
    assert repair["defect"] == "none"
    assert repair["action"] == "none"
    assert repair["applied"] is False
    assert [channel["id"] for channel in repair["channels"]] == [channel_id]


def test_repair_deletes_a_v1_channel_of_an_unmodelled_kind(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v1-telegram-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={"name": name, "telegram_configs": [{"chat": 12345, "token": "telegram-bot-token"}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}/repair"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    repair = response.json()["data"]
    assert repair["defect"] == "unsupported_notifier"
    assert repair["action"] == "delete"
    assert repair["applied"] is False
    assert repair["channels"] is None or repair["channels"] == []

    # A dry run leaves the channel in place.
    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 1

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}/repair"),
        params={"apply": "true"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["applied"] is True
    cleanup_notification_channels.remove(channel_id)

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 0


def test_repair_splits_a_v1_channel_carrying_several_notifiers(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"v1-fanout-{uuid.uuid4().hex[:8]}"

    # Only v1 accepts a receiver with more than one notifier configuration.
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={
            "name": name,
            "slack_configs": [{"api_url": "https://hooks.slack.test/services/T/B/X", "channel": "#alerts"}],
            "webhook_configs": [{"url": "https://webhook.test/hook"}],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}/repair"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    repair = response.json()["data"]
    assert repair["defect"] == "multiple_notifiers"
    assert repair["action"] == "split"
    assert repair["applied"] is False
    assert [channel["displayName"] for channel in repair["channels"]] == [name, f"{name} (2)"]
    assert [channel["kind"] for channel in repair["channels"]] == ["slack", "webhook"]
    assert repair["channels"][0]["id"] == channel_id

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 1

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}/repair"),
        params={"apply": "true"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    repair = response.json()["data"]
    assert repair["applied"] is True
    cleanup_notification_channels.append(repair["channels"][1]["id"])

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    listed = response.json()["data"]
    assert listed["total"] == 2
    assert sorted(channel["kind"] for channel in listed["channels"]) == ["slack", "webhook"]

    # The original now reads through v2 as the first notifier alone.
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["config"]["kind"] == "slack"
