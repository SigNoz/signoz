import json
import time
import urllib.parse
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.alerts import update_rule_channel_name
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fs import get_testdata_file_path
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# Rules in the scenarios below evaluate every 15s and the data is set up to
# fire on the first evaluation, so the firing entry should be recorded well
# within this window.
HISTORY_WAIT_SECONDS = 60

# Related links cover [ts - evalWindow - 3m, ts]: the rules use a 5m eval
# window and the backend widens it by 3m for the built-in evaluation delay.
RELATED_LINK_WINDOW_SECONDS = (5 + 3) * 60


def _labels_to_map(labels: list[dict]) -> dict[str, str]:
    return {label["key"]["name"]: label["value"] for label in labels or []}


def _parse_related_link(link: str) -> dict:
    params = urllib.parse.parse_qs(link)
    for key in ("compositeQuery", "startTime", "endTime", "options"):
        assert key in params, f"related link is missing param {key}, link: {link}"
    return {
        "start": int(params["startTime"][0]),
        "end": int(params["endTime"][0]),
        # the compositeQuery value is query-escaped before being encoded into
        # the params, so it needs one more unquote than the other params
        "composite_query": json.loads(urllib.parse.unquote_plus(params["compositeQuery"][0])),
    }


def _assert_link_query(link: dict, data_source: str, expression_pieces: list[str]) -> None:
    query_data = link["composite_query"]["builder"]["queryData"]
    assert len(query_data) == 1
    assert query_data[0]["dataSource"] == data_source
    expression = query_data[0]["filter"]["expression"]
    for piece in expression_pieces:
        assert piece in expression, f"expected {piece} in link filter expression: {expression}"


def _create_rule_with_channel(
    notification_channel: types.TestContainerDocker,
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
    create_alert_rule: Callable[[dict], str],
    rule_path: str,
) -> str:
    channel_name = str(uuid.uuid4())
    create_webhook_notification_channel(
        channel_name=channel_name,
        webhook_url=notification_channel.container_configs["8080"].get(f"/alert/{channel_name}"),
        http_config={},
        send_resolved=False,
    )

    with open(get_testdata_file_path(rule_path), encoding="utf-8") as f:
        rule_data = json.loads(f.read())
    update_rule_channel_name(rule_data, channel_name)
    return create_alert_rule(rule_data)


def _wait_for_firing_timeline_item(signoz: types.SigNoz, token: str, rule_id: str, start_ms: int) -> tuple[dict, int]:
    """Polls the v2 timeline API until the rule records a firing entry.

    Returns the firing entry and the end of the queried range.
    """
    deadline = time.time() + HISTORY_WAIT_SECONDS
    items = []
    while time.time() < deadline:
        end_ms = int(datetime.now(tz=UTC).timestamp() * 1000) + 60_000
        response = requests.get(
            signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/history/timeline"),
            params={"start": start_ms, "end": end_ms, "limit": 50, "order": "desc"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"Failed to get rule history timeline, api returned {response.status_code} with response: {response.text}"
        items = response.json()["data"]["items"] or []
        firing = [item for item in items if item["state"] == "firing"]
        if len(firing) > 0:
            return (firing[0], end_ms)
        time.sleep(2)

    raise AssertionError(f"No firing entry recorded in rule state history within {HISTORY_WAIT_SECONDS}s, items: {items}")


def _get_top_contributors(signoz: types.SigNoz, token: str, rule_id: str, start_ms: int, end_ms: int) -> list[dict]:
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/history/top_contributors"),
        params={"start": start_ms, "end": end_ms},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, f"Failed to get rule history top contributors, api returned {response.status_code} with response: {response.text}"
    return response.json()["data"] or []


def test_logs_rule_history_related_links(
    signoz: types.SigNoz,
    notification_channel: types.TestContainerDocker,
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=30)).timestamp() * 1000)

    insert_alert_data(
        [types.AlertData(type="logs", data_path="alerts/test_scenarios/rule_state_history_logs/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )
    rule_id = _create_rule_with_channel(
        notification_channel,
        create_webhook_notification_channel,
        create_alert_rule,
        "alerts/test_scenarios/rule_state_history_logs/rule.json",
    )

    (item, query_end_ms) = _wait_for_firing_timeline_item(signoz, token, rule_id, query_start_ms)

    assert _labels_to_map(item["labels"]).get("service.name") == "payment-service"
    assert item.get("relatedTracesLink", "") == ""
    assert item.get("relatedLogsLink", "") != ""

    # logs explorer links carry the time range in milliseconds, anchored to the
    # second-truncated entry timestamp
    link = _parse_related_link(item["relatedLogsLink"])
    assert link["end"] == (item["unixMilli"] // 1000) * 1000
    assert link["end"] - link["start"] == RELATED_LINK_WINDOW_SECONDS * 1000
    _assert_link_query(link, "logs", ["payment success", "service.name", "payment-service"])

    contributors = _get_top_contributors(signoz, token, rule_id, query_start_ms, query_end_ms)
    contributors = [c for c in contributors if _labels_to_map(c["labels"]).get("service.name") == "payment-service"]
    assert len(contributors) == 1
    assert contributors[0]["count"] >= 1
    assert contributors[0].get("relatedTracesLink", "") == ""
    assert contributors[0].get("relatedLogsLink", "") != ""

    # contributor counts aggregate the whole queried range, so their links span it
    contributor_link = _parse_related_link(contributors[0]["relatedLogsLink"])
    assert contributor_link["start"] == query_start_ms
    assert contributor_link["end"] == query_end_ms
    _assert_link_query(contributor_link, "logs", ["payment success", "service.name", "payment-service"])


def test_traces_rule_history_related_links(
    signoz: types.SigNoz,
    notification_channel: types.TestContainerDocker,
    create_webhook_notification_channel: Callable[[str, str, dict, bool], str],
    create_alert_rule: Callable[[dict], str],
    insert_alert_data: Callable[[list[types.AlertData], datetime], None],
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    query_start_ms = int((datetime.now(tz=UTC) - timedelta(minutes=30)).timestamp() * 1000)

    insert_alert_data(
        [types.AlertData(type="traces", data_path="alerts/test_scenarios/rule_state_history_traces/alert_data.jsonl")],
        base_time=datetime.now(tz=UTC) - timedelta(minutes=5),
    )
    rule_id = _create_rule_with_channel(
        notification_channel,
        create_webhook_notification_channel,
        create_alert_rule,
        "alerts/test_scenarios/rule_state_history_traces/rule.json",
    )

    (item, query_end_ms) = _wait_for_firing_timeline_item(signoz, token, rule_id, query_start_ms)

    assert _labels_to_map(item["labels"]).get("service.name") == "order-service"
    assert item.get("relatedLogsLink", "") == ""
    assert item.get("relatedTracesLink", "") != ""

    # traces explorer links carry the time range in nanoseconds, anchored to the
    # second-truncated entry timestamp
    link = _parse_related_link(item["relatedTracesLink"])
    assert link["end"] == (item["unixMilli"] // 1000) * 1_000_000_000
    assert link["end"] - link["start"] == RELATED_LINK_WINDOW_SECONDS * 1_000_000_000
    _assert_link_query(link, "traces", ["http.request.path", "/order", "service.name", "order-service"])

    contributors = _get_top_contributors(signoz, token, rule_id, query_start_ms, query_end_ms)
    contributors = [c for c in contributors if _labels_to_map(c["labels"]).get("service.name") == "order-service"]
    assert len(contributors) == 1
    assert contributors[0]["count"] >= 1
    assert contributors[0].get("relatedLogsLink", "") == ""
    assert contributors[0].get("relatedTracesLink", "") != ""

    # contributor counts aggregate the whole queried range, so their links span it
    contributor_link = _parse_related_link(contributors[0]["relatedTracesLink"])
    assert contributor_link["start"] == query_start_ms * 1_000_000
    assert contributor_link["end"] == query_end_ms * 1_000_000
    _assert_link_query(contributor_link, "traces", ["http.request.path", "/order", "service.name", "order-service"])
