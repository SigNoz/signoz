from http import HTTPStatus
from typing import Any, Callable, Dict, List

import requests
from selenium import webdriver
from wiremock.resources.mappings import Mapping
import uuid

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
    update_saml_client_attributes: Callable[[str, Dict[str, Any]], None],
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

    # Get the domains from signoz
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    found_domain = None

    if len(response.json()["data"]) > 0:
        found_domain = next(
            (
                domain
                for domain in response.json()["data"]
                if domain["name"] == "saml.integration.test"
            ),
            None,
        )

    relay_state_path = found_domain["authNProviderInfo"]["relayStatePath"]

    assert relay_state_path is not None

    # Get the relay state url from domains API
    relay_state_url = signoz.self.host_configs["8080"].base() + "/" + relay_state_path

    # Update the saml client with new attributes
    update_saml_client_attributes(
        f"{signoz.self.host_configs['8080'].address}:{signoz.self.host_configs['8080'].port}",
        {
            "saml_idp_initiated_sso_url_name": "idp-initiated-saml-test",
            "saml_idp_initiated_sso_relay_state": relay_state_url,
        },
    )


def test_saml_authn(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool, str, str], None],
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


def test_idp_initiated_saml_authn(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool, str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    # Create a user in the idp.
    create_user_idp("viewer.idp.initiated@saml.integration.test", "password", True)

    # Get the session context from signoz which will give the SAML login URL.
    session_context = get_session_context("viewer.idp.initiated@saml.integration.test")

    assert len(session_context["orgs"]) == 1
    assert len(session_context["orgs"][0]["authNSupport"]["callback"]) == 1

    idp_initiated_login_url = (
        idp.container.host_configs["6060"].base()
        + "/realms/master/protocol/saml/clients/idp-initiated-saml-test"
    )

    driver.get(idp_initiated_login_url)
    idp_login("viewer.idp.initiated@saml.integration.test", "password")

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
            if user["email"] == "viewer.idp.initiated@saml.integration.test"
        ),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "VIEWER"


def _get_saml_domain(signoz: SigNoz, admin_token: str) -> dict:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    return next(
        (
            domain
            for domain in response.json()["data"]
            if domain["name"] == "saml.integration.test"
        ),
        None,
    )


def _get_user_by_email(signoz: SigNoz, admin_token: str, email: str) -> dict:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    return next(
        (user for user in response.json()["data"] if user["email"] == email),
        None,
    )


def _perform_saml_login(
    signoz: SigNoz,
    driver: webdriver.Chrome,
    get_session_context: Callable[[str], str],
    idp_login: Callable[[str, str], None],
    email: str,
    password: str,
) -> None:
    session_context = get_session_context(email)
    url = session_context["orgs"][0]["authNSupport"]["callback"][0]["url"]
    driver.get(url)
    idp_login(email, password)


def test_saml_update_domain_with_group_mappings(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
    get_saml_settings: Callable[[], dict],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_saml_domain(signoz, admin_token)
    settings = get_saml_settings()

    # update the existing saml domain to have role mappings also
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/domains/{domain['id']}"),
        json={
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "samlConfig": {
                    "samlEntity": settings["entityID"],
                    "samlIdp": settings["singleSignOnServiceLocation"],
                    "samlCert": settings["certificate"],
                    "samlAttributeMapping": {
                        "name": "givenName",
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


def test_saml_role_mapping_single_group_admin(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: User in 'signoz-admins' group gets ADMIN role.
    """
    email = "admin-group-user@saml.integration.test"
    create_user_idp_with_groups(email, "password", True, ["signoz-admins"])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "ADMIN"


def test_saml_role_mapping_single_group_editor(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: User in 'signoz-editors' group gets EDITOR role.
    """
    email = "editor-group-user@saml.integration.test"
    create_user_idp_with_groups(email, "password", True, ["signoz-editors"])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "EDITOR"


def test_saml_role_mapping_multiple_groups_highest_wins(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: User in multiple groups gets highest role.
    User is in both 'signoz-viewers' and 'signoz-editors'.
    Expected: User gets EDITOR (highest of VIEWER and EDITOR).
    """
    email = f"multi-group-user-{uuid.uuid4().hex[:8]}@saml.integration.test"
    create_user_idp_with_groups(email, "password", True, ["signoz-viewers", "signoz-editors"])

    # DEBUG: Verify user has both groups in Keycloak
    from keycloak import KeycloakAdmin
    kc = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username="admin",
        password="password",
        realm_name="master",
    )
    user_id = kc.get_user_id(email)
    groups = kc.get_user_groups(user_id)
    print(f"\n=== DEBUG: User groups in Keycloak: {[g['name'] for g in groups]} ===\n")

    # DEBUG: Check if domain has role mappings configured
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_saml_domain(signoz, admin_token)
    print(f"\n=== DEBUG: Domain role mapping config: {domain.get('roleMapping')} ===\n")
    print(f"domain: {domain}")

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "EDITOR"


def test_saml_role_mapping_explicit_viewer_group(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: User explicitly mapped to VIEWER via groups should get VIEWER.
    This tests the bug where VIEWER group mappings were incorrectly ignored.
    """
    email = "viewer-group-user@saml.integration.test"
    create_user_idp_with_groups(email, "password", True, ["signoz-viewers"])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "VIEWER"


def test_saml_role_mapping_unmapped_group_uses_default(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_groups: Callable[[str, str, bool, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """
    Test: User in unmapped group falls back to default role (VIEWER).
    """
    email = "unmapped-group-user@saml.integration.test"
    create_user_idp_with_groups(email, "password", True, ["some-other-group"])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "VIEWER"


def test_saml_update_domain_with_use_role_claim(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
    get_saml_settings: Callable[[], dict],
) -> None:
    """
    Updates SAML domain to enable useRoleAttribute (direct role attribute).
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_saml_domain(signoz, admin_token)
    settings = get_saml_settings()

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v1/domains/{domain['id']}"),
        json={
            "config": {
                "ssoEnabled": True,
                "ssoType": "saml",
                "samlConfig": {
                    "samlEntity": settings["entityID"],
                    "samlIdp": settings["singleSignOnServiceLocation"],
                    "samlCert": settings["certificate"],
                    "samlAttributeMapping": {
                        "name": "displayName",
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


def test_saml_role_mapping_role_claim_takes_precedence(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_role: Callable[[str, str, bool, str, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
    setup_user_profile: Callable[[], None],
) -> None:
    """
    Test: useRoleAttribute takes precedence over group mappings.
    User is in 'signoz-editors' group but has role attribute 'ADMIN'.
    Expected: User gets ADMIN (from role attribute).
    """

    setup_user_profile()

    email = "role-claim-precedence@saml.integration.test"
    create_user_idp_with_role(email, "password", True, "ADMIN", ["signoz-editors"])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "ADMIN"


def test_saml_role_mapping_invalid_role_claim_fallback(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
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
    email = "invalid-role-user@saml.integration.test"
    create_user_idp_with_role(email, "password", True, "SUPERADMIN", ["signoz-editors"])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "EDITOR"


def test_saml_role_mapping_case_insensitive(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    driver: webdriver.Chrome,
    create_user_idp_with_role: Callable[[str, str, bool, str, List[str]], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
    setup_user_profile: Callable[[], None],
) -> None:
    """
    Test: Role attribute matching is case-insensitive.
    User has role 'admin' (lowercase).
    Expected: User gets ADMIN role.
    """
    setup_user_profile()
    email = "lowercase-role-user@saml.integration.test"
    create_user_idp_with_role(email, "password", True, "admin", [])

    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)

    assert found_user is not None
    assert found_user["role"] == "ADMIN"


def test_saml_name_mapping(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool, str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """Test that user's display name is mapped from SAML displayName attribute."""
    email = "named-user@saml.integration.test"
    
    create_user_idp(email, "password", True, "Jane", "Smith")
    
    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")
    
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)
    
    assert found_user is not None
    assert found_user["displayName"] == "Jane" # We are only mapping the first name here
    assert found_user["role"] == "VIEWER"


def test_saml_empty_name_fallback(
    signoz: SigNoz,
    idp: TestContainerIDP,
    driver: webdriver.Chrome,
    create_user_idp: Callable[[str, str, bool, str, str], None],
    idp_login: Callable[[str, str], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], str],
) -> None:
    """Test that user without displayName in IDP still gets created."""
    email = "no-name@saml.integration.test"
    
    create_user_idp(email, "password", True)
    
    _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")
    
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = _get_user_by_email(signoz, admin_token, email)
    
    assert found_user is not None
    assert found_user["role"] == "VIEWER"


# def test_saml_role_mapping_update_on_subsequent_login(
#     signoz: SigNoz,
#     idp: TestContainerIDP,  # pylint: disable=unused-argument
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
#     email = "role-update-user@saml.integration.test"
    
#     # First login with EDITOR group
#     create_user_idp_with_groups(email, "password", True, ["signoz-editors"])
#     _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

#     admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
#     found_user = _get_user_by_email(signoz, admin_token, email)

#     assert found_user is not None
#     assert found_user["role"] == "EDITOR"

#     # Add user to admin group in IDP
#     add_user_to_group(email, "signoz-admins")

#     # Clear browser session and login again
#     driver.delete_all_cookies()
#     _perform_saml_login(signoz, driver, get_session_context, idp_login, email, "password")

#     # Check if role was updated
#     found_user = _get_user_by_email(signoz, admin_token, email)

#     assert found_user is not None
#     # After fix, this should be ADMIN. Currently stays EDITOR (bug).
#     assert found_user["role"] == "ADMIN"


#!########################################################################
#!############## KEEP THIS IN THE END ALWAYS #############################
#!########################################################################
def test_cleanup_saml_domain(
    signoz: SigNoz,
    idp: TestContainerIDP,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Cleanup: Remove the SAML domain after tests complete."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    domain = _get_saml_domain(signoz, admin_token)
    
    if domain:
        response = requests.delete(
            signoz.self.host_configs["8080"].get(f"/api/v1/domains/{domain['id']}"),
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=2,
        )
        # 204 No Content or 200 OK are both valid
        assert response.status_code in [HTTPStatus.OK, HTTPStatus.NO_CONTENT, HTTPStatus.NOT_FOUND]

    # also remove the saml client from the idp
    response = requests.delete(
        idp.container.host_configs["6060"].get(f"/realms/master/clients/{domain['id']}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code in [HTTPStatus.OK, HTTPStatus.NO_CONTENT, HTTPStatus.NOT_FOUND]
