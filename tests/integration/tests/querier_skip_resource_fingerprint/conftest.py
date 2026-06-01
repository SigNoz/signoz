import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_skip_resource_fingerprint(
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
    Package-scoped SigNoz instance with the skip_resource_fingerprint
    optimization enabled and a low threshold so both the materialized and
    fallback resolver paths are exercised by sibling tests.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-skip-resource-fingerprint",
        env_overrides={
            "SIGNOZ_QUERIER_SKIP__RESOURCE__FINGERPRINT_ENABLED": True,
            "SIGNOZ_QUERIER_SKIP__RESOURCE__FINGERPRINT_THRESHOLD": 2,
        },
    )
