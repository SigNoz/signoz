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
    JIRA_API_BASE,
    jira_config,
    jira_create_mapping,
    jira_issue_subset,
    jira_retry_search_mappings,
    jira_search_mapping,
    wait_for_org_registration,
)

logger = setup_logger(__name__)

METRICS_DATA = "alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "alerts/test_scenarios/threshold_above_at_least_once/rule.json"
LOGS_DATA = "alerts/test_scenarios/threshold_below_at_least_once/alert_data.jsonl"
LOGS_RULE = "alerts/test_scenarios/threshold_below_at_least_once/rule.json"


JIRA_CASES = [
    types.AlertManagerNotificationTestCase(
        name="jira_default_metrics_firing",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config=jira_config(),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": f"{JIRA_API_BASE}/issue",
                        "count": 1,
                        "json_body": jira_issue_subset("threshold_above_at_least_once", [("Open in SigNoz", r"/alerts/overview\?ruleId=")]),
                    },
                ),
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={"path": f"{JIRA_API_BASE}/search/jql", "count": 1},
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="jira_rich_issue_logs",
        rule_path=LOGS_RULE,
        alert_data=[types.AlertData(type="logs", data_path=LOGS_DATA)],
        channel_config=jira_config(),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": f"{JIRA_API_BASE}/issue",
                        "count": 1,
                        "json_body": jira_issue_subset(
                            "threshold_below_at_least_once",
                            [("Open in SigNoz", r"/alerts/overview\?ruleId="), ("View Related Logs", r"/logs/logs-explorer\?")],
                        ),
                    },
                ),
            ],
        ),
    ),
]


@pytest.mark.parametrize(
    "jira_test_case",
    JIRA_CASES,
    ids=lambda c: c.name,
)
def test_jira_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
    jira_test_case: types.AlertManagerNotificationTestCase,
) -> None:
    channel_name = str(uuid.uuid4())

    channel_config = update_raw_channel_config(jira_test_case.channel_config, channel_name, notification_channel)

    make_http_mocks(notification_channel, [jira_search_mapping([]), jira_create_mapping()])

    create_notification_channel(channel_config)
    wait_for_org_registration(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), notification_channel)

    insert_alert_data(jira_test_case.alert_data, base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(jira_test_case.rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)

    verify_notification_expectation(notification_channel, maildev, jira_test_case.notification_expectation)


def test_jira_retry_429_then_200(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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

    channel_config = update_raw_channel_config(jira_config(), channel_name, notification_channel)

    make_http_mocks(notification_channel, [*jira_retry_search_mappings(), jira_create_mapping()])

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
                    # a retryable 429 on the search re-runs the whole notify => >=2 searches
                    validation_data={"path": f"{JIRA_API_BASE}/search/jql", "min_count": 2},
                ),
                types.NotificationValidation(
                    destination_type="webhook",
                    # but the issue is still only created once
                    validation_data={"path": f"{JIRA_API_BASE}/issue", "count": 1},
                ),
            ],
        ),
    )
