import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.migrator import create_migrator
from fixtures.signoz import create_signoz

UNSUPPORTED_CLICKHOUSE_VERSIONS = {"25.5.6"}


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    version = config.getoption("--clickhouse-version")
    if version in UNSUPPORTED_CLICKHOUSE_VERSIONS:
        skip = pytest.mark.skip(reason=f"JSON body QB tests require ClickHouse > {version}")
        for item in items:
            item.add_marker(skip)


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
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_BODY__JSON__ENABLED": True,
        },
    )
