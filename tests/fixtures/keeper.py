import os
from collections.abc import Generator
from typing import Any

import docker
import docker.errors
import pytest
from testcontainers.core.container import DockerContainer, Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

KEEPER_CONFIG = """
<clickhouse>
    <listen_host>0.0.0.0</listen_host>
    <keeper_server>
        <tcp_port>9181</tcp_port>
        <server_id>1</server_id>
        <log_storage_path>/var/lib/clickhouse-keeper/coordination/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse-keeper/coordination/snapshots</snapshot_storage_path>
        <coordination_settings>
            <operation_timeout_ms>10000</operation_timeout_ms>
            <session_timeout_ms>30000</session_timeout_ms>
            <raft_logs_level>warning</raft_logs_level>
        </coordination_settings>
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>localhost</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
"""


def create_clickhouse_keeper(
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "clickhousekeeper",
) -> types.TestContainerDocker:

    def create() -> types.TestContainerDocker:
        keeper_version = request.config.getoption("--clickhouse-version")

        tmp_dir = tmpfs(cache_key)
        keeper_config_file_path = os.path.join(tmp_dir, "keeper_config.xml")
        with open(keeper_config_file_path, "w", encoding="utf-8") as f:
            f.write(KEEPER_CONFIG)

        container = DockerContainer(image=f"clickhouse/clickhouse-keeper:{keeper_version}")
        container.with_volume_mapping(keeper_config_file_path, "/etc/clickhouse-keeper/keeper_config.xml")
        container.with_exposed_ports(9181)
        container.with_network(network=network)

        container.start()
        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "9181": types.TestContainerUrlConfig(
                    scheme="tcp",
                    address=container.get_container_host_ip(),
                    port=container.get_exposed_port(9181),
                )
            },
            container_configs={
                "9181": types.TestContainerUrlConfig(
                    scheme="tcp",
                    address=container.get_wrapped_container().name,
                    port=9181,
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
                "Skipping removal of ClickHouse Keeper, Keeper(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return reuse.wrap(
        request,
        pytestconfig,
        cache_key,
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="keeper", scope="package")
def keeper(
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for ClickHouse Keeper TestContainer.
    """
    return create_clickhouse_keeper(
        tmpfs=tmpfs,
        network=network,
        request=request,
        pytestconfig=pytestconfig,
    )
