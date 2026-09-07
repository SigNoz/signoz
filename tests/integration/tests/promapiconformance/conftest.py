import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_promapi_v2(
    network: Network,
    migrator: types.Operation,  # pylint: disable=unused-argument
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    SigNoz with clickhousev2 as the serving prometheus provider. The corpus
    replays against the /prometheus/api/v1 endpoints, so this package covers
    the two paths nothing else serves: v2 as the provider (range queries
    transpile when the shape allows), and the Prometheus HTTP API contract.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-promapi-v2",
        env_overrides={
            "SIGNOZ_PROMETHEUS_PROVIDER": "clickhousev2",
        },
    )
