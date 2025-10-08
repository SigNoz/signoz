from http import HTTPStatus
from typing import Callable

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
            "config": {
                "ssoEnabled": True,
                "ssoType": "google_auth",
                "googleAuthConfig": {
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
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "samlConfig": {
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
    assert data[0]["name"] == "domain-google.integration.test"
    assert data[0]["ssoType"] == "google_auth"
    assert data[1]["name"] == "domain-saml.integration.test"
    assert data[1]["ssoType"] == "saml"


def test_create_invalid(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create a domain with type saml and body for oidc, this should fail because oidcConfig is not allowed for saml
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "domain.integration.test",
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "oidcConfig": {
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
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "samlConfig": {
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
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "samlConfig": {
                    "samlEntity": "saml-entity",
                    "samlIdp": "saml-idp",
                    "samlCert": "saml-cert",
                },
            }
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Create a domain with no config
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "domain.integration.test",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
