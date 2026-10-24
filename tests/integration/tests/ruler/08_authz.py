from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.resources.mappings import Mapping

from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
)
from fixtures.role import find_role_by_name, transaction_group
from fixtures.types import Operation, SigNoz, TestContainerDocker

V2_RULES_URL = "/api/v2/rules"
V3_RULES_URL = "/api/v3/rules"
RULE_VIEWS_URL = "/api/v2/rule_views"
DOWNTIME_URL = "/api/v1/downtime_schedules"
ROUTE_POLICIES_URL = "/api/v1/route_policies"

_EDITOR_EMAIL = "editor+alertauthz@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "viewer+alertauthz@integration.test"
_VIEWER_PASSWORD = "password123Z$"
_ACTOR_EMAIL = "actor+alertauthz@integration.test"
_ACTOR_PASSWORD = "password123Z$"
_ACTOR_ROLE_NAME = "alert-authz-actor"

_TARGET_RULE = "alert authz target"
_VIEW_NAME = "alert-authz-view"
_DOWNTIME_NAME = "alert-authz-downtime"
_ACTOR_DOWNTIME_NAME = "alert-authz-actor-downtime"
_ROUTE_POLICY_NAME = "alert-authz-route-policy"
_ACTOR_ROUTE_POLICY_NAME = "alert-authz-actor-route-policy"

SEED_CHANNEL = {"name": "alert-authz-channel", "email_configs": [{"to": "alert-authz@integration.test"}]}
SEED_CHANNEL_ALT = {"name": "alert-authz-channel-alt", "email_configs": [{"to": "alert-authz-alt@integration.test"}]}

ROUTE_POLICY_TEMPLATE = {"expression": 'threshold.name == "critical"', "channels": [SEED_CHANNEL["name"]], "description": "authz coverage policy"}

RULE_CONDITION = {
    "thresholds": {
        "kind": "basic",
        "spec": [{"name": "critical", "target": 90, "matchType": "at_least_once", "op": "above", "channels": [SEED_CHANNEL["name"]]}],
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

DOWNTIME_SCHEDULE = {"timezone": "UTC", "startTime": "2026-09-21T00:00:00Z", "endTime": "2026-09-22T00:00:00Z"}

_ACTOR_BASE_TRANSACTION_GROUPS = [
    transaction_group("create", "metaresource", "route-policy", ["*"]),
    transaction_group("read", "metaresource", "route-policy", ["*"]),
    transaction_group("list", "metaresource", "route-policy", ["*"]),
    transaction_group("update", "metaresource", "route-policy", ["*"]),
    transaction_group("delete", "metaresource", "route-policy", ["*"]),
    transaction_group("attach", "metaresource", "route-policy", ["*"]),
    transaction_group("detach", "metaresource", "route-policy", ["*"]),
    transaction_group("create", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("read", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("list", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("update", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("delete", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("attach", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("detach", "metaresource", "planned-maintenance", ["*"]),
    transaction_group("attach", "metaresource", "rule", ["*"]),
]


def test_setup_users_and_channels(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    existing_channel_names = [channel["name"] for channel in response.json()["data"] or []]
    for channel in (SEED_CHANNEL, SEED_CHANNEL_ALT):
        if channel["name"] not in existing_channel_names:
            response = requests.post(
                signoz.self.host_configs["8080"].get("/api/v1/channels"),
                json=channel,
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.CREATED, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for policy in response.json()["data"] or []:
        if policy["name"] in (_ROUTE_POLICY_NAME, _ACTOR_ROUTE_POLICY_NAME):
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for rule in response.json()["data"]["rules"]:
        if rule["alert"] == _TARGET_RULE:
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{V2_RULES_URL}/{rule['id']}"),
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

    response = requests.post(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ROUTE_POLICY_NAME},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text


def test_viewer_and_editor_allowed_on_route_policy_reads(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    for email, password in ((_VIEWER_EMAIL, _VIEWER_PASSWORD), (_EDITOR_EMAIL, _EDITOR_PASSWORD)):
        token = get_token(email, password)

        response = requests.get(
            signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"{email}: {response.text}"
        policy_id = {policy["name"]: policy["id"] for policy in response.json()["data"]}[_ROUTE_POLICY_NAME]

        response = requests.get(
            signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"{email}: {response.text}"


def test_viewer_and_editor_forbidden_on_route_policy_writes(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    policy_id = {policy["name"]: policy["id"] for policy in response.json()["data"]}[_ROUTE_POLICY_NAME]

    for email, password in ((_VIEWER_EMAIL, _VIEWER_PASSWORD), (_EDITOR_EMAIL, _EDITOR_PASSWORD)):
        token = get_token(email, password)
        for method, path in (
            ("post", ROUTE_POLICIES_URL),
            ("put", f"{ROUTE_POLICIES_URL}/{policy_id}"),
            ("delete", f"{ROUTE_POLICIES_URL}/{policy_id}"),
        ):
            response = getattr(requests, method)(
                signoz.self.host_configs["8080"].get(path),
                json={**ROUTE_POLICY_TEMPLATE, "name": _ROUTE_POLICY_NAME},
                headers={"Authorization": f"Bearer {token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} {method.upper()} {path}: expected 403, got {response.status_code}: {response.text}"


def test_admin_allowed_on_route_policy_writes(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    policy_id = {policy["name"]: policy["id"] for policy in response.json()["data"]}[_ROUTE_POLICY_NAME]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ROUTE_POLICY_NAME, "channels": [SEED_CHANNEL_ALT["name"]]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["channels"] == [SEED_CHANNEL_ALT["name"]]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_route_policy_naming_unknown_channel_rejected(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ROUTE_POLICY_NAME, "channels": ["alert-authz-channel-missing"]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_editor_allowed_on_downtime_mutations(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={"name": _DOWNTIME_NAME, "description": "authz coverage window", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    downtime_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        json={"name": _DOWNTIME_NAME, "description": "authz coverage window updated", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
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


def test_editor_allowed_on_downtime_naming_rules(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    target_id = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}[_TARGET_RULE]

    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={"name": _DOWNTIME_NAME, "description": "authz coverage window with rules", "schedule": DOWNTIME_SCHEDULE, "alertIds": [target_id]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    downtime_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        json={"name": _DOWNTIME_NAME, "description": "authz coverage window without rules", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
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


def test_viewer_allowed_on_downtime_reads_and_forbidden_on_writes(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={"name": _DOWNTIME_NAME, "description": "authz coverage window", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    downtime_id = response.json()["data"]["id"]

    for path in (DOWNTIME_URL, f"{DOWNTIME_URL}/{downtime_id}"):
        response = requests.get(
            signoz.self.host_configs["8080"].get(path),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, f"GET {path}: expected 200, got {response.status_code}: {response.text}"

    for method, path in (
        ("post", DOWNTIME_URL),
        ("put", f"{DOWNTIME_URL}/{downtime_id}"),
        ("delete", f"{DOWNTIME_URL}/{downtime_id}"),
    ):
        response = getattr(requests, method)(
            signoz.self.host_configs["8080"].get(path),
            json={"name": _DOWNTIME_NAME, "description": "authz coverage window", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{method.upper()} {path}: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_viewer_allowed_on_rule_views(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
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

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{RULE_VIEWS_URL}/{view_id}"),
        json={"name": _VIEW_NAME, "data": {"version": "v1", "sort": "updated_at", "order": "asc"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{RULE_VIEWS_URL}/{view_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
):
    add_license(signoz, make_http_mocks, get_token)


def test_setup_channel_scoped_actor(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    existing_role_ids = {role["name"]: role["id"] for role in response.json()["data"]}

    if _ACTOR_ROLE_NAME in existing_role_ids:
        response = requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v1/roles/{existing_role_ids[_ACTOR_ROLE_NAME]}"),
            json={"description": "", "transactionGroups": _ACTOR_BASE_TRANSACTION_GROUPS},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, response.text
    else:
        create_role(admin_token, _ACTOR_ROLE_NAME, _ACTOR_BASE_TRANSACTION_GROUPS)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    if _ACTOR_EMAIL not in {user["email"] for user in response.json()["data"]}:
        user_id = create_active_user(signoz, admin_token, email=_ACTOR_EMAIL, role="signoz-viewer", password=_ACTOR_PASSWORD, name="alert authz actor")
        change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_route_policy_naming_channel_forbidden_without_channel_attach(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ACTOR_ROUTE_POLICY_NAME},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text


def test_route_policy_channel_changes_follow_channel_attach_and_detach(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": _ACTOR_BASE_TRANSACTION_GROUPS + [transaction_group("attach", "metaresource", "notification-channel", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ACTOR_ROUTE_POLICY_NAME},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    policy_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ACTOR_ROUTE_POLICY_NAME, "channels": [SEED_CHANNEL["name"], SEED_CHANNEL_ALT["name"]]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ACTOR_ROUTE_POLICY_NAME, "channels": [SEED_CHANNEL_ALT["name"]]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": _ACTOR_BASE_TRANSACTION_GROUPS + [transaction_group("attach", "metaresource", "notification-channel", ["*"]), transaction_group("detach", "metaresource", "notification-channel", ["*"])],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        json={**ROUTE_POLICY_TEMPLATE, "name": _ACTOR_ROUTE_POLICY_NAME, "channels": [SEED_CHANNEL_ALT["name"]]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["channels"] == [SEED_CHANNEL_ALT["name"]]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_rule_views_forbidden_without_rule_list(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(RULE_VIEWS_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(RULE_VIEWS_URL),
        json={"name": _VIEW_NAME, "data": {"version": "v1", "sort": "updated_at", "order": "desc"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text


def test_downtime_naming_rule_forbidden_without_rule_attach(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    target_id = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}[_TARGET_RULE]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": [group for group in _ACTOR_BASE_TRANSACTION_GROUPS if group != transaction_group("attach", "metaresource", "rule", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={"name": _ACTOR_DOWNTIME_NAME, "description": "scoped actor window", "schedule": DOWNTIME_SCHEDULE, "alertIds": [target_id]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": _ACTOR_BASE_TRANSACTION_GROUPS},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_downtime_rule_removal_forbidden_without_rule_detach(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    target_id = {rule["alert"]: rule["id"] for rule in response.json()["data"]["rules"]}[_TARGET_RULE]

    response = requests.post(
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        json={"name": _ACTOR_DOWNTIME_NAME, "description": "scoped actor window", "schedule": DOWNTIME_SCHEDULE, "alertIds": [target_id]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    downtime_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        json={"name": _ACTOR_DOWNTIME_NAME, "description": "scoped actor window without rules", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        json={"name": _ACTOR_DOWNTIME_NAME, "description": "scoped actor window still with rules", "schedule": DOWNTIME_SCHEDULE, "alertIds": [target_id]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
        json={"name": _ACTOR_DOWNTIME_NAME, "description": "scoped actor window without rules", "schedule": DOWNTIME_SCHEDULE, "alertIds": []},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{downtime_id}"),
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
        signoz.self.host_configs["8080"].get(DOWNTIME_URL),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for schedule in response.json()["data"] or []:
        if schedule["name"] in (_DOWNTIME_NAME, _ACTOR_DOWNTIME_NAME):
            response = requests.put(
                signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{schedule['id']}"),
                json={"name": schedule["name"], "description": schedule["description"], "schedule": schedule["schedule"], "alertIds": []},
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{DOWNTIME_URL}/{schedule['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V3_RULES_URL}?limit=200"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for rule in response.json()["data"]["rules"]:
        if rule["alert"] == _TARGET_RULE:
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{V2_RULES_URL}/{rule['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get(ROUTE_POLICIES_URL),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for policy in response.json()["data"] or []:
        if policy["name"] in (_ROUTE_POLICY_NAME, _ACTOR_ROUTE_POLICY_NAME):
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{ROUTE_POLICIES_URL}/{policy['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/channels"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for channel in response.json()["data"] or []:
        if channel["name"] in (SEED_CHANNEL["name"], SEED_CHANNEL_ALT["name"]):
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"/api/v1/channels/{channel['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, f"delete channel: {response.text}"
