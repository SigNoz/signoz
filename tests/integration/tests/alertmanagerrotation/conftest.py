import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.maildev import NEW_PROVIDER_SMTP_PASS, OLD_PROVIDER_SMTP_PASS, create_maildev, signoz_smtp_env
from fixtures.signoz import create_signoz


@pytest.fixture(name="maildev_old", scope="package")
def maildev_old(network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.TestContainerDocker:
    return create_maildev(network, request, pytestconfig, cache_key="maildev_smtp_old", incoming_pass=OLD_PROVIDER_SMTP_PASS)


@pytest.fixture(name="maildev_new", scope="package")
def maildev_new(network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.TestContainerDocker:
    return create_maildev(network, request, pytestconfig, cache_key="maildev_smtp_new", incoming_pass=NEW_PROVIDER_SMTP_PASS)


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    maildev_old: types.TestContainerDocker,
) -> types.SigNoz:
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_smtp_rotation",
        env_overrides=signoz_smtp_env(maildev_old, password=OLD_PROVIDER_SMTP_PASS),
    )
