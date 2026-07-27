import os
from collections.abc import Callable, Generator
from datetime import datetime
from typing import Any
from uuid import uuid4

import clickhouse_connect
import clickhouse_connect.driver
import clickhouse_connect.driver.client
import docker
import docker.errors
import pytest
from testcontainers.clickhouse import ClickHouseContainer
from testcontainers.core.container import Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

CLICKHOUSE_USERNAME = "signoz"
CLICKHOUSE_PASSWORD = "password"

CUSTOM_FUNCTION_CONFIG = """
<functions>
    <function>
        <type>executable</type>
        <name>histogramQuantile</name>
        <return_type>Float64</return_type>
        <argument>
            <type>Array(Float64)</type>
            <name>buckets</name>
        </argument>
        <argument>
            <type>Array(Float64)</type>
            <name>counts</name>
        </argument>
        <argument>
            <type>Float64</type>
            <name>quantile</name>
        </argument>
        <format>CSV</format>
        <command>./histogramQuantile</command>
    </function>
</functions>
"""

# Distributed inserts to a remote shard are async by default. We force
# sycn at the profile level for deterministic tests.
CLUSTER_USERS_CONFIG = """
<clickhouse>
    <profiles>
        <default>
            <insert_distributed_sync>1</insert_distributed_sync>
        </default>
    </profiles>
</clickhouse>
"""


def render_remote_servers(shard_hosts: list[tuple[str, int]], secret: str | None = None) -> str:
    """Render the <remote_servers> block for a cluster named `cluster` with one
    single-replica shard per (host, port).
    """
    shards = "".join(
        f"""
                <shard>
                    <replica>
                        <host>{host}</host>
                        <port>{port}</port>
                    </replica>
                </shard>"""
        for host, port in shard_hosts
    )

    # Multi-node clusters need `secret` because distributed queries otherwise
    # authenticate as the `default` user, which the docker entrypoint restricts
    # to localhost when a custom user is configured.
    secret_block = (
        f"""
                    <secret>{secret}</secret>"""
        if secret
        else ""
    )

    return f"""
            <remote_servers>
                <cluster>{secret_block}{shards}
                </cluster>
            </remote_servers>"""


def render_node_config(
    keeper_address: str,
    keeper_port: int,
    shard: str,
    remote_servers: str,
    distributed_ddl_path: str = "/clickhouse/task_queue/ddl",
) -> str:
    # <zookeeper> is ClickHouse's config section name for any coordination
    # service, including ClickHouse Keeper.
    return f"""
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
                <shard>{shard}</shard>
                <replica>01</replica>
            </macros>

            <zookeeper>
                <node>
                    <host>{keeper_address}</host>
                    <port>{keeper_port}</port>
                </node>
            </zookeeper>
{remote_servers}

            <user_defined_executable_functions_config>*function.xml</user_defined_executable_functions_config>
            <user_scripts_path>/var/lib/clickhouse/user_scripts/</user_scripts_path>

            <distributed_ddl>
                <path>{distributed_ddl_path}</path>
                <profile>default</profile>
            </distributed_ddl>

            <storage_configuration>
                <disks>
                    <default>
                        <keep_free_space_bytes>1024</keep_free_space_bytes>
                    </default>
                    <cold>
                        <type>local</type>
                        <path>/var/lib/clickhouse/cold/</path>
                        <keep_free_space_bytes>1024</keep_free_space_bytes>
                    </cold>
                </disks>
                <policies>
                    <default>
                        <volumes>
                            <default>
                                <disk>default</disk>
                            </default>
                            <cold>
                                <disk>cold</disk>
                            </cold>
                        </volumes>
                    </default>
                    <tiered>
                        <volumes>
                            <default>
                                <disk>default</disk>
                            </default>
                            <cold>
                                <disk>cold</disk>
                            </cold>
                        </volumes>
                    </tiered>
                </policies>
            </storage_configuration>
        </clickhouse>
        """


def install_histogram_quantile(container: ClickHouseContainer) -> None:
    wrapped = container.get_wrapped_container()
    exit_code, output = wrapped.exec_run(
        [
            "bash",
            "-c",
            (
                'version="v0.0.1" && '
                'node_os=$(uname -s | tr "[:upper:]" "[:lower:]") && '
                "node_arch=$(uname -m | sed s/aarch64/arm64/ | sed s/x86_64/amd64/) && "
                "cd /tmp && "
                'wget -O histogram-quantile.tar.gz "https://github.com/SigNoz/signoz/releases/download/histogram-quantile%2F${version}/histogram-quantile_${node_os}_${node_arch}.tar.gz" && '
                "tar -xzf histogram-quantile.tar.gz && "
                "mkdir -p /var/lib/clickhouse/user_scripts && "
                "mv histogram-quantile /var/lib/clickhouse/user_scripts/histogramQuantile && "
                "chmod +x /var/lib/clickhouse/user_scripts/histogramQuantile"
            ),
        ],
    )
    if exit_code != 0:
        raise RuntimeError(f"Failed to install histogramQuantile binary: {output.decode()}")


def create_clickhouse(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    keeper: types.TestContainerDocker,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "clickhouse",
) -> types.TestContainerClickhouse:
    def create() -> types.TestContainerClickhouse:
        # Lazy: the keeper fixture is empty under --teardown (never created).
        coordinator = next(iter(keeper.container_configs.values()))
        clickhouse_version = request.config.getoption("--clickhouse-version")

        container = ClickHouseContainer(
            image=f"clickhouse/clickhouse-server:{clickhouse_version}",
            port=9000,
            username=CLICKHOUSE_USERNAME,
            password=CLICKHOUSE_PASSWORD,
        )

        cluster_config = render_node_config(
            keeper_address=coordinator.address,
            keeper_port=coordinator.port,
            shard="01",
            remote_servers=render_remote_servers([("127.0.0.1", 9000)]),
        )

        tmp_dir = tmpfs(cache_key)
        cluster_config_file_path = os.path.join(tmp_dir, "cluster.xml")
        with open(cluster_config_file_path, "w", encoding="utf-8") as f:
            f.write(cluster_config)

        custom_function_file_path = os.path.join(tmp_dir, "custom-function.xml")
        with open(custom_function_file_path, "w", encoding="utf-8") as f:
            f.write(CUSTOM_FUNCTION_CONFIG)

        container.with_volume_mapping(cluster_config_file_path, "/etc/clickhouse-server/config.d/cluster.xml")
        container.with_volume_mapping(
            custom_function_file_path,
            "/etc/clickhouse-server/custom-function.xml",
        )
        container.with_network(network)
        container.start()

        install_histogram_quantile(container)

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
                    "9000": types.TestContainerUrlConfig("tcp", container.get_wrapped_container().name, 9000),
                    "8123": types.TestContainerUrlConfig("tcp", container.get_wrapped_container().name, 8123),
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

    return reuse.wrap(
        request,
        pytestconfig,
        cache_key,
        empty=lambda: types.TestContainerSQL(
            container=types.TestContainerDocker(id="", host_configs={}, container_configs={}),
            conn=None,
            env={},
        ),
        create=create,
        delete=delete,
        restore=restore,
    )


@pytest.fixture(name="clickhouse", scope="package")
def clickhouse(
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    keeper: types.TestContainerDocker,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerClickhouse:
    """
    Package-scoped fixture for Clickhouse TestContainer.
    """
    return create_clickhouse(
        tmpfs=tmpfs,
        network=network,
        keeper=keeper,
        request=request,
        pytestconfig=pytestconfig,
    )


@pytest.fixture(name="clickhouse_node_conns", scope="function")
def clickhouse_node_conns(
    clickhouse: types.TestContainerClickhouse,
) -> Generator[list[clickhouse_connect.driver.client.Client], Any]:
    """Per-node clients (index 0 = the initiator) for asserting shard-local
    state via the local, non-distributed tables. Empty for single-node
    fixtures, which don't populate `nodes`."""
    conns = [
        clickhouse_connect.get_client(
            user=clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"],
            password=clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"],
            host=node.host_configs["8123"].address,
            port=node.host_configs["8123"].port,
        )
        for node in clickhouse.nodes
    ]
    yield conns
    for conn in conns:
        conn.close()


def create_clickhouse_cluster(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    tmpfs: Generator[types.LegacyPath, Any],
    network: Network,
    keeper: types.TestContainerDocker,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "clickhouse_cluster",
    shards: int = 2,
) -> types.TestContainerClickhouse:
    """
    To some extent, taken inspiration from how ClickHouse's own integration
    harness composes real clusters: deterministic hostnames
    (network aliases), per-node shard macros, and a shared cluster definition
    named `cluster`.

    `conn`/`env` point at node 1 i.e the initiator every query-service query and
    migration goes through. Per-node containers are exposed via `nodes` so
    tests can assert shard-local state.
    """

    def create() -> types.TestContainerClickhouse:
        # Lazy: the keeper fixture is empty under --teardown (never created).
        coordinator = next(iter(keeper.container_configs.values()))
        clickhouse_version = request.config.getoption("--clickhouse-version")

        # Unique aliases per creation: docker allows duplicate network aliases
        # (DNS round-robin), so a stale cluster must never share names with a
        # fresh one.
        suffix = uuid4().hex[:6]
        aliases = [f"signoz-ch-{suffix}-{i:02d}" for i in range(1, shards + 1)]
        remote_servers = render_remote_servers([(alias, 9000) for alias in aliases], secret=cache_key)
        # Own DDL queue path: the keeper instance may be shared with other
        # environments under --reuse; its DDL queue stays separate.
        distributed_ddl_path = f"/clickhouse/{cache_key}-{suffix}/task_queue/ddl"

        nodes: list[types.TestContainerDocker] = []
        started: list[ClickHouseContainer] = []
        try:
            for i, alias in enumerate(aliases, start=1):
                node_config = render_node_config(
                    keeper_address=coordinator.address,
                    keeper_port=coordinator.port,
                    shard=f"{i:02d}",
                    remote_servers=remote_servers,
                    distributed_ddl_path=distributed_ddl_path,
                )

                tmp_dir = tmpfs(f"clickhouse-{suffix}-{i:02d}")
                cluster_config_file_path = os.path.join(tmp_dir, "cluster.xml")
                with open(cluster_config_file_path, "w", encoding="utf-8") as f:
                    f.write(node_config)
                custom_function_file_path = os.path.join(tmp_dir, "custom-function.xml")
                with open(custom_function_file_path, "w", encoding="utf-8") as f:
                    f.write(CUSTOM_FUNCTION_CONFIG)
                users_config_file_path = os.path.join(tmp_dir, "users.xml")
                with open(users_config_file_path, "w", encoding="utf-8") as f:
                    f.write(CLUSTER_USERS_CONFIG)

                container = ClickHouseContainer(
                    image=f"clickhouse/clickhouse-server:{clickhouse_version}",
                    port=9000,
                    username=CLICKHOUSE_USERNAME,
                    password=CLICKHOUSE_PASSWORD,
                )
                container.with_volume_mapping(cluster_config_file_path, "/etc/clickhouse-server/config.d/cluster.xml")
                container.with_volume_mapping(custom_function_file_path, "/etc/clickhouse-server/custom-function.xml")
                container.with_volume_mapping(users_config_file_path, "/etc/clickhouse-server/users.d/integration-cluster.xml")
                container.with_network(network)
                container.with_network_aliases(alias)
                container.start()
                started.append(container)

                install_histogram_quantile(container)

                nodes.append(
                    types.TestContainerDocker(
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
                            "9000": types.TestContainerUrlConfig("tcp", alias, 9000),
                            "8123": types.TestContainerUrlConfig("tcp", alias, 8123),
                        },
                    )
                )
        except Exception:
            for container in started:
                container.stop()
            raise

        connection = clickhouse_connect.get_client(
            user=CLICKHOUSE_USERNAME,
            password=CLICKHOUSE_PASSWORD,
            host=nodes[0].host_configs["8123"].address,
            port=nodes[0].host_configs["8123"].port,
        )

        return types.TestContainerClickhouse(
            container=nodes[0],
            conn=connection,
            env={
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN": f"tcp://{CLICKHOUSE_USERNAME}:{CLICKHOUSE_PASSWORD}@{aliases[0]}:{9000}",
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME": CLICKHOUSE_USERNAME,
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD": CLICKHOUSE_PASSWORD,
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER": "cluster",
            },
            nodes=nodes,
        )

    def delete(resource: types.TestContainerClickhouse) -> None:
        client = docker.from_env()
        for node in resource.nodes or [resource.container]:
            try:
                client.containers.get(container_id=node.id).stop()
                client.containers.get(container_id=node.id).remove(v=True)
            except docker.errors.NotFound:
                logger.info(
                    "Skipping removal of Clickhouse cluster node, node(%s) not found. Maybe it was manually removed?",
                    {"id": node.id},
                )

    def restore(cache: dict) -> types.TestContainerClickhouse:
        nodes = [types.TestContainerDocker.from_cache(node) for node in cache["nodes"]]
        env = cache["env"]
        host_config = nodes[0].host_configs["8123"]

        conn = clickhouse_connect.get_client(
            user=env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"],
            password=env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"],
            host=host_config.address,
            port=host_config.port,
        )

        return types.TestContainerClickhouse(
            container=nodes[0],
            conn=conn,
            env=env,
            nodes=nodes,
        )

    return reuse.wrap(
        request,
        pytestconfig,
        cache_key,
        empty=lambda: types.TestContainerClickhouse(
            container=types.TestContainerDocker(id="", host_configs={}, container_configs={}),
            conn=None,
            env={},
        ),
        create=create,
        delete=delete,
        restore=restore,
    )


@pytest.fixture(name="check_query_log")
def check_query_log(
    signoz: types.SigNoz,
) -> Callable[..., None]:
    """
    Returns a callable that flushes system.query_log and asserts that at
    least one recent SELECT satisfies check_fn.

    Args:
        after_ts:         Only consider queries logged after this timestamp.
        case_name:        Label used in assertion failure messages.
        check_fn:         Predicate run against each candidate query string.
        tables:           Filter to queries that touched all of these tables, as
                          'db.table' strings (uses hasAll(tables, [...])).
        must_contain:     Substrings that must appear in the query text (AND-ed).
        must_not_contain: Substrings that must not appear in the query text (AND-ed).
        limit:            How many most-recent queries to examine (default 10).

    Usage:
        before = datetime.now(tz=timezone.utc)
        # ... trigger the query under test ...
        check_query_log(
            before, "my.case",
            lambda q: "assumeNotNull" in q,
            tables=["signoz_logs.distributed_logs_v2"],
        )
    """

    def _check(
        after_ts: datetime,
        case_name: str,
        check_fn: Callable[[str], bool],
        *,
        tables: list[str] | None = None,
        must_contain: list[str] | None = None,
        must_not_contain: list[str] | None = None,
        limit: int = 10,
    ) -> None:
        conn = signoz.telemetrystore.conn
        conn.command("SYSTEM FLUSH LOGS")

        # Use millisecond precision to avoid timestamp collisions between
        # adjacent test cases (second-level precision causes bleed-through).
        params: dict = {"after_ms": int(after_ts.timestamp() * 1000)}
        conditions = [
            "type = 'QueryFinish'",
            "query_kind = 'Select'",
            "toUnixTimestamp64Milli(event_time_microseconds) >= %(after_ms)s",
        ]
        if tables:
            params["tables"] = tables
            conditions.append("hasAll(tables, %(tables)s)")
        for i, pattern in enumerate(must_contain or []):
            key = f"mc_{i}"
            params[key] = pattern
            conditions.append(f"position(query, %({key})s) > 0")
        for i, pattern in enumerate(must_not_contain or []):
            key = f"mnc_{i}"
            params[key] = pattern
            conditions.append(f"position(query, %({key})s) = 0")

        where = " AND ".join(conditions)
        result = conn.query(
            f"SELECT query FROM system.query_log WHERE {where} ORDER BY event_time_microseconds DESC LIMIT {limit}",
            parameters=params,
        )
        queries = [row[0] for row in result.result_rows]
        assert queries, f"No matching SELECT in system.query_log for case '{case_name}'"
        assert all(check_fn(q) for q in queries), f"query_log check failed for case '{case_name}'.\n" + "Queries:\n" + "\n---\n".join(queries)

    return _check
