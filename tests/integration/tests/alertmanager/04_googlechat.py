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
    googlechat_card_subset,
    googlechat_config,
    googlechat_ok_mappings,
    googlechat_retry_mappings,
    wait_for_org_registration,
)

logger = setup_logger(__name__)

METRICS_DATA = "alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "alerts/test_scenarios/threshold_above_at_least_once/rule.json"
LOGS_DATA = "alerts/test_scenarios/threshold_below_at_least_once/alert_data.jsonl"
LOGS_RULE = "alerts/test_scenarios/threshold_below_at_least_once/rule.json"
TRACES_DATA = "alerts/test_scenarios/threshold_above_average/alert_data.jsonl"
TRACES_RULE = "alerts/test_scenarios/threshold_above_average/rule.json"


GOOGLECHAT_CASES = [
    types.AlertManagerNotificationTestCase(
        name="googlechat_default_metrics_firing",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config=googlechat_config("gc-metrics"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v1/spaces/gc-metrics/messages",
                        "count": 1,
                        "json_body": googlechat_card_subset("threshold_above_at_least_once", [("Open in SigNoz", r"/alerts/overview\?ruleId=")]),
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="googlechat_rich_card_logs",
        rule_path=LOGS_RULE,
        alert_data=[types.AlertData(type="logs", data_path=LOGS_DATA)],
        channel_config=googlechat_config("gc-logs"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v1/spaces/gc-logs/messages",
                        "count": 1,
                        "json_body": googlechat_card_subset(
                            "threshold_below_at_least_once",
                            [("View Related Logs", r"/logs/logs-explorer\?"), ("Open in SigNoz", r"/alerts/overview\?ruleId=")],
                        ),
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="googlechat_rich_card_traces",
        rule_path=TRACES_RULE,
        alert_data=[types.AlertData(type="traces", data_path=TRACES_DATA)],
        channel_config=googlechat_config("gc-traces"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v1/spaces/gc-traces/messages",
                        "count": 1,
                        "json_body": googlechat_card_subset(
                            "threshold_above_average",
                            [("View Related Traces", r"traces-explorer\?"), ("Open in SigNoz", r"/alerts/overview\?ruleId=")],
                        ),
                    },
                ),
            ],
        ),
    ),
]


@pytest.mark.parametrize(
    "gc_test_case",
    GOOGLECHAT_CASES,
    ids=lambda c: c.name,
)
def test_googlechat_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
    gc_test_case: types.AlertManagerNotificationTestCase,
) -> None:
    channel_name = str(uuid.uuid4())
    path = gc_test_case.notification_expectation.notification_validations[0].validation_data["path"]

    channel_config = update_raw_channel_config(gc_test_case.channel_config, channel_name, notification_channel)

    make_http_mocks(notification_channel, googlechat_ok_mappings(path))

    create_notification_channel(channel_config)
    wait_for_org_registration(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), notification_channel)

    insert_alert_data(gc_test_case.alert_data, base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(gc_test_case.rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)

    verify_notification_expectation(notification_channel, maildev, gc_test_case.notification_expectation)


def test_googlechat_retry_429_then_200(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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
    path = "/v1/spaces/gc-retry/messages"

    channel_config = update_raw_channel_config(googlechat_config("gc-retry"), channel_name, notification_channel)

    make_http_mocks(notification_channel, googlechat_retry_mappings(path))

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
                        "json_body": {"cardsV2": [{"cardId": "signoz-alert"}]},
                    },
                ),
            ],
        ),
    )
