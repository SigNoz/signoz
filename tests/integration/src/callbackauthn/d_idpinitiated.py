"""
Tests for IDP initiated SAML Login flow
"""

from http import HTTPStatus
from typing import Callable, List, Mapping
from selenium import webdriver
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.types import Operation, SigNoz, TestContainerDocker, TestContainerIDP


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, List[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)


def test_create_auth_domain(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    create_saml_client: Callable[[str, str], None],
    update_saml_client_attributes: Callable[[str, str, str, str], None],
    get_saml_settings: Callable[[], dict],
    create_user_admin: Callable[[], None],  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    # Create a saml client in the idp.
    create_saml_client("idp-initiated-saml.integration.test", "/api/v1/complete/saml")

    # Get the saml settings from keycloak.
    settings = get_saml_settings()

    # Create a auth domain in signoz.
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Create the domain in SigNoz
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "idp-initiated-saml.integration.test",
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "samlConfig": {
                    "samlEntity": settings["entityID"],
                    "samlIdp": settings["singleSignOnServiceLocation"],
                    "samlCert": settings["certificate"],
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    created_domain_id: str = response.json()["data"]["id"]
    created_domain_id = created_domain_id.replace("-", ":")

    # Get the relay state url from domains API
    relay_state_url = signoz.self.host_configs["8080"].base() + "/login?domain_id=" + created_domain_id

    # Update the saml client with new attributes
    update_saml_client_attributes(
        "idp-initiated-saml.integration.test",
        {
            "saml_idp_initiated_sso_url_name": "idp-initiated-saml-test",
            "saml_idp_initiated_sso_relay_state": relay_state_url,
            "saml_assertion_consumer_url_post": signoz.self.host_configs["8080"].get("/api/v1/complete/saml")
        }
    )


def test_idp_initiated_saml_authn(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    # Create a user in the idp.
    create_user_idp("viewer@idp-initiated-saml.integration.test", "password", True)

    # Get the session context from signoz which will give the SAML login URL.
    session_context = get_session_context("viewer@idp-initiated-saml.integration.test")

    assert len(session_context["orgs"]) == 1
    assert len(session_context["orgs"][0]["authNSupport"]["callback"]) == 1

    idp_initiated_login_url = idp.container.host_configs["6060"].base() + "/realms/master/protocol/saml/clients/idp-initiated-saml-test"

    driver.get(idp_initiated_login_url)
    idp_login("viewer@idp-initiated-saml.integration.test", "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Assert that the user was created in signoz.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (
            user
            for user in user_response
            if user["email"] == "viewer@idp-initiated-saml.integration.test"
        ),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "VIEWER"
