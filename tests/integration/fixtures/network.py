import pytest
from testcontainers.core.container import Network

from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="network", scope="package")
def network(request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> Network:
    """
    Package-Scoped fixture for creating a network
    """
    nw = Network()

    dev = request.config.getoption("--dev")
    if dev:
        cached_network = pytestconfig.cache.get("network", None)
        if cached_network:
            logger.info("Using cached Network(%s)", cached_network)
            nw.id = cached_network["id"]
            nw.name = cached_network["name"]
            return nw

    nw.create()

    def stop():
        dev = request.config.getoption("--dev")
        if dev:
            logger.info(
                "Skipping removal of Network(%s)", {"name": nw.name, "id": nw.id}
            )
        else:
            logger.info("Removing Network(%s)", {"name": nw.name, "id": nw.id})
            nw.remove()

    request.addfinalizer(stop)

    cached_network = nw
    if dev:
        pytestconfig.cache.set(
            "network", {"name": cached_network.name, "id": cached_network.id}
        )

    return cached_network
