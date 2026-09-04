import time
import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from sqlalchemy import text

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.maildev import (
    MAILDEV_INCOMING_PASS,
    SMTP_TEST_FROM,
    delete_all_mails,
    verify_email_received,
)
from fixtures.notification_channel import assert_email_channel_payload_clean, send_test_notification

TIMEOUT = 10


CHANNEL_TYPE_CASES = [
    (
        "webhook",
        lambda sink: {"webhook_configs": [{"url": sink.container_configs["8080"].get("/webhook/crud-original"), "send_resolved": True}]},
        lambda sink: {"webhook_configs": [{"url": sink.container_configs["8080"].get("/webhook/crud-updated"), "send_resolved": True}]},
        "crud-original",
        "crud-updated",
    ),
    (
        "slack",
        lambda sink: {"slack_configs": [{"api_url": sink.container_configs["8080"].get("/services/T/B/X"), "channel": "#crud-original"}]},
        lambda sink: {"slack_configs": [{"api_url": sink.container_configs["8080"].get("/services/T/B/X"), "channel": "#crud-updated"}]},
        "#crud-original",
        "#crud-updated",
    ),
    (
        "pagerduty",
        lambda sink: {"pagerduty_configs": [{"routing_key": "crud-original-routing-key"}]},
        lambda sink: {"pagerduty_configs": [{"routing_key": "crud-updated-routing-key"}]},
        "crud-original-routing-key",
        "crud-updated-routing-key",
    ),
    (
        "opsgenie",
        lambda sink: {"opsgenie_configs": [{"api_key": "crud-original-api-key", "message": "{{ .CommonLabels.alertname }}"}]},
        lambda sink: {"opsgenie_configs": [{"api_key": "crud-updated-api-key", "message": "{{ .CommonLabels.alertname }}"}]},
        "crud-original-api-key",
        "crud-updated-api-key",
    ),
    (
        "msteamsv2",
        lambda sink: {"msteamsv2_configs": [{"webhook_url": sink.container_configs["8080"].get("/msteams/crud-original")}]},
        lambda sink: {"msteamsv2_configs": [{"webhook_url": sink.container_configs["8080"].get("/msteams/crud-updated")}]},
        "crud-original",
        "crud-updated",
    ),
    (
        "email",
        lambda sink: {"email_configs": [{"to": "crud-original@integration.test"}]},
        lambda sink: {"email_configs": [{"to": "crud-updated@integration.test"}]},
        "crud-original@integration.test",
        "crud-updated@integration.test",
    ),
]


@pytest.mark.parametrize(
    "channel_type,make_config,make_updated_config,created_marker,updated_marker",
    CHANNEL_TYPE_CASES,
    ids=[case[0] for case in CHANNEL_TYPE_CASES],
)
def test_channel_crud(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    channel_type: str,
    make_config: Callable[[types.TestContainerDocker], dict],
    make_updated_config: Callable[[types.TestContainerDocker], dict],
    created_marker: str,
    updated_marker: str,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"crud-{channel_type}-{uuid.uuid4()}"

    config = {"name": name, **make_config(notification_channel)}
    response = requests.post(signoz.self.host_configs["8080"].get("/api/v1/channels"), json=config, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.CREATED, response.text
    created = response.json()["data"]
    channel_id = created["id"]
    assert created["name"] == name
    assert created["type"] == channel_type

    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/channels"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.OK, response.text
    listed = {channel["name"]: channel for channel in response.json()["data"]}
    assert name in listed
    assert listed[name]["type"] == channel_type

    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.OK, response.text
    assert created_marker in response.json()["data"]["data"]

    updated_config = {"name": name, **make_updated_config(notification_channel)}
    response = requests.put(signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"), json=updated_config, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]["data"]
    assert updated_marker in data
    assert created_marker not in data

    response = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


def test_create_rejects_duplicate_name(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_notification_channel: Callable[[dict], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"duplicate-{uuid.uuid4()}"

    create_notification_channel({"name": name, "email_configs": [{"to": "first@integration.test"}]})

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={"name": name, "email_configs": [{"to": "second@integration.test"}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "unique" in response.text


def test_create_rejects_channel_without_configs(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={"name": f"empty-{uuid.uuid4()}"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "notification configuration" in response.text


def test_update_rejects_name_change(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_notification_channel: Callable[[dict], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"rename-{uuid.uuid4()}"
    channel_id = create_notification_channel({"name": name, "email_configs": [{"to": "rename@integration.test"}]})

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel_id}"),
        json={"name": f"{name}-renamed", "email_configs": [{"to": "rename@integration.test"}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot update channel name" in response.text


def test_channels_require_authentication(signoz: types.SigNoz) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/channels"), timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


def test_email_channel_never_stores_or_serves_smtp_settings(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    hostile_name = f"hostile-email-{uuid.uuid4()}"
    hostile_config = {
        "name": hostile_name,
        "email_configs": [
            {
                "to": "hostile@integration.test",
                "from": "spoofed@integration.test",
                "hello": "attacker.test",
                "smarthost": "smtp.attacker.test:2525",
                "auth_username": "attacker",
                "auth_password": "tenant-posted-secret",
                "require_tls": False,
                "headers": {"Subject": "hostile subject"},
            }
        ],
    }

    response = requests.post(signoz.self.host_configs["8080"].get("/api/v1/channels"), json=hostile_config, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.CREATED, response.text
    created = response.json()["data"]
    assert_email_channel_payload_clean(created["data"])

    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/channels/{created['id']}"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.OK, response.text
    served = response.json()["data"]["data"]
    assert_email_channel_payload_clean(served)
    assert "hostile@integration.test" in served
    assert "hostile subject" in served
    assert "smtp.attacker.test" not in served
    assert "tenant-posted-secret" not in served

    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/channels"), headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)
    assert response.status_code == HTTPStatus.OK, response.text
    assert "tenant-posted-secret" not in response.text
    assert MAILDEV_INCOMING_PASS not in response.text

    with signoz.sqlstore.conn.connect() as conn:
        stored = conn.execute(
            text("SELECT data FROM notification_channel WHERE display_name = :name"),
            {"name": hostile_name},
        ).fetchone()
        assert stored is not None
        assert_email_channel_payload_clean(stored[0])
        assert "tenant-posted-secret" not in stored[0]

        configs = conn.execute(text("SELECT config FROM alertmanager_config")).fetchall()
        assert len(configs) > 0
        for (config_raw,) in configs:
            assert MAILDEV_INCOMING_PASS not in config_raw
            assert "tenant-posted-secret" not in config_raw
            assert '"smtp_auth_password"' not in config_raw
            assert '"auth_password"' not in config_raw


def test_email_test_channel_delivers_via_env_transport(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    maildev: types.TestContainerDocker,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_mails(maildev)

    recipient = f"delivery-{uuid.uuid4()}@integration.test"
    send_test_notification(
        signoz,
        token,
        {"name": f"delivery-{uuid.uuid4()}", "email_configs": [{"to": recipient}]},
    )

    deadline = time.time() + 30
    while time.time() < deadline:
        if verify_email_received(maildev, {"to": recipient, "from": SMTP_TEST_FROM}):
            return
        time.sleep(1)
    raise AssertionError(f"no email delivered to {recipient} from {SMTP_TEST_FROM}")
