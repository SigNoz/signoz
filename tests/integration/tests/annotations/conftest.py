import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz_families_on", scope="package")
def signoz_families_on(
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """Shares the sqlstore and clickhouse with the default instance, so the
    same admin token and seeded rows work."""
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-annotations-families-on",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_RESOLVE__SEMCONV__FAMILIES": True,
        },
    )
