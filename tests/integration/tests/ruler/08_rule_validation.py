import time
from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/rules"

VALID_RULE = {
    "alert": "validation probe",
    "alertType": "METRIC_BASED_ALERT",
    "ruleType": "threshold_rule",
    "condition": {
        "thresholds": {
            "kind": "basic",
            "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": []}],
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
                        "aggregations": [{"metricName": "validation_probe_cpu", "timeAggregation": "avg", "spaceAggregation": "max"}],
                    },
                }
            ],
        },
        "selectedQueryName": "A",
    },
    "labels": {"severity": "critical"},
    "annotations": {"summary": "s", "description": "d"},
    "disabled": True,
    "evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m", "frequency": "1m"}},
    "notificationSettings": {"usePolicy": False, "renotify": {"enabled": False}},
    "schemaVersion": "v2alpha1",
}


def test_create_rejects_missing_alert_type(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {key: value for key, value in VALID_RULE.items() if key != "alertType"}
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=rule,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "alert rule is not valid",
            "errors": [{"message": "alertType: field is required", "suggestions": []}],
            "suggestions": [],
        },
    }


def test_create_rejects_unknown_panel_type(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {**VALID_RULE, "condition": {**VALID_RULE["condition"], "compositeQuery": {**VALID_RULE["condition"]["compositeQuery"], "panelType": "pie"}}}
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json=rule,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "alert rule is not valid",
            "errors": [{"message": 'condition.compositeQuery.panelType: unsupported value "pie"; must be one of value, table, graph', "suggestions": []}],
            "suggestions": [],
        },
    }


def test_create_rejects_malformed_json(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        data='{"alert": ',
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "failed to unmarshal rule",
            "errors": [],
            "suggestions": [],
        },
    }


def test_timeline_rejects_unknown_state(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    rule_id = create_alert_rule(VALID_RULE)

    end_ms = int(time.time() * 1000)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{rule_id}/history/timeline"),
        params={"start": end_ms - 3_600_000, "end": end_ms, "state": "bogus"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "invalid query parameters",
            "errors": [],
            "suggestions": [],
        },
    }
