from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_EDITOR_EMAIL,
    USER_EDITOR_PASSWORD,
    USER_ROLES_BASE,
    USERS_BASE,
    change_user_role,
    create_active_user,
    find_user_by_email,
)
from fixtures.role import find_role_by_name, transaction_group

_ACTOR_ROLE_NAME = "user-fga-actor"
_ACTOR_EMAIL = "customrole+userfga@integration.test"
_ACTOR_PASSWORD = "password123Z$"

_VIEWER_EMAIL = "viewer+userfga@integration.test"
_VIEWER_PASSWORD = "password123Z$"

# Instance verbs are granted on _TARGET_EMAIL's id only; _OTHER_EMAIL must stay forbidden.
_TARGET_EMAIL = "target+userfga@integration.test"
_OTHER_EMAIL = "other+userfga@integration.test"
_TARGET_PASSWORD = "password123Z$"

_INVITED_VIEWER_EMAIL = "invited-viewer+userfga@integration.test"
_INVITED_EDITOR_EMAIL = "invited-editor+userfga@integration.test"
_INVITED_NO_ROLE_EMAIL = "invited-norole+userfga@integration.test"


def _set_actor_role(signoz: types.SigNoz, admin_token: str, transaction_groups: list[dict]) -> None:
    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)
    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": transaction_groups},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_setup_actor_and_targets(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_active_user(signoz, admin_token, email=_VIEWER_EMAIL, role="signoz-viewer", password=_VIEWER_PASSWORD, name="user-fga-viewer")
    create_active_user(signoz, admin_token, email=_TARGET_EMAIL, role="signoz-viewer", password=_TARGET_PASSWORD, name="user-fga-target")
    create_active_user(signoz, admin_token, email=_OTHER_EMAIL, role="signoz-viewer", password=_TARGET_PASSWORD, name="user-fga-other")

    target_id = find_user_by_email(signoz, admin_token, _TARGET_EMAIL)["id"]
    create_role(
        admin_token,
        _ACTOR_ROLE_NAME,
        [
            transaction_group("read", "user", "user", [target_id]),
            transaction_group("list", "user", "user", ["*"]),
        ],
    )

    actor_id = create_active_user(signoz, admin_token, email=_ACTOR_EMAIL, role="signoz-viewer", password=_ACTOR_PASSWORD, name="user-fga-actor")
    change_user_role(signoz, admin_token, actor_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_managed_roles_matrix(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    target_id = find_user_by_email(signoz, admin_token, _TARGET_EMAIL)["id"]
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")

    for email, password in ((USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD), (_VIEWER_EMAIL, _VIEWER_PASSWORD)):
        token = get_token(email, password)
        headers = {"Authorization": f"Bearer {token}"}

        resp = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers=headers, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} list users: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"), headers=headers, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} get user: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"), headers=headers, timeout=5)
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} reset token: expected 403, got {resp.status_code}: {resp.text}"

        resp = requests.post(
            signoz.self.host_configs["8080"].get(USER_ROLES_BASE),
            json={"userId": target_id, "roleId": viewer_role_id},
            headers=headers,
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.FORBIDDEN, f"{email} assign role: expected 403, got {resp.status_code}: {resp.text}"

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"), headers=admin_headers, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"), headers=admin_headers, timeout=5)
    assert resp.status_code in (HTTPStatus.OK, HTTPStatus.NOT_FOUND), resp.text

    resp = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"), headers=admin_headers, timeout=5)
    assert resp.status_code == HTTPStatus.CREATED, resp.text


def test_read_scoped_to_granted_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)
    target_id = find_user_by_email(signoz, admin_token, _TARGET_EMAIL)["id"]
    other_id = find_user_by_email(signoz, admin_token, _OTHER_EMAIL)["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get granted user: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get granted user roles: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{other_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get other user: expected 403, got {resp.status_code}: {resp.text}"

    # list is collection-scoped: list on "*" returns every user, including the one
    # the actor cannot read individually.
    resp = requests.get(signoz.self.host_configs["8080"].get(USERS_BASE), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    ids = {user["id"] for user in resp.json()["data"]}
    assert {target_id, other_id} <= ids

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}"),
        json={"displayName": "user-fga-target-renamed"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update user without grant: expected 403, got {resp.status_code}: {resp.text}"


def test_reset_password_token_scoped_to_granted_user(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    target_id = find_user_by_email(signoz, admin_token, _TARGET_EMAIL)["id"]
    other_id = find_user_by_email(signoz, admin_token, _OTHER_EMAIL)["id"]

    _set_actor_role(
        signoz,
        admin_token,
        [
            transaction_group("read", "user", "user", [target_id]),
            transaction_group("attach", "user", "user", [target_id]),
            transaction_group("create", "metaresource", "factor-password", ["*"]),
            transaction_group("read", "metaresource", "factor-password", ["*"]),
        ],
    )
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.CREATED, f"create reset token for granted user: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get reset token for granted user: {resp.text}"

    resp = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{other_id}/reset_password_tokens"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create reset token for other user: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{other_id}/reset_password_tokens"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get reset token for other user: expected 403, got {resp.status_code}: {resp.text}"

    # user:attach alone is not enough: factor-password:create is checked too.
    _set_actor_role(signoz, admin_token, [transaction_group("attach", "user", "user", [target_id])])
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.put(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{target_id}/reset_password_tokens"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create reset token without factor-password:create: expected 403, got {resp.status_code}: {resp.text}"


def test_user_role_attach_detach_dual_scoped(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    target_id = find_user_by_email(signoz, admin_token, _TARGET_EMAIL)["id"]
    other_id = find_user_by_email(signoz, admin_token, _OTHER_EMAIL)["id"]
    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")
    admin_role_id = find_role_by_name(signoz, admin_token, "signoz-admin")

    # attach/detach granted on the target user id AND the signoz-editor role name only.
    _set_actor_role(
        signoz,
        admin_token,
        [
            transaction_group("read", "user", "user", [target_id]),
            transaction_group("attach", "user", "user", [target_id]),
            transaction_group("detach", "user", "user", [target_id]),
            transaction_group("attach", "role", "role", ["signoz-editor"]),
            transaction_group("detach", "role", "role", ["signoz-editor"]),
        ],
    )
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USER_ROLES_BASE),
        json={"userId": target_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"assign editor to target: {resp.text}"
    editor_entry_id = resp.json()["data"]["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{USER_ROLES_BASE}/{editor_entry_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get user role of granted user: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USER_ROLES_BASE),
        json={"userId": other_id, "roleId": editor_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign editor to other user: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USER_ROLES_BASE),
        json={"userId": target_id, "roleId": admin_role_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"assign admin to target: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{USER_ROLES_BASE}/{editor_entry_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove editor from target: {resp.text}"


def test_invite_checks_role_attach_per_role(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    viewer_role_id = find_role_by_name(signoz, admin_token, "signoz-viewer")
    editor_role_id = find_role_by_name(signoz, admin_token, "signoz-editor")

    _set_actor_role(
        signoz,
        admin_token,
        [
            transaction_group("create", "user", "user", ["*"]),
            transaction_group("attach", "user", "user", ["*"]),
            transaction_group("attach", "role", "role", ["signoz-viewer"]),
        ],
    )
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _INVITED_VIEWER_EMAIL, "displayName": "invited-viewer", "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"invite with viewer: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _INVITED_EDITOR_EMAIL, "displayName": "invited-editor", "userRoles": [{"id": editor_role_id}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"invite with editor: expected 403, got {resp.status_code}: {resp.text}"

    # No roles in the body: nothing to attach, so neither user:attach nor role:attach is checked.
    _set_actor_role(signoz, admin_token, [transaction_group("create", "user", "user", ["*"])])
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": _INVITED_NO_ROLE_EMAIL, "displayName": "invited-norole", "userRoles": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"invite without roles: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        json={"email": "invited-viewer-denied+userfga@integration.test", "displayName": "invited-viewer-denied", "userRoles": [{"id": viewer_role_id}]},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"invite with viewer without role:attach: expected 403, got {resp.status_code}: {resp.text}"


def test_cleanup(signoz: types.SigNoz, get_token: Callable[[str, str], str]):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}

    actor_id = find_user_by_email(signoz, admin_token, _ACTOR_EMAIL)["id"]
    change_user_role(signoz, admin_token, actor_id, _ACTOR_ROLE_NAME, "signoz-viewer")

    role_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)
    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers=headers, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    for email in (_ACTOR_EMAIL, _VIEWER_EMAIL, _TARGET_EMAIL, _OTHER_EMAIL, _INVITED_VIEWER_EMAIL, _INVITED_NO_ROLE_EMAIL):
        user_id = find_user_by_email(signoz, admin_token, email)["id"]
        resp = requests.delete(signoz.self.host_configs["8080"].get(f"{USERS_BASE}/{user_id}"), headers=headers, timeout=5)
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete {email}: {resp.text}"
