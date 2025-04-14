from dataclasses import dataclass
from urllib.parse import urljoin

from testcontainers.core.container import DockerContainer
from wiremock.testing.testcontainer import WireMockContainer


@dataclass
class TestContainerConnectionConfig:
    __test__ = False
    scheme: str
    address: str
    port: int

    def base_url(self) -> str:
        return f"{self.scheme}://{self.address}:{self.port}"

    def get_url(self, path: str) -> str:
        return urljoin(self.base_url(), path)


@dataclass
class TestContainerConfig:
    __test__ = False
    container: DockerContainer
    host_config: TestContainerConnectionConfig
    container_config: TestContainerConnectionConfig


@dataclass
class TestContainerWiremock(TestContainerConfig):
    __test__ = False
    container: WireMockContainer


@dataclass
class TestContainerConnection:
    __test__ = False
    connection: any
    host_config: dict
    container_config: dict


@dataclass
class SigNoz:
    __test__ = False
    self: TestContainerConfig
    sqlstore: TestContainerConnection
    telemetrystore: TestContainerConnection
    zeus: TestContainerWiremock
