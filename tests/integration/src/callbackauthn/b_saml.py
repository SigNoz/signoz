from http import HTTPStatus
from typing import Callable, List

import requests
from selenium import webdriver
from wiremock.resources.mappings import Mapping

from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
)
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
    get_saml_settings: Callable[[], dict],
    create_user_admin: Callable[[], None],  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    # Create a saml client in the idp.
    create_saml_client("saml.integration.test", "/api/v1/complete/saml")

    # Get the saml settings from keycloak.
    settings = get_saml_settings()

    # Create a auth domain in signoz.
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "saml.integration.test",
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


def test_saml_authn(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    # Create a user in the idp.
    create_user_idp("viewer@saml.integration.test", "password", True)

    # Get the session context from signoz which will give the SAML login URL.
    session_context = get_session_context("viewer@saml.integration.test")

    assert len(session_context["orgs"]) == 1
    assert len(session_context["orgs"][0]["authNSupport"]["callback"]) == 1

    url = session_context["orgs"][0]["authNSupport"]["callback"][0]["url"]

    driver.get(url)
    idp_login("viewer@saml.integration.test", "password")

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
            if user["email"] == "viewer@saml.integration.test"
        ),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "VIEWER"
