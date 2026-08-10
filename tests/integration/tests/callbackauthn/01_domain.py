from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz


def test_create_and_get_domain(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Reruns against a reused stack find domains from previous runs; drop them
    # all so the suite starts from a clean slate.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    for domain in response.json()["data"]:
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=2,
        )
        assert response.status_code == HTTPStatus.NO_CONTENT

    # Create a domain with google auth config
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "domain-google.integration.test",
            "enabled": True,
            "config": {
                "kind": "google",
                "spec": {
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "redirectURI": "redirect-uri",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    # Create a domain with saml config
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "domain-saml.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    # List the domains
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    data = response.json()["data"]

    assert len(data) == 2

    for domain in data:
        assert domain["name"] in [
            "domain-google.integration.test",
            "domain-saml.integration.test",
        ]
        assert domain["config"]["kind"] in ["google", "saml"]


def test_create_invalid(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a domain with kind saml and a spec for oidc, this should fail because the spec does not match the kind
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "domain.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "issuer": "issuer",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with a kind but no spec
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "domain.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with invalid name
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "$%^invalid",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with no name
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with no config
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "domain.integration.test",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_create_invalid_role_mapping(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create domain with invalid defaultRole
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "invalid-role-test.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
            "roleMapping": {
                "defaultRole": "SUPERADMIN",  # Invalid role
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create domain with invalid role in groupMappings
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "invalid-group-role.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
            "roleMapping": {
                "defaultRole": "VIEWER",
                "groupMappings": {
                    "admins": "SUPERUSER",  # Invalid role
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Valid role mapping should succeed
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "valid-role-mapping.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
            "roleMapping": {
                "defaultRole": "VIEWER",
                "groupMappings": {
                    "signoz-admins": "ADMIN",
                    "signoz-editors": "EDITOR",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED


@pytest.mark.parametrize(
    ("config", "role_mapping", "expected_config", "expected_role_mapping"),
    [
        pytest.param(
            {
                "kind": "google",
                "spec": {"clientId": "client-id", "clientSecret": "client-secret"},
            },
            None,
            {
                "kind": "google",
                "spec": {
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "redirectURI": "",
                    "fetchGroups": False,
                    "insecureSkipEmailVerified": False,
                },
            },
            None,
            id="google_minimal",
        ),
        pytest.param(
            {
                "kind": "google",
                "spec": {
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "redirectURI": "https://redirect.integration.test",
                    "fetchGroups": True,
                    "serviceAccountJson": '{"type": "service_account"}',
                    "domainToAdminEmail": {
                        "roundtrip.integration.test": "admin@roundtrip.integration.test",
                        "*": "fallback@roundtrip.integration.test",
                    },
                    "fetchTransitiveGroupMembership": True,
                    "allowedGroups": ["group-one", "group-two"],
                    "insecureSkipEmailVerified": True,
                },
            },
            None,
            {
                "kind": "google",
                "spec": {
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "redirectURI": "https://redirect.integration.test",
                    "fetchGroups": True,
                    "serviceAccountJson": '{"type": "service_account"}',
                    "domainToAdminEmail": {
                        "roundtrip.integration.test": "admin@roundtrip.integration.test",
                        "*": "fallback@roundtrip.integration.test",
                    },
                    "fetchTransitiveGroupMembership": True,
                    "allowedGroups": ["group-one", "group-two"],
                    "insecureSkipEmailVerified": True,
                },
            },
            None,
            id="google_full",
        ),
        pytest.param(
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                },
            },
            None,
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                    "insecureSkipAuthNRequestsSigned": False,
                    "attributeMapping": {"email": "email", "name": "name", "groups": "groups", "role": "role"},
                },
            },
            None,
            id="saml_minimal",
        ),
        pytest.param(
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                    "insecureSkipAuthNRequestsSigned": True,
                    "attributeMapping": {"email": "mail"},
                },
            },
            None,
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                    "insecureSkipAuthNRequestsSigned": True,
                    "attributeMapping": {"email": "mail", "name": "name", "groups": "groups", "role": "role"},
                },
            },
            None,
            id="saml_partial_attribute_mapping",
        ),
        pytest.param(
            {
                "kind": "oidc",
                "spec": {
                    "issuer": "https://issuer.integration.test",
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                },
            },
            None,
            {
                "kind": "oidc",
                "spec": {
                    "issuer": "https://issuer.integration.test",
                    "issuerAlias": "",
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "claimMapping": {"email": "email", "name": "name", "groups": "groups", "role": "role"},
                    "insecureSkipEmailVerified": False,
                    "getUserInfo": False,
                },
            },
            None,
            id="oidc_minimal",
        ),
        pytest.param(
            {
                "kind": "oidc",
                "spec": {
                    "issuer": "https://issuer.integration.test",
                    "issuerAlias": "https://alias.integration.test",
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "claimMapping": {"email": "eml", "name": "nm", "groups": "grps", "role": "rl"},
                    "insecureSkipEmailVerified": True,
                    "getUserInfo": True,
                },
            },
            None,
            {
                "kind": "oidc",
                "spec": {
                    "issuer": "https://issuer.integration.test",
                    "issuerAlias": "https://alias.integration.test",
                    "clientId": "client-id",
                    "clientSecret": "client-secret",
                    "claimMapping": {"email": "eml", "name": "nm", "groups": "grps", "role": "rl"},
                    "insecureSkipEmailVerified": True,
                    "getUserInfo": True,
                },
            },
            None,
            id="oidc_full",
        ),
        pytest.param(
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                },
            },
            {
                "defaultRole": "EDITOR",
                "groupMappings": {"platform-team": "ADMIN"},
                "useRoleAttribute": False,
            },
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                    "insecureSkipAuthNRequestsSigned": False,
                    "attributeMapping": {"email": "email", "name": "name", "groups": "groups", "role": "role"},
                },
            },
            {
                "defaultRole": "signoz-editor",
                "groupMappings": {"platform-team": "signoz-admin"},
                "useRoleAttribute": False,
            },
            id="role_mapping_names_normalized",
        ),
        pytest.param(
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                },
            },
            {"defaultRole": "VIEWER", "useRoleAttribute": True},
            {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "https://idp.integration.test/sso",
                    "certificate": "saml-cert",
                    "insecureSkipAuthNRequestsSigned": False,
                    "attributeMapping": {"email": "email", "name": "name", "groups": "groups", "role": "role"},
                },
            },
            {"defaultRole": "signoz-viewer", "groupMappings": None, "useRoleAttribute": True},
            id="role_mapping_null_group_mappings",
        ),
    ],
)
def test_domain_roundtrip(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    config: dict,
    role_mapping: dict | None,
    expected_config: dict,
    expected_role_mapping: dict | None,
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Drop a same-named leftover so reruns against a reused stack stay green.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    for domain in response.json()["data"]:
        if domain["name"] == "roundtrip.integration.test":
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=2,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "roundtrip.integration.test",
            "enabled": True,
            "config": config,
            "roleMapping": role_mapping,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED
    domain_id = response.json()["data"]["id"]

    # Clients (e.g. the terraform provider) read state back with a follow-up
    # GET after every write, so posted values must round-trip exactly; the
    # server-side defaulting and role-name normalization pinned here are part
    # of that contract.
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]

    assert data["name"] == "roundtrip.integration.test"
    assert data["enabled"] is True
    assert data["config"] == expected_config
    assert data["roleMapping"] == expected_role_mapping

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT


def test_patch_enabled(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Drop a same-named leftover so reruns against a reused stack stay green.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    for domain in response.json()["data"]:
        if domain["name"] == "patch.integration.test":
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=2,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": "patch.integration.test",
            "enabled": True,
            "config": {
                "kind": "saml",
                "spec": {
                    "entityId": "saml-entity",
                    "location": "saml-idp",
                    "certificate": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED
    domain_id = response.json()["data"]["id"]

    # Patching enforcement must flip only the enabled flag; the provider
    # config stays untouched.
    response = requests.patch(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        json={"enabled": False},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    data = response.json()["data"]

    assert data["enabled"] is False
    assert data["config"] == {
        "kind": "saml",
        "spec": {
            "entityId": "saml-entity",
            "location": "saml-idp",
            "certificate": "saml-cert",
            "insecureSkipAuthNRequestsSigned": False,
            "attributeMapping": {"email": "email", "name": "name", "groups": "groups", "role": "role"},
        },
    }

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT
