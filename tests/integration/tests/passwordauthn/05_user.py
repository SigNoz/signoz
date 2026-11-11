from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USERS_BASE,
    assert_user_has_role,
    create_active_user,
    find_user_by_email,
    find_user_with_roles_by_email,
)

_EDITOR_EMAIL = "editor+user@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_SELF_ADMIN_EMAIL = "admin+user-self@integration.test"
_SELF_ADMIN_PASSWORD = "password123Z$"
_DELETED_EMAIL = "deleted+user@integration.test"
_DELETED_PASSWORD = "password123Z$"


def test_setup_users(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    create_active_user(signoz, admin_token, email=_EDITOR_EMAIL, role="signoz-editor", password=_EDITOR_PASSWORD, name="user editor")
    create_active_user(signoz, admin_token, email=_SELF_ADMIN_EMAIL, role="signoz-admin", password=_SELF_ADMIN_PASSWORD, name="self admin")


def test_list_users(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.OK
    users = {user["email"]: user for user in response.json()["data"]}

    assert users[USER_ADMIN_EMAIL]["isRoot"] is True
    assert users[USER_ADMIN_EMAIL]["status"] == "active"
    assert users[_EDITOR_EMAIL]["isRoot"] is False
    assert users[_EDITOR_EMAIL]["status"] == "active"


def test_get_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor = find_user_with_roles_by_email(signoz, admin_token, _EDITOR_EMAIL)
    assert editor["email"] == _EDITOR_EMAIL
    assert editor["status"] == "active"
    assert_user_has_role(editor, "signoz-editor")


def test_get_my_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    editor_token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)
    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"), headers={"Authorization": f"Bearer {editor_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]
    assert data["email"] == _EDITOR_EMAIL
    assert data["isRoot"] is False
    assert_user_has_role(data, "signoz-editor")


def test_update_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor_id = find_user_by_email(signoz, admin_token, _EDITOR_EMAIL)["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{editor_id}"),
        json={"displayName": "updated editor"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT
    assert find_user_by_email(signoz, admin_token, _EDITOR_EMAIL)["displayName"] == "updated editor"


def test_update_my_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    editor_token = get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"),
        json={"displayName": "self updated editor"},
        headers={"Authorization": f"Bearer {editor_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"), headers={"Authorization": f"Bearer {editor_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["displayName"] == "self updated editor"


def test_admin_can_update_self_via_id(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    self_admin_id = find_user_by_email(signoz, admin_token, _SELF_ADMIN_EMAIL)["id"]
    self_admin_token = get_token(_SELF_ADMIN_EMAIL, _SELF_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{self_admin_id}"),
        json={"displayName": "self admin updated"},
        headers={"Authorization": f"Bearer {self_admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"), headers={"Authorization": f"Bearer {self_admin_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["displayName"] == "self admin updated"


def test_root_user_is_immutable(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    root_id = find_user_by_email(signoz, admin_token, USER_ADMIN_EMAIL)["id"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{root_id}"), json={"displayName": "should fail"}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NOT_IMPLEMENTED, response.text

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{root_id}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NOT_IMPLEMENTED, response.text

    response = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{root_id}/reset_password_tokens"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NOT_IMPLEMENTED, response.text


def test_delete_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    user_id = create_active_user(signoz, admin_token, email=_DELETED_EMAIL, role="signoz-viewer", password=_DELETED_PASSWORD, name="deleted user")
    user_token = get_token(_DELETED_EMAIL, _DELETED_PASSWORD)

    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"), headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.OK

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["status"] == "deleted"
    assert response.json()["data"]["userRoles"] == []

    assert find_user_by_email(signoz, admin_token, _DELETED_EMAIL)["status"] == "deleted"

    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/me"), headers={"Authorization": f"Bearer {user_token}"}, timeout=5)
    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_editor_cannot_manage_other_users(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    root_id = find_user_by_email(signoz, admin_token, USER_ADMIN_EMAIL)["id"]
    headers = {"Authorization": f"Bearer {get_token(_EDITOR_EMAIL, _EDITOR_PASSWORD)}"}

    response = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{root_id}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{root_id}"), json={"displayName": "hacked"}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{root_id}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN
