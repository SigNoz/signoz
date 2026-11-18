import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest
from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import (
    collect_webhook_firing_alerts,
    get_testdata_file_path,
    update_rule_channel_name,
    verify_webhook_alert_expectation,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.notification_channel import wait_for_alertmanager_sync

FRONTEND_ALERT = types.FiringAlert(labels={"tier": "frontend", "service.name": "checkout"})
BACKEND_ALERT = types.FiringAlert(labels={"tier": "backend", "service.name": "payment"})

ROUTING_POLICY_CASES = [
    types.RoutingPolicyTestCase(
        name="plain_label",
        policies=[
            types.RoutePolicyExpectation(expression='tier == "frontend"', expected_alerts=[FRONTEND_ALERT]),
            types.RoutePolicyExpectation(expression='tier == "backend"', expected_alerts=[BACKEND_ALERT]),
        ],
    ),
]


@pytest.mark.parametrize(
    "routing_policy_test_case",
    ROUTING_POLICY_CASES,
    ids=lambda c: c.name,
)
def test_routing_policies(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_route_policy: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    routing_policy_test_case: types.RoutingPolicyTestCase,
):
    # one channel per policy, so a delivery to a channel shows which policy matched
    policies = routing_policy_test_case.policies
    channel_names = [str(uuid.uuid4()) for _ in policies]
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url=f"/alert/{channel_name}"),
                response=MappingResponse(status=200, json_body={}),
                persistent=False,
            )
            for channel_name in channel_names
        ],
    )
    for channel_name, policy in zip(channel_names, policies, strict=True):
        create_notification_channel(
            {
                "name": channel_name,
                "webhook_configs": [{"url": notification_channel.container_configs["8080"].get(f"/alert/{channel_name}"), "send_resolved": False}],
            }
        )
        create_route_policy({"name": channel_name, "expression": policy.expression, "channels": [channel_name]})

    # waits for the org's alertmanager only; the channels load on its next config poll
    # and alerts sent to them before that are replayed after the reload
    wait_for_alertmanager_sync(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), notification_channel)

    insert_alert_data(
        [types.AlertData(type="metrics", data_path="alertmanager/notification_routing_alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )

    with open(get_testdata_file_path("alertmanager/routing_policies_rule.json"), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_names[0])
    create_alert_rule(rule_data)

    # each channel receives the alerts its policy matches
    for channel_name, policy in zip(channel_names, policies, strict=True):
        if len(policy.expected_alerts) > 0:
            verify_webhook_alert_expectation(
                notification_channel,
                channel_name,
                types.AlertExpectation(should_alert=True, expected_alerts=policy.expected_alerts, wait_time_seconds=120),
            )

    # the rule has fired by now, so an empty channel means its policy did not match
    for channel_name, policy in zip(channel_names, policies, strict=True):
        if len(policy.expected_alerts) == 0:
            verify_webhook_alert_expectation(
                notification_channel,
                channel_name,
                types.AlertExpectation(should_alert=False, expected_alerts=[], wait_time_seconds=15),
            )

    # no channel received alerts its policy did not match
    for channel_name, policy in zip(channel_names, policies, strict=True):
        received_services = {alert.labels["service.name"] for alert in collect_webhook_firing_alerts(notification_channel, channel_name)}
        assert received_services == {alert.labels["service.name"] for alert in policy.expected_alerts}, f"channel {channel_name} received alerts for {received_services}, expected {policy.expected_alerts}"
