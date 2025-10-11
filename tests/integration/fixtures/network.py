import docker
import docker.errors
import pytest
from testcontainers.core.network import Network

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="network", scope="package")
def network(
    request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.Network:
    """
    Package-Scoped fixture for creating a network
    """

    def create() -> types.Network:
        nw = Network()
        nw.create()
        return types.Network(id=nw.id, name=nw.name)

    def delete(nw: types.Network):
        client = docker.from_env()
        try:
            client.networks.get(network_id=nw.id).remove()
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of Network, Network(%s) not found. Maybe it was manually removed?",
                {"name": nw.name, "id": nw.id},
            )

    def restore(existing: dict) -> types.Network:
        client = docker.from_env()
        nw = client.networks.get(network_id=existing.get("id"))
        return types.Network(id=nw.id, name=nw.name)

    return dev.wrap(
        request,
        pytestconfig,
        "network",
        lambda: types.Network("", ""),  # pylint: disable=unnecessary-lambda
        create,
        delete,
        restore,
    )
