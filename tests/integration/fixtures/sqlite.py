import sqlite3
from collections import namedtuple
from typing import Any, Generator

import pytest

from fixtures.fs import LEGACY_PATH

ConnectionTuple = namedtuple("ConnectionTuple", "connection config")


@pytest.fixture(scope="package")
def sqlite(tmpfs: Generator[LEGACY_PATH, Any, None], request: pytest.FixtureRequest):
    """
    Package-scoped fixture for SQLite.
    """

    tmpdir = tmpfs("sqlite")
    path = tmpdir / "signoz.db"
    connection = sqlite3.connect(path, check_same_thread=False)

    def stop():
        connection.close()

    request.addfinalizer(stop)

    return ConnectionTuple(connection, {"path": f"{path}"})
