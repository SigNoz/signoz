import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_promql_conformance(
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
    Package-scoped SigNoz with use_prometheus_clickhouse_v2 on, so the corpus
    can replay every case twice: once against the default provider and once
    pinned to the clickhousev2 provider via the X-SigNoz-PromQL-Provider
    header (which the flag gates). Each leg is asserted against the same
    frozen expectations — see 01_upstream_corpus.py for why the legs are
    never asserted against each other.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz-promql-conformance",
        env_overrides={
            "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_USE__PROMETHEUS__CLICKHOUSE__V2": True,
        },
    )
