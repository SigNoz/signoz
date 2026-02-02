import base64
import json
import time
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.logs import Logs
from fixtures.metrics import Metrics
from fixtures.traces import Traces

logger = setup_logger(__name__)


@pytest.fixture(name="create_alert_rule", scope="function")
def create_alert_rule(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> Callable[[dict], str]:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule_ids = []

    def _create_alert_rule(rule_data: dict) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/rules"),
            json=rule_data,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert (
            response.status_code == HTTPStatus.OK
        ), f"Failed to create rule, api returned {response.status_code} with response: {response.text}"
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
    insert_metrics: Callable[[List[Metrics]], None],
    insert_traces: Callable[[List[Traces]], None],
    insert_logs: Callable[[List[Logs]], None],
    get_testdata_file_path: Callable[[str], str],
) -> Callable[[List[types.AlertData]], None]:

    def _insert_alert_data(
        alert_data_items: List[types.AlertData],
        base_time: datetime = None,
    ) -> None:

        metrics: List[Metrics] = []
        traces: List[Traces] = []
        logs: List[Logs] = []

        now = base_time or datetime.now(tz=timezone.utc).replace(
            second=0, microsecond=0
        )

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


@pytest.fixture(name="collect_firing_alerts", scope="package")
def collect_firing_alerts():
    def _collect_firing_alerts(
        test_alert_container: types.TestContainerDocker, notification_channel_name: str
    ) -> List[dict[str, str]]:
        # Prepare the endpoint path for the channel name, for alerts tests we have
        # used different paths for receiving alerts from each channel so that
        # multiple rules can be tested in isolation.
        rule_webhook_endpoint = f"/alert/{notification_channel_name}"

        url = test_alert_container.host_configs["8080"].get("__admin/requests/find")
        req = {
            "method": "POST",
            "url": rule_webhook_endpoint,
        }
        response = requests.post(url, json=req, timeout=5).json()
        if len(response["requests"]) == 0:  # no alerts fired yet
            return []
        alerts = []
        for req in response["requests"]:
            alert_body_base64 = req["bodyAsBase64"]
            alert_body = base64.b64decode(alert_body_base64).decode("utf-8")
            # remove newlines from the alert body
            alert_body = alert_body.replace("\n", "")
            alert_dict = json.loads(
                alert_body
            )  # parse the alert body into a dictionary
            for a in alert_dict["alerts"]:
                labels = a["labels"]
                alerts.append(labels)
        return alerts

    yield _collect_firing_alerts


@pytest.fixture(name="verify_alert_expectation", scope="package")
def verify_alert_expectation(
    collect_firing_alerts: Callable[
        [types.TestContainerDocker, str], List[dict[str, str]]
    ],
) -> Callable[[types.TestContainerDocker, str, types.AlertExpectation], bool]:
    def _verify_alerts(
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

    def _verify_alert_expectation(
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
            firing_alerts = collect_firing_alerts(
                test_alert_container, notification_channel_name
            )

            if alert_expectations.should_alert:
                # verify the number of alerts fired
                (verified_count, missing_alerts) = _verify_alerts(
                    firing_alerts, expected_alerts_labels
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
            time.sleep(10)

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

    yield _verify_alert_expectation
