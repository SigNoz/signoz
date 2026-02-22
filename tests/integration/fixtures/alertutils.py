import base64
import json
import time
from datetime import datetime, timedelta
from http import HTTPStatus
from typing import List

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def collect_webhook_firing_alerts(
    webhook_test_container: types.TestContainerDocker, notification_channel_name: str
) -> List[types.FiringAlert]:
    # Prepare the endpoint path for the channel name, for alerts tests we have
    # used different paths for receiving alerts from each channel so that
    # multiple rules can be tested in isolation.
    rule_webhook_endpoint = f"/alert/{notification_channel_name}"

    url = webhook_test_container.host_configs["8080"].get("__admin/requests/find")
    req = {
        "method": "POST",
        "url": rule_webhook_endpoint,
    }
    res = requests.post(url, json=req, timeout=5)
    assert res.status_code == HTTPStatus.OK, (
        f"Failed to collect firing alerts for notification channel {notification_channel_name}, "
        f"status code: {res.status_code}, response: {res.text}"
    )
    response = res.json()
    alerts = []
    for req in response["requests"]:
        alert_body_base64 = req["bodyAsBase64"]
        alert_body = base64.b64decode(alert_body_base64).decode("utf-8")
        # remove newlines from the alert body
        alert_body = alert_body.replace("\n", "")
        alert_dict = json.loads(alert_body)  # parse the alert body into a dictionary
        for a in alert_dict["alerts"]:
            alerts.append(types.FiringAlert(labels=a["labels"]))
    return alerts


def _verify_alerts_labels(
    firing_alerts: list[dict[str, str]], expected_alerts: list[dict[str, str]]
) -> tuple[int, list[dict[str, str]]]:
    """
    Checks how many of the expected alerts have been fired.
    Returns the count of expected alerts that have been fired.
    """
    fired_count = 0
    missing_alerts = []

    for alert in expected_alerts:
        is_alert_fired = False

        for fired_alert in firing_alerts:
            # Check if current expected alert is present in the fired alerts
            if all(
                key in fired_alert and fired_alert[key] == value
                for key, value in alert.items()
            ):
                is_alert_fired = True
                break

        if is_alert_fired:
            fired_count += 1
        else:
            missing_alerts.append(alert)

    return (fired_count, missing_alerts)


def verify_webhook_alert_expectation(
    test_alert_container: types.TestContainerDocker,
    notification_channel_name: str,
    alert_expectations: types.AlertExpectation,
) -> bool:

    # time to wait till the expected alerts are fired
    time_to_wait = datetime.now() + timedelta(
        seconds=alert_expectations.wait_time_seconds
    )
    expected_alerts_labels = [
        alert.labels for alert in alert_expectations.expected_alerts
    ]

    while datetime.now() < time_to_wait:
        firing_alerts = collect_webhook_firing_alerts(
            test_alert_container, notification_channel_name
        )
        firing_alert_labels = [alert.labels for alert in firing_alerts]

        if alert_expectations.should_alert:
            # verify the number of alerts fired, currently we're only verifying the labels of the alerts
            # but there could be verification of annotations and other fields in the FiringAlert
            (verified_count, missing_alerts) = _verify_alerts_labels(
                firing_alert_labels, expected_alerts_labels
            )

            if verified_count == len(alert_expectations.expected_alerts):
                logger.info(
                    "Got expected number of alerts: %s", {"count": verified_count}
                )
                return True
        else:
            # No alert is supposed to be fired if should_alert is False
            if len(firing_alerts) > 0:
                break

        # wait for some time before checking again
        time.sleep(1)

    # We've waited but we didn't get the expected number of alerts

    # check if alert was expected to be fired or not, if not then we're good
    if not alert_expectations.should_alert:
        assert len(firing_alerts) == 0, (
            "Expected no alerts to be fired, ",
            f"got {len(firing_alerts)} alerts, " f"firing alerts: {firing_alerts}",
        )
        logger.info("No alerts fired, as expected")
        return True

    # we've waited but we didn't get the expected number of alerts, raise an exception
    assert verified_count == len(alert_expectations.expected_alerts), (
        f"Expected {len(alert_expectations.expected_alerts)} alerts to be fired but got {verified_count} alerts, ",
        f"missing alerts: {missing_alerts}, ",
        f"firing alerts: {firing_alerts}",
    )

    return True  # should not reach here


def update_rule_channel_name(rule_data: dict, channel_name: str):
    """
    updates the channel name in the thresholds
    so alert notification are sent to the given channel
    """
    thresholds = rule_data["condition"]["thresholds"]
    if "kind" in thresholds and thresholds["kind"] == "basic":
        # loop over all the sepcs and update the channels
        for spec in thresholds["spec"]:
            spec["channels"] = [channel_name]
