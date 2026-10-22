import json
import time
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

BACKEND_ALERT = types.FiringAlert(labels={"tier": "backend", "service.name": "payment"})

# MaintenanceMuter caches downtime schedules for 30s
MAINTENANCE_CACHE_TTL_SECONDS = 30


PLANNED_DOWNTIME_CASES = [
    types.PlannedDowntimeTestCase(name="dotted_label_scope", scope='service.name == "checkout"', start_offset=timedelta(0), expected_alerts=[BACKEND_ALERT]),
]


@pytest.mark.parametrize(
    "planned_downtime_test_case",
    PLANNED_DOWNTIME_CASES,
    ids=lambda c: c.name,
)
def test_planned_downtime(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    create_notification_channel: Callable[[dict], str],
    create_alert_rule: Callable[[dict], str],
    create_downtime_schedule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    planned_downtime_test_case: types.PlannedDowntimeTestCase,
):
    expected_alerts = planned_downtime_test_case.expected_alerts
    channel_name = str(uuid.uuid4())
    make_http_mocks(
        notification_channel,
        [
            Mapping(
                request=MappingRequest(method=HttpMethods.POST, url=f"/alert/{channel_name}"),
                response=MappingResponse(status=200, json_body={}),
                persistent=False,
            )
        ],
    )
    create_notification_channel(
        {
            "name": channel_name,
            "webhook_configs": [{"url": notification_channel.container_configs["8080"].get(f"/alert/{channel_name}"), "send_resolved": False}],
        }
    )

    with open(get_testdata_file_path("alertmanager/planned_downtime_rule.json"), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    rule_id = create_alert_rule(rule_data)

    start = datetime.now(tz=UTC).replace(microsecond=0) + planned_downtime_test_case.start_offset
    create_downtime_schedule(
        {
            "name": channel_name,
            "alertIds": [rule_id],
            "scope": planned_downtime_test_case.scope,
            "schedule": {
                "timezone": "UTC",
                "startTime": start.isoformat(),
                "endTime": (start + timedelta(hours=1)).isoformat(),
            },
        }
    )

    # the rule has no data to fire on until the downtime is visible to the muter
    time.sleep(MAINTENANCE_CACHE_TTL_SECONDS + 5)

    insert_alert_data(
        [types.AlertData(type="metrics", data_path="alertmanager/notification_routing_alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )

    verify_webhook_alert_expectation(
        notification_channel,
        channel_name,
        types.AlertExpectation(
            should_alert=len(expected_alerts) > 0,
            expected_alerts=expected_alerts,
            wait_time_seconds=120,
        ),
    )

    received_services = {alert.labels["service.name"] for alert in collect_webhook_firing_alerts(notification_channel, channel_name)}
    assert received_services == {alert.labels["service.name"] for alert in expected_alerts}, f"received alerts for {received_services}, expected {expected_alerts}"
