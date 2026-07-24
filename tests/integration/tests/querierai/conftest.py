import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_ai_observability(
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
    Package-scoped SigNoz instance with AI observability enabled. source=ai
    queries rely on the metadata store surfacing the static gen_ai key
    definitions (enrichWithGenAIKeys), which is gated on this flag — without it
    the gate keys (gen_ai.tool.name, gen_ai.agent.name, ...) only resolve once
    a span carrying them has been ingested.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-ai-observability",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_ENABLE__AI__OBSERVABILITY": True,
        },
    )
