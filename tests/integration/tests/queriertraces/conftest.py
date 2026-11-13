import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_trace_attributes_json(
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
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
        cache_key="signoz-trace-attributes-json",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_USE__TRACE__ATTRIBUTES__JSON": True,
            # map-backend windows sit an hour back, past the 5m default, where same-query cases
            # would read each other's cached buckets
            "SIGNOZ_QUERIER_FLUX__INTERVAL": "8760h",
        },
    )
