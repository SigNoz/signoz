import sqlite3
from collections import namedtuple
from typing import Any, Generator

import pytest

from fixtures import dev, types

ConnectionTuple = namedtuple("ConnectionTuple", "connection config")


@pytest.fixture(name="sqlite", scope="package")
def sqlite(
    tmpfs: Generator[types.LegacyPath, Any, None],
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerSQL:
    """
    Package-scoped fixture for SQLite.
    """

    def create() -> types.TestContainerSQL:
        tmpdir = tmpfs("sqlite")
        path = tmpdir / "signoz.db"
        connection = sqlite3.connect(path, check_same_thread=False)

        return types.TestContainerSQL(
            container=types.TestContainerDocker(
                id="",
                host_configs={},
                container_configs={},
            ),
            conn=connection,
            env={
                "SIGNOZ_SQLSTORE_PROVIDER": "sqlite",
                "SIGNOZ_SQLSTORE_SQLITE_PATH": str(path),
            },
        )

    def delete(container: types.TestContainerSQL):
        container.conn.close()

    def restore(cache: dict) -> types.TestContainerSQL:
        path = cache["env"].get("SIGNOZ_SQLSTORE_SQLITE_PATH")
        conn = sqlite3.connect(path, check_same_thread=False)
        return types.TestContainerSQL(
            container=types.TestContainerDocker(
                id="",
                host_configs={},
                container_configs={},
            ),
            conn=conn,
            env=cache["env"],
        )

    return dev.wrap(
        request,
        pytestconfig,
        "sqlite",
        lambda: types.TestContainerSQL(
            container=types.TestContainerDocker(
                id="", host_configs={}, container_configs={}
            ),
            conn=None,
            env={},
        ),
        create,
        delete,
        restore,
    )
