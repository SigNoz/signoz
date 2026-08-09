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
from fixtures.savedview import SAVED_VIEW_BASE, create_saved_view, find_saved_view_by_name

_SAVED_VIEW_FGA_CUSTOM_ROLE_NAME = "saved-view-fga-readonly"
_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL = "customrole+savedviewfga@integration.test"
_SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD = "password123Z$"
_SAVED_VIEW_FGA_TARGET_NAME = "saved-view-fga-target"
_SAVED_VIEW_FGA_OTHER_NAME = "saved-view-fga-other"
_SAVED_VIEW_FGA_CREATED_NAME = "saved-view-fga-created"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_custom_role_readonly_view(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    target_id = create_saved_view(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)
    create_saved_view(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)

    create_role(
        admin_token,
        _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME,
        [
            transaction_group("read", "metaresource", "saved-view", [target_id]),
            transaction_group("list", "metaresource", "saved-view", ["*"]),
        ],
    )

    user_id = create_active_user(
        signoz,
        admin_token,
        email=_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL,
        role="VIEWER",
        password=_SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD,
        name="saved-view-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME)


def test_read_scoped_to_granted_view(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)
    target_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)["id"]
    other_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)["id"]

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{target_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"get granted saved view: {resp.text}"

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{other_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"get other saved view: expected 403, got {resp.status_code}: {resp.text}"


def test_list_returns_every_view(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)
    target_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)["id"]
    other_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)["id"]

    # list is collection-scoped: list on "*" returns every saved view, including
    # the one the user cannot read individually.
    resp = requests.get(signoz.self.host_configs["8080"].get(SAVED_VIEW_BASE), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    ids = {view["id"] for view in resp.json()["data"]}
    assert {target_id, other_id} <= ids


def test_write_forbidden_without_grant(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)
    target_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{target_id}"),
        json={
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": _SAVED_VIEW_FGA_TARGET_NAME,
                "panelType": "table",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                "selectedFields": [],
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update saved view: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.post(
        signoz.self.host_configs["8080"].get(SAVED_VIEW_BASE),
        json={
            "name": "saved-view-fga-create-attempt",
            "source": "logs",
            "schemaVersion": "v2",
            "spec": {
                "displayName": "saved-view-fga-create-attempt",
                "panelType": "table",
                "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
                "selectedFields": [],
                "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"create saved view: expected 403, got {resp.status_code}: {resp.text}"


def test_create_is_collection_scoped(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME)
    target_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "saved-view", [target_id]),
                transaction_group("list", "metaresource", "saved-view", ["*"]),
                transaction_group("create", "metaresource", "saved-view", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)
    created_id = create_saved_view(signoz, token, _SAVED_VIEW_FGA_CREATED_NAME)

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{created_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"cleanup {_SAVED_VIEW_FGA_CREATED_NAME}: {resp.text}"


def test_update_scoped_to_granted_view(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME)
    target_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)["id"]
    other_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "saved-view", [target_id]),
                transaction_group("list", "metaresource", "saved-view", ["*"]),
                transaction_group("create", "metaresource", "saved-view", ["*"]),
                transaction_group("update", "metaresource", "saved-view", [target_id]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)
    updated_body = {
        "source": "logs",
        "schemaVersion": "v2",
        "spec": {
            "displayName": _SAVED_VIEW_FGA_TARGET_NAME,
            "panelType": "graph",
            "queries": [{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}}],
            "selectedFields": [],
            "display": {"maxLines": 0, "fontSize": "", "format": "", "color": ""},
        },
    }

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{target_id}"),
        json=updated_body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"update granted saved view: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{other_id}"),
        json=updated_body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"update other saved view: expected 403, got {resp.status_code}: {resp.text}"


def test_delete_scoped_to_granted_view(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME)
    target_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_TARGET_NAME)["id"]
    other_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "saved-view", [target_id]),
                transaction_group("list", "metaresource", "saved-view", ["*"]),
                transaction_group("create", "metaresource", "saved-view", ["*"]),
                transaction_group("update", "metaresource", "saved-view", [target_id]),
                transaction_group("delete", "metaresource", "saved-view", [target_id]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{other_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"delete other saved view: expected 403, got {resp.status_code}: {resp.text}"

    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{target_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete granted saved view: {resp.text}"


def test_revoke_read_scoped(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    role_id = find_role_id(admin_token, _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME)
    other_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)["id"]

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "saved-view", [other_id]),
                transaction_group("list", "metaresource", "saved-view", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    token = get_token(_SAVED_VIEW_FGA_CUSTOM_USER_EMAIL, _SAVED_VIEW_FGA_CUSTOM_USER_PASSWORD)
    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{other_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, f"read after grant: {resp.text}"

    resp = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{role_id}"),
        json={"description": "", "transactionGroups": [transaction_group("list", "metaresource", "saved-view", ["*"])]},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    resp = requests.get(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{other_id}"), headers={"Authorization": f"Bearer {token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.FORBIDDEN, f"read after revoke: expected 403, got {resp.status_code}: {resp.text}"


def test_saved_view_fga_cleanup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    find_role_id: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    user = find_user_by_email(signoz, admin_token, _SAVED_VIEW_FGA_CUSTOM_USER_EMAIL)

    resp = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.OK, resp.text
    custom_entry = next((r for r in resp.json()["data"] if r["name"] == _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME), None)
    if custom_entry is not None:
        resp = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/users/{user['id']}/roles/{custom_entry['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert resp.status_code == HTTPStatus.NO_CONTENT, f"remove role from user: {resp.text}"

    resp = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_id(admin_token, _SAVED_VIEW_FGA_CUSTOM_ROLE_NAME)}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert resp.status_code == HTTPStatus.NO_CONTENT, resp.text

    other_id = find_saved_view_by_name(signoz, admin_token, _SAVED_VIEW_FGA_OTHER_NAME)["id"]
    resp = requests.delete(signoz.self.host_configs["8080"].get(f"{SAVED_VIEW_BASE}/{other_id}"), headers={"Authorization": f"Bearer {admin_token}"}, timeout=5)
    assert resp.status_code == HTTPStatus.NO_CONTENT, f"delete {_SAVED_VIEW_FGA_OTHER_NAME}: {resp.text}"
