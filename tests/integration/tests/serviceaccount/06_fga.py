"""Tests for resource-level FGA on service account endpoints.

Validates that a custom role with specific SA permissions gets exactly
the access it was granted, and that SA role assignment requires BOTH
serviceaccount:attach AND role:attach.
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
    create_custom_role,
    delete_custom_role,
    find_role_by_name,
    object_group,
    patch_role_objects,
)
from fixtures.serviceaccount import (
    SERVICE_ACCOUNT_BASE,
    create_service_account,
    find_service_account_by_name,
    get_first_key_id,
)

SA_FGA_CUSTOM_ROLE_NAME = "sa-fga-readonly"
SA_FGA_CUSTOM_USER_EMAIL = "customrole+safga@integration.test"
SA_FGA_CUSTOM_USER_PASSWORD = "password123Z$"
SA_FGA_TARGET_SA_NAME = "sa-fga-target"


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
# 2. Create custom role + user
# ---------------------------------------------------------------------------


def test_create_custom_role_readonly_sa(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create the custom role.
    role_id = create_custom_role(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)

    # Grant read on serviceaccount instances.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "read",
        additions=[
            object_group("serviceaccount", "serviceaccount", ["*"]),
        ],
    )

    # Grant list on serviceaccount collection.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "list",
        additions=[
            object_group("metaresources", "serviceaccount", ["*"]),
        ],
    )

    # Create the custom-role user: invite as VIEWER, activate, change role.
    user_id = create_active_user(
        signoz,
        admin_token,
        email=SA_FGA_CUSTOM_USER_EMAIL,
        role="VIEWER",
        password=SA_FGA_CUSTOM_USER_PASSWORD,
        name="sa-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", SA_FGA_CUSTOM_ROLE_NAME)

    # Create a target SA (with role + key) for the custom user to operate on.
    sa_id = create_service_account(signoz, admin_token, SA_FGA_TARGET_SA_NAME, role="signoz-viewer")

    # Create a key on the target SA.
    key_resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys"),
        json={"name": "fga-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert key_resp.status_code == HTTPStatus.CREATED, key_resp.text


# ---------------------------------------------------------------------------
# 3. Read-only access: allowed operations
# ---------------------------------------------------------------------------


def test_readonly_role_allowed_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)
    sa_id = find_service_account_by_name(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), SA_FGA_TARGET_SA_NAME)["id"]

    # List SAs.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"list SAs: {resp.text}"

    # Get SA.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"get SA: {resp.text}"

    # Get SA roles.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"get SA roles: {resp.text}"

    # List SA keys.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"list SA keys: {resp.text}"


# ---------------------------------------------------------------------------
# 4. Read-only access: forbidden operations
# ---------------------------------------------------------------------------


def test_readonly_role_forbidden_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")
    key_id = get_first_key_id(signoz, admin_token, sa_id)

    # Create SA — forbidden.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": "sa-fga-should-fail"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create SA: expected 403, got {resp.status_code}: {resp.text}"

    # Update SA — forbidden.
    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"),
        json={"name": "sa-fga-renamed"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update SA: expected 403, got {resp.status_code}: {resp.text}"

    # Delete SA — forbidden.
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"delete SA: expected 403, got {resp.status_code}: {resp.text}"

    # Assign role to SA — forbidden.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign SA role: expected 403, got {resp.status_code}: {resp.text}"

    # Remove role from SA — forbidden.
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove SA role: expected 403, got {resp.status_code}: {resp.text}"

    # Create key — forbidden (needs update).
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys"),
        json={"name": "fga-key-fail", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create key: expected 403, got {resp.status_code}: {resp.text}"

    # Revoke key — forbidden (needs update).
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys/{key_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"revoke key: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 5. Grant write permissions, verify access opens up
# ---------------------------------------------------------------------------


def test_patch_role_add_write_permissions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # Grant create on collection.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "create",
        additions=[
            object_group("metaresources", "serviceaccount", ["*"]),
        ],
    )

    # Grant update on instances.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "update",
        additions=[
            object_group("serviceaccount", "serviceaccount", ["*"]),
        ],
    )

    # Grant delete on instances.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "delete",
        additions=[
            object_group("serviceaccount", "serviceaccount", ["*"]),
        ],
    )

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    # Create SA — now allowed.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": "sa-fga-write-test"},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create SA: {resp.text}"
    new_sa_id = resp.json()["data"]["id"]

    # Update SA — now allowed.
    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}"),
        json={"name": "sa-fga-write-renamed"},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update SA: {resp.text}"

    # Create key — now allowed (update permission covers key create).
    key_resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}/keys"),
        json={"name": "fga-write-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert key_resp.status_code == HTTPStatus.CREATED, f"create key: {key_resp.text}"
    new_key_id = key_resp.json()["data"]["id"]

    # Revoke key — now allowed (update permission covers key revoke).
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}/keys/{new_key_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"revoke key: {resp.text}"

    # Delete SA — now allowed.
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete SA: {resp.text}"

    # Role assignment still forbidden (no attach).
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign SA role: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove SA role: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 6. Dual-attach: SA attach only (no role attach) → forbidden
# ---------------------------------------------------------------------------


def test_attach_with_only_sa_attach_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # Grant attach on serviceaccount only.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "attach",
        additions=[
            object_group("serviceaccount", "serviceaccount", ["*"]),
        ],
    )

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    # Assign role — forbidden (has SA attach, missing role attach).
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign with only SA attach: expected 403, got {resp.status_code}: {resp.text}"

    # Remove role — forbidden (CheckAll: role attach group fails).
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove with only SA attach: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 7. Dual-attach: role attach only (no SA attach) → forbidden
# ---------------------------------------------------------------------------


def test_attach_with_only_role_attach_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    # Remove SA attach, grant role attach.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "attach",
        additions=[object_group("role", "role", ["*"])],
        deletions=[object_group("serviceaccount", "serviceaccount", ["*"])],
    )

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    # Assign role — forbidden (middleware SA attach check fails).
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign with only role attach: expected 403, got {resp.status_code}: {resp.text}"

    # Remove role — forbidden (CheckAll: SA attach group fails).
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove with only role attach: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 8. Dual-attach: both SA + role attach → succeeds
# ---------------------------------------------------------------------------


def test_attach_with_both_permissions_succeeds(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]

    # Add back SA attach (role attach already present from previous test).
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "attach",
        additions=[
            object_group("serviceaccount", "serviceaccount", ["*"]),
        ],
    )

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    # The target SA currently has signoz-viewer assigned. Assign a different role.
    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")

    # Assign editor role — should succeed (both SA attach + role attach).
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": editor_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"assign with both attach: {resp.text}"

    # Remove the editor role — should succeed (CheckAll: both groups pass).
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{editor_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove with both attach: {resp.text}"


# ---------------------------------------------------------------------------
# 9. Revoke read/list → verify access lost
# ---------------------------------------------------------------------------


def test_remove_read_permissions_revokes_access(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]

    # Revoke read.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "read",
        deletions=[
            object_group("serviceaccount", "serviceaccount", ["*"]),
        ],
    )

    # Revoke list.
    patch_role_objects(
        signoz,
        admin_token,
        role_id,
        "list",
        deletions=[
            object_group("metaresources", "serviceaccount", ["*"]),
        ],
    )

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    # List SAs — forbidden.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"list SAs after revoke: expected 403, got {resp.status_code}: {resp.text}"

    # Get SA — forbidden.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get SA after revoke: expected 403, got {resp.status_code}: {resp.text}"


# ---------------------------------------------------------------------------
# 10. Clean up: delete custom role
# ---------------------------------------------------------------------------


def test_delete_custom_role_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    user = find_user_by_email(signoz, admin_token, SA_FGA_CUSTOM_USER_EMAIL)

    # Remove the custom role from the user first — role deletion requires no assignees.
    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    roles = resp.json()["data"]
    custom_entry = next((r for r in roles if r["name"] == SA_FGA_CUSTOM_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    delete_custom_role(signoz, admin_token, role_id)
