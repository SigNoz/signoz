import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Callable, List

import pytest
from wiremock.client import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import types
from fixtures.alertutils import (
    update_rule_channel_name,
    verify_webhook_alert_expectation,
)
from fixtures.logger import setup_logger
from fixtures.utils import get_testdata_file_path

# Alert test cases use a 30-second wait time to verify expected alert firing.
# Alert data is set up to trigger on the first rule manager evaluation.
# With a 15-second eval frequency for most rules, plus alertmanager's
# group_wait and group_interval delays, alerts should fire well within 30 seconds.
TEST_RULES_MATCH_TYPE_AND_COMPARE_OPERATORS = [
    types.AlertTestCase(
        name="test_threshold_above_at_least_once",
        rule_path="alerts/test_scenarios/threshold_above_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                # active requests dummy data
                data_path="alerts/test_scenarios/threshold_above_at_least_once/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_above_at_least_once",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_above_all_the_time",
        rule_path="alerts/test_scenarios/threshold_above_all_the_time/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_all_the_time/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_above_all_the_time",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_above_in_total",
        rule_path="alerts/test_scenarios/threshold_above_in_total/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_in_total/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_above_in_total",
                        "threshold.name": "critical",
                        "service": "server",
                    },
                ),
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_above_in_total",
                        "threshold.name": "critical",
                        "service": "api",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_above_average",
        rule_path="alerts/test_scenarios/threshold_above_average/rule.json",
        alert_data=[
            types.AlertData(
                type="traces",
                data_path="alerts/test_scenarios/threshold_above_average/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_above_average",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_above_last",
        rule_path="alerts/test_scenarios/threshold_above_last/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_above_last/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_above_last",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_below_at_least_once",
        rule_path="alerts/test_scenarios/threshold_below_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="logs",
                data_path="alerts/test_scenarios/threshold_below_at_least_once/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_below_at_least_once",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_below_all_the_time",
        rule_path="alerts/test_scenarios/threshold_below_all_the_time/rule.json",
        alert_data=[
            types.AlertData(
                type="logs",
                data_path="alerts/test_scenarios/threshold_below_all_the_time/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_below_all_the_time",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_below_in_total",
        rule_path="alerts/test_scenarios/threshold_below_in_total/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                # one rate ~5 + rest 0.01 so it remains in total below 10
                data_path="alerts/test_scenarios/threshold_below_in_total/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_below_in_total",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_below_average",
        rule_path="alerts/test_scenarios/threshold_below_average/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_below_average/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_below_average",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_below_last",
        rule_path="alerts/test_scenarios/threshold_below_last/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_below_last/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_below_last",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_equal_to_at_least_once",
        rule_path="alerts/test_scenarios/threshold_equal_to_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_equal_to_at_least_once/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_equal_to_at_least_once",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_equal_to_all_the_time",
        rule_path="alerts/test_scenarios/threshold_equal_to_all_the_time/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_equal_to_all_the_time/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_equal_to_all_the_time",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_equal_to_in_total",
        rule_path="alerts/test_scenarios/threshold_equal_to_in_total/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_equal_to_in_total/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_equal_to_in_total",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_equal_to_average",
        rule_path="alerts/test_scenarios/threshold_equal_to_average/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_equal_to_average/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_equal_to_average",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_equal_to_last",
        rule_path="alerts/test_scenarios/threshold_equal_to_last/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_equal_to_last/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_equal_to_last",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_not_equal_to_at_least_once",
        rule_path="alerts/test_scenarios/threshold_not_equal_to_at_least_once/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_not_equal_to_at_least_once/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_not_equal_to_at_least_once",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_not_equal_to_all_the_time",
        rule_path="alerts/test_scenarios/threshold_not_equal_to_all_the_time/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_not_equal_to_all_the_time/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_not_equal_to_all_the_time",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_not_equal_to_in_total",
        rule_path="alerts/test_scenarios/threshold_not_equal_to_in_total/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_not_equal_to_in_total/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_not_equal_to_in_total",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_not_equal_to_average",
        rule_path="alerts/test_scenarios/threshold_not_equal_to_average/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_not_equal_to_average/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_not_equal_to_average",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_threshold_not_equal_to_last",
        rule_path="alerts/test_scenarios/threshold_not_equal_to_last/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/threshold_not_equal_to_last/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "threshold_not_equal_to_last",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
]

# test cases unit conversion
TEST_RULES_UNIT_CONVERSION = [
    types.AlertTestCase(
        name="test_unit_conversion_bytes_to_mb",
        rule_path="alerts/test_scenarios/unit_conversion_bytes_to_mb/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/unit_conversion_bytes_to_mb/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "unit_conversion_bytes_to_mb",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
    types.AlertTestCase(
        name="test_unit_conversion_ms_to_second",
        rule_path="alerts/test_scenarios/unit_conversion_ms_to_second/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/unit_conversion_ms_to_second/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "unit_conversion_ms_to_second",
                        "threshold.name": "critical",
                    }
                ),
            ],
        ),
    ),
]

# test cases miscellaneous cases, no data and multi threshold
TEST_RULES_MISCELLANEOUS = [
    types.AlertTestCase(
        name="test_no_data_rule_test",
        rule_path="alerts/test_scenarios/no_data_rule_test/rule.json",
        alert_data=[
            types.AlertData(
                type="metrics",
                data_path="alerts/test_scenarios/no_data_rule_test/alert_data.jsonl",
            ),
        ],
        alert_expectation=types.AlertExpectation(
            should_alert=True,
            wait_time_seconds=30,
            expected_alerts=[
                types.FiringAlert(
                    labels={
                        "alertname": "[No data] no_data_rule_test",
                        "nodata": "true",
                    }
                ),
            ],
        ),
    ),
    # TODO: @abhishekhugetech enable the test for multi threshold rule, pylint: disable=W0511
    # after the [issue](https://github.com/SigNoz/engineering-pod/issues/3934) with alertManager is resolved
    # types.AlertTestCase(
    #     name="test_multi_threshold_rule_test",
    #     rule_path="alerts/test_scenarios/multi_threshold_rule_test/rule.json",
    #     alert_data=[
    #         types.AlertData(
    #             type="metrics",
    #             data_path="alerts/test_scenarios/multi_threshold_rule_test/alert_data.jsonl",
    #         ),
    #     ],
    #     alert_expectation=types.AlertExpectation(
    #         should_alert=True,
    #         # the second alert will be fired with some delay from alert manager's group_interval
    #         # so taking this in consideration, the wait time is 90 seconds (30s + 30s for next alert + 30s buffer)
    #         wait_time_seconds=90,
    #         expected_alerts=[
    #             types.FiringAlert(
    #                 labels={
    #                     "alertname": "multi_threshold_rule_test",
    #                     "threshold.name": "info",
    #                 }
    #             ),
    #             types.FiringAlert(
    #                 labels={
    #                     "alertname": "multi_threshold_rule_test",
    #                     "threshold.name": "warning",
    #                 }
    #             ),
    #         ],
    #     ),
    # ),
]


logger = setup_logger(__name__)


@pytest.mark.parametrize(
    "alert_test_case",
    TEST_RULES_MATCH_TYPE_AND_COMPARE_OPERATORS
    + TEST_RULES_UNIT_CONVERSION
    + TEST_RULES_MISCELLANEOUS,
    ids=lambda alert_test_case: alert_test_case.name,
)
def test_basic_alert_rule_conditions(
    # Notification channel related fixtures
    notification_channel: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, List[Mapping]], None],
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
    # Alert rule related fixtures
    create_alert_rule: Callable[[dict], str],
    # Alert data insertion related fixtures
    insert_alert_data: Callable[[List[types.AlertData], datetime], None],
    alert_test_case: types.AlertTestCase,
):
    # Prepare notification channel name and webhook endpoint
    notification_channel_name = str(uuid.uuid4())
    webhook_endpoint_path = f"/alert/{notification_channel_name}"
    notification_url = notification_channel.container_configs["8080"].get(
        webhook_endpoint_path
    )

    logger.info("notification_url: %s", {"notification_url": notification_url})

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

    logger.info(
        "alert channel created with name: %s",
        {"notification_channel_name": notification_channel_name},
    )

    # Insert alert data
    insert_alert_data(
        alert_test_case.alert_data,
        base_time=datetime.now(tz=timezone.utc) - timedelta(minutes=5),
    )

    # Create Alert Rule
    rule_path = get_testdata_file_path(alert_test_case.rule_path)
    with open(rule_path, "r", encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    # Update the channel name in the rule data
    update_rule_channel_name(rule_data, notification_channel_name)
    rule_id = create_alert_rule(rule_data)
    logger.info(
        "rule created with id: %s",
        {"rule_id": rule_id, "rule_name": rule_data["alert"]},
    )

    # Verify alert expectation
    verify_webhook_alert_expectation(
        notification_channel,
        notification_channel_name,
        alert_test_case.alert_expectation,
    )
