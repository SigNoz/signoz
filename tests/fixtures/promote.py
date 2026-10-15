from collections.abc import Callable, Generator

import pytest
import requests

from fixtures import types

PROMOTED_PATHS = "/api/v1/promoted_paths"

# signal -> (database, local table)
PROMOTE_INDEX_TABLES = {
    "traces": ("signoz_traces", "signoz_index_v3"),
    "logs": ("signoz_logs", "logs_v2"),
}


@pytest.fixture(name="promote_paths", scope="function")
def promote_paths(signoz: types.SigNoz) -> Generator[Callable[[str, list[dict]], requests.Response]]:
    """Teardown drops every index whose expression mentions a posted path."""
    cluster = signoz.telemetrystore.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"]
    posted: list[dict] = []

    def promote(token: str, paths: list[dict]) -> requests.Response:
        posted.extend(paths)
        return requests.post(
            signoz.self.host_configs["8080"].get(PROMOTED_PATHS),
            json=paths,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )

    yield promote

    for path in posted:
        database, local_table = PROMOTE_INDEX_TABLES[path["signal"]]
        indexes = signoz.telemetrystore.conn.query(f"SELECT name FROM system.data_skipping_indices WHERE database = '{database}' AND table = '{local_table}' AND expr LIKE '%{path['path']}%'").result_rows
        for (index_name,) in indexes:
            signoz.telemetrystore.conn.query(f"ALTER TABLE {database}.{local_table} ON CLUSTER '{cluster}' DROP INDEX IF EXISTS `{index_name}`")
