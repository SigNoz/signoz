from collections.abc import Callable

import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import register_admin, session_context_getter, token_getter
from fixtures.signoz import create_signoz

# SigNoz is served under this URL path prefix for the base-path suite. The auth
# helpers from fixtures/auth.py are reused via their factories with this prefix,
# so these fixtures shadow the same-named root ones without duplicating logic.
# Only the path component is read by global.ExternalPath(), which derives the
# http.StripPrefix route prefix.
BASE_PATH = "/signoz"


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
        cache_key="signoz_base_path",
        env_overrides={"SIGNOZ_GLOBAL_EXTERNAL__URL": f"http://localhost:8080{BASE_PATH}"},
    )


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin_base_path(signoz: types.SigNoz, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.Operation:
    return register_admin(signoz, request, pytestconfig, cache_key="create_user_admin_base_path", base_path=BASE_PATH)


@pytest.fixture(name="get_token", scope="function")
def get_token(signoz: types.SigNoz) -> Callable[[str, str], str]:
    return token_getter(signoz, BASE_PATH)


@pytest.fixture(name="get_session_context", scope="function")
def get_session_context(signoz: types.SigNoz) -> Callable[[str], dict]:
    return session_context_getter(signoz, BASE_PATH)
