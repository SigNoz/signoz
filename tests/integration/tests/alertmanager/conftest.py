import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.maildev import signoz_smtp_env
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
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_alertmanager",
        env_overrides={
            **signoz_smtp_env(maildev),
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_PAGERDUTY__URL": notification_channel.container_configs["8080"].get("/v2/enqueue"),
            "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_OPSGENIE__API__URL": notification_channel.container_configs["8080"].get("/"),
        },
    )
