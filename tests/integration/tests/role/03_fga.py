"""Tests for resource-level FGA on role endpoints.

Validates that a custom role with specific role permissions gets exactly
the access it was granted — read/list allowed, create/update/delete forbidden
until explicitly granted, and revocation removes access.
"""

from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
    find_user_by_email,
)
from fixtures.role import (
    ROLES_BASE,
    create_custom_role,
    delete_custom_role,
    find_role_by_name,
    object_group,
    patch_role_objects,
)

ROLE_FGA_CUSTOM_ROLE_NAME = "role-fga-readonly"
ROLE_FGA_CUSTOM_USER_EMAIL = "customrole+rolefga@integration.test"
ROLE_FGA_CUSTOM_USER_PASSWORD = "password123Z$"


# ---------------------------------------------------------------------------
# 1. Apply license (required for custom role CRUD)
# ---------------------------------------------------------------------------


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


# ---------------------------------------------------------------------------
# 2. Create custom role + user with read/list on roles
# ---------------------------------------------------------------------------


def test_create_custom_role_for_role_fga(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create the custom role.
    role_id = create_custom_role(signoz, admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)

    # Grant read on role instances.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "read",
        additions=[
            object_group("role", "role", ["*"]),
        ],
    )

    # Grant list on role collection.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "list",
        additions=[
            object_group("role", "role", ["*"]),
        ],
    )

    # Create the custom-role user: invite as VIEWER, activate, change role.
    user_id = create_active_user(
        signoz,
        admin_token,
        email=ROLE_FGA_CUSTOM_USER_EMAIL,
        role="VIEWER",
        password=ROLE_FGA_CUSTOM_USER_PASSWORD,
        name="role-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", ROLE_FGA_CUSTOM_ROLE_NAME)


# ---------------------------------------------------------------------------
# 3. Read-only access: allowed operations
# ---------------------------------------------------------------------------


def test_role_readonly_allowed_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)
    target_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # List roles.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(ROLES_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"list roles: {resp.text}"

    # Get role.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{target_role_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"get role: {resp.text}"

    # Get objects for role.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{target_role_id}/relations/read/objects"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"get role objects: {resp.text}"


# ---------------------------------------------------------------------------
# 4. Read-only access: forbidden operations
# ---------------------------------------------------------------------------


def test_role_readonly_forbidden_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)
    target_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # Create role — forbidden.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(ROLES_BASE),
        json={"name": "role-fga-should-fail"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create role: expected 403, got {resp.status_code}: {resp.text}"

    # Patch role — forbidden.
    resp = requests.patch(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{target_role_id}"),
        json={"description": "role-fga-renamed"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"patch role: expected 403, got {resp.status_code}: {resp.text}"

    # Patch objects — forbidden.
    resp = requests.patch(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{target_role_id}/relations/read/objects"),
        json={"additions": [object_group("metaresource", "dashboard", ["*"])]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"patch objects: expected 403, got {resp.status_code}: {resp.text}"

    # Delete role — forbidden (cannot delete managed role, but auth check comes first).
    # Use the custom role itself as target (non-managed, but user lacks delete permission).
    custom_role_id = find_role_by_name(signoz, admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{custom_role_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"delete role: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 5. Grant write permissions, verify access opens up
# ---------------------------------------------------------------------------


def test_role_grant_write_permissions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)

    # Grant create, update, delete on roles.
    for verb in ("create", "update", "delete"):
        patch_role_objects(
            signoz,
            admin_token,
            role_id,
            verb,
            additions=[object_group("role", "role", ["*"])],
        )

    custom_token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)

    # Create role — now allowed.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(ROLES_BASE),
        json={"name": "role-fga-write-test"},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create role: {resp.text}"
    new_role_id = resp.json()["data"]["id"]

    # Patch role — now allowed.
    resp = requests.patch(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{new_role_id}"),
        json={"description": "role-fga-write-renamed"},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"patch role: {resp.text}"

    # Delete role — now allowed.
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{new_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete role: {resp.text}"


# ---------------------------------------------------------------------------
# 6. Revoke read/list → verify access lost
# ---------------------------------------------------------------------------


def test_role_revoke_read_permissions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)
    target_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # Revoke read.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "read",
        deletions=[object_group("role", "role", ["*"])],
    )

    # Revoke list.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "list",
        deletions=[object_group("role", "role", ["*"])],
    )

    custom_token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)

    # List roles — forbidden.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(ROLES_BASE),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"list roles after revoke: expected 403, got {resp.status_code}: {resp.text}"

    # Get role — forbidden.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{ROLES_BASE}/{target_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get role after revoke: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 7. Clean up: delete custom role
# ---------------------------------------------------------------------------


def test_role_fga_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)
    user = find_user_by_email(signoz, admin_token, ROLE_FGA_CUSTOM_USER_EMAIL)

    # Remove the custom role from the user first.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    roles = resp.json()["data"]
    custom_entry = next((r for r in roles if r["name"] == ROLE_FGA_CUSTOM_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    delete_custom_role(signoz, admin_token, role_id)
