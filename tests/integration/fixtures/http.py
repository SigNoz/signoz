from typing import List

import pytest
from testcontainers.core.container import Network
from wiremock.client import (
    Mapping,
    Mappings,
)
from wiremock.constants import Config
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import types


@pytest.fixture(name="zeus", scope="package")
def zeus(
    network: Network, request: pytest.FixtureRequest
) -> types.TestContainerWiremock:
    """
    Package-scoped fixture for running zeus
    """
    container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
    container.with_network(network)

    container.start()

    def stop():
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return types.TestContainerWiremock(
        container=container,
        host_config=types.TestContainerUrlConfig(
            "http", container.get_container_host_ip(), container.get_exposed_port(8080)
        ),
        container_config=types.TestContainerUrlConfig(
            "http", container.get_wrapped_container().name, 8080
        ),
    )


@pytest.fixture(name="make_http_mocks", scope="function")
def make_http_mocks():
    def _make_http_mocks(container: WireMockContainer, mappings: List[Mapping]):
        Config.base_url = container.get_url("__admin")

        for mapping in mappings:
            Mappings.create_mapping(mapping=mapping)

    yield _make_http_mocks

    Mappings.delete_all_mappings()
