from collections.abc import Callable
from http import HTTPStatus

import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    assert_user_has_role,
    find_user_with_roles_by_email,
)
from fixtures.googleidp import google_oidc_mappings, perform_google_login
from fixtures.types import Operation, SigNoz

GOOGLE_DOMAIN = "google.integration.test"
GOOGLE_CLIENT_ID = "google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "google-client-secret"


def test_create_auth_domain(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Reruns against a reused stack find the domain from the previous run;
    # drop it so creation always starts from a clean slate.
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    for domain in response.json()["data"]:
        if domain["name"] == GOOGLE_DOMAIN:
            response = requests.delete(
                signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain['id']}"),
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=2,
            )
            assert response.status_code == HTTPStatus.NO_CONTENT

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        json={
            "name": GOOGLE_DOMAIN,
            "enabled": True,
            "config": {
                "kind": "google",
                "spec": {
                    "clientId": GOOGLE_CLIENT_ID,
                    "clientSecret": GOOGLE_CLIENT_SECRET,
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED


def test_google_authn(
    signoz: SigNoz,
    googleidp: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    email = "viewer@google.integration.test"
    make_http_mocks(googleidp, google_oidc_mappings(email=email, name="Google Viewer", hd=GOOGLE_DOMAIN, audience=GOOGLE_CLIENT_ID))

    redirect_url = perform_google_login(signoz, googleidp, get_session_context, email)
    assert "accessToken=" in redirect_url

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = find_user_with_roles_by_email(signoz, admin_token, email)

    assert found_user["displayName"] == "Google Viewer"
    assert_user_has_role(found_user, "signoz-viewer")


def test_google_authn_hd_mismatch(
    signoz: SigNoz,
    googleidp: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    # The id_token carries a hosted-domain claim for a different workspace than
    # the auth domain; the callback must reject it and provision no user.
    email = "intruder@google.integration.test"
    make_http_mocks(googleidp, google_oidc_mappings(email=email, name="Intruder", hd="other.workspace.test", audience=GOOGLE_CLIENT_ID))

    redirect_url = perform_google_login(signoz, googleidp, get_session_context, email)
    assert "callbackauthnerr" in redirect_url
    assert "accessToken=" not in redirect_url

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/users"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    assert not any(user["email"] == email for user in response.json()["data"])


def test_google_authn_unverified_email(
    signoz: SigNoz,
    googleidp: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    email = "unverified@google.integration.test"
    make_http_mocks(googleidp, google_oidc_mappings(email=email, name="Unverified", hd=GOOGLE_DOMAIN, audience=GOOGLE_CLIENT_ID, email_verified=False))

    redirect_url = perform_google_login(signoz, googleidp, get_session_context, email)
    assert "callbackauthnerr" in redirect_url

    # Opting the domain into insecureSkipEmailVerified must let the same
    # unverified identity through.
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    domain = next(domain for domain in response.json()["data"] if domain["name"] == GOOGLE_DOMAIN)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain['id']}"),
        json={
            "enabled": True,
            "config": {
                "kind": "google",
                "spec": {
                    "clientId": GOOGLE_CLIENT_ID,
                    "clientSecret": GOOGLE_CLIENT_SECRET,
                    "insecureSkipEmailVerified": True,
                },
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    redirect_url = perform_google_login(signoz, googleidp, get_session_context, email)
    assert "accessToken=" in redirect_url

    found_user = find_user_with_roles_by_email(signoz, admin_token, email)
    assert_user_has_role(found_user, "signoz-viewer")


def test_google_role_mapping_default_role(
    signoz: SigNoz,
    googleidp: types.TestContainerDocker,
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    get_session_context: Callable[[str], dict],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/auth_domains"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    domain = next(domain for domain in response.json()["data"] if domain["name"] == GOOGLE_DOMAIN)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/auth_domains/{domain['id']}"),
        json={
            "enabled": True,
            "config": {
                "kind": "google",
                "spec": {
                    "clientId": GOOGLE_CLIENT_ID,
                    "clientSecret": GOOGLE_CLIENT_SECRET,
                },
            },
            "roleMapping": {
                "defaultRole": "EDITOR",
            },
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    email = "editor@google.integration.test"
    make_http_mocks(googleidp, google_oidc_mappings(email=email, name="Google Editor", hd=GOOGLE_DOMAIN, audience=GOOGLE_CLIENT_ID))

    redirect_url = perform_google_login(signoz, googleidp, get_session_context, email)
    assert "accessToken=" in redirect_url

    found_user = find_user_with_roles_by_email(signoz, admin_token, email)
    assert_user_has_role(found_user, "signoz-editor")
