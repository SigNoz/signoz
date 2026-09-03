import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.alerts import (
    get_testdata_file_path,
    update_raw_channel_config,
    update_rule_channel_name,
    verify_notification_expectation,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.notification_channel import (
    JSMOPS_API_BASE,
    JSMOPS_NOTES_PATH_PATTERN,
    jsmops_alert_subset,
    jsmops_config,
    jsmops_create_mapping,
    jsmops_notes_mapping,
    jsmops_retry_create_mappings,
    wait_for_org_registration,
)

logger = setup_logger(__name__)

METRICS_DATA = "alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "alerts/test_scenarios/threshold_above_at_least_once/rule.json"
LOGS_DATA = "alerts/test_scenarios/threshold_below_at_least_once/alert_data.jsonl"
LOGS_RULE = "alerts/test_scenarios/threshold_below_at_least_once/rule.json"


JSMOPS_CASES = [
    types.AlertManagerNotificationTestCase(
        name="jsmops_default_metrics_firing",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config=jsmops_config(),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": f"{JSMOPS_API_BASE}/v2/alerts",
                        "count": 1,
                        "json_body": jsmops_alert_subset("threshold_above_at_least_once", [("View in SigNoz", r"/alerts/overview\?ruleId=")]),
                    },
                ),
                types.NotificationValidation(
                    destination_type="webhook",
                    # every fire appends a timeline note
                    validation_data={"path_pattern": JSMOPS_NOTES_PATH_PATTERN, "count": 1},
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="jsmops_rich_alert_logs",
        rule_path=LOGS_RULE,
        alert_data=[types.AlertData(type="logs", data_path=LOGS_DATA)],
        channel_config=jsmops_config(),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": f"{JSMOPS_API_BASE}/v2/alerts",
                        "count": 1,
                        "json_body": jsmops_alert_subset(
                            "threshold_below_at_least_once",
                            [("View in SigNoz", r"/alerts/overview\?ruleId="), ("View related logs", r"/logs/logs-explorer\?")],
                        ),
                    },
                ),
            ],
        ),
    ),
]


@pytest.mark.parametrize(
    "jsmops_test_case",
    JSMOPS_CASES,
    ids=lambda c: c.name,
)
def test_jsmops_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
    jsmops_test_case: types.AlertManagerNotificationTestCase,
) -> None:
    channel_name = str(uuid.uuid4())

    channel_config = update_raw_channel_config(jsmops_test_case.channel_config, channel_name, notification_channel)

    make_http_mocks(notification_channel, [jsmops_create_mapping(), jsmops_notes_mapping()])

    create_notification_channel(channel_config)
    wait_for_org_registration(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), notification_channel)

    insert_alert_data(jsmops_test_case.alert_data, base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(jsmops_test_case.rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)

    verify_notification_expectation(notification_channel, maildev, jsmops_test_case.notification_expectation)


def test_jsmops_retry_429_then_202(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
) -> None:
    channel_name = str(uuid.uuid4())

    channel_config = update_raw_channel_config(jsmops_config(), channel_name, notification_channel)

    make_http_mocks(notification_channel, [*jsmops_retry_create_mappings(), jsmops_notes_mapping()])

    create_notification_channel(channel_config)
    wait_for_org_registration(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), notification_channel)

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
                    # a retryable 429 on the create re-runs the whole notify => >=2 creates
                    validation_data={"path": f"{JSMOPS_API_BASE}/v2/alerts", "min_count": 2},
                ),
                types.NotificationValidation(
                    destination_type="webhook",
                    # the note only goes out after the create succeeded
                    validation_data={"path_pattern": JSMOPS_NOTES_PATH_PATTERN, "count": 1},
                ),
            ],
        ),
    )
