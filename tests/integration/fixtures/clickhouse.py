import os
from typing import Any, Generator

import clickhouse_connect
import clickhouse_connect.driver
import clickhouse_connect.driver.client
import docker
import docker.errors
import pytest
from testcontainers.clickhouse import ClickHouseContainer
from testcontainers.core.container import Network

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="clickhouse", scope="package")
def clickhouse(
    tmpfs: Generator[types.LegacyPath, Any, None],
    network: Network,
    zookeeper: types.TestContainerDocker,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerClickhouse:
    """
    Package-scoped fixture for Clickhouse TestContainer.
    """

    def create() -> types.TestContainerClickhouse:
        version = request.config.getoption("--clickhouse-version")

        container = ClickHouseContainer(
            image=f"clickhouse/clickhouse-server:{version}",
            port=9000,
            username="signoz",
            password="password",
        )

        cluster_config = f"""
        <clickhouse>
            <logger>
                <level>information</level>
                <formatting>
                    <type>json</type>
                </formatting>
                <log>/var/log/clickhouse-server/clickhouse-server.log</log>
                <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
                <size>1000M</size>
                <count>3</count>
                <console>1</console>
            </logger>

            <macros>
                <shard>01</shard>
                <replica>01</replica>
            </macros>

            <zookeeper>
                <node>
                    <host>{zookeeper.container_configs["2181"].address}</host>
                    <port>{zookeeper.container_configs["2181"].port}</port>
                </node>
            </zookeeper>

            <remote_servers>
                <cluster>
                    <shard>
                        <replica>
                            <host>127.0.0.1</host>
                            <port>9000</port>
                        </replica>
                    </shard>
                </cluster>
            </remote_servers>

            <distributed_ddl>
                <path>/clickhouse/task_queue/ddl</path>
                <profile>default</profile>
            </distributed_ddl>
        </clickhouse>
        """

        tmp_dir = tmpfs("clickhouse")
        cluster_config_file_path = os.path.join(tmp_dir, "cluster.xml")
        with open(cluster_config_file_path, "w", encoding="utf-8") as f:
            f.write(cluster_config)

        container.with_volume_mapping(
            cluster_config_file_path, "/etc/clickhouse-server/config.d/cluster.xml"
        )
        container.with_network(network)
        container.start()

        connection = clickhouse_connect.get_client(
            user=container.username,
            password=container.password,
            host=container.get_container_host_ip(),
            port=container.get_exposed_port(8123),
        )

        return types.TestContainerClickhouse(
            container=types.TestContainerDocker(
                id=container.get_wrapped_container().id,
                host_configs={
                    "9000": types.TestContainerUrlConfig(
                        "tcp",
                        container.get_container_host_ip(),
                        container.get_exposed_port(9000),
                    ),
                    "8123": types.TestContainerUrlConfig(
                        "tcp",
                        container.get_container_host_ip(),
                        container.get_exposed_port(8123),
                    ),
                },
                container_configs={
                    "9000": types.TestContainerUrlConfig(
                        "tcp", container.get_wrapped_container().name, 9000
                    ),
                    "8123": types.TestContainerUrlConfig(
                        "tcp", container.get_wrapped_container().name, 8123
                    ),
                },
            ),
            conn=connection,
            env={
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN": f"tcp://{container.username}:{container.password}@{container.get_wrapped_container().name}:{9000}",
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME": container.username,
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD": container.password,
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER": "cluster",
            },
        )

    def delete(container: types.TestContainerClickhouse) -> None:
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.container.id).stop()
            client.containers.get(container_id=container.container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of Clickhouse, Clickhouse(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerClickhouse:
        container = types.TestContainerDocker.from_cache(cache["container"])
        host_config = container.host_configs["8123"]
        env = cache["env"]

        conn = clickhouse_connect.get_client(
            user=env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"],
            password=env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"],
            host=host_config.address,
            port=host_config.port,
        )

        return types.TestContainerClickhouse(
            container=container,
            conn=conn,
            env=env,
        )

    return dev.wrap(
        request,
        pytestconfig,
        "clickhouse",
        empty=lambda: types.TestContainerSQL(
            container=types.TestContainerDocker(
                id="", host_configs={}, container_configs={}
            ),
            conn=None,
            env={},
        ),
        create=create,
        delete=delete,
        restore=restore,
    )
