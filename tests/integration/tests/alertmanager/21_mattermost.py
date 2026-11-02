import base64
import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import NamedTuple

import pytest
import requests
from wiremock.resources.mappings import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import (
    get_testdata_file_path,
    update_rule_channel_name,
    verify_notification_expectation,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.notification_channel import (
    mattermost_channel,
    mattermost_message_subset,
    mattermost_ok_mappings,
    mattermost_path,
    mattermost_retry_mappings,
    wait_for_alertmanager_sync,
)

V2_BASE_URL = "/api/v2/notification_channels"

METRICS_DATA = "ruler/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "ruler/test_scenarios/threshold_above_at_least_once/rule.json"


def _create_channel_and_rule(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    admin_token: str,
    notification_channel: types.TestContainerDocker,
    cleanup_notification_channels: list[str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    hook: str,
) -> None:
    channel_name = str(uuid.uuid4())
    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json=mattermost_channel(channel_name, hook, notification_channel),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    cleanup_notification_channels.append(response.json()["data"]["id"])
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    insert_alert_data([types.AlertData(type="metrics", data_path=METRICS_DATA)], base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(METRICS_RULE), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)


def test_mattermost_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    cleanup_notification_channels: list[str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
) -> None:
    path = mattermost_path("mm-metrics")
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    make_http_mocks(notification_channel, mattermost_ok_mappings(path))

    _create_channel_and_rule(signoz, admin_token, notification_channel, cleanup_notification_channels, create_alert_rule, insert_alert_data, "mm-metrics")

    verify_notification_expectation(
        notification_channel,
        maildev,
        types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": path,
                        "count": 1,
                        "json_body": mattermost_message_subset("threshold_above_at_least_once"),
                    },
                ),
            ],
        ),
    )


def test_mattermost_retry_503_then_200(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    cleanup_notification_channels: list[str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
) -> None:
    path = mattermost_path("mm-retry")
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    make_http_mocks(notification_channel, mattermost_retry_mappings(path))

    _create_channel_and_rule(signoz, admin_token, notification_channel, cleanup_notification_channels, create_alert_rule, insert_alert_data, "mm-retry")

    verify_notification_expectation(
        notification_channel,
        maildev,
        types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        # a retryable 503 is followed by a successful re-POST => >=2 hits
                        "path": path,
                        "min_count": 2,
                        "json_body": {"channel": "alerts"},
                    },
                ),
            ],
        ),
    )


# channel test drives the notifier once, synchronously, with no retry.
class TestChannelCase(NamedTuple):
    __test__ = False
    name: str
    hook: str
    status: int  # stub status
    body: str  # stub body
    expected_error: str | None  # the notifier's error text, None when delivered


TEST_CHANNEL_CASES = [
    TestChannelCase("success", "mm-tc-ok", 200, "ok", None),
    TestChannelCase("bad_request_400", "mm-tc-400", 400, '{"id":"web.incoming_webhook.text.app_error"}', "unexpected status code 400"),
    TestChannelCase("not_found_404", "mm-tc-404", 404, '{"id":"web.incoming_webhook.invalid.app_error"}', "unexpected status code 404"),
]


@pytest.mark.parametrize(
    "case",
    TEST_CHANNEL_CASES,
    ids=lambda c: c.name,
)
def test_mattermost_test_channel(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    case: TestChannelCase,
) -> None:
    path = mattermost_path(case.hook)
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url_path=path),
                response=MappingResponse(status=case.status, body=case.body),
            )
        ],
    )

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/test"),
        json={"config": mattermost_channel(str(uuid.uuid4()), case.hook, notification_channel)["config"]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=30,
    )

    if case.expected_error is None:
        assert response.status_code == HTTPStatus.NO_CONTENT, f"expected 204, got {response.status_code}: {response.text}"
    else:
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR, f"expected 500, got {response.status_code}: {response.text}"
        assert case.expected_error in response.text, f"expected {case.expected_error!r} in error body: {response.text}"
        # the webhook path is the credential and must not leak into the error
        assert case.hook not in response.text, f"webhook path leaked into error body: {response.text}"

    # exactly one delivery attempt either way (testChannel never retries)
    count = requests.post(
        notification_channel.host_configs["8080"].get("/__admin/requests/count"),
        json={"method": "POST", "urlPath": path},
        timeout=10,
    )
    assert count.json()["count"] == 1, f"expected exactly 1 request (no retry), got {count.text}"

    find = requests.post(
        notification_channel.host_configs["8080"].get("/__admin/requests/find"),
        json={"method": "POST", "urlPath": path},
        timeout=10,
    )
    message = json.loads(base64.b64decode(find.json()["requests"][0]["bodyAsBase64"]).decode("utf-8"))
    assert message["channel"] == "alerts"
    assert "# Alerts Firing:" in message["text"], f"unexpected text: {message['text']}"
    assert "alertname = Test Alert" in message["text"], f"unexpected text: {message['text']}"
