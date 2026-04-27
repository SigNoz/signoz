from collections.abc import Callable
from datetime import datetime

import pytest

from fixtures import types


@pytest.fixture(name="check_query_log")
def check_query_log_fixture(
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
            f"SELECT query FROM system.query_log"
            f" WHERE {where}"
            f" ORDER BY event_time_microseconds DESC LIMIT {limit}",
            parameters=params,
        )
        queries = [row[0] for row in result.result_rows]
        assert queries, (
            f"No matching SELECT in system.query_log for case '{case_name}'"
        )
        assert any(check_fn(q) for q in queries), (
            f"query_log check failed for case '{case_name}'.\n"
            + "Queries:\n"
            + "\n---\n".join(queries)
        )

    return _check
