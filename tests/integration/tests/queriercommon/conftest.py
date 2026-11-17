from collections.abc import Callable

import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz_clickhouse_query_profile", scope="package")
def signoz_clickhouse_query_profile(
    network: Network,
    migrator: types.Operation,  # pylint: disable=unused-argument
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    clickhouse_settings_profile: Callable[[str, str], None],
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    SigNoz whose clickhouse_sql queries run with the clickhouse_query profile. The profile is created
    first: SigNoz checks it once at startup and runs without it when it is missing.
    """
    clickhouse_settings_profile(
        "clickhouse_query",
        "<max_result_rows>100</max_result_rows><constraints><max_result_rows><min>1</min><max>100</max></max_result_rows></constraints>",
    )
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-clickhouse-query-profile",
        env_overrides={
            "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PROFILES": "clickhouse_query",
        },
    )
