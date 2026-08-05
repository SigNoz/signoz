from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    create_active_user,
    find_user_by_email,
)
from fixtures.role import flatten_transaction_groups, transaction_group

CRUD_ROLE_NAME = "crud-test-role"
CRUD_ASSIGNEE_ROLE_NAME = "crud-assignee-role"
CRUD_ASSIGNEE_USER_EMAIL = "crud+assignee@integration.test"
CRUD_ASSIGNEE_USER_PASSWORD = "password123Z$"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_get_list_roundtrip(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    groups = [
        transaction_group("read", "metaresource", "dashboard", ["*"]),
        transaction_group("list", "metaresource", "dashboard", ["*"]),
        transaction_group("read", "metaresource", "rule", ["*"]),
    ]
    role_id = create_role(admin_token, CRUD_ROLE_NAME, groups, "crud role")

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    role = resp.json()["data"]
    assert role["name"] == CRUD_ROLE_NAME
    assert role["type"] == "custom"
    assert role["description"] == "crud role"
    assert flatten_transaction_groups(role["transactionGroups"]) == flatten_transaction_groups(groups)

    resp = requests.get(signoz.self.host_configs["8080"].get("/api/v1/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    assert CRUD_ROLE_NAME in {r["name"] for r in resp.json()["data"]}


def test_declarative_update_adds_and_removes_transactions(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, CRUD_ROLE_NAME)

    def put_transactions(groups: list[dict]) -> None:
        resp = requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
            json={"description": "crud role", "transactionGroups": groups},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    def current_transactions() -> set:
        resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.OK, resp.text
        return flatten_transaction_groups(resp.json()["data"]["transactionGroups"])

    superset = [
        transaction_group("read", "metaresource", "dashboard", ["*"]),
        transaction_group("list", "metaresource", "dashboard", ["*"]),
        transaction_group("create", "metaresource", "dashboard", ["*"]),
        transaction_group("update", "metaresource", "dashboard", ["*"]),
        transaction_group("read", "metaresource", "rule", ["*"]),
    ]
    put_transactions(superset)
    assert current_transactions() == flatten_transaction_groups(superset)

    subset = [transaction_group("read", "metaresource", "dashboard", ["*"])]
    put_transactions(subset)
    assert current_transactions() == flatten_transaction_groups(subset)

    put_transactions([])
    assert current_transactions() == set()

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_update_changes_description(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    groups = [transaction_group("read", "metaresource", "dashboard", ["*"])]
    role_id = create_role(admin_token, "crud-desc-role", groups, "initial")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "updated", "transactionGroups": None},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.BAD_REQUEST, f"null transactionGroups: expected 400, got {resp.status_code}: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "updated", "transactionGroups": groups},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    role = resp.json()["data"]
    assert role["description"] == "updated"
    assert flatten_transaction_groups(role["transactionGroups"]) == flatten_transaction_groups(groups)

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_create_validation_rejected(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    bad_bodies = {
        "reserved-prefix": {"name": "signoz-nope", "transactionGroups": []},
        "invalid-name-chars": {"name": "Bad_Name", "transactionGroups": []},
        "name-too-long": {"name": "a" * 51, "transactionGroups": []},
        "verb-invalid-for-resource": {
            "name": "crud-bad-verb",
            "transactionGroups": [transaction_group("assignee", "metaresource", "dashboard", ["*"])],
        },
        "unknown-type": {
            "name": "crud-bad-type",
            "transactionGroups": [transaction_group("read", "not-a-type", "dashboard", ["*"])],
        },
        "unknown-kind": {
            "name": "crud-bad-kind",
            "transactionGroups": [transaction_group("read", "metaresource", "not-a-kind", ["*"])],
        },
        "bad-selector-metaresource": {
            "name": "crud-bad-selector",
            "transactionGroups": [transaction_group("read", "metaresource", "dashboard", ["not-a-uuid"])],
        },
        "bad-selector-telemetry": {
            "name": "crud-bad-telemetry-selector",
            "transactionGroups": [transaction_group("read", "telemetryresource", "logs", ["not-a-wildcard"])],
        },
    }

    for label, body in bad_bodies.items():
        resp = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/roles"),
            json=body,
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.BAD_REQUEST, f"{label}: expected 400, got {resp.status_code}: {resp.text}"


def test_duplicate_name_conflict(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    role_id = create_role(admin_token, "crud-dup-role")

    try:
        resp = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/roles"),
            json={"name": "crud-dup-role", "transactionGroups": []},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.CONFLICT, f"expected 409, got {resp.status_code}: {resp.text}"
    finally:
        resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
        assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_managed_role_is_immutable(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    admin_role_id = find_role_id(admin_token, "signoz-admin")

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{admin_role_id}"),
        json={"description": "hijacked", "transactionGroups": []},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.BAD_REQUEST, f"update managed role: expected 400, got {resp.status_code}: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{admin_role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.BAD_REQUEST, f"delete managed role: expected 400, got {resp.status_code}: {resp.text}"


def test_delete_role_with_assignee_guarded(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    role_id = create_role(admin_token, CRUD_ASSIGNEE_ROLE_NAME, [transaction_group("read", "metaresource", "dashboard", ["*"])])

    user_id = create_active_user(
        signoz,
        admin_token,
        email=CRUD_ASSIGNEE_USER_EMAIL,
        role="VIEWER",
        password=CRUD_ASSIGNEE_USER_PASSWORD,
        name="crud-assignee-user",
    )

    resp = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"),
        json={"name": CRUD_ASSIGNEE_ROLE_NAME},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.BAD_REQUEST, f"delete role with assignee: expected 400, got {resp.status_code}: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    entry = next(r for r in resp.json()["data"] if r["name"] == CRUD_ASSIGNEE_ROLE_NAME)
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}/roles/{entry['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text


def test_delete_removes_role(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    role_id = create_role(admin_token, "crud-del-role")

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NOT_FOUND, f"expected 404 after delete, got {resp.status_code}: {resp.text}"


def test_cleanup_assignee_user(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    user = find_user_by_email(signoz, admin_token, CRUD_ASSIGNEE_USER_EMAIL)
    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text
