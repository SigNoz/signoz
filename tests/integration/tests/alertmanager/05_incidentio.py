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
    incidentio_config,
    incidentio_event_subset,
    incidentio_ok_mappings,
    incidentio_path,
    incidentio_retry_mappings,
    wait_for_org_registration,
)

logger = setup_logger(__name__)

METRICS_DATA = "alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "alerts/test_scenarios/threshold_above_at_least_once/rule.json"
LOGS_DATA = "alerts/test_scenarios/threshold_below_at_least_once/alert_data.jsonl"
LOGS_RULE = "alerts/test_scenarios/threshold_below_at_least_once/rule.json"


INCIDENTIO_CASES = [
    types.AlertManagerNotificationTestCase(
        name="incidentio_default_metrics_firing",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config=incidentio_config("inc-metrics"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": incidentio_path("inc-metrics"),
                        "count": 1,
                        "json_body": incidentio_event_subset("threshold_above_at_least_once", [("View in SigNoz", r"/alerts/overview\?ruleId=")]),
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="incidentio_rich_event_logs",
        rule_path=LOGS_RULE,
        alert_data=[types.AlertData(type="logs", data_path=LOGS_DATA)],
        channel_config=incidentio_config("inc-logs"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": incidentio_path("inc-logs"),
                        "count": 1,
                        "json_body": incidentio_event_subset(
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
    "incidentio_test_case",
    INCIDENTIO_CASES,
    ids=lambda c: c.name,
)
def test_incidentio_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
    incidentio_test_case: types.AlertManagerNotificationTestCase,
) -> None:
    channel_name = str(uuid.uuid4())
    path = incidentio_test_case.notification_expectation.notification_validations[0].validation_data["path"]

    channel_config = update_raw_channel_config(incidentio_test_case.channel_config, channel_name, notification_channel)

    make_http_mocks(notification_channel, incidentio_ok_mappings(path))

    create_notification_channel(channel_config)
    wait_for_org_registration(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), notification_channel)

    insert_alert_data(incidentio_test_case.alert_data, base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(incidentio_test_case.rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)

    verify_notification_expectation(notification_channel, maildev, incidentio_test_case.notification_expectation)


def test_incidentio_retry_429_then_202(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
    path = incidentio_path("inc-retry")

    channel_config = update_raw_channel_config(incidentio_config("inc-retry"), channel_name, notification_channel)

    make_http_mocks(notification_channel, incidentio_retry_mappings(path))

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
                    validation_data={
                        # a retryable 429 is followed by a successful re-POST => >=2 hits
                        "path": path,
                        "min_count": 2,
                        "json_body": {"status": "firing"},
                    },
                ),
            ],
        ),
    )
