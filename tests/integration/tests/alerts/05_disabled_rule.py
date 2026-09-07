import json
import time
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alerts import (
    collect_webhook_firing_alerts,
    get_rule,
    update_rule_channel_name,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# The rule evaluates every 15s and the alert data is set up to fire on the
# first evaluation, so a buggy evaluator would transition the rule and fire
# well within this window.
OBSERVATION_WINDOW_SECONDS = 35


def test_disabled_rule_does_not_evaluate_or_notify(
    signoz: types.SigNoz,
    # Notification channel related fixtures
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
    # Alert rule related fixtures
    create_alert_rule: Callable[[dict], str],
    # Alert data insertion related fixtures
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    """
    A rule created with disabled: true must not be evaluated: its state must
    stay "disabled" and it must not send any notification, even though the
    inserted data would fire the rule if it were evaluated. The companion
    scenario threshold_above_at_least_once in 02_basic_alert_conditions.py
    uses the same data shape and fires when the rule is enabled.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Prepare notification channel name and webhook endpoint
    notification_channel_name = str(uuid.uuid4())
    webhook_endpoint_path = f"/alert/{notification_channel_name}"
    notification_url = notification_channel.container_configs["8080"].get(webhook_endpoint_path)

    # register the mock endpoint in notification channel
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

    # Create an alert channel using the given route
    create_webhook_notification_channel(
        channel_name=notification_channel_name,
        webhook_url=notification_url,
        http_config={},
        send_resolved=False,
    )

    # Insert alert data that would fire the rule if it were evaluated
    insert_alert_data(
        [types.AlertData(type="metrics", data_path="alerts/test_scenarios/disabled_rule/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )

    # Create the disabled alert rule
    rule_path = get_testdata_file_path("alerts/test_scenarios/disabled_rule/rule.json")
    with open(rule_path, encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, notification_channel_name)
    rule_id = create_alert_rule(rule_data)
    logger.info(
        "disabled rule created with id: %s",
        {"rule_id": rule_id, "rule_name": rule_data["alert"]},
    )

    # The rule must stay disabled and must not fire for the whole observation
    # window; poll to give a buggy evaluator several chances to run.
    deadline = time.time() + OBSERVATION_WINDOW_SECONDS
    while time.time() < deadline:
        rule = get_rule(signoz, token, rule_id)
        assert rule["state"] == "disabled", f"disabled rule transitioned to unexpected state: {rule['state']}"
        assert rule["disabled"] is True, "disabled rule was unexpectedly re-enabled"

        firing_alerts = collect_webhook_firing_alerts(notification_channel, notification_channel_name)
        assert len(firing_alerts) == 0, f"disabled rule fired alerts: {[alert.labels for alert in firing_alerts]}"

        time.sleep(2)

    logger.info("disabled rule stayed disabled and sent no notifications, as expected")
