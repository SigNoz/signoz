from http import HTTPStatus
from typing import Callable, List
from urllib.parse import urlparse

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
    """
    This applies a license to the signoz instance.
    """
    add_license(signoz, make_http_mocks, get_token)


def test_create_auth_domain(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    create_oidc_client: Callable[[str, str], None],
    get_oidc_settings: Callable[[], dict],
    create_user_admin: Callable[[], None],  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    This creates an OIDC auth domain in signoz.
    """
    client_id = f"oidc.integration.test.{signoz.self.host_configs['8080'].address}:{signoz.self.host_configs['8080'].port}"
    # Create a saml client in the idp.
    create_oidc_client(client_id, "/api/v1/complete/oidc")

    # Get the saml settings from keycloak.
    settings = get_oidc_settings(client_id)

    # Create a auth domain in signoz.
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        json={
            "name": "oidc.integration.test",
            "config": {
                "ssoEnabled": True,
                "ssoType": "oidc",
                "oidcConfig": {
                    "clientId": settings["client_id"],
                    "clientSecret": settings["client_secret"],
                    # Change the hostname of the issuer to the internal resolvable hostname of the idp
                    "issuer": f"{idp.container.container_configs['6060'].get(urlparse(settings["issuer"]).path)}",
                    "issuerAlias": settings["issuer"],
                    "getUserInfo": True,
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED


def test_oidc_authn(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    This tests the OIDC authn flow.
    It uses a web browser to login to the idp and then asserts that the user was created in signoz.
    """
    # Create a user in the idp.
    create_user_idp("viewer@oidc.integration.test", "password123", True)

    # Get the session context from signoz which will give the OIDC login URL.
    session_context = get_session_context("viewer@oidc.integration.test")

    assert len(session_context["orgs"]) == 1
    assert len(session_context["orgs"][0]["authNSupport"]["callback"]) == 1

    url = session_context["orgs"][0]["authNSupport"]["callback"][0]["url"]

    # change the url to the external resolvable hostname of the idp
    parsed_url = urlparse(url)
    actual_url = (
        f"{idp.container.host_configs['6060'].get(parsed_url.path)}?{parsed_url.query}"
    )

    driver.get(actual_url)
    idp_login("viewer@oidc.integration.test", "password123")

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
            if user["email"] == "viewer@oidc.integration.test"
        ),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "VIEWER"
