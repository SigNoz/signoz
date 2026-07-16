import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_ai(
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    Package-scoped SigNoz with AI observability enabled: the metadata store surfaces
    the gen_ai semconv keys and the trace-aggregate suggestion keys only behind this
    flag, so the querierai suite runs against a flag-enabled instance.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-ai",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_ENABLE__AI__OBSERVABILITY": True,
        },
    )
