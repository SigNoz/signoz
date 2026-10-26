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
            "message": "failed to parse json: unexpected end of JSON input",
            "errors": [],
            "suggestions": [],
        },
    }


def test_create_rejects_unnamed_threshold(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {**VALID_RULE, "condition": {**VALID_RULE["condition"], "thresholds": {"kind": "basic", "spec": [{"name": "", "target": 90, "matchType": "at_least_once", "op": "above", "channels": []}]}}}
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
            "errors": [{"message": "threshold name cannot be empty", "suggestions": []}],
            "suggestions": [],
        },
    }


def test_create_rejects_duplicate_threshold_names(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    threshold = {"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": []}
    rule = {**VALID_RULE, "condition": {**VALID_RULE["condition"], "thresholds": {"kind": "basic", "spec": [threshold, {**threshold, "target": 95}]}}}
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
            "errors": [{"message": 'condition.thresholds.spec: duplicate threshold name "critical"', "suggestions": []}],
            "suggestions": [],
        },
    }


def test_create_rejects_empty_rule_type(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={**VALID_RULE, "ruleType": ""},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "failed to parse json: string must not be empty",
            "errors": [],
            "suggestions": [],
        },
    }


def test_create_rejects_empty_schema_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={**VALID_RULE, "schemaVersion": ""},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "failed to parse json: string must not be empty",
            "errors": [],
            "suggestions": [],
        },
    }


def test_create_rejects_empty_seasonality(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={**VALID_RULE, "condition": {**VALID_RULE["condition"], "seasonality": ""}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json() == {
        "status": "error",
        "error": {
            "type": "invalid-input",
            "code": "invalid_input",
            "message": "failed to parse json: string must not be empty",
            "errors": [],
            "suggestions": [],
        },
    }


def test_create_defaults_clickhouse_rule_type(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {key: value for key, value in VALID_RULE.items() if key != "ruleType"}
    rule["condition"] = {**VALID_RULE["condition"], "compositeQuery": {"queryType": "clickhouse_sql", "panelType": "graph", "queries": [{"type": "clickhouse_sql", "spec": {"name": "A", "query": "SELECT now() AS ts, 1 AS value"}}]}}
    rule_id = create_alert_rule(rule)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["ruleType"] == "threshold_rule"


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
