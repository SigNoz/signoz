from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.alerts import delete_all_rules
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.notification_channel import ensure_notification_channel
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v3/rules"

EVALUATION = {"kind": "rolling", "spec": {"evalWindow": "5m0s", "frequency": "1m"}}

NOTIFICATION_SETTINGS = {
    "groupBy": [],
    "usePolicy": False,
    "renotify": {"enabled": False, "interval": "30m", "alertStates": []},
}

METRIC_CONDITION = {
    "thresholds": {
        "kind": "basic",
        "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": ["list-rules-v3-channel"]}],
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
                    "aggregations": [{"metricName": "list_rules_v3_cpu", "timeAggregation": "avg", "spaceAggregation": "max"}],
                },
            }
        ],
    },
    "selectedQueryName": "A",
}

LOGS_CONDITION = {
    "thresholds": {
        "kind": "basic",
        "spec": [{"name": "critical", "target": 100, "matchType": "at_least_once", "op": "above", "channels": ["list-rules-v3-channel"]}],
    },
    "compositeQuery": {
        "queryType": "builder",
        "panelType": "graph",
        "queries": [
            {
                "type": "builder_query",
                "spec": {
                    "name": "A",
                    "signal": "logs",
                    "aggregations": [{"expression": "count()"}],
                    "filter": {"expression": ""},
                },
            }
        ],
    },
    "selectedQueryName": "A",
}

PROMQL_CONDITION = {
    "thresholds": {
        "kind": "basic",
        "spec": [{"name": "critical", "target": 1, "matchType": "at_least_once", "op": "below", "channels": ["list-rules-v3-channel"]}],
    },
    "compositeQuery": {
        "queryType": "promql",
        "panelType": "graph",
        "queries": [{"type": "promql", "spec": {"name": "A", "query": '{"list_rules_v3_up"}'}}],
    },
    "selectedQueryName": "A",
}

SEED_RULES = [
    {
        "alert": "payment latency high",
        "description": "p99 latency guard",
        "alertType": "METRIC_BASED_ALERT",
        "ruleType": "threshold_rule",
        "condition": METRIC_CONDITION,
        "labels": {"severity": "critical", "team": "payments", "k8s.cluster": "prod-1"},
        "annotations": {"summary": "s", "description": "d"},
        "evaluation": EVALUATION,
        "notificationSettings": NOTIFICATION_SETTINGS,
        "version": "v5",
        "schemaVersion": "v2alpha1",
    },
    {
        "alert": "payment gateway errors",
        "description": "error rate watch",
        "alertType": "LOGS_BASED_ALERT",
        "ruleType": "threshold_rule",
        "condition": LOGS_CONDITION,
        "labels": {"severity": "warning", "team": "payments"},
        "annotations": {"summary": "s", "description": "d"},
        "evaluation": EVALUATION,
        "notificationSettings": NOTIFICATION_SETTINGS,
        "version": "v5",
        "schemaVersion": "v2alpha1",
    },
    {
        "alert": "checkout conversion drop",
        "description": "funnel watcher",
        "alertType": "METRIC_BASED_ALERT",
        "ruleType": "threshold_rule",
        "condition": METRIC_CONDITION,
        "labels": {"severity": "important", "team": "checkout"},
        "annotations": {"summary": "s", "description": "d"},
        "disabled": True,
        "evaluation": EVALUATION,
        "notificationSettings": NOTIFICATION_SETTINGS,
        "version": "v5",
        "schemaVersion": "v2alpha1",
    },
    {
        "alert": "infra cpu saturation",
        "description": "node headroom",
        "alertType": "METRIC_BASED_ALERT",
        "ruleType": "threshold_rule",
        "condition": METRIC_CONDITION,
        "labels": {"team": "infra"},
        "annotations": {"summary": "s", "description": "d"},
        "evaluation": EVALUATION,
        "notificationSettings": NOTIFICATION_SETTINGS,
        "version": "v5",
        "schemaVersion": "v2alpha1",
    },
    {
        "alert": "prom uptime probe",
        "description": "blackbox liveness",
        "alertType": "METRIC_BASED_ALERT",
        "ruleType": "promql_rule",
        "condition": PROMQL_CONDITION,
        "labels": {},
        "annotations": {"summary": "s", "description": "d"},
        "evaluation": EVALUATION,
        "notificationSettings": NOTIFICATION_SETTINGS,
        "version": "v5",
        "schemaVersion": "v2alpha1",
    },
]

RESERVED_KEYWORDS = [
    "alert_type",
    "created_at",
    "created_by",
    "labels.<key>",
    "name",
    "rule_type",
    "severity",
    "updated_at",
    "updated_by",
]


def test_envelope_and_slim_rows(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]

    assert data["total"] == 5
    assert len(data["rules"]) == 5
    assert data["reservedKeywords"] == RESERVED_KEYWORDS

    label_pairs = [(pair["key"], pair["value"]) for pair in data["labels"]]
    assert label_pairs == sorted(label_pairs), "label pairs must be sorted by key then value"
    for expected_pair in [
        ("k8s.cluster", "prod-1"),
        ("severity", "critical"),
        ("severity", "important"),
        ("severity", "warning"),
        ("team", "checkout"),
        ("team", "infra"),
        ("team", "payments"),
    ]:
        assert expected_pair in label_pairs, f"missing label pair {expected_pair}"

    by_name = {rule["alert"]: rule for rule in data["rules"]}
    assert set(by_name) == {r["alert"] for r in SEED_RULES}

    for rule in data["rules"]:
        for forbidden_field in ("condition", "annotations", "notificationSettings", "evaluation", "source", "version", "schemaVersion"):
            assert forbidden_field not in rule, f"slim row leaked {forbidden_field}"
        for required_field in ("id", "state", "alert", "alertType", "ruleType", "createdAt", "updatedAt"):
            assert required_field in rule, f"slim row missing {required_field}"
        assert rule["createdBy"] == USER_ADMIN_EMAIL
        assert rule["updatedBy"] == USER_ADMIN_EMAIL

    assert by_name["checkout conversion drop"]["state"] == "disabled"
    assert by_name["checkout conversion drop"]["disabled"] is True
    assert by_name["payment latency high"]["state"] == "inactive"
    assert by_name["payment latency high"]["description"] == "p99 latency guard"
    assert by_name["payment latency high"]["labels"] == {"severity": "critical", "team": "payments", "k8s.cluster": "prod-1"}
    assert by_name["payment gateway errors"]["alertType"] == "LOGS_BASED_ALERT"
    assert by_name["prom uptime probe"]["ruleType"] == "promql_rule"


def test_query_filters(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    cases = [
        ("name = 'payment latency high'", {"payment latency high"}),
        ("name CONTAINS 'payment'", {"payment latency high", "payment gateway errors"}),
        # free text goes through LOWER() on both dialects, so a case mismatch must still match
        ("PAYMENT", {"payment latency high", "payment gateway errors"}),
        # free text also matches the description field
        ("blackbox", {"prom uptime probe"}),
        (f"created_by = '{USER_ADMIN_EMAIL}'", {r["alert"] for r in SEED_RULES}),
        ("created_at >= '2020-01-01T00:00:00Z'", {r["alert"] for r in SEED_RULES}),
        ("created_at < '2020-01-01T00:00:00Z'", set()),
        ("alert_type = 'LOGS_BASED_ALERT'", {"payment gateway errors"}),
        ("rule_type = 'promql_rule'", {"prom uptime probe"}),
        ("rule_type IN ['threshold_rule']", {"payment latency high", "payment gateway errors", "checkout conversion drop", "infra cpu saturation"}),
        ("labels.team = 'payments'", {"payment latency high", "payment gateway errors"}),
        ("labels.k8s.cluster = 'prod-1'", {"payment latency high"}),
        ("labels.team EXISTS", {"payment latency high", "payment gateway errors", "checkout conversion drop", "infra cpu saturation"}),
        ("labels.team NOT EXISTS", {"prom uptime probe"}),
        ("NOT (labels.team EXISTS)", {"prom uptime probe"}),
        (
            "(labels.team = 'payments' OR labels.team = 'infra') AND name NOT CONTAINS 'gateway'",
            {"payment latency high", "infra cpu saturation"},
        ),
    ]

    for query, expected_names in cases:
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"query": query},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"query {query!r}: {response.text}"
        data = response.json()["data"]
        assert {rule["alert"] for rule in data["rules"]} == expected_names, f"query {query!r}"
        assert data["total"] == len(expected_names), f"query {query!r}: total mismatch"


def test_label_missing_semantics(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    # A missing label uniformly evaluates as the empty string for value
    # operators; presence is expressed with EXISTS / NOT EXISTS.
    cases = [
        ("severity = ''", {"infra cpu saturation", "prom uptime probe"}),
        ("severity != ''", {"payment latency high", "payment gateway errors", "checkout conversion drop"}),
        ("severity != 'critical'", {"payment gateway errors", "checkout conversion drop", "infra cpu saturation", "prom uptime probe"}),
        ("severity EXISTS", {"payment latency high", "payment gateway errors", "checkout conversion drop"}),
        ("severity NOT EXISTS", {"infra cpu saturation", "prom uptime probe"}),
        ("severity = 'critical'", {"payment latency high"}),
        ("severity IN ['critical', 'warning']", {"payment latency high", "payment gateway errors"}),
        ("labels.team != 'payments'", {"checkout conversion drop", "infra cpu saturation", "prom uptime probe"}),
        ("labels.team NOT IN ['payments']", {"checkout conversion drop", "infra cpu saturation", "prom uptime probe"}),
        ("labels.team NOT CONTAINS 'pay'", {"checkout conversion drop", "infra cpu saturation", "prom uptime probe"}),
    ]

    for query, expected_names in cases:
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"query": query},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"query {query!r}: {response.text}"
        data = response.json()["data"]
        assert {rule["alert"] for rule in data["rules"]} == expected_names, f"query {query!r}"
        assert data["total"] == len(expected_names), f"query {query!r}: total mismatch"


def test_states_param(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    # No telemetry is seeded, so enabled rules sit at inactive and the one
    # disabled rule reads disabled, deterministic without waiting on evals.
    cases = [
        ({"states": ["disabled"]}, {"checkout conversion drop"}),
        ({"states": ["inactive"]}, {"payment latency high", "payment gateway errors", "infra cpu saturation", "prom uptime probe"}),
        ({"states": ["inactive", "disabled"]}, {r["alert"] for r in SEED_RULES}),
        ({"states": ["firing"]}, set()),
        ({"states": ["disabled"], "query": "labels.team = 'checkout'"}, {"checkout conversion drop"}),
        ({"states": ["disabled"], "query": "labels.team = 'payments'"}, set()),
    ]

    for params, expected_names in cases:
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"params {params!r}: {response.text}"
        data = response.json()["data"]
        assert {rule["alert"] for rule in data["rules"]} == expected_names, f"params {params!r}"
        assert data["total"] == len(expected_names), f"params {params!r}: total mismatch"


def test_sorting(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"sort": "name", "order": "asc"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert [rule["alert"] for rule in response.json()["data"]["rules"]] == [
        "checkout conversion drop",
        "infra cpu saturation",
        "payment gateway errors",
        "payment latency high",
        "prom uptime probe",
    ]

    # state display priority: inactive (rank 1) outranks disabled (rank 0);
    # the four inactive rules tie on state and must break on name asc
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"sort": "state", "order": "desc"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert [rule["alert"] for rule in response.json()["data"]["rules"]] == [
        "infra cpu saturation",
        "payment gateway errors",
        "payment latency high",
        "prom uptime probe",
        "checkout conversion drop",
    ]

    # asc flips the state buckets but the name tiebreak stays ascending
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"sort": "state", "order": "asc"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert [rule["alert"] for rule in response.json()["data"]["rules"]] == [
        "checkout conversion drop",
        "infra cpu saturation",
        "payment gateway errors",
        "payment latency high",
        "prom uptime probe",
    ]

    # severity: known ranks first (critical > warning), then custom values
    # lexically, then rules without severity tie and break on name asc
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"sort": "severity", "order": "desc"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert [rule["alert"] for rule in response.json()["data"]["rules"]] == [
        "payment latency high",
        "payment gateway errors",
        "checkout conversion drop",
        "infra cpu saturation",
        "prom uptime probe",
    ]

    for order in ("asc", "desc"):
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"sort": "created_at", "order": order},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        created_ats = [rule["createdAt"] for rule in response.json()["data"]["rules"]]
        assert created_ats == sorted(created_ats, reverse=order == "desc"), f"created_at {order} not monotonic"


def test_pagination(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    pages = []
    for offset in (0, 2, 4):
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"sort": "name", "order": "asc", "limit": 2, "offset": offset},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        data = response.json()["data"]
        assert data["total"] == 5, f"offset {offset}: total must stay the full filtered count"
        pages.append([rule["alert"] for rule in data["rules"]])

    assert [len(page) for page in pages] == [2, 2, 1]
    flattened = [name for page in pages for name in page]
    assert len(flattened) == len(set(flattened)), "pages must be disjoint"
    assert set(flattened) == {r["alert"] for r in SEED_RULES}

    # state sort is almost all ties (four inactive rules); the name/id tiebreak
    # must keep the pages disjoint and in the same order on every request
    tie_pages = []
    for offset in (0, 2, 4):
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params={"sort": "state", "order": "desc", "limit": 2, "offset": offset},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        tie_pages.append([rule["alert"] for rule in response.json()["data"]["rules"]])

    assert [name for page in tie_pages for name in page] == [
        "infra cpu saturation",
        "payment gateway errors",
        "payment latency high",
        "prom uptime probe",
        "checkout conversion drop",
    ], "tied rows must not shuffle between page requests"

    # a past-the-end offset returns an empty page but keeps the real total
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"limit": 2, "offset": 50},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["rules"] == []
    assert data["total"] == 5

    # an over-max limit is clamped, not rejected
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        params={"limit": 6000},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["total"] == 5


def test_error_contract(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    cases = [
        ({"query": "created_by ==== ((("}, "rule_list_filter_invalid", "invalid filter query:"),
        ({"query": "team = 'infra'"}, "rule_list_filter_invalid", 'unknown filter key "team"'),
        ({"query": "state = 'firing'"}, "rule_list_filter_invalid", 'unknown filter key "state"'),
        ({"query": "alert_type = 'bogus'"}, "rule_list_filter_invalid", "METRIC_BASED_ALERT"),
        ({"query": "name REGEXP 'x.*'"}, "rule_list_filter_invalid", "operator REGEXP is not allowed"),
        ({"query": "created_at >= 'yesterday'"}, "rule_list_filter_invalid", "invalid RFC3339 timestamp"),
        ({"query": "name LIKE 'prod\\\\'"}, "rule_list_filter_invalid", "must not end with an unescaped backslash"),
        ({"states": ["bogus"]}, "rule_list_invalid", 'invalid state "bogus"'),
        ({"sort": "bogus"}, "rule_list_invalid", "invalid sort"),
        ({"order": "bogus"}, "rule_list_invalid", "invalid order"),
        ({"limit": -1}, "rule_list_invalid", "invalid limit"),
        ({"offset": -1}, "rule_list_invalid", "invalid offset"),
    ]

    for params, expected_code, expected_message_part in cases:
        response = requests.get(
            signoz.self.host_configs["8080"].get(BASE_URL),
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST, f"params {params!r}: {response.text}"
        error = response.json()["error"]
        assert error["code"] == expected_code, f"params {params!r}"
        assert expected_message_part in error["message"], f"params {params!r}: {error['message']}"


def test_v2_list_still_serves_bare_array(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_alert_rule: Callable[[dict], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    delete_all_rules(signoz, token)
    ensure_notification_channel(signoz, token, {"name": "list-rules-v3-channel", "email_configs": [{"to": "list-rules-v3@integration.test"}]})
    for rule in SEED_RULES:
        create_alert_rule(rule)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/rules"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert isinstance(data, list), "deprecated v2 must keep returning a bare array"
    assert {rule["alert"] for rule in data} == {r["alert"] for r in SEED_RULES}
