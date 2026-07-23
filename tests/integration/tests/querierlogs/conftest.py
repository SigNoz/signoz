import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


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
    """SigNoz with a conservative search_max_scan_rows (50000) so a broad search() over a
    busy range trips the cost guard, while a more selective one (by service or by a
    narrower time range) stays under it. Shares the default instance's sqlstore +
    clickhouse, so the same admin token and seeded logs work against it."""
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-search-scan-budget-50k",
        env_overrides={
            "SIGNOZ_QUERIER_SEARCH__MAX__SCAN__ROWS": 50000,
        },
    )
