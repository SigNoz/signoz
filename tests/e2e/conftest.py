import pytest
from testcontainers.core.network import Network

from fixtures import types
from fixtures.signoz import create_signoz

# `use_infra_monitoring_v2` ships with DefaultVariant "disabled" (see
# pkg/flagger/registry.go), and `useIsInfraMonitoringV2` in the frontend routes
# /infrastructure-monitoring/{hosts,kubernetes} to the *V1* containers when it is
# off. The whole e2e suite is written against V2 — V1 renders a different search
# box and a different URL contract — so the e2e stack turns the flag on by
# construction rather than relying on someone having flipped it by hand.
#
# The integration suite deliberately keeps the product default, so this override
# lives here rather than in `fixtures/signoz.py`.
E2E_FLAGGER_ENV = {
    "SIGNOZ_FLAGGER_CONFIG_BOOLEAN_USE__INFRA__MONITORING__V2": True,
}


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """SigNoz with the e2e-specific feature flags applied."""
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        env_overrides=E2E_FLAGGER_ENV,
    )
