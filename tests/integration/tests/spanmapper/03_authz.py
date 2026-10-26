from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.resources.mappings import Mapping

from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
    find_user_by_email,
)
from fixtures.role import find_role_by_name, transaction_group
from fixtures.types import Operation, SigNoz, TestContainerDocker

GROUPS_PATH = "/api/v1/span_mapper_groups"

_EDITOR_EMAIL = "editor+spanmapperauthz@integration.test"
_VIEWER_EMAIL = "viewer+spanmapperauthz@integration.test"
_ACTOR_ROLE_NAME = "span-mapper-fga-actor"
_ACTOR_EMAIL = "customrole+spanmapperauthz@integration.test"
_PASSWORD = "password123Z$"

# Instance verbs are granted on _TARGET_A and its mapper only; _TARGET_B must stay forbidden.
_TARGET_A = "span-mapper-authz-target-a"
_TARGET_B = "span-mapper-authz-target-b"

_MAPPER = {
    "name": "span_mapper_authz.target",
    "fieldContext": "attribute",
    "config": {"sources": [{"key": "authz.source", "context": "attribute", "operation": "copy", "priority": 1, "enabled": True}]},
    "enabled": True,
}

_SIMULATE = {
    "spans": [{"attributes": {"authz.source": "x"}, "resource": {}}],
    "groups": [{"name": _TARGET_A, "condition": {"attributes": [{"value": "authz.a", "enabled": True}], "resource": []}, "enabled": True}],
}


def test_setup_users_and_targets(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}

    # A --reuse stack may already hold part of this state; create only what is missing.
    response = requests.get(signoz.self.host_configs["8080"].get("/api/v2/users"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    existing_emails = {user["email"] for user in response.json()["data"]}
    for email, role in ((_EDITOR_EMAIL, "signoz-editor"), (_VIEWER_EMAIL, "signoz-viewer")):
        if email not in existing_emails:
            create_active_user(signoz, admin_token, email=email, role=role, password=_PASSWORD)

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    existing_groups = {group["name"] for group in response.json()["data"]["items"]}
    for name, substring in ((_TARGET_A, "authz.a"), (_TARGET_B, "authz.b")):
        if name in existing_groups:
            continue
        response = requests.post(
            signoz.self.host_configs["8080"].get(GROUPS_PATH),
            json={"name": name, "condition": {"attributes": [{"value": substring, "enabled": True}], "resource": []}, "enabled": True},
            headers=headers,
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {group["name"]: group["id"] for group in response.json()["data"]["items"]}
    for name in (_TARGET_A, _TARGET_B):
        response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[name]}/span_mappers"), headers=headers, timeout=5)
        assert response.status_code == HTTPStatus.OK, response.text
        if any(mapper["name"] == _MAPPER["name"] for mapper in response.json()["data"]["items"]):
            continue
        response = requests.post(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[name]}/span_mappers"), json=_MAPPER, headers=headers, timeout=5)
        assert response.status_code == HTTPStatus.CREATED, response.text


def test_mapper_is_only_reachable_through_its_own_group(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    # The authz check on the mapper routes trusts the group id in the path, so the
    # store must refuse a mapper addressed through another group.
    headers = {"Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {group["name"]: group["id"] for group in response.json()["data"]["items"]}

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    mapper_b = response.json()["data"]["items"][0]["id"]

    response = requests.patch(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers/{mapper_b}"), json={"enabled": True}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NOT_FOUND, f"update B's mapper via A: expected 404, got {response.status_code}: {response.text}"

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers/{mapper_b}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NOT_FOUND, f"delete B's mapper via A: expected 404, got {response.status_code}: {response.text}"

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    assert {mapper["id"] for mapper in response.json()["data"]["items"]} == {mapper_b}


@pytest.mark.parametrize("email", [_VIEWER_EMAIL, _EDITOR_EMAIL], ids=["viewer", "editor"])
def test_managed_readers_allowed_on_reads_and_simulate(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    email: str,
):
    headers = {"Authorization": f"Bearer {get_token(email, _PASSWORD)}"}

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    target_a = {group["name"]: group["id"] for group in response.json()["data"]["items"]}[_TARGET_A]

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{target_a}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    assert {mapper["name"] for mapper in response.json()["data"]["items"]} == {_MAPPER["name"]}

    response = requests.post(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/test"), json=_SIMULATE, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text


@pytest.mark.parametrize("email", [_VIEWER_EMAIL, _EDITOR_EMAIL], ids=["viewer", "editor"])
def test_managed_readers_forbidden_on_mutations(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    email: str,
):
    headers = {"Authorization": f"Bearer {get_token(email, _PASSWORD)}"}

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    target_a = {group["name"]: group["id"] for group in response.json()["data"]["items"]}[_TARGET_A]

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{target_a}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    mapper_id = response.json()["data"]["items"][0]["id"]

    for method, path, body in (
        ("POST", GROUPS_PATH, {"name": "span-mapper-authz-denied", "condition": {"attributes": [{"value": "authz.denied", "enabled": True}], "resource": []}, "enabled": True}),
        ("PATCH", f"{GROUPS_PATH}/{target_a}", {"enabled": True}),
        ("DELETE", f"{GROUPS_PATH}/{target_a}", None),
        ("POST", f"{GROUPS_PATH}/{target_a}/span_mappers", {**_MAPPER, "name": "span_mapper_authz.denied"}),
        ("PATCH", f"{GROUPS_PATH}/{target_a}/span_mappers/{mapper_id}", {"enabled": True}),
        ("DELETE", f"{GROUPS_PATH}/{target_a}/span_mappers/{mapper_id}", None),
    ):
        response = requests.request(method, signoz.self.host_configs["8080"].get(path), json=body, headers=headers, timeout=5)
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{method} {path}: expected 403, got {response.status_code}: {response.text}"


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_setup_scoped_actor(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    target_a = {group["name"]: group["id"] for group in response.json()["data"]["items"]}[_TARGET_A]

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{target_a}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    mapper_a = response.json()["data"]["items"][0]["id"]

    # Adding a mapper needs create on the collection plus attach on the group;
    # removing one needs delete on the mapper plus detach on the group.
    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/roles"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    if not any(role["name"] == _ACTOR_ROLE_NAME for role in response.json()["data"]):
        create_role(
            admin_token,
            _ACTOR_ROLE_NAME,
            [
                transaction_group("list", "metaresource", "span-mapper-group", ["*"]),
                transaction_group("read", "metaresource", "span-mapper-group", [target_a]),
                transaction_group("update", "metaresource", "span-mapper-group", [target_a]),
                transaction_group("attach", "metaresource", "span-mapper-group", [target_a]),
                transaction_group("detach", "metaresource", "span-mapper-group", [target_a]),
                transaction_group("create", "metaresource", "span-mapper", ["*"]),
                transaction_group("delete", "metaresource", "span-mapper", ["*"]),
                transaction_group("update", "metaresource", "span-mapper", [mapper_a]),
            ],
        )

    response = requests.get(signoz.self.host_configs["8080"].get("/api/v2/users"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    actor = next((user for user in response.json()["data"] if user["email"] == _ACTOR_EMAIL), None)
    user_id = actor["id"] if actor else create_active_user(signoz, admin_token, email=_ACTOR_EMAIL, role="signoz-viewer", password=_PASSWORD)

    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v2/users/{user_id}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    if not any(ur["role"]["name"] == _ACTOR_ROLE_NAME for ur in response.json()["data"]["userRoles"]):
        change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_access_scoped_to_granted_group_and_mapper(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    headers = {"Authorization": f"Bearer {get_token(_ACTOR_EMAIL, _PASSWORD)}"}

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {group["name"]: group["id"] for group in response.json()["data"]["items"]}
    assert {_TARGET_A, _TARGET_B} <= set(ids)

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, f"list granted group's mappers: {response.text}"
    mapper_a = response.json()["data"]["items"][0]["id"]

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"list other group's mappers: expected 403, got {response.status_code}: {response.text}"

    # Simulate reads saved groups by name, so it needs read on every group.
    response = requests.post(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/test"), json=_SIMULATE, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"simulate: expected 403, got {response.status_code}: {response.text}"

    response = requests.patch(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}"), json={"enabled": True}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT, f"update granted group: {response.text}"

    response = requests.patch(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}"), json={"enabled": True}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"update other group: expected 403, got {response.status_code}: {response.text}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers"),
        json={**_MAPPER, "name": "span_mapper_authz.actor"},
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, f"create mapper in granted group: {response.text}"
    created = response.json()["data"]["id"]

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers/{created}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT, f"delete mapper in granted group: {response.text}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers"),
        json={**_MAPPER, "name": "span_mapper_authz.actor"},
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"create mapper in other group: expected 403, got {response.status_code}: {response.text}"

    # Mapper update is checked on the mapper itself, so the grant on A's mapper
    # does not extend to B's.
    response = requests.patch(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers/{mapper_a}"), json={"enabled": True}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NO_CONTENT, f"update granted mapper: {response.text}"

    admin_headers = {"Authorization": f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"}
    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers"), headers=admin_headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    mapper_b = response.json()["data"]["items"][0]["id"]

    response = requests.patch(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers/{mapper_b}"), json={"enabled": True}, headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"update other mapper: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_B]}/span_mappers/{mapper_b}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"delete other mapper: expected 403, got {response.status_code}: {response.text}"

    # detach on A plus delete on "*" passes authz for B's mapper addressed through
    # A's path; the store must still refuse it.
    response = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}/span_mappers/{mapper_b}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.NOT_FOUND, f"delete B's mapper via A: expected 404, got {response.status_code}: {response.text}"

    response = requests.post(
        signoz.self.host_configs["8080"].get(GROUPS_PATH),
        json={"name": "span-mapper-authz-actor", "condition": {"attributes": [{"value": "authz.actor", "enabled": True}], "resource": []}, "enabled": True},
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"create group: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[_TARGET_A]}"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"delete granted group: expected 403, got {response.status_code}: {response.text}"


def test_revoke_group_read(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    headers = {"Authorization": f"Bearer {get_token(_ACTOR_EMAIL, _PASSWORD)}"}

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=admin_headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    target_a = {group["name"]: group["id"] for group in response.json()["data"]["items"]}[_TARGET_A]

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{target_a}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, f"read before revoke: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)}"),
        json={"description": "", "transactionGroups": [transaction_group("list", "metaresource", "span-mapper-group", ["*"])]},
        headers=admin_headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.get(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{target_a}/span_mappers"), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.FORBIDDEN, f"read after revoke: expected 403, got {response.status_code}: {response.text}"


def test_span_mapper_authz_cleanup(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}"}
    actor = find_user_by_email(signoz, admin_token, _ACTOR_EMAIL)

    # Back to viewer so a rerun on the same stack can set the actor up again.
    change_user_role(signoz, admin_token, actor["id"], _ACTOR_ROLE_NAME, "signoz-viewer")

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)}"),
        headers=headers,
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"delete {_ACTOR_ROLE_NAME}: {response.text}"

    response = requests.get(signoz.self.host_configs["8080"].get(GROUPS_PATH), headers=headers, timeout=5)
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {group["name"]: group["id"] for group in response.json()["data"]["items"]}
    for name in (_TARGET_A, _TARGET_B):
        response = requests.delete(signoz.self.host_configs["8080"].get(f"{GROUPS_PATH}/{ids[name]}"), headers=headers, timeout=5)
        assert response.status_code == HTTPStatus.NO_CONTENT, f"delete {name}: {response.text}"
