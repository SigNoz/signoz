import dataclasses
from typing import List

import pytest
from testcontainers.core.container import Network
from wiremock.client import (
    Mapping,
    Mappings,
    Requests,
)
from wiremock.constants import Config
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import types


@pytest.fixture(name="zeus", scope="package")
def zeus(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for running zeus
    """
    dev = request.config.getoption("--dev")
    if dev:
        cached_zeus = pytestconfig.cache.get("zeus", None)
        if cached_zeus:
            return types.TestContainerDocker(
                host_config=types.TestContainerUrlConfig(
                    cached_zeus["host_config"]["scheme"],
                    cached_zeus["host_config"]["address"],
                    cached_zeus["host_config"]["port"],
                ),
                container_config=types.TestContainerUrlConfig(
                    cached_zeus["container_config"]["scheme"],
                    cached_zeus["container_config"]["address"],
                    cached_zeus["container_config"]["port"],
                ),
            )

    container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
    container.with_network(network)

    container.start()

    def stop():
        if dev:
            return

        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    cached_zeus = types.TestContainerDocker(
        host_config=types.TestContainerUrlConfig(
            "http", container.get_container_host_ip(), container.get_exposed_port(8080)
        ),
        container_config=types.TestContainerUrlConfig(
            "http", container.get_wrapped_container().name, 8080
        ),
    )

    if dev:
        pytestconfig.cache.set("zeus", dataclasses.asdict(cached_zeus))

    return cached_zeus


@pytest.fixture(name="make_http_mocks", scope="function")
def make_http_mocks():
    def _make_http_mocks(container: types.TestContainerDocker, mappings: List[Mapping]):
        Config.base_url = container.host_config.get("/__admin")

        for mapping in mappings:
            Mappings.create_mapping(mapping=mapping)

    yield _make_http_mocks

    Mappings.delete_all_mappings()
    Requests.reset_request_journal()
