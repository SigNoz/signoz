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

ROLE_FGA_CUSTOM_ROLE_NAME = "role-fga-readonly"
ROLE_FGA_CUSTOM_USER_EMAIL = "customrole+rolefga@integration.test"
ROLE_FGA_CUSTOM_USER_PASSWORD = "password123Z$"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_custom_role_for_role_fga(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={
            "name": ROLE_FGA_CUSTOM_ROLE_NAME,
            "transactionGroups": [
                transaction_group("read", "role", "role", ["*"]),
                transaction_group("list", "role", "role", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, resp.text

    user_id = create_active_user(
        signoz,
        admin_token,
        email=ROLE_FGA_CUSTOM_USER_EMAIL,
        role="VIEWER",
        password=ROLE_FGA_CUSTOM_USER_PASSWORD,
        name="role-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", ROLE_FGA_CUSTOM_ROLE_NAME)


def test_role_readonly_allowed_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)
    target_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.get(signoz.self.host_configs["8080"].get("/api/v1/roles"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"list roles: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{target_role_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get role: {resp.text}"


def test_role_readonly_forbidden_operations(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)
    target_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={"name": "role-fga-should-fail", "transactionGroups": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create role: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{target_role_id}"),
        json={"description": "role-fga-renamed", "transactionGroups": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update role: expected 403, got {resp.status_code}: {resp.text}"

    custom_role_id = find_role_id(admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)
    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{custom_role_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"delete role: expected 403, got {resp.status_code}: {resp.text}"


def test_role_grant_write_permissions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "role", "role", ["*"]) for verb in ("read", "list", "create", "update", "delete")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={"name": "role-fga-write-test", "transactionGroups": []},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.CREATED, f"create role: {resp.text}"
    new_role_id = resp.json()["data"]["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{new_role_id}"),
        json={"description": "role-fga-write-renamed", "transactionGroups": []},
        headers={"Authorization": f"Bearer {custom_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update role: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{new_role_id}"), headers={"Authorization": f"Bearer {custom_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete role: {resp.text}"


def test_role_revoke_read_permissions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)
    target_role_id = find_role_id(admin_token, "signoz-viewer")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [transaction_group(verb, "role", "role", ["*"]) for verb in ("create", "update", "delete")],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    custom_token = get_token(ROLE_FGA_CUSTOM_USER_EMAIL, ROLE_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.get(signoz.self.host_configs["8080"].get("/api/v1/roles"), headers={"Authorization": f"Bearer {custom_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"list roles after revoke: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{target_role_id}"), headers={"Authorization": f"Bearer {custom_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get role after revoke: expected 403, got {resp.status_code}: {resp.text}"


def test_role_fga_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, ROLE_FGA_CUSTOM_ROLE_NAME)
    user = find_user_by_email(signoz, admin_token, ROLE_FGA_CUSTOM_USER_EMAIL)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    custom_entry = next((r for r in resp.json()["data"] if r["name"] == ROLE_FGA_CUSTOM_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text
