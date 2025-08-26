import docker
import docker.errors
import pytest
from testcontainers.core.container import DockerContainer, Network

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="zookeeper", scope="package")
def zookeeper(
    network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for Zookeeper TestContainer.
    """

    def create() -> types.TestContainerDocker:
        version = request.config.getoption("--zookeeper-version")

        container = DockerContainer(image=f"signoz/zookeeper:{version}")
        container.with_env("ALLOW_ANONYMOUS_LOGIN", "yes")
        container.with_exposed_ports(2181)
        container.with_network(network=network)

        container.start()
        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "2181": types.TestContainerUrlConfig(
                    scheme="tcp",
                    address=container.get_container_host_ip(),
                    port=container.get_exposed_port(2181),
                )
            },
            container_configs={
                "2181": types.TestContainerUrlConfig(
                    scheme="tcp",
                    address=container.get_wrapped_container().name,
                    port=2181,
                )
            },
        )

    def delete(container: types.TestContainerDocker):
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.id).stop()
            client.containers.get(container_id=container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of Zookeeper, Zookeeper(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return dev.wrap(
        request,
        pytestconfig,
        "zookeeper",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )
