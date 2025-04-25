from dataclasses import dataclass
from typing import Dict
from urllib.parse import urljoin

import py
from clickhouse_driver.dbapi import Connection

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
    host_config: TestContainerUrlConfig
    container_config: TestContainerUrlConfig


@dataclass
class TestContainerSQL:
    __test__ = False
    container: TestContainerDocker
    conn: any
    env: Dict[str, str]


@dataclass
class TestContainerClickhouse:
    __test__ = False
    container: TestContainerDocker
    conn: Connection
    env: Dict[str, str]


@dataclass
class SigNoz:
    __test__ = False
    self: TestContainerDocker
    sqlstore: TestContainerSQL
    telemetrystore: TestContainerClickhouse
    zeus: TestContainerDocker
