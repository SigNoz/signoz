"""Google Chat notifier integration tests driven through the real alerting path:
create a rule pointing at a Google Chat channel, insert breaching telemetry, let
the ruler fire, and assert on the cardsV2 payload WireMock received.

WireMock stands in for chat.googleapis.com (network alias + https:8443, see the
notification_channel fixture). Assertions check the actual card structure, deep
links and threading query params so behavioural regressions are caught.
"""

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
from fixtures.notification_channel import googlechat_config

logger = setup_logger(__name__)

METRICS_DATA = "alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl"
METRICS_RULE = "alerts/test_scenarios/threshold_above_at_least_once/rule.json"
LOGS_DATA = "alerts/test_scenarios/threshold_below_at_least_once/alert_data.jsonl"
LOGS_RULE = "alerts/test_scenarios/threshold_below_at_least_once/rule.json"
TRACES_DATA = "alerts/test_scenarios/threshold_above_average/alert_data.jsonl"
TRACES_RULE = "alerts/test_scenarios/threshold_above_average/rule.json"

# threading query params the notifier always appends
THREAD_QUERY = {
    "messageReplyOption": "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD",
    "threadKey": None,  # dynamic hash; presence only
}


def _path(space: str) -> str:
    return f"/v1/spaces/{space}/messages"


def _stub_200(path: str) -> list[Mapping]:
    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=200, json_body={"name": "spaces/x/messages/x"}),
            persistent=True,
        )
    ]


def _stub_retry(path: str) -> list[Mapping]:
    """429 on the first call then 200, via a wiremock scenario transition."""
    scenario = f"gc-retry-{path}"
    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=429, json_body={"error": {"code": 429, "status": "RESOURCE_EXHAUSTED"}}),
            scenario_name=scenario,
            required_scenario_state="Started",
            new_scenario_state="ok",
            persistent=True,
        ),
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path=path),
            response=MappingResponse(status=200, json_body={"name": "spaces/x/messages/x"}),
            scenario_name=scenario,
            required_scenario_state="ok",
            persistent=True,
        ),
    ]


def _card_subset(alertname: str, buttons: list[tuple[str, str]]) -> dict:
    """A cardsV2 subset asserting title, firing banner, rendered body, and each
    button's text AND deep-link url (as a regex), so a broken link is caught too.
    buttons: list of (text, url_regex)."""
    return {
        "text": f"[FIRING:1] {alertname}",
        "cardsV2": [
            {
                "cardId": "signoz-alert",
                "card": {
                    "header": {"title": f"[FIRING:1] {alertname}"},
                    "sections": [
                        # firing banner
                        {"widgets": [{"textParagraph": {"text": re.compile("FIRING")}}]},
                        # rendered alert body mentions the alertname
                        {"widgets": [{"textParagraph": {"text": re.compile(re.escape(alertname))}}]},
                    ]
                    + [
                        {"widgets": [{"buttonList": {"buttons": [{"text": text, "onClick": {"openLink": {"url": re.compile(url)}}}]}}]}
                        for text, url in buttons
                    ],
                },
            }
        ],
    }


GOOGLECHAT_CASES = [
    types.AlertManagerNotificationTestCase(
        name="googlechat_default_metrics_firing",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config=googlechat_config("gc-metrics"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=150,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": _path("gc-metrics"),
                        "query_params": THREAD_QUERY,
                        "json_body": _card_subset("threshold_above_at_least_once", [("Open in SigNoz", r"/alerts/overview\?ruleId=")]),
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
            wait_time_seconds=150,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": _path("gc-logs"),
                        "json_body": _card_subset(
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
            wait_time_seconds=150,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        "path": _path("gc-traces"),
                        "json_body": _card_subset(
                            "threshold_above_average",
                            [("View Related Traces", r"traces-explorer\?"), ("Open in SigNoz", r"/alerts/overview\?ruleId=")],
                        ),
                    },
                ),
            ],
        ),
    ),
    types.AlertManagerNotificationTestCase(
        name="googlechat_retry_429_then_200",
        rule_path=METRICS_RULE,
        alert_data=[types.AlertData(type="metrics", data_path=METRICS_DATA)],
        channel_config=googlechat_config("gc-retry"),
        notification_expectation=types.AMNotificationExpectation(
            should_notify=True,
            wait_time_seconds=150,
            notification_validations=[
                types.NotificationValidation(
                    destination_type="webhook",
                    validation_data={
                        # a retryable 429 is followed by a successful re-POST => >=2 hits
                        "path": _path("gc-retry"),
                        "min_count": 2,
                        "json_body": {"cardsV2": [{"cardId": "signoz-alert"}]},
                    },
                ),
            ],
        ),
    ),
]

# per-case wiremock stubs (retry needs a stateful scenario, the rest a plain 200)
CASE_STUBS: dict[str, Callable[[str], list[Mapping]]] = {
    "googlechat_retry_429_then_200": _stub_retry,
}


@pytest.mark.parametrize(
    "gc_test_case",
    GOOGLECHAT_CASES,
    ids=lambda c: c.name,
)
def test_googlechat_notifier(  # pylint: disable=too-many-arguments,too-many-positional-arguments
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

    stub_factory = CASE_STUBS.get(gc_test_case.name, _stub_200)
    make_http_mocks(notification_channel, stub_factory(path))

    create_notification_channel(channel_config)
    time.sleep(12)  # org registration in alertmanager

    insert_alert_data(gc_test_case.alert_data, base_time=datetime.now(tz=UTC) - timedelta(minutes=5))

    with open(get_testdata_file_path(gc_test_case.rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    create_alert_rule(rule_data)

    verify_notification_expectation(notification_channel, maildev, gc_test_case.notification_expectation)
