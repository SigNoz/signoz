from typing import Any, Callable, Dict, List
from urllib.parse import urljoin
from xml.etree import ElementTree

import pytest
import requests
from keycloak import KeycloakAdmin
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from fixtures import types
from fixtures.idp import IDP_ROOT_PASSWORD, IDP_ROOT_USERNAME


@pytest.fixture(name="create_saml_client", scope="function")
def create_saml_client(
    idp: types.TestContainerIDP, signoz: types.SigNoz
) -> Callable[[str, str], None]:
    def _create_saml_client(client_id: str, callback_path: str) -> None:
        client = KeycloakAdmin(
            server_url=idp.container.host_configs["6060"].base(),
            username=IDP_ROOT_USERNAME,
            password=IDP_ROOT_PASSWORD,
            realm_name="master",
        )

        # DELETE existing client if it exists (to ensure mappers are updated)
        saml_client_id = f"{signoz.self.host_configs['8080'].address}:{signoz.self.host_configs['8080'].port}"
        try:
            existing_client_id = client.get_client_id(client_id=saml_client_id)
            if existing_client_id:
                client.delete_client(existing_client_id)
        except Exception:
            pass  # Client doesn't exist, that's fine

        client.create_client(
            skip_exists=True,
            payload={
                "clientId": f"{signoz.self.host_configs['8080'].address}:{signoz.self.host_configs['8080'].port}",
                "name": f"{client_id}",
                "description": f"client for {client_id}",
                "rootUrl": "",
                "adminUrl": "",
                "baseUrl": urljoin(
                    f"{signoz.self.host_configs['8080'].base()}", callback_path
                ),
                "surrogateAuthRequired": False,
                "enabled": True,
                "alwaysDisplayInConsole": False,
                "clientAuthenticatorType": "client-secret",
                "redirectUris": [f"{signoz.self.host_configs['8080'].base()}/*"],
                "webOrigins": [],
                "notBefore": 0,
                "bearerOnly": False,
                "consentRequired": False,
                "standardFlowEnabled": True,
                "implicitFlowEnabled": False,
                "directAccessGrantsEnabled": False,
                "serviceAccountsEnabled": False,
                "publicClient": True,
                "frontchannelLogout": True,
                "protocol": "saml",
                "attributes": {
                    "saml.assertion.signature": "false",
                    "saml.force.post.binding": "true",
                    "saml.encrypt": "false",
                    "saml.server.signature": "true",
                    "saml.server.signature.keyinfo.ext": "false",
                    "realm_client": "false",
                    "saml.artifact.binding": "false",
                    "saml.signature.algorithm": "RSA_SHA256",
                    "saml_force_name_id_format": "false",
                    "saml.client.signature": "false",
                    "saml.authnstatement": "true",
                    "display.on.consent.screen": "false",
                    "saml_name_id_format": "email",
                    "saml.allow.ecp.flow": "false",
                    "saml_signature_canonicalization_method": "http://www.w3.org/2001/10/xml-exc-c14n#",
                    "saml.onetimeuse.condition": "false",
                    "saml.server.signature.keyinfo.xmlSigKeyInfoKeyNameTransformer": "NONE",
                    "saml_assertion_consumer_url_post": urljoin(
                        f"{signoz.self.host_configs['8080'].base()}", callback_path
                    ),
                },
                "authenticationFlowBindingOverrides": {},
                "fullScopeAllowed": True,
                "nodeReRegistrationTimeout": -1,
                "protocolMappers": [
                    {
                        "name": "X500 givenName",
                        "protocol": "saml",
                        "protocolMapper": "saml-user-property-mapper",
                        "consentRequired": False,
                        "config": {
                            "attribute.nameformat": "urn:oasis:names:tc:SAML:2.0:attrname-format:uri",
                            "user.attribute": "firstName",
                            "friendly.name": "givenName",
                            "attribute.name": "urn:oid:2.5.4.42",
                        },
                    },
                    {
                        "name": "X500 email",
                        "protocol": "saml",
                        "protocolMapper": "saml-user-property-mapper",
                        "consentRequired": False,
                        "config": {
                            "attribute.nameformat": "urn:oasis:names:tc:SAML:2.0:attrname-format:uri",
                            "user.attribute": "email",
                            "friendly.name": "email",
                            "attribute.name": "urn:oid:1.2.840.113549.1.9.1",
                        },
                    },
                    {
                        "name": "role list",
                        "protocol": "saml",
                        "protocolMapper": "saml-role-list-mapper",
                        "consentRequired": False,
                        "config": {
                            "single": "false",
                            "attribute.nameformat": "Basic",
                            "attribute.name": "Role",
                        },
                    },
                    {
                        "name": "groups",
                        "protocol": "saml",
                        "protocolMapper": "saml-group-membership-mapper",
                        "consentRequired": False,
                        "config": {
                            "full.path": "false",
                            "attribute.nameformat": "Basic",
                            "single": "true", # ! this was changed to true as we need the groups in the single attribute section
                            "friendly.name": "groups",
                            "attribute.name": "groups",
                        },
                    },
                    {
                        "name": "role attribute",
                        "protocol": "saml",
                        "protocolMapper": "saml-user-attribute-mapper",
                        "consentRequired": False,
                        "config": {
                            "attribute.nameformat": "Basic",
                            "user.attribute": "signoz_role",
                            "friendly.name": "signoz_role",
                            "attribute.name": "signoz_role",
                        },
                    },
                    {
                        "name": "displayName",
                        "protocol": "saml",
                        "protocolMapper": "saml-user-property-mapper",
                        "consentRequired": False,
                        "config": {
                            "attribute.nameformat": "Basic",
                            "user.attribute": "firstName",
                            "friendly.name": "displayName",
                            "attribute.name": "displayName",
                        },
                    },
                ],
                "defaultClientScopes": ["saml_organization", "role_list"],
                "optionalClientScopes": [],
                "access": {"view": True, "configure": True, "manage": True},
            },
        )

    return _create_saml_client


@pytest.fixture(name="update_saml_client_attributes", scope="function")
def update_saml_client_attributes(
    idp: types.TestContainerIDP,
) -> Callable[[str, Dict[str, Any]], None]:
    def _update_saml_client_attributes(
        client_id: str, attributes: Dict[str, Any]
    ) -> None:
        client = KeycloakAdmin(
            server_url=idp.container.host_configs["6060"].base(),
            username=IDP_ROOT_USERNAME,
            password=IDP_ROOT_PASSWORD,
            realm_name="master",
        )

        kc_client_id = client.get_client_id(client_id=client_id)
        print("kc_client_id: " + kc_client_id)

        payload = client.get_client(client_id=kc_client_id)

        for attr_key, attr_value in attributes.items():
            payload["attributes"][attr_key] = attr_value

        client.update_client(client_id=kc_client_id, payload=payload)

    return _update_saml_client_attributes


@pytest.fixture(name="create_oidc_client", scope="function")
def create_oidc_client(
    idp: types.TestContainerIDP, signoz: types.SigNoz
) -> Callable[[str, str], None]:
    def _create_oidc_client(client_id: str, callback_path: str) -> None:
        client = KeycloakAdmin(
            server_url=idp.container.host_configs["6060"].base(),
            username=IDP_ROOT_USERNAME,
            password=IDP_ROOT_PASSWORD,
            realm_name="master",
        )

        _ensure_groups_client_scope(client)

        # DELETE existing client if it exists (to ensure redirect URIs are updated)
        try:
            existing_client_id = client.get_client_id(client_id=client_id)
            if existing_client_id:
                client.delete_client(existing_client_id)
        except Exception:
            pass  # Client doesn't exist, that's fine

        client.create_client(
            skip_exists=True,
            payload={
                "clientId": f"{client_id}",
                "name": f"{client_id}",
                "description": f"client for {client_id}",
                "rootUrl": "",
                "adminUrl": "",
                "baseUrl": "",
                "surrogateAuthRequired": False,
                "enabled": True,
                "alwaysDisplayInConsole": False,
                "clientAuthenticatorType": "client-secret",
                "redirectUris": [
                    f"{urljoin(signoz.self.host_configs['8080'].base(), callback_path)}"
                ],
                "webOrigins": ["/*"],
                "notBefore": 0,
                "bearerOnly": False,
                "consentRequired": False,
                "standardFlowEnabled": True,
                "implicitFlowEnabled": False,
                "directAccessGrantsEnabled": False,
                "serviceAccountsEnabled": False,
                "publicClient": False,
                "frontchannelLogout": True,
                "protocol": "openid-connect",
                "attributes": {
                    "realm_client": "false",
                    "oidc.ciba.grant.enabled": "false",
                    "backchannel.logout.session.required": "true",
                    "standard.token.exchange.enabled": "false",
                    "oauth2.device.authorization.grant.enabled": "false",
                    "backchannel.logout.revoke.offline.tokens": "false",
                },
                "authenticationFlowBindingOverrides": {},
                "fullScopeAllowed": True,
                "nodeReRegistrationTimeout": -1,
                "defaultClientScopes": [
                    "web-origins",
                    "acr",
                    "roles",
                    "profile",
                    "basic",
                    "email",
                    "groups",
                ],
                "optionalClientScopes": [
                    "address",
                    "phone",
                    "offline_access",
                    "organization",
                    "microprofile-jwt",
                ],
                "access": {"view": True, "configure": True, "manage": True},
            },
        )

    return _create_oidc_client


@pytest.fixture(name="get_saml_settings", scope="function")
def get_saml_settings(idp: types.TestContainerIDP) -> dict:
    def _get_saml_settings() -> dict:
        response = requests.get(
            f"{idp.container.host_configs['6060'].base()}/realms/master/protocol/saml/descriptor",
            timeout=5,
        )

        root = ElementTree.fromstring(response.content)
        ns = {
            "md": "urn:oasis:names:tc:SAML:2.0:metadata",
            "ds": "http://www.w3.org/2000/09/xmldsig#",
        }

        entity_id = root.attrib.get("entityID")
        certificate_el = root.find(".//ds:X509Certificate", ns)
        sso_post_el = root.find(
            ".//md:SingleSignOnService[@Binding='urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST']",
            ns,
        )

        return {
            "entityID": entity_id,
            "certificate": certificate_el.text if certificate_el is not None else None,
            "singleSignOnServiceLocation": (
                sso_post_el.get("Location") if sso_post_el is not None else None
            ),
        }

    return _get_saml_settings


@pytest.fixture(name="get_oidc_settings", scope="function")
def get_oidc_settings(idp: types.TestContainerIDP) -> dict:
    def _get_oidc_settings(client_id: str) -> dict:
        client = KeycloakAdmin(
            server_url=idp.container.host_configs["6060"].base(),
            username=IDP_ROOT_USERNAME,
            password=IDP_ROOT_PASSWORD,
            realm_name="master",
        )

        client_secrets = client.get_client_secrets(client.get_client_id(client_id))

        response = requests.get(
            f"{idp.container.host_configs['6060'].base()}/realms/master/.well-known/openid-configuration",
            timeout=5,
        )

        return {
            "client_id": client_id,
            "client_secret": client_secrets["value"],
            "issuer": response.json()["issuer"],
        }

    return _get_oidc_settings


@pytest.fixture(name="create_user_idp", scope="function")
def create_user_idp(idp: types.TestContainerIDP) -> Callable[[str, str, bool, str, str], None]:
    client = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username=IDP_ROOT_USERNAME,
        password=IDP_ROOT_PASSWORD,
        realm_name="master",
    )

    created_users = []

    def _create_user_idp(email: str, password: str, verified: bool = True, first_name: str = "", last_name: str = "") -> None:
        payload = {
            "username": email,
            "email": email,
            "enabled": True,
            "emailVerified": verified,
        }

        if first_name:
            payload["firstName"] = first_name
        if last_name:
            payload["lastName"] = last_name

        user_id = client.create_user(exist_ok=False, payload=payload)
        client.set_user_password(user_id, password, temporary=False)
        created_users.append(user_id)

    yield _create_user_idp

    for user_id in created_users:
        client.delete_user(user_id)


@pytest.fixture(name="idp_login", scope="function")
def idp_login(driver: webdriver.Chrome) -> Callable[[str, str], None]:
    def _idp_login(email: str, password: str) -> None:
        # Input email. The following element is present in the idp login page.
        # <input id="username" name="username" value="" type="text" autocomplete="username" autofocus aria-invalid=""/>
        driver.find_element(By.ID, "username").send_keys(email)

        # Input password. The following element is present in the idp login page.
        # <input id="password" name="password" value="" type="password" autocomplete="current-password" aria-invalid=""/>
        driver.find_element(By.ID, "password").send_keys(password)

        # Click login button. The following element is present in the idp login page.
        # <button class="pf-v5-c-button pf-m-primary pf-m-block " name="login" id="kc-login" type="submit" >Sign In</button>
        driver.find_element(By.ID, "kc-login").click()

        wait = WebDriverWait(driver, 10)

        # Wait till kc-login element has vanished from the page, which means that a redirection is taking place.
        wait.until(EC.invisibility_of_element((By.ID, "kc-login")))

    return _idp_login


@pytest.fixture(name="create_group_idp", scope="function")
def create_group_idp(idp: types.TestContainerIDP) -> Callable[[str], str]:
    """Creates a group in Keycloak IDP."""
    client = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username=IDP_ROOT_USERNAME,
        password=IDP_ROOT_PASSWORD,
        realm_name="master",
    )

    created_groups = []

    def _create_group_idp(group_name: str) -> str:
        group_id = client.create_group({"name": group_name}, skip_exists=True)
        created_groups.append(group_id)
        return group_id

    yield _create_group_idp

    for group_id in created_groups:
        try:
            client.delete_group(group_id)
        except Exception:
            pass


@pytest.fixture(name="create_user_idp_with_groups", scope="function")
def create_user_idp_with_groups(
    idp: types.TestContainerIDP,
    create_group_idp: Callable[[str], str],
) -> Callable[[str, str, bool, List[str]], None]:
    """Creates a user in Keycloak IDP with specified groups."""
    client = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username=IDP_ROOT_USERNAME,
        password=IDP_ROOT_PASSWORD,
        realm_name="master",
    )

    created_users = []

    def _create_user_idp_with_groups(
        email: str, password: str, verified: bool, groups: List[str]
    ) -> None:
        # Create groups first
        group_ids = []
        for group_name in groups:
            group_id = create_group_idp(group_name)
            group_ids.append(group_id)

        # Create user
        user_id = client.create_user(
            exist_ok=False,
            payload={
                "username": email,
                "email": email,
                "enabled": True,
                "emailVerified": verified,
            },
        )
        client.set_user_password(user_id, password, temporary=False)
        created_users.append(user_id)

        # Add user to groups
        for group_id in group_ids:
            client.group_user_add(user_id, group_id)

    yield _create_user_idp_with_groups

    for user_id in created_users:
        try:
            client.delete_user(user_id)
        except Exception:
            pass


@pytest.fixture(name="add_user_to_group", scope="function")
def add_user_to_group(
    idp: types.TestContainerIDP,
    create_group_idp: Callable[[str], str],
) -> Callable[[str, str], None]:
    """Adds an existing user to a group."""
    client = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username=IDP_ROOT_USERNAME,
        password=IDP_ROOT_PASSWORD,
        realm_name="master",
    )

    def _add_user_to_group(email: str, group_name: str) -> None:
        user_id = client.get_user_id(email)
        group_id = create_group_idp(group_name)
        client.group_user_add(user_id, group_id)

    return _add_user_to_group


@pytest.fixture(name="create_user_idp_with_role", scope="function")
def create_user_idp_with_role(
    idp: types.TestContainerIDP,
    create_group_idp: Callable[[str], str],
) -> Callable[[str, str, bool, str, List[str]], None]:
    """Creates a user in Keycloak IDP with a custom role attribute and optional groups."""
    client = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username=IDP_ROOT_USERNAME,
        password=IDP_ROOT_PASSWORD,
        realm_name="master",
    )

    created_users = []

    def _create_user_idp_with_role(
        email: str, password: str, verified: bool, role: str, groups: List[str]
    ) -> None:
        # Create groups first
        group_ids = []
        for group_name in groups:
            group_id = create_group_idp(group_name)
            group_ids.append(group_id)

        # Create user with role attribute
        user_id = client.create_user(
            exist_ok=False,
            payload={
                "username": email,
                "email": email,
                "enabled": True,
                "emailVerified": verified,
                "attributes": {
                    "signoz_role": role,
                },
            },
        )
        client.set_user_password(user_id, password, temporary=False)
        created_users.append(user_id)

        # Add user to groups
        for group_id in group_ids:
            client.group_user_add(user_id, group_id)

    yield _create_user_idp_with_role

    for user_id in created_users:
        try:
            client.delete_user(user_id)
        except Exception:
            pass


@pytest.fixture(name="setup_user_profile", scope="package")
def setup_user_profile(idp: types.TestContainerIDP) -> Callable[[], None]:
    """Setup Keycloak User Profile with signoz_role attribute."""
    def _setup_user_profile() -> None:
        client = KeycloakAdmin(
            server_url=idp.container.host_configs["6060"].base(),
            username=IDP_ROOT_USERNAME,
            password=IDP_ROOT_PASSWORD,
            realm_name="master",
        )
        
        # Get current user profile config
        profile = client.get_realm_users_profile()
        
        # Check if signoz_role attribute already exists
        attributes = profile.get("attributes", [])
        signoz_role_exists = any(attr.get("name") == "signoz_role" for attr in attributes)
        
        if not signoz_role_exists:
            # Add signoz_role attribute to user profile
            attributes.append({
                "name": "signoz_role",
                "displayName": "SigNoz Role",
                "validations": {},
                "annotations": {},
                # "required": {
                #     "roles": []  # Not required
                # },
                "permissions": {
                    "view": ["admin", "user"],
                    "edit": ["admin"]
                },
                "multivalued": False
            })
            profile["attributes"] = attributes
            
            # Update the realm user profile
            client.update_realm_users_profile(payload=profile)
    
    return _setup_user_profile


def _ensure_groups_client_scope(client: KeycloakAdmin) -> None:
    """Create 'groups' client scope if it doesn't exist."""
    # Check if groups scope exists
    scopes = client.get_client_scopes()
    groups_scope_exists = any(s.get("name") == "groups" for s in scopes)
    
    if not groups_scope_exists:
        # Create the groups client scope
        client.create_client_scope(
            payload={
                "name": "groups",
                "description": "Group membership",
                "protocol": "openid-connect",
                "attributes": {
                    "include.in.token.scope": "true",
                    "display.on.consent.screen": "true",
                },
                "protocolMappers": [
                    {
                        "name": "groups",
                        "protocol": "openid-connect",
                        "protocolMapper": "oidc-group-membership-mapper",
                        "consentRequired": False,
                        "config": {
                            "full.path": "false",
                            "id.token.claim": "true",
                            "access.token.claim": "true",
                            "claim.name": "groups",
                            "userinfo.token.claim": "true",
                        },
                    },
                    {
                        "name": "signoz_role",
                        "protocol": "openid-connect",
                        "protocolMapper": "oidc-usermodel-attribute-mapper",
                        "consentRequired": False,
                        "config": {
                            "user.attribute": "signoz_role",
                            "id.token.claim": "true",
                            "access.token.claim": "true",
                            "claim.name": "signoz_role",
                            "userinfo.token.claim": "true",
                            "jsonType.label": "String",
                        },
                    },
                ],
            },
            skip_exists=True,
        )
