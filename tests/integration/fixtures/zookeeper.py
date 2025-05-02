import dataclasses

import pytest
from testcontainers.core.container import DockerContainer, Network

from fixtures import types


@pytest.fixture(name="zookeeper", scope="package")
def zookeeper(
    network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for Zookeeper TestContainer.
    """

    dev = request.config.getoption("--dev")
    if dev:
        cached_zookeeper = pytestconfig.cache.get("zookeeper", None)
        if cached_zookeeper:
            return types.TestContainerDocker(
                host_config=types.TestContainerUrlConfig(
                    cached_zookeeper["host_config"]["scheme"],
                    cached_zookeeper["host_config"]["address"],
                    cached_zookeeper["host_config"]["port"],
                ),
                container_config=types.TestContainerUrlConfig(
                    cached_zookeeper["container_config"]["scheme"],
                    cached_zookeeper["container_config"]["address"],
                    cached_zookeeper["container_config"]["port"],
                ),
            )

    version = request.config.getoption("--zookeeper-version")

    container = DockerContainer(image=f"bitnami/zookeeper:{version}")
    container.with_env("ALLOW_ANONYMOUS_LOGIN", "yes")
    container.with_exposed_ports(2181)
    container.with_network(network=network)

    container.start()

    def stop():
        if dev:
            return

        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    cached_zookeeper = types.TestContainerDocker(
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

    if dev:
        pytestconfig.cache.set("zookeeper", dataclasses.asdict(cached_zookeeper))

    return cached_zookeeper
