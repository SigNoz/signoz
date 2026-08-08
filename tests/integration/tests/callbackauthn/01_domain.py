from collections.abc import Callable
from http import HTTPStatus

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
