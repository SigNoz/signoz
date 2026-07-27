from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fixtures import types
from fixtures.alerts import (
    assert_related_link_query,
    get_rule_history_top_contributors,
    labels_to_map,
    parse_related_link,
    wait_for_firing_timeline_entry,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# Related links cover [ts - evalWindow - 3m, ts]: the rules use a 5m eval
# window and the backend widens it by 3m for the built-in evaluation delay.
RELATED_LINK_WINDOW_SECONDS = (5 + 3) * 60


def test_logs_rule_history_related_links(
    signoz: types.SigNoz,
    create_alert_rule_with_channel: Callable[[str], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=30)).timestamp() * 1000)

    insert_alert_data(
        [types.AlertData(type="logs", data_path="alerts/test_scenarios/rule_state_history_logs/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )
    rule_id = create_alert_rule_with_channel("alerts/test_scenarios/rule_state_history_logs/rule.json")

    (item, query_end_ms) = wait_for_firing_timeline_entry(signoz, token, rule_id, query_start_ms)

    assert labels_to_map(item["labels"]).get("service.name") == "payment-service"
    assert item.get("relatedTracesLink", "") == ""
    assert item.get("relatedLogsLink", "") != ""

    # logs explorer links carry the time range in milliseconds, anchored to the
    # second-truncated entry timestamp
    link = parse_related_link(item["relatedLogsLink"])
    assert link["end"] == (item["unixMilli"] // 1000) * 1000
    assert link["end"] - link["start"] == RELATED_LINK_WINDOW_SECONDS * 1000
    assert_related_link_query(link, "logs", ["payment success", "service.name", "payment-service"])

    contributors = get_rule_history_top_contributors(signoz, token, rule_id, query_start_ms, query_end_ms)
    contributors = [c for c in contributors if labels_to_map(c["labels"]).get("service.name") == "payment-service"]
    assert len(contributors) == 1
    assert contributors[0]["count"] >= 1
    assert contributors[0].get("relatedTracesLink", "") == ""
    assert contributors[0].get("relatedLogsLink", "") != ""

    # contributor counts aggregate the whole queried range, so their links span it
    contributor_link = parse_related_link(contributors[0]["relatedLogsLink"])
    assert contributor_link["start"] == query_start_ms
    assert contributor_link["end"] == query_end_ms
    assert_related_link_query(contributor_link, "logs", ["payment success", "service.name", "payment-service"])


def test_traces_rule_history_related_links(
    signoz: types.SigNoz,
    create_alert_rule_with_channel: Callable[[str], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=30)).timestamp() * 1000)

    insert_alert_data(
        [types.AlertData(type="traces", data_path="alerts/test_scenarios/rule_state_history_traces/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )
    rule_id = create_alert_rule_with_channel("alerts/test_scenarios/rule_state_history_traces/rule.json")

    (item, query_end_ms) = wait_for_firing_timeline_entry(signoz, token, rule_id, query_start_ms)

    assert labels_to_map(item["labels"]).get("service.name") == "order-service"
    assert item.get("relatedLogsLink", "") == ""
    assert item.get("relatedTracesLink", "") != ""

    # traces explorer links carry the time range in nanoseconds, anchored to the
    # second-truncated entry timestamp
    link = parse_related_link(item["relatedTracesLink"])
    assert link["end"] == (item["unixMilli"] // 1000) * 1_000_000_000
    assert link["end"] - link["start"] == RELATED_LINK_WINDOW_SECONDS * 1_000_000_000
    assert_related_link_query(link, "traces", ["http.request.path", "/order", "service.name", "order-service"])

    contributors = get_rule_history_top_contributors(signoz, token, rule_id, query_start_ms, query_end_ms)
    contributors = [c for c in contributors if labels_to_map(c["labels"]).get("service.name") == "order-service"]
    assert len(contributors) == 1
    assert contributors[0]["count"] >= 1
    assert contributors[0].get("relatedLogsLink", "") == ""
    assert contributors[0].get("relatedTracesLink", "") != ""

    # contributor counts aggregate the whole queried range, so their links span it
    contributor_link = parse_related_link(contributors[0]["relatedTracesLink"])
    assert contributor_link["start"] == query_start_ms * 1_000_000
    assert contributor_link["end"] == query_end_ms * 1_000_000
    assert_related_link_query(contributor_link, "traces", ["http.request.path", "/order", "service.name", "order-service"])
