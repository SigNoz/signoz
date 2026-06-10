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

    # Get domains which should be an empty list
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    data = response.json()["data"]
    assert len(data) == 0

    # Create a domain with google auth config
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "domain-google.integration.test",
            "ssoEnabled": True,
            "provider": {
                "type": "google_auth",
                "config": {
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
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "domain-saml.integration.test",
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    # List the domains
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
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
        assert domain["provider"]["type"] in ["google_auth", "saml"]


def test_create_invalid(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a domain with type saml but an oidc-shaped config; this should fail
    # because the config is decoded as SAML and fails SAML validation.
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "domain.integration.test",
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
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

    # Create a domain with invalid name
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "$%^invalid",
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with no name
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with no provider
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
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
    """Test that invalid role mappings are rejected."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create domain with invalid defaultRole
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "invalid-role-test.integration.test",
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
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
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "invalid-group-role.integration.test",
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
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
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "valid-role-mapping.integration.test",
            "ssoEnabled": True,
            "provider": {
                "type": "saml",
                "config": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
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
