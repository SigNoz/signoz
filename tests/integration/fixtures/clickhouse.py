import dataclasses
import os
from typing import Any, Generator

import clickhouse_driver
import pytest
from testcontainers.clickhouse import ClickHouseContainer
from testcontainers.core.container import Network

from fixtures import types


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
    dev = request.config.getoption("--dev")
    if dev:
        container = pytestconfig.cache.get("clickhouse.container", None)
        env = pytestconfig.cache.get("clickhouse.env", None)

        if container and env:
            assert isinstance(container, dict)
            assert isinstance(env, dict)

            test_container = types.TestContainerDocker(
                host_config=types.TestContainerUrlConfig(
                    container["host_config"]["scheme"],
                    container["host_config"]["address"],
                    container["host_config"]["port"],
                ),
                container_config=types.TestContainerUrlConfig(
                    container["container_config"]["scheme"],
                    container["container_config"]["address"],
                    container["container_config"]["port"],
                ),
            )

            connection = clickhouse_driver.connect(
                user=env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"],
                password=env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"],
                host=test_container.host_config.address,
                port=test_container.host_config.port,
            )

            return types.TestContainerClickhouse(
                container=test_container,
                conn=connection,
                env=env,
            )

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
                <host>{zookeeper.container_config.address}</host>
                <port>{zookeeper.container_config.port}</port>
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

    connection = clickhouse_driver.connect(
        user=container.username,
        password=container.password,
        host=container.get_container_host_ip(),
        port=container.get_exposed_port(9000),
    )

    def stop():
        if dev:
            return

        connection.close()
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    cached_clickhouse = types.TestContainerClickhouse(
        container=types.TestContainerDocker(
            host_config=types.TestContainerUrlConfig(
                "tcp",
                container.get_container_host_ip(),
                container.get_exposed_port(9000),
            ),
            container_config=types.TestContainerUrlConfig(
                "tcp", container.get_wrapped_container().name, 9000
            ),
        ),
        conn=connection,
        env={
            "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN": f"tcp://{container.username}:{container.password}@{container.get_wrapped_container().name}:{9000}",  # pylint: disable=line-too-long
            "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME": container.username,
            "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD": container.password,
        },
    )

    if dev:
        pytestconfig.cache.set(
            "clickhouse.container", dataclasses.asdict(cached_clickhouse.container)
        )
        pytestconfig.cache.set("clickhouse.env", cached_clickhouse.env)

    return cached_clickhouse
