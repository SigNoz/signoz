import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.alerts import (
    get_testdata_file_path,
    update_rule_channel_name,
    verify_notification_expectation,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.notification_channel import (
    telegram_channel,
    telegram_message_subset,
    telegram_ok_mappings,
    telegram_path,
    telegram_retry_mappings,
    wait_for_alertmanager_sync,
)

V2_BASE_URL = "/api/v2/notification_channels"

METRICS_DATA = "ruler/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "ruler/test_scenarios/threshold_above_at_least_once/rule.json"
LOGS_DATA = "ruler/test_scenarios/threshold_below_at_least_once/alert_data.jsonl"
LOGS_RULE = "ruler/test_scenarios/threshold_below_at_least_once/rule.json"
TRACES_DATA = "ruler/test_scenarios/threshold_above_average/alert_data.jsonl"
TRACES_RULE = "ruler/test_scenarios/threshold_above_average/rule.json"


# channel_config holds the bot name; the v2 body is built at runtime since it
# needs the WireMock host.
TELEGRAM_CASES = [
    types.AlertManagerNotificationTestCase(
        name="telegram_default_metrics_firing",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config={"bot": "tg-metrics"},
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": telegram_path("tg-metrics"),
                        "count": 1,
                        "json_body": telegram_message_subset("threshold_above_at_least_once", [("View in SigNoz", r"/alerts/overview\?ruleId=")]),
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="telegram_rich_message_logs",
        rule_path=LOGS_RULE,
        alert_data=[types.AlertData(type="logs", data_path=LOGS_DATA)],
        channel_config={"bot": "tg-logs"},
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": telegram_path("tg-logs"),
                        "count": 1,
                        "json_body": telegram_message_subset(
                            "threshold_below_at_least_once",
                            [("View in SigNoz", r"/alerts/overview\?ruleId="), ("View related logs", r"/logs/logs-explorer\?")],
                        ),
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="telegram_rich_message_traces",
        rule_path=TRACES_RULE,
        alert_data=[types.AlertData(type="traces", data_path=TRACES_DATA)],
        channel_config={"bot": "tg-traces"},
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": telegram_path("tg-traces"),
                        "count": 1,
                        "json_body": telegram_message_subset(
                            "threshold_above_average",
                            [("View in SigNoz", r"/alerts/overview\?ruleId="), ("View related traces", r"traces-explorer\?")],
                        ),
                    },
                ),
            ],
        ),
    ),
]


@pytest.mark.parametrize(
    "telegram_test_case",
    TELEGRAM_CASES,
    ids=lambda c: c.name,
)
def test_telegram_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_user_admin: None,  # pylint: disable=unused-argument
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    cleanup_notification_channels: list[str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
    telegram_test_case: types.AlertManagerNotificationTestCase,
) -> None:
    channel_name = str(uuid.uuid4())
    path = telegram_test_case.notification_expectation.notification_validations[0].validation_data["path"]
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(notification_channel, telegram_ok_mappings(path))

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json=telegram_channel(channel_name, telegram_test_case.channel_config["bot"], notification_channel),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    cleanup_notification_channels.append(response.json()["data"]["id"])
    wait_for_alertmanager_sync(signoz, admin_token, notification_channel)

    insert_alert_data(telegram_test_case.alert_data, base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(telegram_test_case.rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)

    verify_notification_expectation(notification_channel, maildev, telegram_test_case.notification_expectation)


def test_telegram_retry_429_then_200(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
    channel_name = str(uuid.uuid4())
    path = telegram_path("tg-retry")
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    make_http_mocks(notification_channel, telegram_retry_mappings(path))

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json=telegram_channel(channel_name, "tg-retry", notification_channel),
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
                        # a retryable 429 is followed by a successful re-POST => >=2 hits
                        "path": path,
                        "min_count": 2,
                        "json_body": {"parse_mode": "HTML"},
                    },
                ),
            ],
        ),
    )
