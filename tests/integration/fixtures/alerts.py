import time
import json
import logging
import datetime
from dataclasses import dataclass, field
from http import HTTPStatus
from typing import Any, Callable, Dict, List, Optional, Union

import pytest
import requests

from fixtures.metrics import Metrics
from fixtures.logs import Logs
from fixtures.types import Operation, SigNoz
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import AlertExpectations, AlertTestCase, MetricValues, TEST_CHANNEL_NAME, WIREMOCK_WEBHOOK_PATH


logger = logging.getLogger(__name__)

class AlertFramework:
    """
    Helper framework to orchestrate Alert Integration Tests.
    Handles: Channel Setup, Rule Creation, Data Ingestion, and Alert Verification.
    """

    def __init__(
        self,
        signoz: SigNoz,
        get_token: Callable[[str, str], str],
        insert_metrics: Callable[[List[Metrics]], None],
        insert_logs: Callable[[List[Logs]], None],
        admin_email: str,
        admin_password: str,
    ):
        self.signoz = signoz
        self.base_url = signoz.self.host_configs["8080"].base()
        self.zeus_url_internal = "http://zeus:8080" # URL for SigNoz to reach WireMock
        self.zeus_public_url = signoz.zeus.host_configs["8080"].base() # URL for Test Runner to reach WireMock
        
        self.insert_metrics = insert_metrics
        self.insert_logs = insert_logs
        
        # Authenticate
        self.token = get_token(admin_email, admin_password)
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        self.channel_id: Optional[str] = None
        self.active_rules: List[str] = []

    def setup_test_channel(self):
        """
        Ensures a Webhook channel exists that points to our WireMock instance.
        """
        # 1. Check if channel exists
        resp = requests.get(f"{self.base_url}/api/v1/channels", headers=self.headers)
        if resp.status_code == HTTPStatus.OK:
            channels = resp.json().get("data", [])
            for ch in channels:
                if ch["name"] == TEST_CHANNEL_NAME:
                    self.channel_id = ch["id"]
                    logger.info(f"Reusing existing test channel: {self.channel_id}")
                    return

        # 2. Create if not exists
        payload = {
            "name": TEST_CHANNEL_NAME,
            "webhook_configs": [
                {
                    # we won't be waiting for the alert getting resolved
                    "send_resolved": False,
                    "url": f"{self.zeus_url_internal}{WIREMOCK_WEBHOOK_PATH}",
                    "http_config": {}
                }
            ]
        }
        resp = requests.post(f"{self.base_url}/api/v1/channels", json=payload, headers=self.headers)
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"Failed to create test channel: {resp.text}"
        self.channel_id = TEST_CHANNEL_NAME
        logger.info(f"Created new test channel: {self.channel_id}")

    def create_rule(self, rule_payload: Dict[str, Any]) -> str:
        """
        Creates an Alert Rule and returns its ID.
        Also patches the rule to ensure it sends notifications to our Test Channel.
        
        Args:
            rule_payload: Rule payload dict
        
        Returns:
            Rule ID string
        """
        if not self.channel_id:
            self.setup_test_channel()

        # Inject our test channel
        rule_payload["preferredChannels"] = [self.channel_id]
        
        resp = requests.post(f"{self.base_url}/api/v1/rules", json=rule_payload, headers=self.headers)
        assert resp.status_code == HTTPStatus.OK, f"Failed to create rule: {resp.text}"
        
        rule_id = resp.json()["data"]["id"]
        self.active_rules.append(rule_id)
        logger.info(f"Created Rule ID: {rule_id}")
        return rule_id

    def inject_data(self, data: List[MetricValues], start_time: Optional[datetime.datetime] = None):
        """
        Converts MetricValues to appropriate data types and ingests into ClickHouse.
        
        Args:
            data: List of MetricValues to ingest
            start_time: Optional start time for the metrics. If None, calculated automatically.
        """
        if not data:
            return

        # Convert all MetricValues to Metrics
        all_metrics = []
        for metric_values in data:
            all_metrics.extend(metric_values.to_metrics(start_time))
        
        if all_metrics:
            self.insert_metrics(all_metrics)
            logger.info(f"Inserted {len(all_metrics)} Metric points from {len(data)} MetricValues series")

    def verify_alert_fired(self, expectations: AlertExpectations):
        """
        Polls WireMock to verify that the webhook was hit with the expected payload.
        """
        if not expectations.should_fire:
            # For negative tests, we wait a bit and ensure NO request came
            time.sleep(expectations.wait_time_sec) 
            count = self._get_webhook_request_count()
            assert count == 0, f"Expected 0 alerts, but got {count}"
            return

        # For positive tests, retry until success
        self._wait_for_webhook(expectations)

    def _wait_for_webhook(self, expectations: AlertExpectations):
        """
        Internal retry loop to check WireMock requests.
        """
        requests_list = self._get_webhook_requests()
        
        # Filter for actual Valid Alerts (ignore test pings if any)
        # Assuming payload structure from AlertManager webhook
        alerts = []
        for req in requests_list:
             body = json.loads(req["body"])
             # The webhook payload usually has an "alerts" array
             if "alerts" in body:
                 alerts.extend(body["alerts"])
        
        if len(alerts) < expectations.num_alerts:
            raise AssertionError(f"Expected {expectations.num_alerts} alerts, found {len(alerts)}")

        # Verify content of the last/latest alert
        last_alert = alerts[-1]
        
        # Verify State
        assert last_alert["status"] == "firing", f"Alert status is {last_alert['status']}, expected 'firing'"

        # Verify Labels
        for k, v in expectations.verify_labels.items():
            assert last_alert["labels"].get(k) == v, f"Label {k} mismatch. Expected {v}, got {last_alert['labels'].get(k)}"
        
        # Verify Annotations
        for k, v in expectations.verify_annotations.items():
            assert last_alert["annotations"].get(k) == v, f"Annotation {k} mismatch. Expected {v}, got {last_alert['annotations'].get(k)}"

    def _get_webhook_requests(self) -> List[Dict]:
        """Fetch all requests made to the webhook URL from WireMock."""
        # WireMock Admin API: GET /__admin/requests
        resp = requests.get(f"{self.zeus_public_url}/__admin/requests")
        assert resp.status_code == 200
        
        all_reqs = resp.json()["requests"]
        # Filter by URL
        return [r["request"] for r in all_reqs if r["request"]["url"] == WIREMOCK_WEBHOOK_PATH]

    def _get_webhook_request_count(self) -> int:
        return len(self._get_webhook_requests())

    def run_test(self, test_case: AlertTestCase, start_time: Optional[datetime.datetime] = None):
        """
        Main orchestrator: Runs a complete alert test case end-to-end.
        
        Steps:
        1. Setup test channel (if not already done)
        2. Create the alert rule
        3. Inject test data
        4. Wait and verify alert expectations
        
        Args:
            test_case: AlertTestCase definition
            start_time: Optional timestamp for data injection
        """
        logger.info(f"Running test: {test_case.name}")
        logger.info(f"Description: {test_case.description}")
        
        try:
            # Step 1: Create the rule (convert PostableRule to dict)
            rule_id = self.create_rule(test_case.rule.to_dict())
            
            # Step 2: Inject data
            self.inject_data(test_case.data, start_time)
            
            # Step 3: Verify expectations
            self.verify_alert_fired(test_case.expectations)
            
            logger.info(f"✓ Test '{test_case.name}' PASSED")
            
        except Exception as e:
            logger.error(f"✗ Test '{test_case.name}' FAILED: {str(e)}")
            raise
    
    def cleanup(self):
        """
        Deletes all rules created during the test.
        """
        for rule_id in self.active_rules:
            try:
                resp = requests.delete(f"{self.base_url}/api/v1/rules/{rule_id}", headers=self.headers)
                logger.info(f"Deleted Rule ID: {rule_id} (status: {resp.status_code})")
            except Exception as e:
                logger.warning(f"Failed to delete rule {rule_id}: {e}")
        self.active_rules.clear()
        
        # Reset WireMock journal to avoid pollution between tests
        try:
            requests.delete(f"{self.zeus_public_url}/__admin/requests")
            logger.info("Reset WireMock request journal")
        except Exception as e:
            logger.warning(f"Failed to reset WireMock: {e}")



@pytest.fixture(name="alert_framework", scope="function")
def alert_framework(
    signoz: SigNoz,
    create_user_admin: Operation,
    get_token: Callable[[str, str], str],
    insert_metrics: Callable,
    insert_logs: Callable,
) -> AlertFramework:
    """Creates an AlertFramework instance for testing."""
    framework = AlertFramework(
        signoz=signoz,
        get_token=get_token,
        insert_metrics=insert_metrics,
        insert_logs=insert_logs,
        admin_email=USER_ADMIN_EMAIL,
        admin_password=USER_ADMIN_PASSWORD,
    )
    
    yield framework
    
    # Cleanup after test
    framework.cleanup()
