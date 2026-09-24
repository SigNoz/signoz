import clickhouse_connect.driver.client

from fixtures import types

TOTAL_ROWS = 64


def test_topology(
    clickhouse: types.TestContainerClickhouse,
    clickhouse_node_conns: list[clickhouse_connect.driver.client.Client],
) -> None:
    aliases = {node.container_configs["9000"].address for node in clickhouse.nodes}

    # Every node sees the same 2-shard cluster definition and identifies
    # exactly itself as the local replica

    for i, conn in enumerate(clickhouse_node_conns, start=1):
        rows = conn.query("SELECT shard_num, host_name, is_local FROM system.clusters WHERE cluster = 'cluster' ORDER BY shard_num").result_rows
        assert [row[0] for row in rows] == [1, 2], f"node {i}: expected 2 shards, got {rows}"
        assert {row[1] for row in rows} == aliases, f"node {i}: cluster hosts {rows} != node aliases {aliases}"
        local = [row[0] for row in rows if row[2]]
        assert local == [i], f"node {i}: expected to be local for shard {i} only, got {local}"


def test_replicated_distributed_round_trip(
    clickhouse: types.TestContainerClickhouse,
    clickhouse_node_conns: list[clickhouse_connect.driver.client.Client],
) -> None:
    # ON CLUSTER DDL reaches both nodes, Replicated engines register with the
    # keeper via per-node macros, and a sharded Distributed insert scatters rows
    # across shards while the distributed read returns the union.
    conn = clickhouse.conn
    try:
        conn.query("CREATE DATABASE IF NOT EXISTS it_cluster ON CLUSTER 'cluster'")
        conn.query("CREATE TABLE it_cluster.events ON CLUSTER 'cluster' (id UInt64, payload String) ENGINE = ReplicatedMergeTree ORDER BY id")
        conn.query("CREATE TABLE it_cluster.distributed_events ON CLUSTER 'cluster' AS it_cluster.events ENGINE = Distributed('cluster', 'it_cluster', 'events', cityHash64(id))")

        conn.insert(
            database="it_cluster",
            table="distributed_events",
            column_names=["id", "payload"],
            data=[[i, f"payload-{i:03d}"] for i in range(TOTAL_ROWS)],
        )

        distributed_count = int(conn.query("SELECT count() FROM it_cluster.distributed_events").result_rows[0][0])
        assert distributed_count == TOTAL_ROWS

        local_counts = [int(node_conn.query("SELECT count() FROM it_cluster.events").result_rows[0][0]) for node_conn in clickhouse_node_conns]
        assert sum(local_counts) == TOTAL_ROWS, f"local counts {local_counts} do not add up to {TOTAL_ROWS}"
        assert min(local_counts) > 0, f"all rows landed on one shard: {local_counts}"
    finally:
        conn.query("DROP DATABASE IF EXISTS it_cluster ON CLUSTER 'cluster' SYNC")
