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
        name="email_metrics_custom_templating",
        rule_path="alertmanager/content_templating/metrics_rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alertmanager/content_templating/metrics_data.jsonl",
            ),
        ],
        channel_config=email_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="email",
                    validation_data={
                        "subject": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p",
                        "html": "<!DOCTYPE html>\n<html lang=\"en\">\n\n<head>\n  <meta charset=\"utf-8\"/>\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n  <title>[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p</title>\n  <style>\n    code {\n      background: #f0f0f0;\n      padding: 2px 6px;\n      border-radius: 3px;\n      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;\n      font-size: 13px;\n    }\n    pre {\n      background: #f0f0f0;\n      padding: 12px 16px;\n      border-radius: 6px;\n      font-size: 13px;\n      overflow-x: auto;\n      white-space: pre;\n    }\n    pre code {\n      background: none;\n      padding: 0;\n      border-radius: 0;\n      font-size: inherit;\n    }\n    table:not([role=\"presentation\"]) {\n      width: 100%;\n      border-collapse: collapse;\n      font-size: 14px;\n    }\n    table:not([role=\"presentation\"]) th {\n      font-weight: 600;\n      text-align: left;\n      padding: 8px 12px;\n      border-bottom: 2px solid #d0d0d0;\n    }\n    table:not([role=\"presentation\"]) td {\n      padding: 8px 12px;\n      border-bottom: 1px solid #e8e8e8;\n    }\n    table:not([role=\"presentation\"]) tr:last-child td {\n      border-bottom: none;\n    }\n  </style>\n</head>\n\n<body style=\"margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#333;background:#fff\">\n  <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"background:#fff\">\n    <tr>\n      <td align=\"center\" style=\"padding:0\">\n        <table role=\"presentation\" width=\"600\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"max-width:600px;width:100%;border:1px solid #e2e2e2;border-radius:12px;overflow:hidden\">\n\n          <tr>\n            <td align=\"center\" style=\"padding:20px 20px 12px\">\n              <h2 style=\"margin:0 0 8px;font-size:20px;color:#333\">[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p</h2>\n              <p style=\"margin:0;font-size:14px;color:#666\">\n                Status: <strong>firing</strong>\n                 | Firing: <strong style=\"color:#e53e3e\">1</strong>\n                \n              </p>\n            </td>\n          </tr>\n\n          <tr>\n            <td style=\"padding:0 20px\">\n              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\">\n                <tr><td style=\"border-top:1px solid #e2e2e2;font-size:0;line-height:0\" height=\"1\">&nbsp;</td></tr>\n              </table>\n            </td>\n          </tr>\n\n          \n          <tr>\n            <td style=\"padding:8px 20px\">\n              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\">\n                <tr>\n                  <td style=\"padding:16px;background:#fafafa;border:1px solid #e8e8e8;border-radius:6px\">\n                    <p><strong>Severity:</strong> critical\n<strong>Status:</strong> firing</p>\n<p><strong>Pod Details:</strong></p>\n<ul>\n<li><strong>Namespace:</strong> production</li>\n<li><strong>Pod:</strong> checkout-7d9c8b5f4-x2k9p</li>\n<li><strong>Container:</strong> checkout</li>\n<li><strong>Node:</strong> ip-10-0-1-23</li>\n</ul>\n<p><strong>Condition (critical):</strong></p>\n<ul>\n<li><strong>Current:</strong> 110</li>\n<li><strong>Threshold:</strong> above 100</li>\n</ul>\n<p><strong>Description:</strong> Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) has memory usage at 110, which crossed the critical threshold of above 100. Immediate investigation is recommended to prevent OOMKill.</p>\n<p><strong>Runbook:</strong> <a href=\"https://signoz.io/docs/runbooks/container-memory-near-limit\">https://signoz.io/docs/runbooks/container-memory-near-limit</a></p>\n\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          \n\n          \n          <tr>\n            <td style=\"padding:16px 20px\">\n              <table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\">\n                <tr>\n                  <td align=\"center\">\n                    <a href=\"http://localhost:8080\" target=\"_blank\" style=\"display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#fff;background:#4E74F8;text-decoration:none;border-radius:4px\">\n                      View in SigNoz\n                    </a>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          \n\n          <tr>\n            <td align=\"center\" style=\"padding:8px 16px 16px\">\n              <p style=\"margin:0;font-size:12px;color:#999;line-height:1.5\">\n                Sent by SigNoz AlertManager\n              </p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n\n</html>",
                    },
                ),
            ],
        ),
    ),
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
                                                "text": "**Severity:** critical\n**Status:** firing\n\n**Pod Details:**\n- **Namespace:** production\n- **Pod:** checkout-7d9c8b5f4-x2k9p\n- **Container:** checkout\n- **Node:** ip-10-0-1-23\n\n**Condition (critical):**\n- **Current:** 110\n- **Threshold:** above 100\n\n**Description:** Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) has memory usage at 110, which crossed the critical threshold of above 100. Immediate investigation is recommended to prevent OOMKill.\n\n**Runbook:** https://signoz.io/docs/runbooks/container-memory-near-limit"
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
                            "description": '<div><p><strong>Severity:</strong> critical\n<strong>Status:</strong> firing</p>\n<p><strong>Pod Details:</strong></p>\n<ul>\n<li><strong>Namespace:</strong> production</li>\n<li><strong>Pod:</strong> checkout-7d9c8b5f4-x2k9p</li>\n<li><strong>Container:</strong> checkout</li>\n<li><strong>Node:</strong> ip-10-0-1-23</li>\n</ul>\n<p><strong>Condition (critical):</strong></p>\n<ul>\n<li><strong>Current:</strong> 110</li>\n<li><strong>Threshold:</strong> above 100</li>\n</ul>\n<p><strong>Description:</strong> Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) has memory usage at 110, which crossed the critical threshold of above 100. Immediate investigation is recommended to prevent OOMKill.</p>\n<p><strong>Runbook:</strong> <a href="https://signoz.io/docs/runbooks/container-memory-near-limit">https://signoz.io/docs/runbooks/container-memory-near-limit</a></p>\n</div>',
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
                                    "text": "*Severity:* critical\n*Status:* firing\n\n*Service:* payment-service\n\n*Condition (critical):*\n\n• *Current:* 1\n• *Threshold:* above 0\n\n*Description:* Payment failures observed at 1 over the evaluation window, crossing the critical threshold of above 0 on payment-service. Investigate downstream payment processor health.\n\n*Runbook:* https://signoz.io/docs/runbooks/payment-failure-spike\n\n",
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
                                    "text": "*Severity:* critical\n*Status:* firing\n\n*Pod Details:*\n\n• *Namespace:* production\n• *Pod:* checkout-7d9c8b5f4-x2k9p\n• *Container:* checkout\n• *Node:* ip-10-0-1-23\n\n*Condition (critical):*\n\n• *Current:* 110\n• *Threshold:* above 100\n\n*Description:* Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) has memory usage at 110, which crossed the critical threshold of above 100. Immediate investigation is recommended to prevent OOMKill.\n\n*Runbook:* https://signoz.io/docs/runbooks/container-memory-near-limit\n\n"
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
                                "templated_body": "**Severity:** critical\n**Status:** firing\n\n**Pod Details:**\n- **Namespace:** production\n- **Pod:** checkout-7d9c8b5f4-x2k9p\n- **Container:** checkout\n- **Node:** ip-10-0-1-23\n\n**Condition (critical):**\n- **Current:** 110\n- **Threshold:** above 100\n\n**Description:** Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) has memory usage at 110, which crossed the critical threshold of above 100. Immediate investigation is recommended to prevent OOMKill.\n\n**Runbook:** https://signoz.io/docs/runbooks/container-memory-near-limit",
                                "compare_op": "above",
                                "description": "Container checkout in pod checkout-7d9c8b5f4-x2k9p (production) exceeded memory threshold",
                                "match_type": "at_least_once",
                                "summary": "High container memory in production/checkout-7d9c8b5f4-x2k9p",
                                "threshold.value": "100",
                                "templated_title": "[firing] High container memory in production/checkout-7d9c8b5f4-x2k9p",
                                "value": "110",
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
