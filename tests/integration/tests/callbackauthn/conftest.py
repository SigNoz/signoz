import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_callbackauthn(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    Package-scoped fixture for the callbackauthn suite.

    With --base-path set (e.g. /signoz), SigNoz is served under that URL path
    prefix: SIGNOZ_GLOBAL_EXTERNAL__URL is configured with the path (only the
    path is read by global.ExternalPath(), which derives the http.StripPrefix
    route prefix) and the prefix is appended onto the url configs so the test
    client and IdP registration issue every request under the prefix. Without
    the flag it behaves exactly like the global signoz fixture (root serving).
    """
    base_path = pytestconfig.getoption("--base-path")

    env_overrides = {}
    if base_path:
        env_overrides["SIGNOZ_GLOBAL_EXTERNAL__URL"] = f"http://localhost:8080{base_path}"

    signoz = create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-base-path" if base_path else "signoz",
        env_overrides=env_overrides,
    )

    if base_path:
        signoz.self.host_configs["8080"].base_path = base_path
        signoz.self.container_configs["8080"].base_path = base_path

    return signoz
