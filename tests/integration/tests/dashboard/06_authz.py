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
    find_user_by_email,
)
from fixtures.role import transaction_group
from fixtures.types import Operation, SigNoz, TestContainerDocker

V2_BASE_URL = "/api/v2/dashboards"
MAX_LIST_LIMIT = 200

_EDITOR_EMAIL = "editor+dashboardauthz@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "viewer+dashboardauthz@integration.test"
_VIEWER_PASSWORD = "password123Z$"

_ACTOR_ROLE_NAME = "dashboard-fga-actor"
_ACTOR_EMAIL = "customrole+dashboardauthz@integration.test"
_ACTOR_PASSWORD = "password123Z$"

# Instance verbs are granted on _TARGET_A only; _TARGET_B must stay forbidden.
_TARGET_A = "dashboard-authz-target-a"
_TARGET_B = "dashboard-authz-target-b"
_CLONE_SOURCE = "dashboard-authz-clone-source"

_SPEC = {
    "display": {"name": "Dashboard Authz"},
    "duration": "1h",
    "links": [],
    "variables": [],
    "panels": {},
    "layouts": [],
}


# ─── managed roles (community-safe: no license, role gate only) ───────────────


def test_setup_managed_role_users(
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
        (_EDITOR_EMAIL, "EDITOR", _EDITOR_PASSWORD, "dashboard authz editor"),
        (_VIEWER_EMAIL, "VIEWER", _VIEWER_PASSWORD, "dashboard authz viewer"),
    ):
        if email not in existing_emails:
            create_active_user(signoz, admin_token, email=email, role=role, password=password, name=name)

    # (org_id, name) is unique, so leftovers from an earlier run have to go before
    # these are recreated.
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for dashboard in response.json()["data"]["dashboards"]:
        if dashboard["name"] in (_TARGET_A, _TARGET_B, _CLONE_SOURCE):
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{dashboard['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=5,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    for name in (_TARGET_A, _TARGET_B, _CLONE_SOURCE):
        response = requests.post(
            signoz.self.host_configs["8080"].get(V2_BASE_URL),
            json={"schemaVersion": "v6", "name": name, "spec": _SPEC, "tags": []},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text


def test_viewer_allowed_on_reads_and_pins(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids[_TARGET_A]}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/dashboards"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids[_TARGET_A]}/pins"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/me/dashboards/{ids[_TARGET_A]}/pins"),
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
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}
    target_id = ids[_TARGET_A]

    response = requests.post(
        signoz.self.host_configs["8080"].get(V2_BASE_URL),
        json={"schemaVersion": "v6", "name": "viewer-denied", "spec": _SPEC, "tags": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"create: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{target_id}"),
        json={"schemaVersion": "v6", "name": _TARGET_A, "spec": _SPEC, "tags": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"update: expected 403, got {response.status_code}: {response.text}"

    response = requests.patch(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{target_id}"),
        json=[{"op": "replace", "path": "/spec/display/name", "value": "Patched"}],
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"patch: expected 403, got {response.status_code}: {response.text}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{target_id}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"clone: expected 403, got {response.status_code}: {response.text}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{target_id}/migrate"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"migrate: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{target_id}/lock"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"lock: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{target_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"delete: expected 403, got {response.status_code}: {response.text}"


def test_editor_allowed_on_mutations(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids[_TARGET_A]}"),
        json={"schemaVersion": "v6", "name": _TARGET_A, "spec": _SPEC, "tags": [{"key": "team", "value": "pulse"}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids[_CLONE_SOURCE]}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    clone_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{clone_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_editor_forbidden_on_public_config(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    target_id = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}[_TARGET_A]

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        json={"timeRangeEnabled": True, "defaultTimeRange": "10m"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"create public: expected 403, got {response.status_code}: {response.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"read public: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        json={"timeRangeEnabled": False, "defaultTimeRange": "10m"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"update public: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"delete public: expected 403, got {response.status_code}: {response.text}"


# ─── per-object FGA scoping (enterprise, custom role) ─────────────────────────


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_setup_scoped_actor(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}

    create_role(
        admin_token,
        _ACTOR_ROLE_NAME,
        [
            transaction_group("read", "metaresource", "dashboard", [ids[_TARGET_A]]),
            transaction_group("list", "metaresource", "dashboard", ["*"]),
        ],
    )

    user_id = create_active_user(signoz, admin_token, email=_ACTOR_EMAIL, role="VIEWER", password=_ACTOR_PASSWORD, name="dashboard fga actor")
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_read_scoped_to_granted_dashboard(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids[_TARGET_A]}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, f"read granted dashboard: {response.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids[_TARGET_B]}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"read other dashboard: expected 403, got {response.status_code}: {response.text}"


def test_list_returns_every_dashboard(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    # list is collection-scoped: list on "*" returns every dashboard, including
    # the one the actor cannot read individually.
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    names = {dashboard["name"] for dashboard in response.json()["data"]["dashboards"]}
    assert {_TARGET_A, _TARGET_B} <= names


def test_publish_and_unpublish_require_update_on_the_dashboard(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_role_id = find_role_id(admin_token, _ACTOR_ROLE_NAME)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    target_id = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}[_TARGET_A]

    # public-dashboard create on "*" alone must not be enough to publish.
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "dashboard", [target_id]),
                transaction_group("list", "metaresource", "dashboard", ["*"]),
                transaction_group("create", "metaresource", "public-dashboard", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        json={"timeRangeEnabled": True, "defaultTimeRange": "10m"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"publish without dashboard update: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "dashboard", [target_id]),
                transaction_group("list", "metaresource", "dashboard", ["*"]),
                transaction_group("update", "metaresource", "dashboard", [target_id]),
                transaction_group("create", "metaresource", "public-dashboard", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        json={"timeRangeEnabled": True, "defaultTimeRange": "10m"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, f"publish with dashboard update: {response.text}"

    # Unpublishing takes the same pair: delete on public-dashboard alone is not enough.
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "dashboard", [target_id]),
                transaction_group("list", "metaresource", "dashboard", ["*"]),
                transaction_group("delete", "metaresource", "public-dashboard", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"unpublish without dashboard update: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "dashboard", [target_id]),
                transaction_group("list", "metaresource", "dashboard", ["*"]),
                transaction_group("update", "metaresource", "dashboard", [target_id]),
                transaction_group("delete", "metaresource", "public-dashboard", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{target_id}/public"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"unpublish with dashboard update: {response.text}"


def test_dashboard_authz_cleanup(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor = find_user_by_email(signoz, admin_token, _ACTOR_EMAIL)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{actor['id']}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    actor_entry = next((role for role in response.json()["data"] if role["name"] == _ACTOR_ROLE_NAME), None)
    if actor_entry is not None:
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{actor['id']}/roles/{actor_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_id(admin_token, _ACTOR_ROLE_NAME)}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"delete {_ACTOR_ROLE_NAME}: {response.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {dashboard["name"]: dashboard["id"] for dashboard in response.json()["data"]["dashboards"]}

    for name in (_TARGET_A, _TARGET_B, _CLONE_SOURCE):
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"{V2_BASE_URL}/{ids[name]}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT, f"delete {name}: {response.text}"
