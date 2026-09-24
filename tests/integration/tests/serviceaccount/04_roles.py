from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.serviceaccount import (
    SERVICE_ACCOUNT_BASE,
    create_service_account,
    create_service_account_with_key,
    find_role_by_name,
)

logger = setup_logger(__name__)


def test_get_service_account_roles(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """GET /{id}/roles returns the assigned roles list."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-get-roles", role="signoz-viewer")

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 1
    role_names = [r["name"] for r in data]
    assert "signoz-viewer" in role_names


def test_assign_role_to_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """POST /service_account_roles adds a role alongside existing ones."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # create service account with viewer role
    service_account_id = create_service_account(signoz, token, "sa-assign-role", role="signoz-viewer")

    # assign editor role (additive — viewer stays)
    editor_role_id = find_role_by_name(signoz, token, "signoz-editor")
    assign_resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/service_account_roles"),
        json={"serviceAccountId": service_account_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert assign_resp.status_code == HTTPStatus.CREATED, assign_resp.text
    assert assign_resp.json()["data"]["id"]

    # verify both viewer and editor roles are present
    roles_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert roles_resp.status_code == HTTPStatus.OK, roles_resp.text
    role_names = [r["name"] for r in roles_resp.json()["data"]]
    assert len(role_names) == 2
    assert "signoz-viewer" in role_names
    assert "signoz-editor" in role_names

    # assign admin role — all three should be present
    admin_role_id = find_role_by_name(signoz, token, "signoz-admin")
    assign_resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/service_account_roles"),
        json={"serviceAccountId": service_account_id, "roleId": admin_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert assign_resp.status_code == HTTPStatus.CREATED, assign_resp.text

    roles_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert roles_resp.status_code == HTTPStatus.OK, roles_resp.text
    role_names = [r["name"] for r in roles_resp.json()["data"]]
    assert len(role_names) == 3
    assert "signoz-viewer" in role_names
    assert "signoz-editor" in role_names
    assert "signoz-admin" in role_names


def test_assign_role_idempotent(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """POST same role twice returns the same assignment (idempotent)."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-role-idempotent", role="signoz-viewer")

    viewer_role_id = find_role_by_name(signoz, token, "signoz-viewer")

    # assign the same role again
    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/service_account_roles"),
        json={"serviceAccountId": service_account_id, "roleId": viewer_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text

    # verify only one instance of the role
    roles_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    role_names = [r["name"] for r in roles_resp.json()["data"]]
    assert role_names.count("signoz-viewer") == 1


def test_assign_role_expands_access(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Adding a higher-privilege role expands the SA's access."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # create SA with viewer role and an API key
    service_account_id, api_key = create_service_account_with_key(signoz, token, "sa-role-expand-access", role="signoz-viewer")

    # viewer should get 403 on admin-only endpoint
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"Expected 403 for viewer on admin endpoint, got {resp.status_code}: {resp.text}"

    # assign admin role (additive — viewer stays)
    admin_role_id = find_role_by_name(signoz, token, "signoz-admin")
    assign_resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/service_account_roles"),
        json={"serviceAccountId": service_account_id, "roleId": admin_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert assign_resp.status_code == HTTPStatus.CREATED, assign_resp.text

    # SA should now have admin access
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"Expected 200 after adding admin role, got {resp.status_code}: {resp.text}"

    # verify both roles are present
    roles_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert roles_resp.status_code == HTTPStatus.OK, roles_resp.text
    role_names = [r["name"] for r in roles_resp.json()["data"]]
    assert len(role_names) == 2
    assert "signoz-admin" in role_names
    assert "signoz-viewer" in role_names


def test_remove_role_from_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """DELETE /service_account_roles/{id} revokes one role while keeping others."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-remove-role", role="signoz-editor")

    # add admin role (now has editor + admin)
    admin_role_id = find_role_by_name(signoz, token, "signoz-admin")
    assign_resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/service_account_roles"),
        json={"serviceAccountId": service_account_id, "roleId": admin_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert assign_resp.status_code == HTTPStatus.CREATED, assign_resp.text

    # find the editor assignment entry id from the service account detail
    detail_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert detail_resp.status_code == HTTPStatus.OK, detail_resp.text
    editor_entry_id = next(entry["id"] for entry in detail_resp.json()["data"]["serviceAccountRoles"] if entry["role"]["name"] == "signoz-editor")

    # remove editor role
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/service_account_roles/{editor_entry_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    # verify editor is gone but admin remains
    roles_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert roles_resp.status_code == HTTPStatus.OK, roles_resp.text
    role_names = [r["name"] for r in roles_resp.json()["data"]]
    assert "signoz-editor" not in role_names
    assert "signoz-admin" in role_names


def test_remove_role_verify_access_lost(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """After role removal, service account key gets 403 on endpoints requiring that role."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id, api_key = create_service_account_with_key(signoz, token, "sa-role-access-lost", role="signoz-admin")

    # verify admin access works
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text

    # find the admin assignment entry id from the service account detail
    detail_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert detail_resp.status_code == HTTPStatus.OK, detail_resp.text
    admin_entry_id = next(entry["id"] for entry in detail_resp.json()["data"]["serviceAccountRoles"] if entry["role"]["name"] == "signoz-admin")

    # remove admin role
    del_resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/service_account_roles/{admin_entry_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert del_resp.status_code == HTTPStatus.NO_CONTENT, del_resp.text

    # now admin endpoint should be forbidden
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"Expected 403 after role removal, got {resp.status_code}: {resp.text}"
