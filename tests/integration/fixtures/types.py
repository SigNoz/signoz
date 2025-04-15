from dataclasses import dataclass
from typing import Dict
from urllib.parse import urljoin

import py
from clickhouse_driver.dbapi import Connection
from testcontainers.core.container import DockerContainer
from wiremock.testing.testcontainer import WireMockContainer

LegacyPath = py.path.local


@dataclass
class TestContainerUrlConfig:
    __test__ = False
    scheme: str
    address: str
    port: int

    def base(self) -> str:
        return f"{self.scheme}://{self.address}:{self.port}"

    def get(self, path: str) -> str:
        return urljoin(self.base(), path)


@dataclass
class TestContainerDocker:
    __test__ = False
    container: DockerContainer
    host_config: TestContainerUrlConfig
    container_config: TestContainerUrlConfig


@dataclass
class TestContainerWiremock(TestContainerDocker):
    __test__ = False
    container: WireMockContainer


@dataclass
class TestContainerSQL(TestContainerDocker):
    __test__ = False
    container: DockerContainer
    conn: any
    env: Dict[str, str]


@dataclass
class TestContainerClickhouse(TestContainerDocker):
    __test__ = False
    container: DockerContainer
    conn: Connection
    env: Dict[str, str]


@dataclass
class SigNoz:
    __test__ = False
    self: TestContainerDocker
    sqlstore: TestContainerSQL
    telemetrystore: TestContainerClickhouse
    zeus: TestContainerWiremock
