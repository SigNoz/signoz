import sqlite3
from collections import namedtuple
from typing import Any, Generator

import pytest

from fixtures import types

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

    dev = request.config.getoption("--dev")
    if dev:
        container = pytestconfig.cache.get("sqlite.container", None)
        env = pytestconfig.cache.get("sqlite.env", None)

        if container and env:
            assert isinstance(container, dict)
            assert isinstance(env, dict)

            return types.TestContainerSQL(
                container=types.TestContainerDocker(
                    host_config=None,
                    container_config=None,
                ),
                conn=sqlite3.connect(
                    env["SIGNOZ_SQLSTORE_SQLITE_PATH"], check_same_thread=False
                ),
                env=env,
            )

    tmpdir = tmpfs("sqlite")
    path = tmpdir / "signoz.db"
    connection = sqlite3.connect(path, check_same_thread=False)

    def stop():
        if dev:
            return

        connection.close()

    request.addfinalizer(stop)

    cached_sqlite = types.TestContainerSQL(
        container=types.TestContainerDocker(
            host_config=None,
            container_config=None,
        ),
        conn=connection,
        env={
            "SIGNOZ_SQLSTORE_PROVIDER": "sqlite",
            "SIGNOZ_SQLSTORE_SQLITE_PATH": str(path),
        },
    )

    if dev:
        pytestconfig.cache.set("sqlite.env", cached_sqlite.env)

    return cached_sqlite
