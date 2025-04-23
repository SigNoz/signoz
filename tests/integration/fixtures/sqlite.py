import sqlite3
from collections import namedtuple
from typing import Any, Generator

import pytest

from fixtures import types

ConnectionTuple = namedtuple("ConnectionTuple", "connection config")


@pytest.fixture(name="sqlite", scope="package")
def sqlite(
    tmpfs: Generator[types.LegacyPath, Any, None], request: pytest.FixtureRequest
) -> types.TestContainerSQL:
    """
    Package-scoped fixture for SQLite.
    """
    tmpdir = tmpfs("sqlite")
    path = tmpdir / "signoz.db"
    connection = sqlite3.connect(path, check_same_thread=False)

    def stop():
        connection.close()

    request.addfinalizer(stop)

    return types.TestContainerSQL(
        None,
        host_config=None,
        container_config=None,
        conn=connection,
        env={
            "SIGNOZ_SQLSTORE_PROVIDER": "sqlite",
            "SIGNOZ_SQLSTORE_SQLITE_PATH": str(path),
        },
    )
