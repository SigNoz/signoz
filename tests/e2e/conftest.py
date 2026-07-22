import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_e2e(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    E2E-scoped SigNoz override. Enables the experimental AI/LLM Observability
    module (disabled by default in pkg/flagger/registry.go) so its routes render
    instead of redirecting to /home — required by the llm-o11y e2e specs. Scoped
    to the e2e package via this conftest so normal integration tests keep the
    stock feature set. Follows the same pattern as
    tests/integration/tests/metricreduction/conftest.py.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_e2e",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_ENABLE__AI__OBSERVABILITY": True,
        },
    )
