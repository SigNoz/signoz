from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest

from fixtures import types
from fixtures.alerts import (
    get_rule_history_top_contributors,
    labels_to_map,
    wait_for_firing_timeline_entry,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_value_panel_fires_on_the_window_sum(
    signoz: types.SigNoz,
    create_alert_rule_with_channel: Callable[[str], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=30)).timestamp() * 1000)

    # one-minute samples of 100, 150 and 250: no step reaches the 400 target,
    # their sum over the window does
    insert_alert_data(
        [types.AlertData(type="metrics", data_path="ruler/test_scenarios/scalar_value_panel_metrics/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=4),
    )
    value_rule_id = create_alert_rule_with_channel("ruler/test_scenarios/scalar_value_panel_metrics/rule.json")
    graph_rule_id = create_alert_rule_with_channel("ruler/test_scenarios/scalar_value_panel_metrics_as_graph/rule.json")

    (item, _) = wait_for_firing_timeline_entry(signoz, token, value_rule_id, query_start_ms)
    assert item["value"] == 500

    # the same query on a graph panel compares each step, even at_least_once
    # never sees 400
    with pytest.raises(AssertionError, match="No firing entry recorded"):
        wait_for_firing_timeline_entry(signoz, token, graph_rule_id, query_start_ms, wait_seconds=30)


def test_table_panel_fires_per_group_on_the_window_count(
    signoz: types.SigNoz,
    create_alert_rule_with_channel: Callable[[str], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=30)).timestamp() * 1000)

    # checkout logs two lines a minute for three minutes, cart one line a
    # minute for two: only checkout's whole-window count passes the 4 target,
    # and no single minute of either does
    insert_alert_data(
        [types.AlertData(type="logs", data_path="ruler/test_scenarios/scalar_table_panel_logs/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=4),
    )
    rule_id = create_alert_rule_with_channel("ruler/test_scenarios/scalar_table_panel_logs/rule.json")

    (item, end_ms) = wait_for_firing_timeline_entry(signoz, token, rule_id, query_start_ms)
    assert labels_to_map(item["labels"]).get("service.name") == "checkout"
    assert item["value"] == 6

    contributors = get_rule_history_top_contributors(signoz, token, rule_id, query_start_ms, end_ms)
    assert {labels_to_map(contributor["labels"]).get("service.name") for contributor in contributors} == {"checkout"}
