from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    create_active_user,
)
from fixtures.notification_channel import ensure_notification_channel
from fixtures.types import Operation, SigNoz

V1_RULES_URL = "/api/v1/rules"
V2_RULES_URL = "/api/v2/rules"
V3_RULES_URL = "/api/v3/rules"
RULE_VIEWS_URL = "/api/v2/rule_views"
DOWNTIME_URL = "/api/v1/downtime_schedules"
ROUTE_POLICIES_URL = "/api/v1/route_policies"

_EDITOR_EMAIL = "editor+alertauthz@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "viewer+alertauthz@integration.test"
_VIEWER_PASSWORD = "password123Z$"

_TARGET_RULE = "alert authz target"
_EDITOR_RULE = "alert authz editor rule"
_EDITOR_RULE_V1 = "alert authz editor rule v1"
_DOWNTIME_NAME = "alert-authz-downtime"
_ROUTE_POLICY_NAME = "alert-authz-route-policy"
_VIEW_NAME = "alert-authz-view"

SEED_CHANNEL = {"name": "alert-authz-channel", "email_configs": [{"to": "alert-authz@integration.test"}]}

RULE_CONDITION = {
    "thresholds": {
        "kind": "basic",
        "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": ["alert-authz-channel"]}],
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
                    "aggregations": [{"metricName": "alert_authz_cpu", "timeAggregation": "avg", "spaceAggregation": "max"}],
                },
            }
        ],
    },
    "selectedQueryName": "A",
}


RULE_TEMPLATE = {
    "description": "authz coverage rule",
    "alertType": "METRIC_BASED_ALERT",
    "ruleType": "threshold_rule",
    "condition": RULE_CONDITION,
    "labels": {"severity": "critical"},
    "annotations": {"summary": "s", "description": "d"},
    "evaluation": {"kind": "rolling", "spec": {"evalWindow": "5m0s", "frequency": "1m"}},
    "notificationSettings": {"groupBy": [], "usePolicy": False, "renotify": {"enabled": False, "interval": "30m", "alertStates": []}},
    "version": "v5",
    "schemaVersion": "v2alpha1",
}


def test_setup_users_and_target(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # A rerun against a --reuse stack starts from the previous run's state, and
    # inviting an existing address fails, so only invite what is missing.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    existing_emails = {user["email"] for user in response.json()["data"]}

    for email, role, password, name in (
        (_EDITOR_EMAIL, "signoz-editor", _EDITOR_PASSWORD, "alert authz editor"),
        (_VIEWER_EMAIL, "signoz-viewer", _VIEWER_PASSWORD, "alert authz viewer"),
    ):
        if email not in existing_emails:
            create_active_user(signoz, admin_token, email=email, role=role, password=password, name=name)

    ensure_notification_channel(signoz, admin_token, SEED_CHANNEL)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}
    for name in (_TARGET_RULE, _EDITOR_RULE, _EDITOR_RULE_V1):
        if name in ids:
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{V2_RULES_URL}/{ids[name]}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_RULES_URL),
        json={**RULE_TEMPLATE, "alert": _TARGET_RULE},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text


def test_viewer_allowed_on_reads(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}
    target_id = ids[_TARGET_RULE]

    for path in (
        V2_RULES_URL,
        f"{V2_RULES_URL}/{target_id}",
        V1_RULES_URL,
        f"{V1_RULES_URL}/{target_id}",
        DOWNTIME_URL,
        ROUTE_POLICIES_URL,
    ):
        response = requests.get(
            signoz.self.host_configs["8080"].get(path),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"GET {path}: expected 200, got {response.status_code}: {response.text}"


def test_viewer_allowed_on_rule_views(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    # Rule views ride on the rule list verb, which a viewer holds, so the whole
    # CRUD surface is open to them.
    token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(RULE_VIEWS_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(RULE_VIEWS_URL),
        json={"name": _VIEW_NAME, "data": {"version": "v1", "sort": "updated_at", "order": "desc"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    view_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{RULE_VIEWS_URL}/{view_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_viewer_forbidden_on_mutations(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}
    target_id = ids[_TARGET_RULE]

    # Authz runs before body parsing, so an empty body still proves the 403.
    for method, path in (
        ("post", V2_RULES_URL),
        ("put", f"{V2_RULES_URL}/{target_id}"),
        ("patch", f"{V2_RULES_URL}/{target_id}"),
        ("delete", f"{V2_RULES_URL}/{target_id}"),
        ("post", f"{V2_RULES_URL}/test"),
        ("post", V1_RULES_URL),
        ("put", f"{V1_RULES_URL}/{target_id}"),
        ("patch", f"{V1_RULES_URL}/{target_id}"),
        ("delete", f"{V1_RULES_URL}/{target_id}"),
        ("post", "/api/v1/testRule"),
        ("post", DOWNTIME_URL),
        ("put", f"{DOWNTIME_URL}/{target_id}"),
        ("delete", f"{DOWNTIME_URL}/{target_id}"),
        ("post", ROUTE_POLICIES_URL),
        ("put", f"{ROUTE_POLICIES_URL}/{target_id}"),
        ("delete", f"{ROUTE_POLICIES_URL}/{target_id}"),
    ):
        response = getattr(requests, method)(
            signoz.self.host_configs["8080"].get(path),
            json={},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{method.upper()} {path}: expected 403, got {response.status_code}: {response.text}"


def test_editor_allowed_on_rule_and_downtime_mutations(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_RULES_URL),
        json={**RULE_TEMPLATE, "alert": _EDITOR_RULE},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    rule_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{V2_RULES_URL}/{rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(V1_RULES_URL),
        json={**RULE_TEMPLATE, "alert": _EDITOR_RULE_V1},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    v1_rule_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{V1_RULES_URL}/{v1_rule_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={
            "name": _DOWNTIME_NAME,
            "description": "authz coverage window",
            "schedule": {"timezone": "UTC", "startTime": "2026-09-21T00:00:00Z", "endTime": "2026-09-22T00:00:00Z"},
            "alertIds": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    downtime_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        json={
            "name": _DOWNTIME_NAME,
            "description": "authz coverage window updated",
            "schedule": {"timezone": "UTC", "startTime": "2026-09-21T00:00:00Z", "endTime": "2026-09-23T00:00:00Z"},
            "alertIds": [],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_editor_forbidden_on_route_policy_writes(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    for method, path in (
        ("post", ROUTE_POLICIES_URL),
        ("put", f"{ROUTE_POLICIES_URL}/00000000-0000-0000-0000-000000000000"),
        ("delete", f"{ROUTE_POLICIES_URL}/00000000-0000-0000-0000-000000000000"),
    ):
        response = getattr(requests, method)(
            signoz.self.host_configs["8080"].get(path),
            json={},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{method.upper()} {path}: expected 403, got {response.status_code}: {response.text}"


def test_admin_allowed_on_route_policy_writes(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        json={
            "name": _ROUTE_POLICY_NAME,
            "expression": 'threshold.name == "critical"',
            "channels": ["alert-authz-channel"],
            "description": "authz coverage policy",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    policy_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_alert_authz_cleanup(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}
    for name in (_TARGET_RULE, _EDITOR_RULE, _EDITOR_RULE_V1):
        if name in ids:
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{V2_RULES_URL}/{ids[name]}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, f"delete {name}: {response.text}"
