from collections.abc import Callable, Generator

import pytest

from fixtures import types

# signal -> (database, local table, distributed table)
MATERIALIZED_TABLES = {
    "traces": ("signoz_traces", "signoz_index_v3", "distributed_signoz_index_v3"),
}


@pytest.fixture(name="materialize_attribute", scope="function")
def materialize_attribute(signoz: types.SigNoz) -> Generator[Callable[[str, str, bool], str]]:
    """Teardown drops the columns and every index whose expression mentions a materialized key."""
    cluster = signoz.telemetrystore.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    created: list[tuple[str, str, str]] = []

    def materialize(signal: str, key: str, indexed: bool) -> str:
        database, local_table, distributed_table = MATERIALIZED_TABLES[signal]
        column = f"attribute_string_{key.replace('.', '$$')}"
        for table in (local_table, distributed_table):
            signoz.telemetrystore.conn.query(f"ALTER TABLE {database}.{table} ON CLUSTER '{cluster}' ADD COLUMN IF NOT EXISTS `{column}` LowCardinality(String) DEFAULT attributes_string['{key}']")
        if indexed:
            signoz.telemetrystore.conn.query(f"ALTER TABLE {database}.{local_table} ON CLUSTER '{cluster}' ADD INDEX IF NOT EXISTS `{column}_idx` `{column}` TYPE bloom_filter(0.01) GRANULARITY 64")
        created.append((signal, key, column))
        return column

    yield materialize

    for signal, key, column in created:
        database, local_table, distributed_table = MATERIALIZED_TABLES[signal]
        indexes = signoz.telemetrystore.conn.query(f"SELECT name FROM system.data_skipping_indices WHERE database = '{database}' AND table = '{local_table}' AND (expr LIKE '%{key}%' OR expr LIKE '%{column}%')").result_rows
        for (index_name,) in indexes:
            signoz.telemetrystore.conn.query(f"ALTER TABLE {database}.{local_table} ON CLUSTER '{cluster}' DROP INDEX IF EXISTS `{index_name}`")
        for table in (local_table, distributed_table):
            signoz.telemetrystore.conn.query(f"ALTER TABLE {database}.{table} ON CLUSTER '{cluster}' DROP COLUMN IF EXISTS `{column}`")
