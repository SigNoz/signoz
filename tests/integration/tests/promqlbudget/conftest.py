import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_promql_budget(
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
    SigNoz with clickhousev2 serving and tiny fetch budgets, so engine-path
    queries trip the ClickHouse-enforced result limits with small fixtures.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-promql-budget",
        env_overrides={
            "SIGNOZ_PROMETHEUS_PROVIDER": "clickhousev2",
            "SIGNOZ_PROMETHEUS_CLICKHOUSEV2_MAX__FETCHED__SERIES": "10",
            "SIGNOZ_PROMETHEUS_CLICKHOUSEV2_MAX__FETCHED__SAMPLES": "100",
        },
    )
