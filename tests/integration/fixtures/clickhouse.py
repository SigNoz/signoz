import os
from typing import Any, Generator

import clickhouse_driver
import docker
import pytest
from testcontainers.clickhouse import ClickHouseContainer
from testcontainers.core.container import DockerContainer, Network

from fixtures.fs import LEGACY_PATH
from fixtures.types import TestContainerConnection


@pytest.fixture(name="zookeeper",scope="package")
def fzookeeper(
    network: Network, request: pytest.FixtureRequest
) -> TestContainerConnection:
    """
    Package-scoped fixture for Zookeeper TestContainer.
    """
    container = DockerContainer("bitnami/zookeeper:3.7.1")
    container.with_env("ALLOW_ANONYMOUS_LOGIN", "yes")
    container.with_exposed_ports(2181)
    container.with_network(network=network)

    container.start()

    def stop():
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return TestContainerConnection(
        None,
        {
            "host": f"{container.get_container_host_ip()}",
            "port": f"{container.get_exposed_port(2181)}",
        },
        {"host": f"{container.get_wrapped_container().name}", "port": f"{2181}"},
    )


@pytest.fixture(name="clickhouse",scope="package")
def fclickhouse(
    tmpfs: Generator[LEGACY_PATH, Any, None],
    network: Network,
    zookeeper: TestContainerConnection,
    request: pytest.FixtureRequest,
) -> TestContainerConnection:
    """
    Package-scoped fixture for Clickhouse TestContainer.
    """
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
                <host>{zookeeper.container_config['host']}</host>
                <port>{zookeeper.container_config['port']}</port>
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
        connection.close()
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return TestContainerConnection(
        connection,
        {
            "dsn": f"tcp://{container.username}:{container.password}@{container.get_container_host_ip()}:{container.get_exposed_port(9000)}"
        },
        {
            "dsn": f"tcp://{container.username}:{container.password}@{container.get_wrapped_container().name}:{9000}"
        },
    )


@pytest.fixture(scope="package")
def migration(
    network: Network,
    clickhouse: TestContainerConnection,
    request: pytest.FixtureRequest,
) -> None:
    """
    Package-scoped fixture for running schema migrations.
    """
    version = request.config.getoption("--schema-migrator-version")

    client = docker.from_env()

    container = client.containers.run(
        image=f"signoz/signoz-schema-migrator:{version}",
        command=f"sync --replication=true --cluster-name=cluster --up= --dsn={clickhouse.container_config["dsn"]}",
        detach=True,
        auto_remove=False,
        network=network.id,
    )

    result = container.wait()

    if result["StatusCode"] != 0:
        logs = container.logs().decode()
        container.remove()
        raise RuntimeError(f"failed to run migrations on clickhouse\n {logs}")

    container.remove()

    container = client.containers.run(
        image=f"signoz/signoz-schema-migrator:{version}",
        command=f"async --replication=true --cluster-name=cluster --up= --dsn={clickhouse.container_config["dsn"]}",
        detach=True,
        auto_remove=False,
        network=network.id,
    )

    result = container.wait()

    if result["StatusCode"] != 0:
        logs = container.logs().decode()
        container.remove()
        raise RuntimeError(f"failed to run migrations on clickhouse\n {logs}")

    container.remove()
