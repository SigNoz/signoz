import http.client
from collections.abc import Callable
from http import HTTPStatus
from urllib.parse import urlparse

import pytest
import requests

from fixtures import types
from fixtures.auth import create_active_user
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# Must match conftest.py's _trusted_header_env(), which is what the `signoz`
# fixture in this package actually boots the server with.
SECRET_HEADER = "X-Signoz-Trusted-Secret"
SECRET_VALUE = "trusted-header-test-secret-do-not-reuse"
EMAIL_HEADER = "X-Forwarded-Email"
ROOT_USER_EMAIL = "trustedheader-root@integration.test"
ROOT_USER_PASSWORD = "password123Z$"

KNOWN_USER_EMAIL = "trustedheader-known@integration.test"
KNOWN_USER_PASSWORD = "password123Z$"

ME_PATH = "/api/v2/users/me"


@pytest.fixture(name="known_user_id", scope="module")
def known_user_id(
    signoz: types.SigNoz,
    signoz_ready: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> str:
    """A pre-created, active user the secret-mode header can resolve to.
    Root doubles as the admin here: register_admin cannot be used once
    SIGNOZ_USER_ROOT_ENABLED is set (see conftest.py)."""
    root_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)
    return create_active_user(signoz, root_token, KNOWN_USER_EMAIL, "VIEWER", KNOWN_USER_PASSWORD)


def _get(signoz: types.SigNoz, headers: dict) -> requests.Response:
    return requests.get(signoz.self.host_configs["8080"].get(ME_PATH), headers=headers, timeout=5)


def _get_with_repeated_header(signoz: types.SigNoz, header_name: str, values: list[str], extra_headers: dict | None = None) -> int:
    """
    Send a GET with the same header name repeated across several lines.

    `requests` cannot express this: its `headers` argument is a plain dict, so
    a second entry for the same key just overwrites the first. Only
    http.client's putheader lets a single request carry two literal header
    lines with the same name, which is what a misbehaving reverse proxy would
    produce if it appended a header instead of replacing it. Returns the
    status code.

    putrequest() already emits a Host header on its own unless skip_host is
    passed, so this must not add a second one: Go's net/http rejects a
    request carrying two Host header lines with 400 before it ever reaches
    application routing, which would look like this test succeeding for the
    wrong reason (a generic bad-request response, not the trusted-header
    provider's own rejection of duplicate values).
    """
    url = urlparse(signoz.self.host_configs["8080"].get(ME_PATH))
    conn = http.client.HTTPConnection(url.hostname, url.port, timeout=5)
    try:
        conn.putrequest("GET", url.path or "/")
        for value in values:
            conn.putheader(header_name, value)
        for key, value in (extra_headers or {}).items():
            conn.putheader(key, value)
        conn.endheaders()
        return conn.getresponse().status
    finally:
        conn.close()


def test_correct_secret_and_known_email_resolves_to_user(signoz: types.SigNoz, known_user_id: str) -> None:  # pylint: disable=unused-argument
    """A request carrying the correct secret and a known active user's email
    resolves to that user, confirmed via the current-user endpoint."""
    response = _get(signoz, {SECRET_HEADER: SECRET_VALUE, EMAIL_HEADER: KNOWN_USER_EMAIL})

    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["email"] == KNOWN_USER_EMAIL


def test_missing_secret_header_is_rejected(signoz: types.SigNoz, known_user_id: str) -> None:  # pylint: disable=unused-argument
    """The same request without the secret header is rejected."""
    response = _get(signoz, {EMAIL_HEADER: KNOWN_USER_EMAIL})

    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_wrong_secret_is_rejected(signoz: types.SigNoz, known_user_id: str) -> None:  # pylint: disable=unused-argument
    """The same request with a wrong secret is rejected."""
    response = _get(signoz, {SECRET_HEADER: "wrong-secret-value", EMAIL_HEADER: KNOWN_USER_EMAIL})

    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_duplicate_email_header_values_rejected(signoz: types.SigNoz, known_user_id: str) -> None:  # pylint: disable=unused-argument
    """A request carrying two values for the email header is rejected rather
    than resolving to whichever value Header.Get happens to prefer."""
    status = _get_with_repeated_header(
        signoz,
        EMAIL_HEADER,
        [KNOWN_USER_EMAIL, "attacker@evil.example"],
        extra_headers={SECRET_HEADER: SECRET_VALUE},
    )

    assert status == HTTPStatus.UNAUTHORIZED


def test_authorization_header_defers_to_tokenizer(signoz: types.SigNoz, known_user_id: str) -> None:  # pylint: disable=unused-argument
    """A request carrying an Authorization header is not resolved by this
    provider. The tokenizer resolver is registered ahead of the trusted-header
    resolver and its Test() matches on header presence alone, so a request
    with a bearer token is claimed by the tokenizer even when it also carries
    a fully valid secret and a known email. An invalid token then makes the
    tokenizer itself fail, which must surface as rejection rather than a
    successful header resolution.
    """
    # Control: without Authorization, this exact secret+email combination
    # succeeds (already covered above, repeated here so the contrast is local
    # to this test).
    control = _get(signoz, {SECRET_HEADER: SECRET_VALUE, EMAIL_HEADER: KNOWN_USER_EMAIL})
    assert control.status_code == HTTPStatus.OK

    response = _get(
        signoz,
        {
            SECRET_HEADER: SECRET_VALUE,
            EMAIL_HEADER: KNOWN_USER_EMAIL,
            "Authorization": "Bearer not-a-real-token",
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_root_user_email_is_rejected(signoz: types.SigNoz, signoz_ready: None) -> None:  # pylint: disable=unused-argument
    """A request asserting the root user's email is rejected: root can only
    authenticate by password. Depends on `signoz_ready` so the root user is
    actually reconciled by the time this runs; otherwise the request would be
    rejected merely because the email matches no user yet, which would prove
    nothing about the root-specific filter this test is named for."""
    response = _get(signoz, {SECRET_HEADER: SECRET_VALUE, EMAIL_HEADER: ROOT_USER_EMAIL})

    assert response.status_code == HTTPStatus.UNAUTHORIZED
