from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_NAME, USER_ADMIN_PASSWORD
from fixtures.signoz import create_signoz

# SigNoz is served under this URL path prefix for the base-path suite. Every
# SigNoz API call in this suite is issued under the prefix and the SSO callback
# registered with the IdP carries it too; the IdP and other containers stay at
# the root. Only the path component is read by global.ExternalPath(), which
# derives the http.StripPrefix route prefix.
#
# These fixtures intentionally shadow the same-named ones in fixtures/auth.py
# with base-path-aware (prefixed) variants, scoped to this suite only.
BASE_PATH = "/signoz"


def api(signoz: types.SigNoz, path: str) -> str:
    """Build a SigNoz URL under the base path prefix."""
    return signoz.self.host_configs["8080"].get(f"{BASE_PATH}{path}")


@pytest.fixture(name="signoz", scope="package")
def signoz_base_path(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    Package-scoped SigNoz served under BASE_PATH. Sets SIGNOZ_GLOBAL_EXTERNAL__URL
    with the prefix so the backend derives the http.StripPrefix route prefix.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-base-path",
        env_overrides={"SIGNOZ_GLOBAL_EXTERNAL__URL": f"http://localhost:8080{BASE_PATH}"},
    )


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin(signoz: types.SigNoz) -> types.Operation:
    """Register the first admin (creates the org) under the base path."""
    response = requests.post(
        api(signoz, "/api/v1/register"),
        json={"name": USER_ADMIN_NAME, "orgName": "", "email": USER_ADMIN_EMAIL, "password": USER_ADMIN_PASSWORD},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    return types.Operation(name="create_user_admin")


@pytest.fixture(name="get_token", scope="function")
def get_token(signoz: types.SigNoz) -> Callable[[str, str], str]:
    """Log in via email/password under the base path and return the access token."""

    def _get_token(email: str, password: str) -> str:
        context = requests.get(
            api(signoz, "/api/v2/sessions/context"),
            params={"email": email, "ref": signoz.self.host_configs["8080"].base()},
            timeout=5,
        )
        assert context.status_code == HTTPStatus.OK
        org_id = context.json()["data"]["orgs"][0]["id"]

        login = requests.post(
            api(signoz, "/api/v2/sessions/email_password"),
            json={"email": email, "password": password, "orgId": org_id},
            timeout=5,
        )
        assert login.status_code == HTTPStatus.OK
        return login.json()["data"]["accessToken"]

    return _get_token


@pytest.fixture(name="get_session_context", scope="function")
def get_session_context(signoz: types.SigNoz) -> Callable[[str], dict]:
    """Fetch the session context (incl. SSO login URL) under the base path."""

    def _get_session_context(email: str) -> dict:
        response = requests.get(
            api(signoz, "/api/v2/sessions/context"),
            params={"email": email, "ref": signoz.self.host_configs["8080"].base()},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK
        return response.json()["data"]

    return _get_session_context
