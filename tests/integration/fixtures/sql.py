import pytest
from dotenv import dotenv_values


@pytest.fixture(scope="package")
def sqlstore(request: pytest.FixtureRequest):
    """
    Packaged-scoped fixture for creating sql store.
    """
    config = request.config.getoption(name="--env")
    env = dotenv_values(config)

    sql_provider = env.get("SIGNOZ_SQLSTORE_PROVIDER", "sqlite")
    if sql_provider == "postgres":
        sqlstore = request.getfixturevalue("postgres")
        env["SIGNOZ_SQLSTORE_POSTGRES_DSN"] = sqlstore.container_config["dsn"]
    elif sql_provider == "sqlite":
        path = env.get("SIGNOZ_SQLSTORE_SQLITE_PATH")
        sqlstore = request.getfixturevalue("sqlite")(path)
        env["SIGNOZ_SQLSTORE_SQLITE_PATH"] = sqlstore.config["path"]
    else:
        raise pytest.FixtureLookupError(
            argname="f{provider}",
            request=request,
            msg=f"{sql_provider} does not have a fixture",
        )
