from collections.abc import Callable
from http import HTTPStatus

import requests
from selenium import webdriver
from wiremock.resources.mappings import Mapping

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license, assert_user_has_role
from fixtures.types import Operation, SigNoz, TestContainerDocker, TestContainerIDP

# SigNoz is served under /signoz, so the SAML ACS registered with the IdP must
# include the prefix to match the backend-generated AssertionConsumerServiceURL.
BASE_PATH = "/signoz"
SAML_CALLBACK_PATH = f"{BASE_PATH}/api/v1/complete/saml"


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    """
    Applies a license to the signoz instance. add_license is a plain function
    called from the test (function scope), so the function-scoped make_http_mocks
    fixture is safe to use; base_path prefixes the licensing API call.
    """
    add_license(signoz, make_http_mocks, get_token, base_path=BASE_PATH)


def test_create_auth_domain(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    create_saml_client: Callable[[str, str], None],
    get_saml_settings: Callable[[], dict],
    get_token: Callable[[str, str], str],
) -> None:
    """
    Creates a SAML auth domain in SigNoz served under a base path. The ACS
    registered with the IdP carries the /signoz prefix.
    """
    # Create a saml client in the idp with the prefixed ACS.
    create_saml_client("saml.basepath.test", SAML_CALLBACK_PATH)

    # Get the saml settings from keycloak.
    settings = get_saml_settings()

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/signoz/api/v1/domains"),
        json={
            "name": "saml.basepath.test",
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
    create_user_idp: Callable[[str, str, bool, str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    """
    Tests the SAML authn flow when SigNoz is served under a base path. The
    AssertionConsumerServiceURL in the AuthnRequest carries the /signoz prefix;
    the e2e browser login must complete and create the user.
    """
    # Create a user in the idp.
    create_user_idp("viewer@saml.basepath.test", "password", True)

    # Get the session context from signoz which will give the SAML login URL.
    session_context = get_session_context("viewer@saml.basepath.test")

    assert len(session_context["orgs"]) == 1
    assert len(session_context["orgs"][0]["authNSupport"]["callback"]) == 1

    url = session_context["orgs"][0]["authNSupport"]["callback"][0]["url"]

    driver.get(url)
    idp_login("viewer@saml.basepath.test", "password")

    # Assert that the user was created in signoz (lookup under the base path).
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    users = requests.get(
        signoz.self.host_configs["8080"].get("/signoz/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert users.status_code == HTTPStatus.OK, users.text
    user = next((u for u in users.json()["data"] if u["email"] == "viewer@saml.basepath.test"), None)
    assert user is not None, "User with email 'viewer@saml.basepath.test' not found"

    user_with_roles = requests.get(
        signoz.self.host_configs["8080"].get(f"/signoz/api/v2/users/{user['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert user_with_roles.status_code == HTTPStatus.OK, user_with_roles.text
    assert_user_has_role(user_with_roles.json()["data"], "signoz-viewer")
