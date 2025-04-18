import pytest
from testcontainers.core.container import DockerContainer, Network

from fixtures import types


@pytest.fixture(name="zookeeper", scope="package")
def zookeeper(
    network: Network, request: pytest.FixtureRequest
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for Zookeeper TestContainer.
    """
    version = request.config.getoption("--zookeeper-version")

    container = DockerContainer(image=f"bitnami/zookeeper:{version}")
    container.with_env("ALLOW_ANONYMOUS_LOGIN", "yes")
    container.with_exposed_ports(2181)
    container.with_network(network=network)

    container.start()

    def stop():
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return types.TestContainerDocker(
        container=container,
        host_config=types.TestContainerUrlConfig(
            "tcp",
            container.get_container_host_ip(),
            container.get_exposed_port(2181),
        ),
        container_config=types.TestContainerUrlConfig(
            "tcp",
            container.get_wrapped_container().name,
            2181,
        ),
    )
