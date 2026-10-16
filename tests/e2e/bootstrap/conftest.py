import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="base_path", scope="package")
def base_path() -> str:
    """URL path prefix SigNoz is served under. Empty serves it at the root;
    basepath/conftest.py overrides it."""
    return ""


@pytest.fixture(name="e2e_env", scope="package")
def e2e_env() -> dict:
    """Environment every e2e SigNoz gets. Each Playwright worker logs in once,
    and the default cap of 5 sessions per user evicts the oldest, which turns a
    worker's requests into 401s mid-run."""
    return {"SIGNOZ_TOKENIZER_OPAQUE_TOKEN_MAX__PER__USER": 100}


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    tls: types.TLS,
    e2e_env: dict,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        tls=tls,
        env_overrides=e2e_env,
    )
