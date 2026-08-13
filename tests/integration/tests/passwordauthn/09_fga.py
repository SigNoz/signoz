from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USERS_BASE,
    create_active_user,
    find_user_by_email,
)
from fixtures.role import find_role_by_name, transaction_group

_ACTOR_ROLE_NAME = "user-fga-actor"
_ACTOR_EMAIL = "userfga+actor@integration.test"
_ACTOR_PASSWORD = "password123Z$"
_TARGET_A_EMAIL = "userfga+target-a@integration.test"
_TARGET_B_EMAIL = "userfga+target-b@integration.test"
_TARGET_PASSWORD = "password123Z$"

_CREATE_ROLE_NAME = "user-fga-creator"
_CREATE_ACTOR_EMAIL = "userfga+creator@integration.test"


def test_setup_actor_and_targets(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    target_a_id = create_active_user(
        signoz,
        admin_token,
        email=_TARGET_A_EMAIL,
        role="signoz-viewer",
        password=_TARGET_PASSWORD,
        name="user-fga-target-a",
    )
    create_active_user(
        signoz,
        admin_token,
        email=_TARGET_B_EMAIL,
        role="signoz-viewer",
        password=_TARGET_PASSWORD,
        name="user-fga-target-b",
    )

    create_role(
        admin_token,
        _ACTOR_ROLE_NAME,
        [
            transaction_group("read", "user", "user", [target_a_id]),
            transaction_group("list", "user", "user", ["*"]),
        ],
    )

    create_active_user(
        signoz,
        admin_token,
        email=_ACTOR_EMAIL,
        role=_ACTOR_ROLE_NAME,
        password=_ACTOR_PASSWORD,
        name="user-fga-actor",
    )


def test_read_scoped_to_granted_user(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    target_a_id = find_user_by_email(signoz, admin_token, _TARGET_A_EMAIL)["id"]
    target_b_id = find_user_by_email(signoz, admin_token, _TARGET_B_EMAIL)["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get granted user: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_b_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get other user: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get granted user roles: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_b_id}/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get other user roles: expected 403, got {resp.status_code}: {resp.text}"


def test_list_returns_every_user(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    target_a_id = find_user_by_email(signoz, admin_token, _TARGET_A_EMAIL)["id"]
    target_b_id = find_user_by_email(signoz, admin_token, _TARGET_B_EMAIL)["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    ids = {user["id"] for user in resp.json()["data"]}
    assert {target_a_id, target_b_id} <= ids


def test_write_forbidden_without_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    target_a_id = find_user_by_email(signoz, admin_token, _TARGET_A_EMAIL)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}"),
        json={"displayName": "nope"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update user: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get reset token: expected 403, got {resp.status_code}: {resp.text}"


def test_attach_detach_dual_scoped(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)
    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")
    target_a_id = find_user_by_email(signoz, admin_token, _TARGET_A_EMAIL)["id"]
    target_b_id = find_user_by_email(signoz, admin_token, _TARGET_B_EMAIL)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "user", "user", [target_a_id]),
                transaction_group("list", "user", "user", ["*"]),
                transaction_group("attach", "user", "user", [target_a_id]),
                transaction_group("detach", "user", "user", [target_a_id]),
                transaction_group("attach", "role", "role", ["signoz-editor"]),
                transaction_group("detach", "role", "role", ["signoz-editor"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": target_a_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"assign editor to target A: {resp.text}"
    user_role_id = resp.json()["data"]["id"]

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": target_b_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign editor to target B: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/user_roles"),
        json={"userId": target_a_id, "roleId": viewer_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign viewer to target A: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get user role: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{user_role_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove editor from target A: {resp.text}"


def test_reset_password_token_scoped(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)
    target_a_id = find_user_by_email(signoz, admin_token, _TARGET_A_EMAIL)["id"]
    target_b_id = find_user_by_email(signoz, admin_token, _TARGET_B_EMAIL)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("list", "user", "user", ["*"]),
                transaction_group("list", "metaresource", "reset-password-token", ["*"]),
                transaction_group("create", "metaresource", "reset-password-token", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create reset token without user attach: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("list", "user", "user", ["*"]),
                transaction_group("attach", "user", "user", [target_a_id]),
                transaction_group("list", "metaresource", "reset-password-token", ["*"]),
                transaction_group("create", "metaresource", "reset-password-token", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create reset token: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_b_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create reset token for target B: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, f"get reset token: {resp.text}"


def test_revoke_read_scoped(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)
    target_a_id = find_user_by_email(signoz, admin_token, _TARGET_A_EMAIL)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": [transaction_group("list", "user", "user", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_a_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get target A after revoke: expected 403, got {resp.status_code}: {resp.text}"


def test_create_with_roles_requires_attach(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")
    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")

    create_role(
        admin_token,
        _CREATE_ROLE_NAME,
        [
            transaction_group("create", "user", "user", ["*"]),
            transaction_group("list", "user", "user", ["*"]),
        ],
    )
    actor_id = create_active_user(
        signoz,
        admin_token,
        email=_CREATE_ACTOR_EMAIL,
        role=_CREATE_ROLE_NAME,
        password=_ACTOR_PASSWORD,
        name="user-fga-creator",
    )
    token = get_token(_CREATE_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": "userfga+created-noroles@integration.test", "displayName": "no roles"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create without roles needs only user:create: {resp.text}"
    noroles_id = resp.json()["data"]["id"]

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": "userfga+created-escalated@integration.test", "displayName": "escalated", "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create with roles but no attach grants: expected 403, got {resp.status_code}: {resp.text}"

    role_id = find_role_by_name(signoz, admin_token, _CREATE_ROLE_NAME)
    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("create", "user", "user", ["*"]),
                transaction_group("list", "user", "user", ["*"]),
                transaction_group("attach", "user", "user", ["*"]),
                transaction_group("attach", "role", "role", ["signoz-viewer"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_CREATE_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": "userfga+created-granted@integration.test", "displayName": "granted", "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create with granted role: {resp.text}"
    granted_id = resp.json()["data"]["id"]

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": "userfga+created-editor@integration.test", "displayName": "editor", "userRoles": [{"id": editor_role_id}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create with role outside attach grant: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{actor_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    custom_entry = next((ur for ur in resp.json()["data"]["userRoles"] if ur["role"]["name"] == _CREATE_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{custom_entry['id']}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"detach actor role: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    for user_id in (noroles_id, granted_id, actor_id):
        resp = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete {user_id}: {resp.text}"


def test_cleanup(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)
    actor = find_user_by_email(signoz, admin_token, _ACTOR_EMAIL)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{actor['id']}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    custom_entry = next((ur for ur in resp.json()["data"]["userRoles"] if ur["role"]["name"] == _ACTOR_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/user_roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove custom role from actor: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    for email in (_TARGET_A_EMAIL, _TARGET_B_EMAIL, _ACTOR_EMAIL):
        user = find_user_by_email(signoz, admin_token, email)
        resp = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user['id']}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete {email}: {resp.text}"
