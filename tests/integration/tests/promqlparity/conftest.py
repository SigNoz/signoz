import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_promql_shadow(
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
    Package-scoped SigNoz with the PromQL shadow-comparison flag on: every
    PromQL query is served from the default engine path and re-run on the
    clickhousev2 provider, with differences logged.
    """
    # The clickhousev2 provider assumes the timeSeries*ToGrid aggregate
    # functions exist (ClickHouse >= 25.6); older versions cannot serve the
    # pinned side of the comparison at all.
    version = pytestconfig.getoption("--clickhouse-version")
    major, minor = (int(part) for part in str(version).split(".")[:2])
    if (major, minor) < (25, 6):
        pytest.skip(f"clickhousev2 requires ClickHouse >= 25.6, matrix leg runs {version}")

    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-promql-shadow",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_USE__PROMETHEUS__CLICKHOUSE__V2": True,
        },
    )
