import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    maildev: types.TestContainerDocker,
    notification_channel: types.TestContainerDocker,
) -> types.SigNoz:
    """
    Package-scoped fixture for setting up SigNoz.
    Overrides SMTP, PagerDuty, and OpsGenie URLs to point to test containers.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        env_overrides={
            # SMTP config for email notifications via maildev
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__SMARTHOST": f"{maildev.container_configs['1025'].address}:{maildev.container_configs['1025'].port}",
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__REQUIRE__TLS": "false",
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__FROM": "alertmanager@signoz.io",
            # PagerDuty API URL -> wiremock (default: https://events.pagerduty.com/v2/enqueue)
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_PAGERDUTY__URL": notification_channel.container_configs["8080"].get("/v2/enqueue"),
            # OpsGenie API URL -> wiremock (default: https://api.opsgenie.com/)
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_OPSGENIE__API__URL": notification_channel.container_configs["8080"].get("/"),
        },
    )
