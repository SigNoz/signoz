import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_clickhouse_query(
    network: Network,
    migrator: types.Operation,  # pylint: disable=unused-argument
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """SigNoz with a small ClickHouse SQL query budget."""
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-clickhouse-query",
        env_overrides={
            "SIGNOZ_QUERIER_CLICKHOUSE__QUERY_MAX__EXECUTION__TIME": "2s",
            "SIGNOZ_QUERIER_CLICKHOUSE__QUERY_MAX__MEMORY__USAGE": 100_000_000,
            "SIGNOZ_QUERIER_CLICKHOUSE__QUERY_MAX__RESULT__ROWS": 1_000,
            "SIGNOZ_QUERIER_CLICKHOUSE__QUERY_MAX__RESULT__BYTES": 1_000_000,
        },
    )
