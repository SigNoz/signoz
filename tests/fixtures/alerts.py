import base64
import json
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from urllib.parse import urlparse

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.logger import setup_logger
from fixtures.logs import Logs
from fixtures.maildev import verify_email_received
from fixtures.metrics import Metrics
from fixtures.traces import Traces

logger = setup_logger(__name__)


@pytest.fixture(name="create_alert_rule", scope="function")
def create_alert_rule(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> Callable[[dict], str]:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule_ids = []

    def _create_alert_rule(rule_data: dict) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/rules"),
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"Failed to create rule, api returned {response.status_code} with response: {response.text}"
        rule_id = response.json()["data"]["id"]
        rule_ids.append(rule_id)
        return rule_id

    def _delete_alert_rule(rule_id: str):
        logger.info("Deleting rule: %s", {"rule_id": rule_id})
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/rules/{rule_id}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        if response.status_code != HTTPStatus.OK:
            raise Exception(  # pylint: disable=broad-exception-raised
                f"Failed to delete rule, api returned {response.status_code} with response: {response.text}"
            )

    yield _create_alert_rule
    # delete the rule on cleanup
    for rule_id in rule_ids:
        try:
            _delete_alert_rule(rule_id)
        except Exception as e:  # pylint: disable=broad-exception-caught
            logger.error("Error deleting rule: %s", {"rule_id": rule_id, "error": e})


@pytest.fixture(name="insert_alert_data", scope="function")
def insert_alert_data(
    insert_metrics: Callable[[list[Metrics]], None],
    insert_traces: Callable[[list[Traces]], None],
    insert_logs: Callable[[list[Logs]], None],
) -> Callable[[list[types.AlertData]], None]:

    def _insert_alert_data(
        alert_data_items: list[types.AlertData],
        base_time: datetime = None,
    ) -> None:

        metrics: list[Metrics] = []
        traces: list[Traces] = []
        logs: list[Logs] = []

        now = base_time or datetime.now(tz=UTC).replace(second=0, microsecond=0)

        for data_item in alert_data_items:
            if data_item.type == "metrics":
                _metrics = Metrics.load_from_file(
                    get_testdata_file_path(data_item.data_path),
                    base_time=now,
                )
                metrics.extend(_metrics)
            elif data_item.type == "traces":
                _traces = Traces.load_from_file(
                    get_testdata_file_path(data_item.data_path),
                    base_time=now,
                )
                traces.extend(_traces)
            elif data_item.type == "logs":
                _logs = Logs.load_from_file(
                    get_testdata_file_path(data_item.data_path),
                    base_time=now,
                )
                logs.extend(_logs)

        # Add data to ClickHouse if any data is present
        if len(metrics) > 0:
            insert_metrics(metrics)
        if len(traces) > 0:
            insert_traces(traces)
        if len(logs) > 0:
            insert_logs(logs)

    yield _insert_alert_data


def collect_webhook_firing_alerts(webhook_test_container: types.TestContainerDocker, notification_channel_name: str) -> list[types.FiringAlert]:
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
    assert res.status_code == HTTPStatus.OK, f"Failed to collect firing alerts for notification channel {notification_channel_name}, status code: {res.status_code}, response: {res.text}"
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


def _verify_alerts_labels(firing_alerts: list[dict[str, str]], expected_alerts: list[dict[str, str]]) -> tuple[int, list[dict[str, str]]]:
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
            if all(key in fired_alert and fired_alert[key] == value for key, value in alert.items()):
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
    time_to_wait = datetime.now() + timedelta(seconds=alert_expectations.wait_time_seconds)
    expected_alerts_labels = [alert.labels for alert in alert_expectations.expected_alerts]

    while datetime.now() < time_to_wait:
        firing_alerts = collect_webhook_firing_alerts(test_alert_container, notification_channel_name)
        firing_alert_labels = [alert.labels for alert in firing_alerts]

        if alert_expectations.should_alert:
            # verify the number of alerts fired, currently we're only verifying the labels of the alerts
            # but there could be verification of annotations and other fields in the FiringAlert
            (verified_count, missing_alerts) = _verify_alerts_labels(firing_alert_labels, expected_alerts_labels)

            if verified_count == len(alert_expectations.expected_alerts):
                logger.info("Got expected number of alerts: %s", {"count": verified_count})
                return True
        # No alert is supposed to be fired if should_alert is False
        elif len(firing_alerts) > 0:
            break

        # wait for some time before checking again
        time.sleep(1)

    # We've waited but we didn't get the expected number of alerts

    # check if alert was expected to be fired or not, if not then we're good
    if not alert_expectations.should_alert:
        assert len(firing_alerts) == 0, (
            "Expected no alerts to be fired, ",
            f"got {len(firing_alerts)} alerts, firing alerts: {firing_alerts}",
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


def _is_json_subset(subset, superset) -> bool:
    """Check if subset is contained within superset recursively.
    - For dicts: all keys in subset must exist in superset with matching values
    - For lists: all items in subset must be present in superset
    - For scalars: exact equality
    """
    if isinstance(subset, dict):
        if not isinstance(superset, dict):
            return False
        return all(key in superset and _is_json_subset(value, superset[key]) for key, value in subset.items())
    if isinstance(subset, list):
        if not isinstance(superset, list):
            return False
        return all(any(_is_json_subset(sub_item, sup_item) for sup_item in superset) for sub_item in subset)
    return subset == superset


def verify_webhook_notification_expectation(
    notification_channel: types.TestContainerDocker,
    validation_data: dict,
) -> bool:
    """Check if wiremock received a request at the given path
    whose JSON body is a superset of the expected json_body."""
    path = validation_data["path"]
    json_body = validation_data["json_body"]

    url = notification_channel.host_configs["8080"].get("__admin/requests/find")
    res = requests.post(url, json={"method": "POST", "url": path}, timeout=5)
    assert res.status_code == HTTPStatus.OK, f"Failed to find requests for path {path}, status code: {res.status_code}, response: {res.text}"

    for req in res.json()["requests"]:
        body = json.loads(base64.b64decode(req["bodyAsBase64"]).decode("utf-8"))
        # logger.info("Webhook request body: %s", json.dumps(body, indent=2))
        if _is_json_subset(json_body, body):
            return True
    return False


def _check_notification_validation(
    validation: types.NotificationValidation,
    notification_channel: types.TestContainerDocker,
    maildev: types.TestContainerDocker,
) -> bool:
    """Dispatch a single validation check to the appropriate verifier."""
    if validation.destination_type == "webhook":
        return verify_webhook_notification_expectation(notification_channel, validation.validation_data)
    if validation.destination_type == "email":
        return verify_email_received(maildev, validation.validation_data)
    raise ValueError(f"Invalid destination type: {validation.destination_type}")


def verify_notification_expectation(
    notification_channel: types.TestContainerDocker,
    maildev: types.TestContainerDocker,
    expected_notification: types.AMNotificationExpectation,
) -> bool:
    """Poll for expected notifications across webhook and email channels."""
    time_to_wait = datetime.now() + timedelta(seconds=expected_notification.wait_time_seconds)

    while datetime.now() < time_to_wait:
        all_found = all(_check_notification_validation(v, notification_channel, maildev) for v in expected_notification.notification_validations)

        if expected_notification.should_notify and all_found:
            logger.info("All expected notifications found")
            return True

        time.sleep(1)

    # Timeout reached
    if not expected_notification.should_notify:
        # Verify no notifications were received
        for validation in expected_notification.notification_validations:
            found = _check_notification_validation(validation, notification_channel, maildev)
            assert not found, f"Expected no notification but found one for {validation.destination_type} with data {validation.validation_data}"
        logger.info("No notifications found, as expected")
        return True

    # Expected notifications but didn't get them all — report missing
    missing = [v for v in expected_notification.notification_validations if not _check_notification_validation(v, notification_channel, maildev)]
    assert len(missing) == 0, f"Expected all notifications to be found but missing: {missing}"
    return True


def update_raw_channel_config(
    channel_config: dict,
    channel_name: str,
    notification_channel: types.TestContainerDocker,
) -> dict:
    """
    Updates the channel config to point to the given wiremock
    notification_channel container to receive notifications.
    """
    config = channel_config.copy()

    config["name"] = channel_name

    url_field_map = {
        "slack_configs": "api_url",
        "msteamsv2_configs": "webhook_url",
        "webhook_configs": "url",
        "pagerduty_configs": "url",
        "opsgenie_configs": "api_url",
    }

    for config_key, url_field in url_field_map.items():
        if config_key in config:
            for entry in config[config_key]:
                if url_field in entry:
                    original_url = entry[url_field]
                    path = urlparse(original_url).path
                    entry[url_field] = notification_channel.container_configs["8080"].get(path)

    return config
