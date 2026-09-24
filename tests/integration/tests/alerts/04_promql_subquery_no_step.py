import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import (
    update_rule_channel_name,
    verify_webhook_alert_expectation,
)
from fixtures.fs import get_testdata_file_path

TEST_CASE = types.AlertTestCase(
    name="promql_subquery_no_step",
    rule_path="alerts/test_scenarios/promql_subquery_no_step/rule.json",
    alert_data=[
        types.AlertData(
            type="metrics",
            data_path="alerts/test_scenarios/promql_subquery_no_step/alert_data.jsonl",
        ),
    ],
    alert_expectation=types.AlertExpectation(
        should_alert=True,
        wait_time_seconds=30,
        expected_alerts=[
            types.FiringAlert(
                labels={
                    "alertname": "promql_subquery_no_step",
                    "threshold.name": "critical",
                }
            ),
        ],
    ),
)


def test_promql_rule_subquery_without_step(
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
):
    """
    A promql rule with a step-less subquery ([2m:]) must evaluate and fire.
    A nil NoStepSubqueryIntervalFn segfaults the process on first evaluation.
    """
    notification_channel_name = str(uuid.uuid4())
    webhook_endpoint_path = f"/alert/{notification_channel_name}"
    notification_url = notification_channel.container_configs["8080"].get(webhook_endpoint_path)

    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(
                    method=HttpMethods.POST,
                    url=webhook_endpoint_path,
                ),
                response=MappingResponse(
                    status=200,
                    json_body={},
                ),
                persistent=False,
            )
        ],
    )

    create_webhook_notification_channel(
        channel_name=notification_channel_name,
        webhook_url=notification_url,
        http_config={},
        send_resolved=False,
    )

    insert_alert_data(
        TEST_CASE.alert_data,
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )

    rule_path = get_testdata_file_path(TEST_CASE.rule_path)
    with open(rule_path, encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, notification_channel_name)
    create_alert_rule(rule_data)

    verify_webhook_alert_expectation(
        notification_channel,
        notification_channel_name,
        TEST_CASE.alert_expectation,
    )
