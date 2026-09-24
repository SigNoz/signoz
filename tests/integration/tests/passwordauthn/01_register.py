from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_EDITOR_EMAIL,
    USER_EDITOR_NAME,
    USER_EDITOR_PASSWORD,
    USER_VIEWER_EMAIL,
    assert_user_has_role,
    find_user_with_roles_by_email,
)
from fixtures.logger import setup_logger
from fixtures.role import find_role_by_name

logger = setup_logger(__name__)


def test_register_with_invalid_input(signoz: types.SigNoz) -> None:
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": "admin@integration.test",
            "password": "password",  # invalid password
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": "admin",  # invalid email
            "password": "password123Z$",
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_register(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is False

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": USER_ADMIN_EMAIL,
            "password": USER_ADMIN_PASSWORD,
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is True

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Verify admin user exists via v2
    found_user = find_user_with_roles_by_email(signoz, admin_token, USER_ADMIN_EMAIL)
    assert_user_has_role(found_user, "signoz-admin")


def test_invite(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    # Create the editor user as a pending invite
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json={
            "email": USER_EDITOR_EMAIL,
            "displayName": USER_EDITOR_NAME,
            "userRoles": [{"id": find_role_by_name(signoz, admin_token, "signoz-editor")}],
        },
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    # Verify the user appears in the users list but as pending_invite status
    found_user = find_user_with_roles_by_email(signoz, admin_token, USER_EDITOR_EMAIL)
    assert found_user["status"] == "pending_invite"
    assert_user_has_role(found_user, "signoz-editor")

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text

    # Reset the password to complete the invite flow (activates the user and also grants authz)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": USER_EDITOR_PASSWORD, "token": response.json()["data"]["token"]},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify the user can now log in
    editor_token = get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)
    assert editor_token is not None

    # Verify that the editor user status has been updated to ACTIVE
    admin_token_fresh = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = find_user_with_roles_by_email(signoz, admin_token_fresh, USER_EDITOR_EMAIL)

    assert_user_has_role(found_user, "signoz-editor")
    assert found_user["displayName"] == USER_EDITOR_NAME
    assert found_user["email"] == USER_EDITOR_EMAIL
    assert found_user["status"] == "active"


def test_revoke_invite(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Invite the viewer user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json={
            "email": USER_VIEWER_EMAIL,
            "userRoles": [{"id": find_role_by_name(signoz, admin_token, "signoz-viewer")}],
        },
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    reset_token = response.json()["data"]["token"]

    # Delete the pending invite user (revoke the invite)
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try to use the reset token — should fail (user deleted)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password123Z$", "token": reset_token},
        timeout=2,
    )
    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_provision_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    """Mirrors the zeus provisioning flow."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    provisioned_email = "zeus-provisioned@integration.test"
    provisioned_name = "zeus provisioned user"
    provisioned_password = "password123Z$"

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    role_id = next(role["id"] for role in response.json()["data"] if role["name"] == "signoz-admin")

    create_payload = {
        "email": provisioned_email,
        "displayName": provisioned_name,
        "userRoles": [{"id": role_id}],
    }
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json=create_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    user_id = response.json()["data"]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        json=create_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CONFLICT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    existing_id = next(user["id"] for user in response.json()["data"] if user["email"] == provisioned_email.strip().lower())
    assert existing_id == user_id

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    reset_token = response.json()["data"]["token"]
    assert reset_token != ""

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": provisioned_password, "token": reset_token},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={"email": provisioned_email, "ref": f"{signoz.self.host_configs['8080'].base()}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    org_id = response.json()["data"]["orgs"][0]["id"]

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/email_password"),
        json={"email": provisioned_email, "password": provisioned_password, "orgId": org_id},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["accessToken"] != ""

    provisioned_user = find_user_with_roles_by_email(signoz, admin_token, provisioned_email)
    assert provisioned_user["status"] == "active"
    assert provisioned_user["displayName"] == provisioned_name
    assert_user_has_role(provisioned_user, "signoz-admin")
