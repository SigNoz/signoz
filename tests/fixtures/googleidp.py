import functools
import time
from collections.abc import Callable
from http import HTTPStatus
from pathlib import Path
from urllib.parse import urlparse

import docker
import docker.errors
import pytest
import requests
from jwcrypto import jwk, jwt
from testcontainers.core.container import Network
from wiremock.resources.mappings import HttpMethods, Mapping, MappingRequest, MappingResponse
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import reuse, types
from fixtures.logger import setup_logger
from fixtures.tls import CA_ID_LABEL, KEYSTORE_PASSWORD, ca_id, issue_server_keystore

logger = setup_logger(__name__)

# The google callback authn hardcodes Google's issuer, so the mock must be
# reachable as accounts.google.com over TLS from the signoz container: the
# wiremock container joins the network under that alias and serves HTTPS on 443
# with a certificate issued by the integration CA that signoz trusts.
ISSUER = "https://accounts.google.com"
ISSUER_HOST = "accounts.google.com"


# One signing key for the whole session: the token and JWKS stubs are always
# installed together, so per-call keys would only add RSA keygen latency.
@functools.cache
def signing_key() -> jwk.JWK:
    return jwk.JWK.generate(kty="RSA", size=2048, kid="googleidp-integration", use="sig", alg="RS256")


def perform_google_login(
    signoz: types.SigNoz,
    googleidp: types.TestContainerDocker,
    get_session_context: Callable[[str], dict],
    email: str,
) -> str:
    """Drive the google login flow for email and return the final redirect URL.

    The authorize URL points at https://accounts.google.com (resolvable only
    inside the docker network), so it is rewritten to the mock's host-mapped
    port, mirroring how the oidc suite rewrites keycloak URLs.
    """
    session_context = get_session_context(email)

    assert len(session_context["orgs"]) == 1
    assert len(session_context["orgs"][0]["authNSupport"]["callback"]) == 1

    url = session_context["orgs"][0]["authNSupport"]["callback"][0]["url"]
    assert url.startswith(f"{ISSUER}/")

    parsed_url = urlparse(url)
    authorize_url = googleidp.host_configs["8080"].get(f"{parsed_url.path}?{parsed_url.query}")

    response = requests.get(authorize_url, allow_redirects=False, timeout=5)
    assert response.status_code == HTTPStatus.FOUND

    callback_url = response.headers["Location"]
    assert "/api/v1/complete/google" in callback_url

    response = requests.get(callback_url, allow_redirects=False, timeout=30)
    assert response.status_code == HTTPStatus.SEE_OTHER

    return response.headers["Location"]


def google_oidc_mappings(email: str, name: str, hd: str, audience: str, email_verified: bool = True) -> list[Mapping]:
    """Wiremock mappings for one Google OIDC login: discovery, an auto-approving
    authorize redirect, a token response with an RS256 id_token for the given
    identity, and the JWKS the signoz container verifies it against."""
    now = int(time.time())
    token = jwt.JWT(
        header={"alg": "RS256", "kid": signing_key()["kid"], "typ": "JWT"},
        claims={
            "iss": ISSUER,
            "aud": audience,
            "sub": f"google-oauth2|{email}",
            "email": email,
            "email_verified": email_verified,
            "name": name,
            "hd": hd,
            "iat": now,
            "exp": now + 3600,
        },
    )
    token.make_signed_token(signing_key())
    id_token = token.serialize()

    return [
        Mapping(
            request=MappingRequest(method=HttpMethods.GET, url_path="/.well-known/openid-configuration"),
            response=MappingResponse(
                status=200,
                json_body={
                    "issuer": ISSUER,
                    "authorization_endpoint": f"{ISSUER}/o/oauth2/v2/auth",
                    "token_endpoint": f"{ISSUER}/token",
                    "jwks_uri": f"{ISSUER}/jwks",
                    "response_types_supported": ["code"],
                    "subject_types_supported": ["public"],
                    "id_token_signing_alg_values_supported": ["RS256"],
                    "scopes_supported": ["openid", "email", "profile"],
                    "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
                },
            ),
        ),
        Mapping(
            request=MappingRequest(method=HttpMethods.GET, url_path="/o/oauth2/v2/auth"),
            response=MappingResponse(
                status=302,
                headers={
                    # Triple-stache: redirect_uri and state are URLs; handlebars
                    # would otherwise HTML-escape their special characters.
                    # request.query values arrive URL-decoded, so the state is
                    # re-encoded into the redirect exactly as google does.
                    "Location": "{{{request.query.redirect_uri}}}?code=integration-test-code&state={{{urlEncode request.query.state}}}",
                },
                transformers=["response-template"],
            ),
        ),
        Mapping(
            request=MappingRequest(method=HttpMethods.POST, url_path="/token"),
            response=MappingResponse(
                status=200,
                json_body={
                    "access_token": "integration-test-access-token",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "id_token": id_token,
                },
            ),
        ),
        Mapping(
            request=MappingRequest(method=HttpMethods.GET, url_path="/jwks"),
            response=MappingResponse(
                status=200,
                json_body={"keys": [signing_key().export_public(as_dict=True)]},
            ),
        ),
    ]


@pytest.fixture(name="googleidp", scope="package")
def googleidp(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    tls: types.TLS,
    tmpfs: Callable[[str], Path],
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """Wiremock impersonating Google's OIDC provider. Stubs are installed per
    test via make_http_mocks with google_oidc_mappings; port 8080 serves the
    admin API and the authorize redirect to the test process."""

    def create() -> types.TestContainerDocker:
        keystore_path = issue_server_keystore(tls, tmpfs("googleidp-certs"), ISSUER_HOST)

        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_volume_mapping(str(keystore_path.parent), "/certs", "ro")
        container.with_network(network)
        container.with_network_aliases(ISSUER_HOST)
        container.with_kwargs(labels={CA_ID_LABEL: ca_id(tls)})

        try:
            container.start(f"--port 8080 --https-port 443 --https-keystore /certs/keystore.p12 --keystore-type PKCS12 --keystore-password {KEYSTORE_PASSWORD} --local-response-templating")
        except Exception:
            # Ryuk is disabled: a started-but-unready container would survive
            # and keep squatting on the accounts.google.com alias, poisoning
            # DNS for any replacement on the shared network.
            container.stop()
            raise

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "8080": types.TestContainerUrlConfig("http", container.get_container_host_ip(), container.get_exposed_port(8080)),
            },
            container_configs={
                "443": types.TestContainerUrlConfig("https", ISSUER_HOST, 443),
            },
        )

    def delete(container: types.TestContainerDocker) -> None:
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.id).stop()
            client.containers.get(container_id=container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info("googleidp container %s already gone", container.id)

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    def stale(container: types.TestContainerDocker) -> bool:
        client = docker.from_env()
        try:
            labels = client.containers.get(container_id=container.id).attrs["Config"]["Labels"]
        except docker.errors.NotFound:
            return True
        return labels.get(CA_ID_LABEL) != ca_id(tls)

    return reuse.wrap(
        request,
        pytestconfig,
        "googleidp",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
        stale=stale,
    )
