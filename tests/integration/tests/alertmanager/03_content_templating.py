import json
import re
import time
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest
from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import (
    get_testdata_file_path,
    update_raw_channel_config,
    update_rule_channel_name,
    verify_notification_expectation,
)
from fixtures.logger import setup_logger
from fixtures.maildev import delete_all_mails
from fixtures.notification_channel import (
    msteams_default_config,
    opsgenie_default_config,
    pagerduty_default_config,
    slack_default_config,
    webhook_default_config,
)

logger = setup_logger(__name__)


CONTENT_TEMPLATING_TEST = [
    types.AlertManagerNotificationTestCase(
        name="msteams_metrics_default_templating",
        rule_path="alertmanager/content_templating/metrics_rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alertmanager/content_templating/metrics_data.jsonl",
            ),
        ],
        channel_config=msteams_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/msteams/webhook_url",
                        "json_body": {
                            "type": "message",
                            "attachments": [
                                {
                                    "contentType": "application/vnd.microsoft.card.adaptive",
                                    "content": {
                                        "type": "AdaptiveCard",
                                        "body": [
                                            {
                                                "type": "TextBlock",
                                                "text": re.compile(
                                                    r'\[FIRING:1\] content_templating_metrics for  \(alertname="content_templating_metrics", container="checkout", namespace="production", node="ip-10-0-1-23", pod="checkout-7d9c8b5f4-x2k9p", ruleSource="http://localhost:8080/alerts/overview\?ruleId=[0-9a-f-]+", severity="critical", threshold\.name="critical"\)'
                                                ),
                                            },
                                        ],
                                    },
                                }
                            ],
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="opsgenie_metrics_default_templating",
        rule_path="alertmanager/content_templating/metrics_rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alertmanager/content_templating/metrics_data.jsonl",
            ),
        ],
        channel_config=opsgenie_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v2/alerts",
                        "json_body": {
                            "message": "content_templating_metrics",
                            "details": {
                                "alertname": "content_templating_metrics",
                                "container": "checkout",
                                "namespace": "production",
                                "node": "ip-10-0-1-23",
                                "pod": "checkout-7d9c8b5f4-x2k9p",
                                "severity": "critical",
                                "threshold.name": "critical",
                            },
                            "priority": "P1",
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="pagerduty_metrics_default_templating",
        rule_path="alertmanager/content_templating/metrics_rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alertmanager/content_templating/metrics_data.jsonl",
            ),
        ],
        channel_config=pagerduty_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v2/enqueue",
                        "json_body": {
                            "routing_key": "PagerDutyRoutingKey",
                            "payload": {
                                "severity": "critical",
                                "custom_details": {
                                    "firing": {
                                        "Labels": [
                                            "alertname = content_templating_metrics",
                                            "container = checkout",
                                            "namespace = production",
                                            "node = ip-10-0-1-23",
                                            "pod = checkout-7d9c8b5f4-x2k9p",
                                            "severity = critical",
                                            "threshold.name = critical",
                                        ],
                                    }
                                },
                            },
                            "client": "SigNoz Alert Manager",
                            "client_url": "https://enter-signoz-host-n-port-here/alerts",
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="slack_logs_default_templating",
        rule_path="alertmanager/content_templating/logs_rule.json",
        alert_data=[
            types.AlertData(
                type="logs",
                data_path="alertmanager/content_templating/logs_data.jsonl",
            ),
        ],
        channel_config=slack_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/services/TEAM_ID/BOT_ID/TOKEN_ID",
                        "json_body": {
                            "username": "Alertmanager",
                            "attachments": [
                                {
                                    "color": "danger",
                                    "mrkdwn_in": ["fallback", "pretext", "text"],
                                }
                            ],
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="slack_metrics_default_templating",
        rule_path="alertmanager/content_templating/metrics_rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alertmanager/content_templating/metrics_data.jsonl",
            ),
        ],
        channel_config=slack_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/services/TEAM_ID/BOT_ID/TOKEN_ID",
                        "json_body": {
                            "username": "Alertmanager",
                            "attachments": [
                                {
                                    "color": "danger",
                                    "mrkdwn_in": ["fallback", "pretext", "text"],
                                }
                            ],
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="webhook_metrics_default_templating",
        rule_path="alertmanager/content_templating/metrics_rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alertmanager/content_templating/metrics_data.jsonl",
            ),
        ],
        channel_config=webhook_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=120,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/webhook/webhook_url",
                        "json_body": {
                            "status": "firing",
                            "alerts": [
                                {
                                    "status": "firing",
                                    "labels": {
                                        "alertname": "content_templating_metrics",
                                        "container": "checkout",
                                        "namespace": "production",
                                        "node": "ip-10-0-1-23",
                                        "pod": "checkout-7d9c8b5f4-x2k9p",
                                        "severity": "critical",
                                        "threshold.name": "critical",
                                    },
                                    "annotations": {
                                        "description": "Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded memory threshold",
                                        "summary": "High container memory in production/checkout-7d9c8b5f4-x2k9p",
                                    },
                                }
                            ],
                            "commonLabels": {
                                "alertname": "content_templating_metrics",
                                "container": "checkout",
                                "namespace": "production",
                                "node": "ip-10-0-1-23",
                                "pod": "checkout-7d9c8b5f4-x2k9p",
                                "severity": "critical",
                                "threshold.name": "critical",
                            },
                        },
                    },
                ),
            ],
        ),
    ),
]


@pytest.mark.parametrize(
    "content_templating_test_case",
    CONTENT_TEMPLATING_TEST,
    ids=lambda content_templating_test_case: content_templating_test_case.name,
)
def test_content_templating(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    maildev: types.TestContainerDocker,
    content_templating_test_case: types.AlertManagerNotificationTestCase,
):
    channel_name = str(uuid.uuid4())

    channel_config = update_raw_channel_config(content_templating_test_case.channel_config, channel_name, notification_channel)
    logger.info("Channel config: %s", {"channel_config": channel_config})

    webhook_validations = [v for v in content_templating_test_case.notification_expectation.notification_validations if v.destination_type == "webhook"]
    if len(webhook_validations) > 0:
        mock_mappings = [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url=v.validation_data["path"]),
                response=MappingResponse(status=200, json_body={}),
                persistent=False,
            )
            for v in webhook_validations
        ]

        make_http_mocks(notification_channel, mock_mappings)
        logger.info("Mock mappings created")

    if any(v.destination_type == "email" for v in content_templating_test_case.notification_expectation.notification_validations):
        delete_all_mails(maildev)
        logger.info("Mails deleted")

    create_notification_channel(channel_config)
    logger.info("Channel created with name: %s", {"channel_name": channel_name})

    time.sleep(12)

    insert_alert_data(
        content_templating_test_case.alert_data,
        base_time=datetime.now(tz=UTC) - timedelta(minutes=10),
    )

    rule_path = get_testdata_file_path(content_templating_test_case.rule_path)
    with open(rule_path, encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    rule_id = create_alert_rule(rule_data)
    logger.info("rule created: %s", {"rule_id": rule_id, "rule_name": rule_data["alert"]})

    verify_notification_expectation(
        notification_channel,
        maildev,
        content_templating_test_case.notification_expectation,
    )
