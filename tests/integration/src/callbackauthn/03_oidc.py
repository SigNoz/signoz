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
    create_user_idp: Callable[[str, str, bool, str, str], None],
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


def _get_oidc_domain(signoz: SigNoz, admin_token: str) -> dict:
    """Helper to get the OIDC domain."""
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    return next(
        (
            domain
            for domain in response.json()["data"]
            if domain["name"] == "oidc.integration.test"
        ),
        None,
    )


def _get_user_by_email(signoz: SigNoz, admin_token: str, email: str) -> dict:
    """Helper to get a user by email."""
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    return next(
        (user for user in response.json()["data"] if user["email"] == email),
        None,
    )


def _perform_oidc_login(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    get_session_context: Callable[[str], str],
    idp_login: Callable[[str, str], None],
    email: str,
    password: str,
) -> None:
    """Helper to perform OIDC login flow."""
    session_context = get_session_context(email)
    url = session_context["orgs"][0]["authNSupport"]["callback"][0]["url"]
    parsed_url = urlparse(url)
    actual_url = (
        f"{idp.container.host_configs['6060'].get(parsed_url.path)}?{parsed_url.query}"
    )
    driver.get(actual_url)
    idp_login(email, password)


def test_oidc_update_domain_with_group_mappings(
    signoz: SigNoz,
    idp: TestContainerIDP,
    get_token: Callable[[str, str], str],
    get_oidc_settings: Callable[[str], dict],
) -> None:
    """
    Updates OIDC domain to add role mapping with group mappings and claim mapping.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_oidc_domain(signoz, admin_token)
    client_id = f"oidc.integration.test.{signoz.self.host_configs['8080'].address}:{signoz.self.host_configs['8080'].port}"
    settings = get_oidc_settings(client_id)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/domains/{domain['id']}"),
        json={
            "config": {
                "ssoEnabled": True,
                "ssoType": "oidc",
                "oidcConfig": {
                    "clientId": settings["client_id"],
                    "clientSecret": settings["client_secret"],
                    "issuer": f"{idp.container.container_configs['6060'].get(urlparse(settings['issuer']).path)}",
                    "issuerAlias": settings["issuer"],
                    "getUserInfo": True,
                    "claimMapping": {
                        "email": "email",
                        "name": "name",
                        "groups": "groups",
                        "role": "signoz_role",
                    },
                },
                "roleMapping": {
                    "defaultRole": "VIEWER",
                    "groupMappings": {
                        "signoz-admins": "ADMIN",
                        "signoz-editors": "EDITOR",
                        "signoz-viewers": "VIEWER",
                    },
                    "useRoleAttribute": False,
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT


def test_oidc_role_mapping_single_group_admin(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: OIDC user in 'signoz-admins' group gets ADMIN role.
    """
    email = "admin-group-user@oidc.integration.test"
    create_user_idp_with_groups(email, "password123", True, ["signoz-admins"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "ADMIN"


def test_oidc_role_mapping_single_group_editor(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: OIDC user in 'signoz-editors' group gets EDITOR role.
    """
    email = "editor-group-user@oidc.integration.test"
    create_user_idp_with_groups(email, "password123", True, ["signoz-editors"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "EDITOR"


def test_oidc_role_mapping_multiple_groups_highest_wins(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: OIDC user in multiple groups gets highest role.
    User is in 'signoz-viewers' and 'signoz-admins'.
    Expected: User gets ADMIN (highest of the two).
    """
    email = "multi-group-user@oidc.integration.test"
    create_user_idp_with_groups(email, "password123", True, ["signoz-viewers", "signoz-admins"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "ADMIN"


def test_oidc_role_mapping_explicit_viewer_group(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: OIDC user explicitly mapped to VIEWER via groups gets VIEWER.
    Tests the bug where VIEWER mappings were ignored.
    """
    email = "viewer-group-user@oidc.integration.test"
    create_user_idp_with_groups(email, "password123", True, ["signoz-viewers"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "VIEWER"


def test_oidc_role_mapping_unmapped_group_uses_default(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: OIDC user in unmapped group falls back to default role.
    """
    email = "unmapped-group-user@oidc.integration.test"
    create_user_idp_with_groups(email, "password123", True, ["some-other-group"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "VIEWER"


def test_oidc_update_domain_with_use_role_claim(
    signoz: SigNoz,
    idp: TestContainerIDP,
    get_token: Callable[[str, str], str],
    get_oidc_settings: Callable[[str], dict],
) -> None:
    """
    Updates OIDC domain to enable useRoleClaim.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_oidc_domain(signoz, admin_token)
    client_id = f"oidc.integration.test.{signoz.self.host_configs['8080'].address}:{signoz.self.host_configs['8080'].port}"
    settings = get_oidc_settings(client_id)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/domains/{domain['id']}"),
        json={
            "config": {
                "ssoEnabled": True,
                "ssoType": "oidc",
                "oidcConfig": {
                    "clientId": settings["client_id"],
                    "clientSecret": settings["client_secret"],
                    "issuer": f"{idp.container.container_configs['6060'].get(urlparse(settings['issuer']).path)}",
                    "issuerAlias": settings["issuer"],
                    "getUserInfo": True,
                    "claimMapping": {
                        "email": "email",
                        "name": "name",
                        "groups": "groups",
                        "role": "signoz_role",
                    },
                },
                "roleMapping": {
                    "defaultRole": "VIEWER",
                    "groupMappings": {
                        "signoz-admins": "ADMIN",
                        "signoz-editors": "EDITOR",
                    },
                    "useRoleAttribute": True,
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT


def test_oidc_role_mapping_role_claim_takes_precedence(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_role: Callable[[str, str, bool, str, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
    setup_user_profile: Callable[[], None],
) -> None:
    """
    Test: useRoleAttribute takes precedence over group mappings.
    User is in 'signoz-editors' group but has role claim 'ADMIN'.
    Expected: User gets ADMIN (from role claim).
    """
    setup_user_profile()
    email = "role-claim-precedence@oidc.integration.test"
    create_user_idp_with_role(email, "password123", True, "ADMIN", ["signoz-editors"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "ADMIN"


def test_oidc_role_mapping_invalid_role_claim_fallback(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_role: Callable[[str, str, bool, str, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
    setup_user_profile: Callable[[], None],
) -> None:
    """
    Test: Invalid role claim falls back to group mappings.
    User has invalid role 'SUPERADMIN' and is in 'signoz-editors'.
    Expected: User gets EDITOR (from group mapping).
    """
    setup_user_profile()
    email = "invalid-role-user@oidc.integration.test"
    create_user_idp_with_role(email, "password123", True, "SUPERADMIN", ["signoz-editors"])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "EDITOR"


def test_oidc_role_mapping_case_insensitive(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp_with_role: Callable[[str, str, bool, str, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
    setup_user_profile: Callable[[], None],
) -> None:
    """
    Test: Role claim matching is case-insensitive.
    User has role 'editor' (lowercase).
    Expected: User gets EDITOR role.
    """
    setup_user_profile()
    email = "lowercase-role-user@oidc.integration.test"
    create_user_idp_with_role(email, "password123", True, "editor", [])

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "EDITOR"


def test_oidc_name_mapping(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool, str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    """Test that user's display name is mapped from IDP name claim."""
    email = "named-user@oidc.integration.test"
    
    # Create user with explicit first/last name
    create_user_idp(
        email, 
        "password123", 
        True,
        first_name="John",
        last_name="Doe"
    )

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")
    
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    
    assert response.status_code == HTTPStatus.OK
    users = response.json()["data"]
    found_user = next((u for u in users if u["email"] == email), None)
    
    assert found_user is not None
    # Keycloak concatenates firstName + lastName into "name" claim
    assert found_user["displayName"] == "John Doe"
    assert found_user["role"] == "VIEWER"  # Default role


def test_oidc_empty_name_uses_fallback(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool, str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    """Test that user without name in IDP still gets created (may have empty displayName)."""
    email = "no-name@oidc.integration.test"
    
    # Create user without first/last name
    create_user_idp(email, "password123", True)

    _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")
    
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    
    assert response.status_code == HTTPStatus.OK
    users = response.json()["data"]
    found_user = next((u for u in users if u["email"] == email), None)
    
    # User should still be created even with empty name
    assert found_user is not None
    assert found_user["role"] == "VIEWER"
    # Note: displayName may be empty - this is a known limitation


# def test_oidc_role_mapping_update_on_subsequent_login(
#     signoz: SigNoz,
#     idp: TestContainerIDP,
#     driver: webdriver.Chrome,
#     create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
#     add_user_to_group: Callable[[str, str], None],
#     idp_login: Callable[[str, str], None],
#     get_token: Callable[[str, str], str],
#     get_session_context: Callable[[str], str],
# ) -> None:
#     """
#     Test: User's role should update on subsequent logins when IDP groups change.
    
#     This tests the critical bug where GetOrCreateUser doesn't update roles.
    
#     Steps:
#     1. User logs in with 'signoz-editors' group -> gets EDITOR role
#     2. User's group changes in IDP to 'signoz-admins'
#     3. User logs in again -> should get ADMIN role
#     """
#     email = "role-update-user@oidc.integration.test"
    
#     # First login with EDITOR group
#     create_user_idp_with_groups(email, "password123", True, ["signoz-editors"])
#     _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

#     admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
#     found_user = _get_user_by_email(signoz, admin_token, email)

#     assert found_user is not None
#     assert found_user["role"] == "EDITOR"

#     # Add user to admin group in IDP
#     add_user_to_group(email, "signoz-admins")

#     # Clear browser session and login again
#     driver.delete_all_cookies()
#     _perform_oidc_login(signoz, idp, driver, get_session_context, idp_login, email, "password123")

#     # Check if role was updated
#     found_user = _get_user_by_email(signoz, admin_token, email)

#     assert found_user is not None
#     # After fix, this should be ADMIN. Currently stays EDITOR (bug).
#     assert found_user["role"] == "ADMIN"


#!########################################################################
#!############## KEEP THIS IN THE END ALWAYS #############################
#!########################################################################
def test_cleanup_oidc_domain(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    """Cleanup: Remove the OIDC domain after tests complete."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_oidc_domain(signoz, admin_token)
    
    if domain:
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/domains/{domain['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=2,
        )
        # 204 No Content or 200 OK are both valid
        assert response.status_code in [HTTPStatus.OK, HTTPStatus.NO_CONTENT, HTTPStatus.NOT_FOUND]
