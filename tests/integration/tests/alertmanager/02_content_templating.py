import json
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
    email_default_config,
    msteams_default_config,
    opsgenie_default_config,
    pagerduty_default_config,
    slack_default_config,
    webhook_default_config,
)

logger = setup_logger(__name__)


# Test cases verifying custom content templating in notifications
# annotations defined inside the rule.json files with title_template / body_template define custom templating.
CONTENT_TEMPLATING_TEST = [
    types.AlertManagerNotificationTestCase(
        name="msteams_metrics_custom_templating",
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
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/msteams/webhook_url",
                        "json_body": {
                            "attachments": [
                                {
                                    "content": {
                                        "body": [
                                            {"text": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p"},
                                            {
                                                "text": "**Severity:** critical\n**Status:** firing\n\n**Pod Details:**\n- **Namespace:** production\n- **Pod:** checkout-7d9c8b5f4-x2k9p\n- **Container:** checkout\n- **Node:** ip-10-0-1-23\n\n**Description:** Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded the critical threshold.\n\n**Runbook:** https://signoz.io/docs/runbooks/container-memory-near-limit"
                                            },
                                        ]
                                    }
                                }
                            ]
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="opsgenie_metrics_custom_templating",
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
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v2/alerts",
                        "json_body": {
                            "message": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p",
                            "description": '<div><p><strong>Severity:</strong> critical\n<strong>Status:</strong> firing</p>\n<p><strong>Pod Details:</strong></p>\n<ul>\n<li><strong>Namespace:</strong> production</li>\n<li><strong>Pod:</strong> checkout-7d9c8b5f4-x2k9p</li>\n<li><strong>Container:</strong> checkout</li>\n<li><strong>Node:</strong> ip-10-0-1-23</li>\n</ul>\n<p><strong>Description:</strong> Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded the critical threshold.</p>\n<p><strong>Runbook:</strong> <a href="https://signoz.io/docs/runbooks/container-memory-near-limit">https://signoz.io/docs/runbooks/container-memory-near-limit</a></p>\n</div>',
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
        name="pagerduty_metrics_custom_templating",
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
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/v2/enqueue",
                        "json_body": {
                            "routing_key": "PagerDutyRoutingKey",
                            "payload": {
                                "summary": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p",
                                "custom_details": {
                                    "firing": {
                                        "Annotations": ["description = Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded memory threshold"],
                                        "Labels": [
                                            "alertname = content_templating_metrics",
                                            "container = checkout",
                                            "namespace = production",
                                            "node = ip-10-0-1-23",
                                            "pod = checkout-7d9c8b5f4-x2k9p",
                                            "severity = critical",
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
        name="slack_logs_custom_templating",
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
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/services/TEAM_ID/BOT_ID/TOKEN_ID",
                        "json_body": {
                            "attachments": [
                                {"title": "[firing] Payment failure spike in payment-service"},
                                {
                                    "text": "*Severity:* critical\n*Status:* firing\n\n*Service:* payment-service\n\n*Description:* Payment failures observed on payment-service, crossing the critical threshold. Investigate downstream payment processor health.\n\n*Runbook:* https://signoz.io/docs/runbooks/payment-failure-spike\n\n",
                                    "actions": [{"type": "button", "text": "View Related Logs"}],
                                },
                            ]
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="slack_metrics_custom_templating",
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
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/services/TEAM_ID/BOT_ID/TOKEN_ID",
                        "json_body": {
                            "attachments": [
                                {"title": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p"},
                                {
                                    "text": "*Severity:* critical\n*Status:* firing\n\n*Pod Details:*\n\n• *Namespace:* production\n• *Pod:* checkout-7d9c8b5f4-x2k9p\n• *Container:* checkout\n• *Node:* ip-10-0-1-23\n\n*Description:* Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded the critical threshold.\n\n*Runbook:* https://signoz.io/docs/runbooks/container-memory-near-limit\n\n"
                                },
                            ]
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="webhook_metrics_custom_templating",
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
            wait_time_seconds=60,
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
                                    },
                                    "annotations": {"templated_title": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p"},
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
                            "commonAnnotations": {
                                "templated_body": "**Severity:** critical\n**Status:** firing\n\n**Pod Details:**\n- **Namespace:** production\n- **Pod:** checkout-7d9c8b5f4-x2k9p\n- **Container:** checkout\n- **Node:** ip-10-0-1-23\n\n**Description:** Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded the critical threshold.\n\n**Runbook:** https://signoz.io/docs/runbooks/container-memory-near-limit",
                                "description": "Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded memory threshold",
                                "summary": "High container memory in production/checkout-7d9c8b5f4-x2k9p",
                                "templated_title": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p",
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
def test_content_templating(
    # wiremock container for webhook notifications
    notification_channel: types.TestContainerDocker,
    # function to create wiremock mocks
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    # function to create alert rule
    create_alert_rule: Callable[[dict], str],
    # Alert data insertion related fixture
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    # Mail dev container for email verification
    maildev: types.TestContainerDocker,
    # test case from parametrize
    content_templating_test_case: types.AlertManagerNotificationTestCase,
):
    # generate unique channel name
    channel_name = str(uuid.uuid4())

    # update channel config: set name and rewrite URLs to wiremock
    channel_config = update_raw_channel_config(content_templating_test_case.channel_config, channel_name, notification_channel)
    logger.info("Channel config: %s", {"channel_config": channel_config})

    # setup wiremock mocks for webhook-based notification validations
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

    # clear mails if any destination is email
    if any(v.destination_type == "email" for v in content_templating_test_case.notification_expectation.notification_validations):
        delete_all_mails(maildev)
        logger.info("Mails deleted")

    # create notification channel
    create_notification_channel(channel_config)
    logger.info("Channel created with name: %s", {"channel_name": channel_name})

    # insert alert data
    insert_alert_data(
        content_templating_test_case.alert_data,
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )

    # create alert rule
    rule_path = get_testdata_file_path(content_templating_test_case.rule_path)
    with open(rule_path, encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    rule_id = create_alert_rule(rule_data)
    logger.info("rule created: %s", {"rule_id": rule_id, "rule_name": rule_data["alert"]})

    # verify notification expectations
    verify_notification_expectation(
        notification_channel,
        maildev,
        content_templating_test_case.notification_expectation,
    )
