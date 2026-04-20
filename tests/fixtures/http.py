from typing import Callable, List

import docker
import docker.errors
import pytest
from testcontainers.core.container import Network
from wiremock.client import (
    Mapping,
    Mappings,
    Requests,
)
from wiremock.constants import Config
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="zeus", scope="package")
def zeus(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for running zeus
    """

    def create() -> types.TestContainerDocker:
        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_network(network)
        container.start()

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "8080": types.TestContainerUrlConfig(
                    "http",
                    container.get_container_host_ip(),
                    container.get_exposed_port(8080),
                )
            },
            container_configs={
                "8080": types.TestContainerUrlConfig(
                    "http", container.get_wrapped_container().name, 8080
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
                "Skipping removal of Zeus, Zeus(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return dev.wrap(
        request,
        pytestconfig,
        "zeus",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="gateway", scope="package")
def gateway(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for running gateway
    """

    def create() -> types.TestContainerDocker:
        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_exposed_ports(8080)
        container.with_network(network)
        container.start()

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "8080": types.TestContainerUrlConfig(
                    "http",
                    container.get_container_host_ip(),
                    container.get_exposed_port(8080),
                )
            },
            container_configs={
                "8080": types.TestContainerUrlConfig(
                    "http", container.get_wrapped_container().name, 8080
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
                "Skipping removal of Gateway, Gateway(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return dev.wrap(
        request,
        pytestconfig,
        "gateway",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="make_http_mocks", scope="function")
def make_http_mocks() -> Callable[[types.TestContainerDocker, List[Mapping]], None]:
    def _make_http_mocks(
        container: types.TestContainerDocker, mappings: List[Mapping]
    ) -> None:
        Config.base_url = container.host_configs["8080"].get("/__admin")

        for mapping in mappings:
            Mappings.create_mapping(mapping=mapping)

    yield _make_http_mocks

    Mappings.delete_all_mappings()
    Requests.reset_request_journal()
