from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    create_active_user,
)
from fixtures.types import Operation, SigNoz

DOWNTIME_URL = "/api/v1/downtime_schedules"

_VIEWER_EMAIL = "viewer+rulemute@integration.test"
_VIEWER_PASSWORD = "password123Z$"

SEED_CHANNEL_NAME = "rulemute-ch"

MUTE_RULE = {
    "alert": "rule mute target",
    "description": "mute endpoint target",
    "alertType": "METRIC_BASED_ALERT",
    "ruleType": "threshold_rule",
    "condition": {
        "thresholds": {
            "kind": "basic",
            "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": ["rulemute-ch"]}],
        },
        "compositeQuery": {
            "queryType": "builder",
            "panelType": "graph",
            "queries": [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "metrics",
                        "aggregations": [{"metricName": "rule_mute_cpu", "timeAggregation": "avg", "spaceAggregation": "max"}],
                    },
                }
            ],
        },
        "selectedQueryName": "A",
    },
    "labels": {"severity": "critical"},
    "annotations": {"summary": "s", "description": "d"},
    "evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m0s", "frequency": "1m"}},
    "notificationSettings": {"groupBy": [], "usePolicy": False, "renotify": {"enabled": False, "interval": "30m", "alertStates": []}},
    "version": "v5",
    "schemaVersion": "v2alpha1",
}


def test_mute_lifecycle(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    rule_id = response.json()["data"]["rules"][0]["id"]

    # mute with a duration creates an adhoc downtime scoped to the rule
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
        json={"duration": "1h"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    mute = response.json()["data"]
    assert mute["origin"] == "adhoc"
    assert mute["name"] == "Mute: rule mute target"
    assert mute["alertIds"] == [rule_id]
    assert mute["status"] == "active"
    first_end = mute["schedule"]["endTime"]

    # the list API overlays muted while the adhoc mute is active
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    listed = next(row for row in response.json()["data"]["rules"] if row["id"] == rule_id)
    assert listed["muted"] is True

    # the single-rule GET carries the same overlay for the detail page
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["muted"] is True

    # the adhoc mute is visible on the downtime list and carries its origin
    response = requests.get(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert [(row["id"], row["origin"]) for row in response.json()["data"]] == [(mute["id"], "adhoc")]

    # re-mute replaces the end time on the same row, no second row appears
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
        json={"duration": "4h"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    remute = response.json()["data"]
    assert remute["id"] == mute["id"]
    assert remute["schedule"]["endTime"] > first_end

    # indefinite re-mute drops the end time entirely
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    indefinite = response.json()["data"]
    assert indefinite["id"] == mute["id"]
    assert not indefinite["schedule"].get("endTime")
    assert indefinite["status"] == "active"

    # unmute deletes the adhoc row and is idempotent
    for expected_rows in (0, 0):
        response = requests.post(
            signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/unmute"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        response = requests.get(
            signoz.self.host_configs["8080"].get(DOWNTIME_URL),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        assert len([row for row in response.json()["data"] if row["origin"] == "adhoc"]) == expected_rows

    # the overlay drops after unmute
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    listed = next(row for row in response.json()["data"]["rules"] if row["id"] == rule_id)
    assert listed["muted"] is False

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["muted"] is False


def test_mute_leaves_maintenance_windows_alone(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    rule_id = response.json()["data"]["rules"][0]["id"]

    # a real maintenance window covering the same rule
    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={
            "name": "rule-mute-window",
            "schedule": {"timezone": "UTC", "startTime": "2020-01-01T00:00:00Z", "endTime": "2030-01-01T00:00:00Z"},
            "alertIds": [rule_id],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    window_id = response.json()["data"]["id"]

    # a leaked window pins the rule and blocks delete_all_rules on reused stacks
    try:
        assert response.json()["data"]["origin"] == "maintenance"

        # a maintenance window silences but does not mute
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v3/rules"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        listed = next(row for row in response.json()["data"]["rules"] if row["id"] == rule_id)
        assert listed["muted"] is False

        response = requests.post(
            signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
            json={"duration": "1h"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text

        # with both the window and the mute active, the rule is muted
        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v3/rules"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        listed = next(row for row in response.json()["data"]["rules"] if row["id"] == rule_id)
        assert listed["muted"] is True

        response = requests.post(
            signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/unmute"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

        # the real window survives unmute and keeps silencing without muting
        response = requests.get(
            signoz.self.host_configs["8080"].get(DOWNTIME_URL),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        remaining_ids = [row["id"] for row in response.json()["data"]]
        assert remaining_ids == [window_id]

        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v3/rules"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        listed = next(row for row in response.json()["data"]["rules"] if row["id"] == rule_id)
        assert listed["muted"] is False
    finally:
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{window_id}"),
            json={
                "name": "rule-mute-window",
                "schedule": {"timezone": "UTC", "startTime": "2020-01-01T00:00:00Z", "endTime": "2030-01-01T00:00:00Z"},
                "alertIds": [],
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{window_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_mute_chunked_body_honored(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    rule_id = response.json()["data"]["rules"][0]["id"]

    # a generator body makes requests send Transfer-Encoding chunked (no Content-Length);
    # the duration must still be honored, not silently become an indefinite mute
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
        data=(chunk for chunk in [b'{"duration": "1h"}']),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["schedule"]["endTime"], response.text


def test_delete_rule_cleans_up_mute(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    rule_id = response.json()["data"]["rules"][0]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
        json={"duration": "1h"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    # the rule-owned adhoc row must not block the delete and dies with the rule
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/rules/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert [row for row in response.json()["data"] if row["origin"] == "adhoc"] == []


def test_delete_rule_blocked_by_window_keeps_mute(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    rule_id = response.json()["data"]["rules"][0]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/mute"),
        json={"duration": "1h"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={
            "name": "rule-delete-window",
            "schedule": {"timezone": "UTC", "startTime": "2020-01-01T00:00:00Z", "endTime": "2030-01-01T00:00:00Z"},
            "alertIds": [rule_id],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    window_id = response.json()["data"]["id"]

    # a leaked window pins the rule and blocks delete_all_rules on reused stacks
    try:
        # the real window blocks the delete; the rollback must keep the adhoc mute too
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/rules/{rule_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CONFLICT, response.text

        response = requests.get(
            signoz.self.host_configs["8080"].get(DOWNTIME_URL),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        origins = sorted(row["origin"] for row in response.json()["data"])
        assert origins == ["adhoc", "maintenance"]
    finally:
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{window_id}"),
            json={
                "name": "rule-delete-window",
                "schedule": {"timezone": "UTC", "startTime": "2020-01-01T00:00:00Z", "endTime": "2030-01-01T00:00:00Z"},
                "alertIds": [],
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{window_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # window gone, the delete now succeeds and takes the surviving mute with it
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/rules/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"] == []


def test_mute_error_contract(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    rule_id = response.json()["data"]["rules"][0]["id"]

    cases = [
        (f"/api/v2/rules/{rule_id}/mute", {"duration": "1h", "endTime": "2030-01-01T00:00:00Z"}, HTTPStatus.BAD_REQUEST, "mutually exclusive"),
        (f"/api/v2/rules/{rule_id}/mute", {"endTime": "2020-01-01T00:00:00Z"}, HTTPStatus.BAD_REQUEST, "must be in the future"),
        ("/api/v2/rules/not-a-uuid/mute", None, HTTPStatus.BAD_REQUEST, "uuid"),
        (f"/api/v2/rules/{'0' * 8}-0000-7000-8000-{'0' * 12}/mute", None, HTTPStatus.NOT_FOUND, ""),
        (f"/api/v2/rules/{'0' * 8}-0000-7000-8000-{'0' * 12}/unmute", None, HTTPStatus.NOT_FOUND, ""),
    ]

    for path, body, expected_status, expected_message_part in cases:
        response = requests.post(
            signoz.self.host_configs["8080"].get(path),
            json=body,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == expected_status, f"{path} {body}: {response.text}"
        if expected_message_part:
            assert expected_message_part in response.json()["error"]["message"], response.text


def test_viewer_cannot_mute_or_unmute(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    seed_alert_rules: Callable[[str, list[dict]], None],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    seed_alert_rules(SEED_CHANNEL_NAME, [MUTE_RULE])

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    if _VIEWER_EMAIL not in {user["email"] for user in response.json()["data"]}:
        create_active_user(signoz, admin_token, email=_VIEWER_EMAIL, role="signoz-viewer", password=_VIEWER_PASSWORD, name="rule mute viewer")

    viewer_token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v3/rules"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    rule_id = response.json()["data"]["rules"][0]["id"]

    for action in ("mute", "unmute"):
        response = requests.post(
            signoz.self.host_configs["8080"].get(f"/api/v2/rules/{rule_id}/{action}"),
            headers={"Authorization": f"Bearer {viewer_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{action}: {response.text}"
