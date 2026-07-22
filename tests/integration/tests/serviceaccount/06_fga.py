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
)

_SA_FGA_CUSTOM_ROLE_NAME = "sa-fga-readonly"
_SA_FGA_CUSTOM_USER_EMAIL = "customrole+safga@integration.test"
_SA_FGA_CUSTOM_USER_PASSWORD = "password123Z$"
_SA_FGA_TARGET_SA_NAME = "sa-fga-target"
_SA_FGA_OTHER_SA_NAME = "sa-fga-other"


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
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    target_id = create_service_account(signoz, admin_token, _SA_FGA_TARGET_SA_NAME, role="signoz-viewer")
    create_service_account(signoz, admin_token, _SA_FGA_OTHER_SA_NAME, role="signoz-viewer")

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}/keys"),
        json={"name": "fga-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text

    create_role(
        admin_token,
        _SA_FGA_CUSTOM_ROLE_NAME,
        [
            transaction_group("read", "serviceaccount", "serviceaccount", [target_id]),
            transaction_group("list", "serviceaccount", "serviceaccount", ["*"]),
            transaction_group("read", "metaresource", "factor-api-key", ["*"]),
            transaction_group("list", "metaresource", "factor-api-key", ["*"]),
        ],
    )

    user_id = create_active_user(
        signoz,
        admin_token,
        email=_SA_FGA_CUSTOM_USER_EMAIL,
        role="VIEWER",
        password=_SA_FGA_CUSTOM_USER_PASSWORD,
        name="sa-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _SA_FGA_CUSTOM_ROLE_NAME)


def test_read_scoped_to_granted_sa(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_SA_FGA_CUSTOM_USER_EMAIL, _SA_FGA_CUSTOM_USER_PASSWORD)
    target_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_TARGET_SA_NAME)["id"]
    other_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_OTHER_SA_NAME)["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get granted SA: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{other_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get other SA: expected 403, got {resp.status_code}: {resp.text}"


def test_list_returns_every_sa(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_SA_FGA_CUSTOM_USER_EMAIL, _SA_FGA_CUSTOM_USER_PASSWORD)
    target_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_TARGET_SA_NAME)["id"]
    other_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_OTHER_SA_NAME)["id"]

    # list is collection-scoped: list on "*" returns every SA, including the one
    # the user cannot read individually.
    resp = requests.get(signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    ids = {sa["id"] for sa in resp.json()["data"]}
    assert {target_id, other_id} <= ids


def test_write_forbidden_without_grant(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_SA_FGA_CUSTOM_USER_EMAIL, _SA_FGA_CUSTOM_USER_PASSWORD)
    target_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_TARGET_SA_NAME)["id"]
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}"),
        json={"name": "sa-fga-renamed"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update SA: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign role: expected 403, got {resp.status_code}: {resp.text}"


def test_update_scoped_to_granted_sa(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SA_FGA_CUSTOM_ROLE_NAME)
    target_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_TARGET_SA_NAME)["id"]
    other_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_OTHER_SA_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "serviceaccount", "serviceaccount", [target_id]),
                transaction_group("update", "serviceaccount", "serviceaccount", [target_id]),
                transaction_group("list", "serviceaccount", "serviceaccount", ["*"]),
                transaction_group("read", "metaresource", "factor-api-key", ["*"]),
                transaction_group("list", "metaresource", "factor-api-key", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SA_FGA_CUSTOM_USER_EMAIL, _SA_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}"),
        json={"name": _SA_FGA_TARGET_SA_NAME},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update granted SA: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{other_id}"),
        json={"name": _SA_FGA_OTHER_SA_NAME},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update other SA: expected 403, got {resp.status_code}: {resp.text}"


def test_attach_detach_dual_scoped(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SA_FGA_CUSTOM_ROLE_NAME)
    target_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_TARGET_SA_NAME)["id"]
    other_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_OTHER_SA_NAME)["id"]
    editor_role_id = find_role_id(admin_token, "signoz-editor")
    viewer_role_id = find_role_id(admin_token, "signoz-viewer")

    # attach/detach granted on the target SA id AND the signoz-editor role name only.
    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "serviceaccount", "serviceaccount", [target_id]),
                transaction_group("list", "serviceaccount", "serviceaccount", ["*"]),
                transaction_group("attach", "serviceaccount", "serviceaccount", [target_id]),
                transaction_group("detach", "serviceaccount", "serviceaccount", [target_id]),
                transaction_group("attach", "role", "role", ["signoz-editor"]),
                transaction_group("detach", "role", "role", ["signoz-editor"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SA_FGA_CUSTOM_USER_EMAIL, _SA_FGA_CUSTOM_USER_PASSWORD)

    # Both SA-attach (target id) and role-attach (editor) present -> allowed.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}/roles"),
        json={"id": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"assign editor to target: {resp.text}"

    # SA-attach not held for the other SA id -> forbidden.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{other_id}/roles"),
        json={"id": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign editor to other SA: expected 403, got {resp.status_code}: {resp.text}"

    # role-attach not held for viewer -> forbidden even on the target SA.
    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}/roles"),
        json={"id": viewer_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign viewer to target: expected 403, got {resp.status_code}: {resp.text}"

    # Both SA-detach (target id) and role-detach (editor) present -> remove allowed.
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}/roles/{editor_role_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove editor from target: {resp.text}"


def test_revoke_read_scoped(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SA_FGA_CUSTOM_ROLE_NAME)
    target_id = find_service_account_by_name(signoz, admin_token, _SA_FGA_TARGET_SA_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": [transaction_group("list", "serviceaccount", "serviceaccount", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SA_FGA_CUSTOM_USER_EMAIL, _SA_FGA_CUSTOM_USER_PASSWORD)
    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{target_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get target SA after revoke: expected 403, got {resp.status_code}: {resp.text}"


def test_delete_custom_role_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SA_FGA_CUSTOM_ROLE_NAME)
    user = find_user_by_email(signoz, admin_token, _SA_FGA_CUSTOM_USER_EMAIL)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    custom_entry = next((r for r in resp.json()["data"] if r["name"] == _SA_FGA_CUSTOM_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    for name in (_SA_FGA_TARGET_SA_NAME, _SA_FGA_OTHER_SA_NAME):
        sa_id = find_service_account_by_name(signoz, admin_token, name)["id"]
        resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{sa_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete {name}: {resp.text}"
