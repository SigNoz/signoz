from datetime import datetime, timezone
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
from fixtures.utils import get_testdata_file_path

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
