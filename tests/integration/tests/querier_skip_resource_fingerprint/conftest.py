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
    optimization enabled and a low threshold so the fallback resolver path is
    exercised (filters matching >= 2 fingerprints skip the fingerprint CTE).
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


@pytest.fixture(name="signoz_fingerprint", scope="package")
def signoz_fingerprint(
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
    A second SigNoz instance with the optimization disabled, so every query
    resolves resource filters through the fingerprint CTE (the path the primary
    also takes below the threshold). It shares the same ClickHouse (telemetry)
    and sqlstore (users) as the primary instance, which lets a single admin
    token authenticate against both and lets the tests diff the optimized
    result against this fingerprint baseline for the same query and data.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-skip-resource-fingerprint-baseline",
        env_overrides={
            "SIGNOZ_QUERIER_SKIP__RESOURCE__FINGERPRINT_ENABLED": False,
        },
    )
