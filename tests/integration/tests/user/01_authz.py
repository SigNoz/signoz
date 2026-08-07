from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USERS_BASE,
    create_active_user,
)

_EDITOR_EMAIL = "userauthz+editor@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "userauthz+viewer@integration.test"
_VIEWER_PASSWORD = "password123Z$"
_TARGET_EMAIL = "userauthz+target@integration.test"


def test_setup_users(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_active_user(
        signoz,
        admin_token,
        email=_EDITOR_EMAIL,
        role="EDITOR",
        password=_EDITOR_PASSWORD,
        name="user-authz-editor",
    )
    create_active_user(
        signoz,
        admin_token,
        email=_VIEWER_EMAIL,
        role="VIEWER",
        password=_VIEWER_PASSWORD,
        name="user-authz-viewer",
    )


def test_admin_allowed_on_all_routes(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")
    editor_role_id = find_role_id(admin_token, "signoz-editor")

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"displayName": "user-authz-target", "email": _TARGET_EMAIL, "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    target_id = resp.json()["data"]["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    assert target_id in {user["id"] for user in resp.json()["data"]}

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"),
        json={"displayName": "user-authz-target-renamed"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text

    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/roles/{viewer_role_id}/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": target_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    user_role_id = resp.json()["data"]["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_editor_and_viewer_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor_role_id = find_role_id(admin_token, "signoz-editor")
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    viewer_user_id = next(user["id"] for user in resp.json()["data"] if user["email"] == _VIEWER_EMAIL)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": viewer_user_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text
    user_role_id = resp.json()["data"]["id"]

    for email, password in ((_EDITOR_EMAIL, _EDITOR_PASSWORD), (_VIEWER_EMAIL, _VIEWER_PASSWORD)):
        token = get_token(email, password)

        resp = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} list users: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.post(
            signoz.self.host_configs["8080"].get(USERS_BASE),
            json={"displayName": "nope", "email": "userauthz+nope@integration.test", "userRoles": [{"id": viewer_role_id}]},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} create user: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{viewer_user_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} get user: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.put(
            signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{viewer_user_id}"),
            json={"displayName": "nope"},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} update user: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{viewer_user_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} delete user: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.get(
            signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{viewer_user_id}/reset_password_tokens"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} get reset token: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.put(
            signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{viewer_user_id}/reset_password_tokens"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} create reset token: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{viewer_user_id}/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} get user roles: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.get(
            signoz.self.host_configs["8080"].get(f"/api/v2/roles/{viewer_role_id}/users"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} get users by role: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
            json={"userId": viewer_user_id, "roleId": editor_role_id},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} create user role: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} get user role: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} delete user role: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_me_routes_stay_open(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(_VIEWER_EMAIL, _VIEWER_PASSWORD)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"),
        json={"displayName": "user-authz-viewer"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text
