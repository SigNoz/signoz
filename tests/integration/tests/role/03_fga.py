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

_ACTOR_ROLE_NAME = "role-fga-actor"
_ACTOR_USER_EMAIL = "customrole+rolefga@integration.test"
_ACTOR_USER_PASSWORD = "password123Z$"

# Instance verbs are granted on _TARGET_A's name only; _TARGET_B must stay forbidden.
_TARGET_A = "role-fga-target-a"
_TARGET_B = "role-fga-target-b"
_CREATED_ROLE = "role-fga-created"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_setup_actor_and_targets(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_role(admin_token, _TARGET_A)
    create_role(admin_token, _TARGET_B)
    create_role(
        admin_token,
        _ACTOR_ROLE_NAME,
        [
            transaction_group("read", "role", "role", [_TARGET_A]),
            transaction_group("list", "role", "role", ["*"]),
        ],
    )

    user_id = create_active_user(
        signoz,
        admin_token,
        email=_ACTOR_USER_EMAIL,
        role="VIEWER",
        password=_ACTOR_USER_PASSWORD,
        name="role-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_read_scoped_to_granted_role(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_USER_EMAIL, _ACTOR_USER_PASSWORD)
    a_id = find_role_id(admin_token, _TARGET_A)
    b_id = find_role_id(admin_token, _TARGET_B)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{a_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"read granted role: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{b_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"read other role: expected 403, got {resp.status_code}: {resp.text}"


def test_list_returns_every_role(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(_ACTOR_USER_EMAIL, _ACTOR_USER_PASSWORD)

    # list is collection-scoped: list on "*" returns every role, including the
    # one the user cannot read individually.
    resp = requests.get(signoz.self.host_configs["8080"].get("/api/v1/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    names = {r["name"] for r in resp.json()["data"]}
    assert {_TARGET_A, _TARGET_B, _ACTOR_ROLE_NAME} <= names


def test_create_is_collection_scoped(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_id(admin_token, _ACTOR_ROLE_NAME)
    token = get_token(_ACTOR_USER_EMAIL, _ACTOR_USER_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={"name": _CREATED_ROLE, "transactionGroups": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create without grant: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "role", "role", [_TARGET_A]),
                transaction_group("list", "role", "role", ["*"]),
                transaction_group("create", "role", "role", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    create_role(token, _CREATED_ROLE)


def test_update_scoped_to_granted_role(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_id(admin_token, _ACTOR_ROLE_NAME)
    a_id = find_role_id(admin_token, _TARGET_A)
    b_id = find_role_id(admin_token, _TARGET_B)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "role", "role", [_TARGET_A]),
                transaction_group("list", "role", "role", ["*"]),
                transaction_group("create", "role", "role", ["*"]),
                transaction_group("update", "role", "role", [_TARGET_A]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_ACTOR_USER_EMAIL, _ACTOR_USER_PASSWORD)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{a_id}"),
        json={"description": "updated by actor", "transactionGroups": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update granted role: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{b_id}"),
        json={"description": "updated by actor", "transactionGroups": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update other role: expected 403, got {resp.status_code}: {resp.text}"


def test_delete_scoped_to_granted_role(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_id(admin_token, _ACTOR_ROLE_NAME)
    a_id = find_role_id(admin_token, _TARGET_A)
    b_id = find_role_id(admin_token, _TARGET_B)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "role", "role", [_TARGET_A]),
                transaction_group("list", "role", "role", ["*"]),
                transaction_group("create", "role", "role", ["*"]),
                transaction_group("update", "role", "role", [_TARGET_A]),
                transaction_group("delete", "role", "role", [_TARGET_A]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_ACTOR_USER_EMAIL, _ACTOR_USER_PASSWORD)

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{b_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"delete other role: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{a_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete granted role: {resp.text}"


def test_revoke_read(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_id(admin_token, _ACTOR_ROLE_NAME)
    b_id = find_role_id(admin_token, _TARGET_B)
    token = get_token(_ACTOR_USER_EMAIL, _ACTOR_USER_PASSWORD)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "role", "role", [_TARGET_B]),
                transaction_group("list", "role", "role", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{b_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"read after grant: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={"description": "", "transactionGroups": [transaction_group("list", "role", "role", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{b_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"read after revoke: expected 403, got {resp.status_code}: {resp.text}"


def test_role_fga_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    user = find_user_by_email(signoz, admin_token, _ACTOR_USER_EMAIL)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    actor_entry = next((r for r in resp.json()["data"] if r["name"] == _ACTOR_ROLE_NAME), None)
    if actor_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{actor_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    for name in (_ACTOR_ROLE_NAME, _TARGET_B, _CREATED_ROLE):
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_id(admin_token, name)}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete {name}: {resp.text}"
