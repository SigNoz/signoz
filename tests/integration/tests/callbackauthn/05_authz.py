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
)
from fixtures.role import find_role_by_name, transaction_group

_EDITOR_EMAIL = "editor+authdomainauthz@integration.test"
_EDITOR_PASSWORD = "password123Z$"
_VIEWER_EMAIL = "viewer+authdomainauthz@integration.test"
_VIEWER_PASSWORD = "password123Z$"

_ACTOR_ROLE_NAME = "auth-domain-fga-actor"
_ACTOR_EMAIL = "customrole+authdomainauthz@integration.test"
_ACTOR_PASSWORD = "password123Z$"

# Instance verbs are granted on _TARGET_A only; _TARGET_B must stay forbidden.
_TARGET_A = "target-a-authdomain.integration.test"
_TARGET_B = "target-b-authdomain.integration.test"
_ADMIN_DOMAIN = "admin-crud-authdomain.integration.test"
_ACTOR_DOMAIN = "actor-crud-authdomain.integration.test"
_DIFF_DOMAIN = "diff-crud-authdomain.integration.test"

_SAML_CONFIG = {
    "kind": "saml",
    "spec": {
        "entityId": "saml-entity",
        "location": "saml-idp",
        "certificate": "saml-cert",
    },
}


def test_setup_managed_role_users_and_targets(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    for email, role, password, name in (
        (_EDITOR_EMAIL, "signoz-editor", _EDITOR_PASSWORD, "auth domain authz editor"),
        (_VIEWER_EMAIL, "signoz-viewer", _VIEWER_PASSWORD, "auth domain authz viewer"),
    ):
        create_active_user(signoz, admin_token, email=email, role=role, password=password, name=name)

    for name in (_TARGET_A, _TARGET_B):
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
            json={"name": name, "enabled": True, "config": _SAML_CONFIG},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, response.text


def test_admin_can_crud(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={"name": _ADMIN_DOMAIN, "enabled": True, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    domain_id = response.json()["data"]["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert _ADMIN_DOMAIN in {domain["name"] for domain in response.json()["data"]}

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        json={"enabled": False, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_editor_and_viewer_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    a_id = next(domain["id"] for domain in response.json()["data"] if domain["name"] == _TARGET_A)

    for email, password in ((_EDITOR_EMAIL, _EDITOR_PASSWORD), (_VIEWER_EMAIL, _VIEWER_PASSWORD)):
        token = get_token(email, password)

        response = requests.get(
            signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} list: expected 403, got {response.status_code}: {response.text}"

        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
            json={"name": _ACTOR_DOMAIN, "enabled": True, "config": _SAML_CONFIG},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} create: expected 403, got {response.status_code}: {response.text}"

        response = requests.get(
            signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} get: expected 403, got {response.status_code}: {response.text}"

        response = requests.put(
            signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
            json={"enabled": True, "config": _SAML_CONFIG},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} update: expected 403, got {response.status_code}: {response.text}"

        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.FORBIDDEN, f"{email} delete: expected 403, got {response.status_code}: {response.text}"


def test_apply_license(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_setup_actor(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_role(admin_token, _ACTOR_ROLE_NAME)

    user_id = create_active_user(
        signoz,
        admin_token,
        email=_ACTOR_EMAIL,
        role="signoz-viewer",
        password=_ACTOR_PASSWORD,
        name="auth-domain-fga-test-user",
    )
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", _ACTOR_ROLE_NAME)


def test_actor_without_grants_forbidden(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    a_id = next(domain["id"] for domain in response.json()["data"] if domain["name"] == _TARGET_A)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"list without grant: expected 403, got {response.status_code}: {response.text}"

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={"name": _ACTOR_DOMAIN, "enabled": True, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"create without grant: expected 403, got {response.status_code}: {response.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"read without grant: expected 403, got {response.status_code}: {response.text}"


def test_create_requires_attach_on_mapped_roles(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("create", "metaresource", "auth-domain", ["*"]),
                transaction_group("delete", "metaresource", "auth-domain", ["*"]),
                transaction_group("list", "metaresource", "auth-domain", ["*"]),
                transaction_group("attach", "metaresource", "auth-domain", ["*"]),
                transaction_group("attach", "role", "role", ["signoz-viewer"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    # No roleMapping means SSO users get signoz-viewer, which is granted.
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={"name": _ACTOR_DOMAIN, "enabled": True, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, f"create with default mapping: {response.text}"
    domain_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": _ACTOR_DOMAIN,
            "enabled": True,
            "config": _SAML_CONFIG,
            "roleMapping": {"defaultRole": "EDITOR"},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"map to unattachable role: expected 403, got {response.status_code}: {response.text}"

    # Trusting the IDP role attribute can grant any role, so it needs attach on role "*".
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": _ACTOR_DOMAIN,
            "enabled": True,
            "config": _SAML_CONFIG,
            "roleMapping": {"defaultRole": "VIEWER", "useRoleAttribute": True},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"role attribute without wildcard attach: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("create", "metaresource", "auth-domain", ["*"]),
                transaction_group("delete", "metaresource", "auth-domain", ["*"]),
                transaction_group("list", "metaresource", "auth-domain", ["*"]),
                transaction_group("attach", "metaresource", "auth-domain", ["*"]),
                transaction_group("attach", "role", "role", ["*"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": _ACTOR_DOMAIN,
            "enabled": True,
            "config": _SAML_CONFIG,
            "roleMapping": {"defaultRole": "EDITOR", "groupMappings": {"platform-team": "ADMIN"}},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, f"create with wildcard role attach: {response.text}"
    domain_id = response.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_update_requires_detach_on_stored_roles(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": _ACTOR_DOMAIN,
            "enabled": True,
            "config": _SAML_CONFIG,
            "roleMapping": {"defaultRole": "EDITOR"},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    domain_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("update", "metaresource", "auth-domain", [domain_id]),
                transaction_group("attach", "metaresource", "auth-domain", [domain_id]),
                transaction_group("detach", "metaresource", "auth-domain", [domain_id]),
                transaction_group("attach", "role", "role", ["signoz-viewer"]),
                transaction_group("detach", "role", "role", ["signoz-viewer"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    # Dropping the mapping detaches the stored signoz-editor grant, which the
    # actor cannot detach.
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        json={"enabled": True, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"drop mapping without detach on stored role: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("update", "metaresource", "auth-domain", [domain_id]),
                transaction_group("attach", "metaresource", "auth-domain", [domain_id]),
                transaction_group("detach", "metaresource", "auth-domain", [domain_id]),
                transaction_group("attach", "role", "role", ["signoz-viewer"]),
                transaction_group("detach", "role", "role", ["signoz-editor"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        json={"enabled": True, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"drop mapping with detach on stored role: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_update_with_unchanged_mapping_needs_only_update(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": _DIFF_DOMAIN,
            "enabled": True,
            "config": _SAML_CONFIG,
            "roleMapping": {"defaultRole": "EDITOR"},
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    domain_id = response.json()["data"]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("update", "metaresource", "auth-domain", [domain_id]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    # The mapping is echoed back unchanged, so the attach/detach checks are
    # skipped and update alone suffices.
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        json={
            "enabled": False,
            "config": _SAML_CONFIG,
            "roleMapping": {"defaultRole": "EDITOR"},
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"unchanged mapping with update only: {response.text}"

    # Dropping the mapping attaches signoz-viewer and detaches signoz-editor,
    # neither of which the actor can do.
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        json={"enabled": False, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"changed mapping without attach/detach: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_instance_verbs_scoped_to_granted_domain(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    actor_id = find_role_by_name(signoz, admin_token, _ACTOR_ROLE_NAME)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    ids = {domain["name"]: domain["id"] for domain in response.json()["data"]}
    a_id, b_id = ids[_TARGET_A], ids[_TARGET_B]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/roles/{actor_id}"),
        json={
            "description": "",
            "transactionGroups": [
                transaction_group("read", "metaresource", "auth-domain", [a_id]),
                transaction_group("update", "metaresource", "auth-domain", [a_id]),
                transaction_group("delete", "metaresource", "auth-domain", [a_id]),
                transaction_group("attach", "metaresource", "auth-domain", [a_id]),
                transaction_group("detach", "metaresource", "auth-domain", [a_id]),
                transaction_group("attach", "role", "role", ["signoz-viewer"]),
                transaction_group("detach", "role", "role", ["signoz-viewer"]),
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    token = get_token(_ACTOR_EMAIL, _ACTOR_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, f"read granted domain: {response.text}"

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{b_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"read other domain: expected 403, got {response.status_code}: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
        json={"enabled": False, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"update granted domain: {response.text}"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{b_id}"),
        json={"enabled": False, "config": _SAML_CONFIG},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"update other domain: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{b_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, f"delete other domain: expected 403, got {response.status_code}: {response.text}"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{a_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, f"delete granted domain: {response.text}"
