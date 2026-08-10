import base64
import json
import time
from collections.abc import Callable
from http import HTTPStatus
from urllib.parse import urlparse

import docker
import docker.errors
import pytest
import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from testcontainers.core.container import DockerContainer, Network
from wiremock.resources.mappings import HttpMethods, Mapping, MappingRequest, MappingResponse

from fixtures import reuse, tls, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# The google callback authn hardcodes Google's issuer, so the mock must be
# reachable as accounts.google.com over TLS from the signoz container: the
# wiremock container joins the network under that alias and serves HTTPS on 443
# with a certificate issued by the integration CA that signoz trusts.
ISSUER = "https://accounts.google.com"
ISSUER_HOST = "accounts.google.com"

# One signing key for the whole session: the token and JWKS stubs are always
# installed together, so per-call keys would only add RSA keygen latency.
signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)


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

    def base64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

    now = int(time.time())
    claims = {
        "iss": ISSUER,
        "aud": audience,
        "sub": f"google-oauth2|{email}",
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "hd": hd,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = base64url(json.dumps({"alg": "RS256", "kid": "googleidp-integration", "typ": "JWT"}).encode()) + "." + base64url(json.dumps(claims).encode())
    signature = signing_key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
    id_token = signing_input + "." + base64url(signature)

    public_numbers = signing_key.public_key().public_numbers()

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
                    "Location": "{{{request.query.redirect_uri}}}?code=integration-test-code&state={{{request.query.state}}}",
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
                json_body={
                    "keys": [
                        {
                            "kty": "RSA",
                            "use": "sig",
                            "alg": "RS256",
                            "kid": "googleidp-integration",
                            "n": base64url(public_numbers.n.to_bytes((public_numbers.n.bit_length() + 7) // 8, "big")),
                            "e": base64url(public_numbers.e.to_bytes((public_numbers.e.bit_length() + 7) // 8, "big")),
                        }
                    ]
                },
            ),
        ),
    ]


@pytest.fixture(name="googleidp", scope="package")
def googleidp(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """Wiremock impersonating Google's OIDC provider. Stubs are installed per
    test via make_http_mocks with google_oidc_mappings; port 8080 serves the
    admin API and the authorize redirect to the test process."""

    def create() -> types.TestContainerDocker:
        keystore_dir = tls.ensure_server_keystore(pytestconfig, ISSUER_HOST)

        container = DockerContainer("wiremock/wiremock:2.35.1-1")
        container.with_command(f"--https-port 443 --https-keystore /certs/keystore.p12 --keystore-type PKCS12 --keystore-password {tls.KEYSTORE_PASSWORD} --local-response-templating")
        container.with_volume_mapping(str(keystore_dir), "/certs", "ro")
        container.with_exposed_ports(8080)
        container.with_network(network)
        container.with_network_aliases(ISSUER_HOST)
        container.start()

        host = container.get_container_host_ip()
        host_port = container.get_exposed_port(8080)

        for attempt in range(20):
            try:
                response = requests.get(f"http://{host}:{host_port}/__admin/mappings", timeout=2)
                if response.status_code == HTTPStatus.OK:
                    break
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.info("googleidp attempt %d: %s", attempt + 1, e)
            time.sleep(1)
        else:
            raise TimeoutError("googleidp container did not become ready")

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "8080": types.TestContainerUrlConfig("http", host, host_port),
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

    return reuse.wrap(
        request,
        pytestconfig,
        "googleidp",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )
