from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/rules"

VALID_RULE = {
    "alert": "threshold probe",
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
                        "aggregations": [{"metricName": "threshold_probe_cpu", "timeAggregation": "avg", "spaceAggregation": "max"}],
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


def test_create_rejects_null_target(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {**VALID_RULE, "condition": {**VALID_RULE["condition"], "thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": None, "matchType": "at_least_once", "op": "above", "channels": []}]}}}
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
            "errors": [{"message": "target value cannot be nil", "suggestions": []}],
            "suggestions": [],
        },
    }


def test_create_rejects_empty_op(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {**VALID_RULE, "condition": {**VALID_RULE["condition"], "thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "", "channels": []}]}}}
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
            "errors": [{"message": 'condition.op: unsupported value ""; must be one of above, below, equal, not_equal, above_or_equal, below_or_equal, outside_bounds', "suggestions": []}],
            "suggestions": [],
        },
    }


def test_create_rejects_unknown_match_type(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    rule = {**VALID_RULE, "condition": {**VALID_RULE["condition"], "thresholds": {"kind": "basic", "spec": [{"name": "critical", "target": 90, "matchType": "0", "op": "above", "channels": []}]}}}
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
            "errors": [{"message": 'condition.matchType: unsupported value "0"; must be one of at_least_once, all_the_times, on_average, in_total, last', "suggestions": []}],
            "suggestions": [],
        },
    }
