from typing import Callable
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
                ],
                "defaultClientScopes": ["saml_organization", "role_list"],
                "optionalClientScopes": [],
                "access": {"view": True, "configure": True, "manage": True},
            },
        )

    return _create_saml_client


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
def create_user_idp(idp: types.TestContainerIDP) -> Callable[[str, str, bool], None]:
    client = KeycloakAdmin(
        server_url=idp.container.host_configs["6060"].base(),
        username=IDP_ROOT_USERNAME,
        password=IDP_ROOT_PASSWORD,
        realm_name="master",
    )

    created_users = []

    def _create_user_idp(email: str, password: str, verified: bool = True) -> None:
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
