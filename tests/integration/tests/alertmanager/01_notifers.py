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

# tests to verify the notifiers sending out the notifications with expected content
NOTIFIERS_TEST = [
    types.AlertManagerNotificationTestCase(
        name="slack_notifier_default_templating",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
            ),
        ],
        channel_config=slack_default_config,
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            # extra wait for alertmanager server setup
            wait_time_seconds=60,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": "/services/TEAM_ID/BOT_ID/TOKEN_ID",
                        "json_body": {
                            "username": "Alertmanager",
                            "attachments": [
                                {
                                    "title": '[FIRING:1] threshold_above_at_least_once for  (alertname="threshold_above_at_least_once", severity="critical", threshold.name="critical")',
                                    "text": "*Alert:* threshold_above_at_least_once - critical\r\n\r\n *Summary:* This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\r\n *Description:* This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\r\n *RelatedLogs:* \r\n *RelatedTraces:* \r\n\r\n *Details:*\r\n • *alertname:* threshold_above_at_least_once\r\n   • *severity:* critical\r\n   • *threshold.name:* critical\r\n   ",
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
        name="msteams_notifier_default_templating",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
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
                            "type": "message",
                            "attachments": [
                                {
                                    "contentType": "application/vnd.microsoft.card.adaptive",
                                    "content": {
                                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                                        "type": "AdaptiveCard",
                                        "version": "1.2",
                                        "body": [
                                            {
                                                "type": "TextBlock",
                                                "text": '[FIRING:1] threshold_above_at_least_once for  (alertname="threshold_above_at_least_once", severity="critical", threshold.name="critical")',
                                                "weight": "Bolder",
                                                "size": "Medium",
                                                "wrap": True,
                                                "style": "heading",
                                                "color": "Attention",
                                            },
                                            {
                                                "type": "TextBlock",
                                                "text": "Alerts",
                                                "weight": "Bolder",
                                                "size": "Medium",
                                                "wrap": True,
                                                "color": "Attention",
                                            },
                                            {
                                                "type": "TextBlock",
                                                "text": "Labels",
                                                "weight": "Bolder",
                                                "size": "Medium",
                                            },
                                            {
                                                "type": "FactSet",
                                                "text": "",
                                                "facts": [
                                                    {
                                                        "title": "threshold.name",
                                                        "value": "critical",
                                                    }
                                                ],
                                            },
                                            {
                                                "type": "TextBlock",
                                                "text": "Annotations",
                                                "weight": "Bolder",
                                                "size": "Medium",
                                            },
                                            {
                                                "type": "FactSet",
                                                "text": "",
                                                "facts": [
                                                    {
                                                        "title": "threshold.value",
                                                        "value": "10",
                                                    },
                                                    {
                                                        "title": "compare_op",
                                                        "value": "above",
                                                    },
                                                    {
                                                        "title": "match_type",
                                                        "value": "at_least_once",
                                                    },
                                                    {"title": "value", "value": "15"},
                                                    {
                                                        "title": "description",
                                                        "value": "This alert is fired when the defined metric (current value: 15) crosses the threshold (10)",
                                                    },
                                                ],
                                            },
                                        ],
                                        "msteams": {"width": "full"},
                                        "actions": [
                                            {
                                                "type": "Action.OpenUrl",
                                                "title": "View Alert",
                                            }
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
        name="pagerduty_notifier_default_templating",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
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
                            "event_action": "trigger",
                            "payload": {
                                "summary": '[FIRING:1] threshold_above_at_least_once for  (alertname="threshold_above_at_least_once", severity="critical", threshold.name="critical")',
                                "source": "SigNoz Alert Manager",
                                "severity": "critical",
                                "custom_details": {
                                    "firing": {
                                        "Annotations": [
                                            "compare_op = above",
                                            {"description = This alert is fired when the defined metric (current value": "15) crosses the threshold (10)"},
                                            "match_type = at_least_once",
                                            "threshold.value = 10",
                                            "value = 15",
                                        ],
                                        "Labels": [
                                            "alertname = threshold_above_at_least_once",
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
        name="opsgenie_notifier_default_templating",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
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
                            "message": "threshold_above_at_least_once",
                            "description": "Alerts Firing:\r\n\t\r\n\t - Message: This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\r\n\tLabels:\r\n\t   - alertname = threshold_above_at_least_once\r\n\t   - severity = critical\r\n\t   - threshold.name = critical\r\n\t   Annotations:\r\n\t   - compare_op = above\r\n\t   - description = This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\r\n\t   - match_type = at_least_once\r\n\t   - summary = This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\r\n\t   - threshold.value = 10\r\n\t   - value = 15\r\n\t   Source: \r\n\t\r\n",
                            "details": {
                                "alertname": "threshold_above_at_least_once",
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
        name="webhook_notifier_default_templating",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
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
                                        "alertname": "threshold_above_at_least_once",
                                        "severity": "critical",
                                        "threshold.name": "critical",
                                    },
                                    "annotations": {
                                        "compare_op": "above",
                                        "description": "This alert is fired when the defined metric (current value: 15) crosses the threshold (10)",
                                        "match_type": "at_least_once",
                                        "summary": "This alert is fired when the defined metric (current value: 15) crosses the threshold (10)",
                                        "threshold.value": "10",
                                        "value": "15",
                                    },
                                }
                            ],
                            "commonLabels": {
                                "alertname": "threshold_above_at_least_once",
                                "severity": "critical",
                                "threshold.name": "critical",
                            },
                            "commonAnnotations": {
                                "compare_op": "above",
                                "description": "This alert is fired when the defined metric (current value: 15) crosses the threshold (10)",
                                "match_type": "at_least_once",
                                "summary": "This alert is fired when the defined metric (current value: 15) crosses the threshold (10)",
                                "threshold.value": "10",
                                "value": "15",
                            },
                        },
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="email_notifier_default_templating",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
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
                        "subject": '[FIRING:1] threshold_above_at_least_once for  (alertname="threshold_above_at_least_once", severity="critical", threshold.name="critical")',
                        "html": "<html><body>*Alert:* threshold_above_at_least_once - critical\n\n *Summary:* This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\n *Description:* This alert is fired when the defined metric (current value: 15) crosses the threshold (10)\n *RelatedLogs:* \n *RelatedTraces:* \n\n *Details:*\n \u2022 *alertname:* threshold_above_at_least_once\n   \u2022 *severity:* critical\n   \u2022 *threshold.name:* critical\n   </body></html>",
                    },
                ),
            ],
        ),
    ),
]


logger = setup_logger(__name__)


@pytest.mark.parametrize(
    "notifier_test_case",
    NOTIFIERS_TEST,
    ids=lambda notifier_test_case: notifier_test_case.name,
)
def test_notifier_templating(
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
    notifier_test_case: types.AlertManagerNotificationTestCase,
):
    # generate unique channel name
    channel_name = str(uuid.uuid4())

    # update channel config: set name and rewrite URLs to wiremock
    channel_config = update_raw_channel_config(notifier_test_case.channel_config, channel_name, notification_channel)
    logger.info("Channel config: %s", {"channel_config": channel_config})

    # setup wiremock mocks for webhook-based notification validations
    webhook_validations = [v for v in notifier_test_case.notification_expectation.notification_validations if v.destination_type == "webhook"]
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
    if any(v.destination_type == "email" for v in notifier_test_case.notification_expectation.notification_validations):
        delete_all_mails(maildev)
        logger.info("Mails deleted")

    # create notification channel
    create_notification_channel(channel_config)
    logger.info("Channel created with name: %s", {"channel_name": channel_name})

    # insert alert data
    insert_alert_data(
        notifier_test_case.alert_data,
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )

    # create alert rule
    rule_path = get_testdata_file_path(notifier_test_case.rule_path)
    with open(rule_path, encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    rule_id = create_alert_rule(rule_data)
    logger.info("rule created: %s", {"rule_id": rule_id, "rule_name": rule_data["alert"]})

    # verify notification expectations
    verify_notification_expectation(
        notification_channel,
        maildev,
        notifier_test_case.notification_expectation,
    )
