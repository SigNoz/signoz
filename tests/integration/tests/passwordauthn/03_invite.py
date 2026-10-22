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
    find_user_with_roles_by_email,
)
from fixtures.role import find_role_by_name

_INVITED_EMAIL = "editor+invite@integration.test"
_INVITED_NAME = "invited editor"
_INVITED_PASSWORD = "password123Z$"
_REVOKED_EMAIL = "viewer+invite-revoked@integration.test"
_DUPLICATE_EMAIL = "duplicate+invite@integration.test"
_REINVITED_EMAIL = "reinvite+invite@integration.test"
_PROVISIONED_EMAIL = "admin+invite-provisioned@integration.test"
_PROVISIONED_NAME = "provisioned admin"
_PROVISIONED_PASSWORD = "password123Z$"


def test_invite(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _INVITED_EMAIL, "displayName": _INVITED_NAME, "userRoles": [{"id": find_role_by_name(signoz, admin_token, "signoz-editor")}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    found_user = find_user_with_roles_by_email(signoz, admin_token, _INVITED_EMAIL)
    assert found_user["status"] == "pending_invite"
    assert_user_has_role(found_user, "signoz-editor")

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": _INVITED_PASSWORD, "token": response.json()["data"]["token"]},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    assert get_token(_INVITED_EMAIL, _INVITED_PASSWORD) is not None

    found_user = find_user_with_roles_by_email(signoz, admin_token, _INVITED_EMAIL)
    assert found_user["status"] == "active"
    assert found_user["displayName"] == _INVITED_NAME
    assert found_user["email"] == _INVITED_EMAIL
    assert_user_has_role(found_user, "signoz-editor")


def test_revoke_invite(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _REVOKED_EMAIL, "userRoles": [{"id": find_role_by_name(signoz, admin_token, "signoz-viewer")}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    reset_token = response.json()["data"]["token"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password123Z$", "token": reset_token},
        timeout=5,
    )
    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_duplicate_invite_rejected(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    response = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _DUPLICATE_EMAIL, "userRoles": [{"id": editor_role_id}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _DUPLICATE_EMAIL, "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CONFLICT

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password123Z$", "token": response.json()["data"]["token"]},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _DUPLICATE_EMAIL, "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CONFLICT


def test_reinvite_deleted_user_creates_new_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    user_id = create_active_user(signoz, admin_token, email=_REINVITED_EMAIL, role="signoz-editor", password="password123Z$", name="reinvite user")

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    reinvited_user_id = create_active_user(signoz, admin_token, email=_REINVITED_EMAIL, role="signoz-viewer", password="newPassword123Z$", name="reinvite user v2")
    assert reinvited_user_id != user_id

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{reinvited_user_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert_user_has_role(response.json()["data"], "signoz-viewer")

    assert get_token(_REINVITED_EMAIL, "newPassword123Z$") is not None


def test_provisioned_admin_can_login(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    """Mirrors the zeus provisioning flow: invite an admin, activate, and log in with an explicit org id."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _PROVISIONED_EMAIL, "displayName": _PROVISIONED_NAME, "userRoles": [{"id": find_role_by_name(signoz, admin_token, "signoz-admin")}]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    reset_token = response.json()["data"]["token"]
    assert reset_token != ""

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": _PROVISIONED_PASSWORD, "token": reset_token},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={"email": _PROVISIONED_EMAIL, "ref": f"{signoz.self.host_configs['8080'].base()}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    org_id = response.json()["data"]["orgs"][0]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
        json={"email": _PROVISIONED_EMAIL, "password": _PROVISIONED_PASSWORD, "orgId": org_id},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["accessToken"] != ""

    provisioned_user = find_user_with_roles_by_email(signoz, admin_token, _PROVISIONED_EMAIL)
    assert provisioned_user["status"] == "active"
    assert provisioned_user["displayName"] == _PROVISIONED_NAME
    assert_user_has_role(provisioned_user, "signoz-admin")
