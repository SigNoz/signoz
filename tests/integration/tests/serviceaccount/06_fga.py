"""Resource-level FGA on service account endpoints.

A custom role is granted exactly the permissions under test, and the role's full
grant set is re-declared via PUT at each step (no incremental patching). Verifies:
- SA role assignment requires BOTH serviceaccount:attach AND role:attach.
- SA role removal requires BOTH serviceaccount:detach AND role:detach.
- Factor API key creation requires factor-api-key:create AND serviceaccount:attach.
- Factor API key revocation requires factor-api-key:delete AND serviceaccount:detach.
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
from fixtures.role import transaction_group
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


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_custom_role_readonly_sa(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={
            "name": SA_FGA_CUSTOM_ROLE_NAME,
            "transactionGroups": [transaction_group(verb, "serviceaccount", "serviceaccount", ["*"]) for verb in ("read", "list")] + [transaction_group(verb, "metaresource", "factor-api-key", ["*"]) for verb in ("read", "list")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text

    user_id = create_active_user(
        signoz,
        admin_token,
        email=SA_FGA_CUSTOM_USER_EMAIL,
        role="VIEWER",
        password=SA_FGA_CUSTOM_USER_PASSWORD,
        name="sa-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", SA_FGA_CUSTOM_ROLE_NAME)

    sa_id = create_service_account(signoz, admin_token, SA_FGA_TARGET_SA_NAME, role="signoz-viewer")

    key_resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys"),
        json={"name": "fga-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert key_resp.status_code == HTTPStatus.CREATED, key_resp.text


def test_readonly_role_allowed_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)
    sa_id = find_service_account_by_name(signoz, get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD), SA_FGA_TARGET_SA_NAME)["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"list SAs: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get SA: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get SA roles: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"list SA keys: {resp.text}"


def test_readonly_role_forbidden_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")
    key_id = get_first_key_id(signoz, admin_token, sa_id)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": "sa-fga-should-fail"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create SA: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"),
        json={"name": "sa-fga-renamed"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update SA: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"delete SA: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign SA role: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove SA role: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys"),
        json={"name": "fga-key-fail", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create key: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/keys/{key_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"revoke key: expected 403, got {resp.status_code}: {resp.text}"


def test_grant_write_permissions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "serviceaccount", "serviceaccount", ["*"]) for verb in ("read", "list", "create", "update", "delete", "attach", "detach")] + [transaction_group(verb, "metaresource", "factor-api-key", ["*"]) for verb in ("read", "list", "create", "delete")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": "sa-fga-write-test"},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create SA: {resp.text}"
    new_sa_id = resp.json()["data"]["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}"),
        json={"name": "sa-fga-write-renamed"},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update SA: {resp.text}"

    key_resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}/keys"),
        json={"name": "fga-write-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert key_resp.status_code == HTTPStatus.CREATED, f"create key: {key_resp.text}"
    new_key_id = key_resp.json()["data"]["id"]

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}/keys/{new_key_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"revoke key: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{new_sa_id}"), headers={"Authorization": f"Bearer {custom_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete SA: {resp.text}"

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


def test_attach_with_only_sa_attach_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")
    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign with only SA attach: expected 403, got {resp.status_code}: {resp.text}"


def test_detach_with_only_sa_detach_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")
    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove with only SA detach: expected 403, got {resp.status_code}: {resp.text}"


def test_attach_with_only_role_attach_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "serviceaccount", "serviceaccount", ["*"]) for verb in ("read", "list", "create", "update", "delete", "detach")]
            + [transaction_group(verb, "metaresource", "factor-api-key", ["*"]) for verb in ("read", "list", "create", "delete")]
            + [transaction_group("attach", "role", "role", ["*"])],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign with only role attach: expected 403, got {resp.status_code}: {resp.text}"


def test_detach_with_only_role_detach_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "serviceaccount", "serviceaccount", ["*"]) for verb in ("read", "list", "create", "update", "delete")]
            + [transaction_group(verb, "metaresource", "factor-api-key", ["*"]) for verb in ("read", "list", "create", "delete")]
            + [transaction_group(verb, "role", "role", ["*"]) for verb in ("attach", "detach")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{viewer_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"remove with only role detach: expected 403, got {resp.status_code}: {resp.text}"


def test_attach_detach_with_both_permissions_succeeds(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "serviceaccount", "serviceaccount", ["*"]) for verb in ("read", "list", "create", "update", "delete", "attach", "detach")]
            + [transaction_group(verb, "metaresource", "factor-api-key", ["*"]) for verb in ("read", "list", "create", "delete")]
            + [transaction_group(verb, "role", "role", ["*"]) for verb in ("attach", "detach")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)
    editor_role_id = find_role_id(admin_token, "signoz-editor")

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles"),
        json={"id": editor_role_id},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"assign with both attach: {resp.text}"

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}/roles/{editor_role_id}"),
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove with both detach: {resp.text}"


def test_remove_read_permissions_revokes_access(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    sa_id = find_service_account_by_name(signoz, admin_token, SA_FGA_TARGET_SA_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "serviceaccount", "serviceaccount", ["*"]) for verb in ("create", "update", "delete", "attach", "detach")]
            + [transaction_group(verb, "metaresource", "factor-api-key", ["*"]) for verb in ("read", "list", "create", "delete")]
            + [transaction_group(verb, "role", "role", ["*"]) for verb in ("attach", "detach")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(SA_FGA_CUSTOM_USER_EMAIL, SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.get(signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE), headers={"Authorization": f"Bearer {custom_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"list SAs after revoke: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"), headers={"Authorization": f"Bearer {custom_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get SA after revoke: expected 403, got {resp.status_code}: {resp.text}"


def test_delete_custom_role_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, SA_FGA_CUSTOM_ROLE_NAME)
    user = find_user_by_email(signoz, admin_token, SA_FGA_CUSTOM_USER_EMAIL)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    custom_entry = next((r for r in resp.json()["data"] if r["name"] == SA_FGA_CUSTOM_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text
