import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.migrator import create_migrator
from fixtures.signoz import create_signoz


@pytest.fixture(name="migrator", scope="package")
def migrator_json(
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.Operation:
    """
    Package-scoped migrator with ENABLE_LOGS_MIGRATIONS_V2=1.
    """
    return create_migrator(
        network=network,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="migrator-json-body",
        env_overrides={
            "ENABLE_LOGS_MIGRATIONS_V2": "1",
        },
    )


@pytest.fixture(name="signoz", scope="package")
def signoz_json_body(
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
    Package-scoped fixture for SigNoz with BODY_JSON_QUERY_ENABLED=true.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-json-body",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_USE__JSON__BODY": True,
        },
    )


@pytest.fixture(name="signoz_search_scan_budget", scope="package")
def signoz_search_scan_budget(
    network: Network,
    migrator: types.Operation,  # pylint: disable=unused-argument
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """The querierlogs budget instance over body_v2: same 50000 rows, but on
    search_max_scan_rows_json_body. search_max_scan_rows keeps its 60M default, so only the
    body_v2 budget can trip here. Shares the default instance's sqlstore + clickhouse, so
    the same admin token and seeded logs work against it."""
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-json-body-search-scan-budget-50k",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_USE__JSON__BODY": True,
            "SIGNOZ_QUERIER_SEARCH__MAX__SCAN__ROWS__JSON__BODY": 50000,
        },
    )
