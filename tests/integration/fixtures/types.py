from dataclasses import dataclass
from typing import Dict, List, Literal
from urllib.parse import urljoin

import clickhouse_connect
import clickhouse_connect.driver
import clickhouse_connect.driver.client
import py
from sqlalchemy import Engine

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

    def __cache__(self) -> dict:
        return {
            "scheme": self.scheme,
            "address": self.address,
            "port": self.port,
        }

    def __log__(self) -> str:
        return f"TestContainerUrlConfig(scheme={self.scheme}, address={self.address}, port={self.port})"


@dataclass
class TestContainerDocker:
    __test__ = False
    id: str
    host_configs: Dict[str, TestContainerUrlConfig]
    container_configs: Dict[str, TestContainerUrlConfig]

    @staticmethod
    def from_cache(cache: dict) -> "TestContainerDocker":
        return TestContainerDocker(
            id=cache["id"],
            host_configs={
                port: TestContainerUrlConfig(**config)
                for port, config in cache["host_configs"].items()
            },
            container_configs={
                port: TestContainerUrlConfig(**config)
                for port, config in cache["container_configs"].items()
            },
        )

    def __cache__(self) -> dict:
        return {
            "id": self.id,
            "host_configs": {
                port: config.__cache__() for port, config in self.host_configs.items()
            },
            "container_configs": {
                port: config.__cache__()
                for port, config in self.container_configs.items()
            },
        }

    def __log__(self) -> str:
        return f"TestContainerDocker(id={self.id}, host_configs={', '.join(host_config.__log__() for host_config in self.host_configs.values())}, container_configs={', '.join(container_config.__log__() for container_config in self.container_configs.values())})"


@dataclass
class TestContainerSQL:
    __test__ = False
    container: TestContainerDocker
    conn: Engine
    env: Dict[str, str]

    def __cache__(self) -> dict:
        return {
            "container": self.container.__cache__(),
            "env": self.env,
        }

    def __log__(self) -> str:
        return f"TestContainerSQL(container={self.container.__log__()}, env={self.env})"


@dataclass
class TestContainerClickhouse:
    __test__ = False
    container: TestContainerDocker
    conn: clickhouse_connect.driver.client.Client
    env: Dict[str, str]

    def __cache__(self) -> dict:
        return {
            "container": self.container.__cache__(),
            "env": self.env,
        }

    def __log__(self) -> str:
        return f"TestContainerClickhouse(container={self.container.__log__()}, env={self.env})"


@dataclass
class TestContainerIDP:
    __test__ = False
    container: TestContainerDocker

    def __cache__(self) -> dict:
        return {
            "container": self.container.__cache__(),
        }

    def __log__(self) -> str:
        return f"TestContainerIDP(container={self.container.__log__()})"


@dataclass
class SigNoz:
    __test__ = False
    self: TestContainerDocker
    sqlstore: TestContainerSQL
    telemetrystore: TestContainerClickhouse
    zeus: TestContainerDocker
    gateway: TestContainerDocker

    def __cache__(self) -> dict:
        return self.self.__cache__()

    def __log__(self) -> str:
        return f"SigNoz(self={self.self.__log__()}, sqlstore={self.sqlstore.__log__()}, telemetrystore={self.telemetrystore.__log__()}, zeus={self.zeus.__log__()}, gateway={self.gateway.__log__()})"


@dataclass
class Operation:
    __test__ = False
    name: str

    def __cache__(self) -> dict:
        return {"name": self.name}

    def __log__(self) -> str:
        return f"Operation(name={self.name})"


@dataclass
class Network:
    __test__ = False
    id: str
    name: str

    def __cache__(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
        }

    def __log__(self) -> str:
        return f"Network(id={self.id}, name={self.name})"


# Alerts related types


@dataclass(frozen=True)
class AlertData:
    # type of the alert data, one of 'metrics', 'logs', 'traces'
    type: Literal["metrics", "logs", "traces"]
    # path to the data file in testdata directory
    data_path: str


@dataclass(frozen=True)
class FiringAlert:
    # labels of the alert that is firing
    labels: dict[str, str]
    # annotations and other fields can be added later as per need


@dataclass(frozen=True)
class AlertExpectation:
    # whether we expect any alerts to be fired
    should_alert: bool
    # alerts that we expect to be fired
    expected_alerts: List[FiringAlert]
    # seconds to wait for the alerts to be fired, if no
    # alerts are fired in the expected time, the test will fail
    wait_time_seconds: int


@dataclass(frozen=True)
class AlertTestCase:
    # name of the test case
    name: str
    # path to the rule file in testdata directory
    rule_path: str
    # list of alert data that will be inserted into the database
    alert_data: List[AlertData]
    # list of alert expectations for the test case
    alert_expectation: AlertExpectation
