import json
import time
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests
from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import update_rule_channel_name, verify_notification_expectation
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
)
from fixtures.fs import get_testdata_file_path
from fixtures.notification_channel import rewrite_channel_as_legacy_receiver

TIMEOUT = 10

V2_BASE_URL = "/api/v2/notification_channels"


def test_get_reflects_a_v2_update_after_a_v1_create(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    display_name = f"V1 then V2 {uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={"name": display_name, "slack_configs": [{"api_url": "https://hooks.slack.test/services/T/B/V1", "channel": "#from-v1"}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["config"]["spec"]["channel"] == "#from-v1"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        json={"config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/V2", "channel": "#from-v2"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["config"]["spec"]["channel"] == "#from-v2"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    fetched = response.json()["data"]
    assert fetched["displayName"] == display_name
    assert fetched["config"]["spec"]["apiUrl"] == "https://hooks.slack.test/services/T/B/V2"
    assert fetched["config"]["spec"]["channel"] == "#from-v2"


@pytest.mark.parametrize(
    "receiver",
    [
        pytest.param(
            {"telegram_configs": [{"chat": 12345, "token": "telegram-bot-token"}]},
            id="kind_v2_does_not_model",
        ),
        pytest.param(
            {
                "slack_configs": [{"api_url": "https://hooks.slack.test/services/T/B/X", "channel": "#alerts"}],
                "webhook_configs": [{"url": "https://webhook.test/hook"}],
            },
            id="several_notifiers",
        ),
        pytest.param(
            {"webhook_configs": [{"url": "https://webhook.test/hook", "http_config": {"proxy_url": "http://proxy.test:3128"}}]},
            id="unsupported_http_config",
        ),
    ],
)
def test_v1_rejects_a_receiver_v2_cannot_represent(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    receiver: dict,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        json={"name": f"v1-rejected-{uuid.uuid4().hex[:8]}", **receiver},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_update_retypes_a_legacy_channel_of_an_unmodelled_kind(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    cleanup_notification_channels: list[str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"legacy-telegram-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)
    rewrite_channel_as_legacy_receiver(signoz, channel_id, {"name": name, "telegram_configs": [{"chat": 12345, "token": "telegram-bot-token"}]})

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text

    # A v2 update needs nothing from the stored config, so it can rewrite a
    # channel v2 cannot read.
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        json={"config": {"kind": "slack", "spec": {"apiUrl": "https://hooks.slack.test/services/T/B/X", "channel": "#retyped"}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["config"]["kind"] == "slack"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    fetched = response.json()["data"]
    assert fetched["displayName"] == name
    assert fetched["config"]["kind"] == "slack"
    assert fetched["config"]["spec"]["channel"] == "#retyped"

    response = requests.get(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        params={"query": name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["channels"][0]["kind"] == "slack"


def test_alerts_still_reach_a_legacy_channel_v2_cannot_read(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    cleanup_notification_channels: list[str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    name = f"legacy-delivery-{uuid.uuid4().hex[:8]}"
    slack_path = f"/services/T/B/{name}"
    webhook_path = f"/webhook/{name}"
    make_http_mocks(
        notification_channel,
        [Mapping(request=MappingRequest(method=HttpMethods.POST, url=path), response=MappingResponse(status=200, json_body={}), persistent=False) for path in (slack_path, webhook_path)],
    )

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"name": name, "config": {"kind": "webhook", "spec": {"url": notification_channel.container_configs["8080"].get(webhook_path)}}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    channel_id = response.json()["data"]["id"]
    cleanup_notification_channels.append(channel_id)
    rewrite_channel_as_legacy_receiver(
        signoz,
        channel_id,
        {
            "name": name,
            "slack_configs": [{"api_url": notification_channel.container_configs["8080"].get(slack_path), "channel": "#legacy"}],
            "webhook_configs": [{"url": notification_channel.container_configs["8080"].get(webhook_path)}],
        },
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{channel_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text

    # The rule must not fire before the alertmanager has polled the swapped receiver.
    time.sleep(12)

    insert_alert_data(
        [types.AlertData(type="metrics", data_path="ruler/test_scenarios/threshold_above_at_least_once/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )
    with open(get_testdata_file_path("ruler/test_scenarios/threshold_above_at_least_once/rule.json"), encoding="utf-8") as f:
        rule_data = json.load(f)
    update_rule_channel_name(rule_data, name)
    create_alert_rule(rule_data)

    verify_notification_expectation(
        notification_channel,
        maildev,
        types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(destination_type="webhook", validation_data={"path": slack_path, "json_body": {"channel": "#legacy"}}),
                types.NotificationValidation(destination_type="webhook", validation_data={"path": webhook_path, "json_body": {"status": "firing", "receiver": name}}),
            ],
        ),
    )
