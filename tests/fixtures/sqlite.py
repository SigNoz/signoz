from collections import namedtuple
from collections.abc import Generator
from typing import Any

import pytest
from sqlalchemy import create_engine, sql

from fixtures import reuse, types

ConnectionTuple = namedtuple("ConnectionTuple", "connection config")


@pytest.fixture(name="sqlite", scope="package")
def sqlite(
    tmpfs: Generator[types.LegacyPath, Any],
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerSQL:
    """
    Package-scoped fixture for SQLite.
    """

    def create() -> types.TestContainerSQL:
        tmpdir = tmpfs("sqlite")
        path = tmpdir / "signoz.db"

        engine = create_engine(f"sqlite:///{path}")
        with engine.connect() as conn:
            result = conn.execute(sql.text("SELECT 1"))
            assert result.fetchone()[0] == 1

        mode = pytestconfig.getoption("--sqlite-mode")
        transaction_mode = pytestconfig.getoption("--sqlite-transaction-mode")
        return types.TestContainerSQL(
            container=types.TestContainerDocker(
                id="",
                host_configs={},
                container_configs={},
            ),
            conn=engine,
            env={
                "SIGNOZ_SQLSTORE_PROVIDER": "sqlite",
                "SIGNOZ_SQLSTORE_SQLITE_PATH": str(path),
                "SIGNOZ_SQLSTORE_SQLITE_MODE": mode,
                "SIGNOZ_SQLSTORE_SQLITE_TRANSACTION__MODE": transaction_mode,
            },
        )

    def delete(_: types.TestContainerSQL):
        pass

    def restore(cache: dict) -> types.TestContainerSQL:
        path = cache["env"].get("SIGNOZ_SQLSTORE_SQLITE_PATH")

        engine = create_engine(f"sqlite:///{path}")
        with engine.connect() as conn:
            result = conn.execute(sql.text("SELECT 1"))
            assert result.fetchone()[0] == 1

        return types.TestContainerSQL(
            container=types.TestContainerDocker(
                id="",
                host_configs={},
                container_configs={},
            ),
            conn=engine,
            env=cache["env"],
        )

    return reuse.wrap(
        request,
        pytestconfig,
        "sqlite",
        lambda: types.TestContainerSQL(
            container=types.TestContainerDocker(id="", host_configs={}, container_configs={}),
            conn=None,
            env={},
        ),
        create,
        delete,
        restore,
    )
