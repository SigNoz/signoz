import dataclasses

import psycopg2
import pytest
from testcontainers.core.container import Network
from testcontainers.postgres import PostgresContainer

from fixtures import types


@pytest.fixture(name="postgres", scope="package")
def postgres(
    network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.TestContainerSQL:
    """
    Package-scoped fixture for PostgreSQL TestContainer.
    """
    dev = request.config.getoption("--dev")
    if dev:
        container = pytestconfig.cache.get("postgres.container", None)
        env = pytestconfig.cache.get("postgres.env", None)

        if container and env:
            assert isinstance(container, dict)
            assert isinstance(env, dict)

            test_container = types.TestContainerDocker(
                host_config=types.TestContainerUrlConfig(
                    container["host_config"]["scheme"],
                    container["host_config"]["address"],
                    container["host_config"]["port"],
                ),
                container_config=types.TestContainerUrlConfig(
                    container["container_config"]["scheme"],
                    container["container_config"]["address"],
                    container["container_config"]["port"],
                ),
            )

            return types.TestContainerSQL(
                container=test_container,
                conn=psycopg2.connect(
                    dbname=env["SIGNOZ_SQLSTORE_POSTGRES_DBNAME"],
                    user=env["SIGNOZ_SQLSTORE_POSTGRES_USER"],
                    password=env["SIGNOZ_SQLSTORE_POSTGRES_PASSWORD"],
                    host=test_container.host_config.address,
                    port=test_container.host_config.port,
                ),
                env=env,
            )

    version = request.config.getoption("--postgres-version")

    container = PostgresContainer(
        image=f"postgres:{version}",
        port=5432,
        username="signoz",
        password="password",
        dbname="signoz",
        driver="psycopg2",
        network=network.id,
    )
    container.start()

    connection = psycopg2.connect(
        dbname=container.dbname,
        user=container.username,
        password=container.password,
        host=container.get_container_host_ip(),
        port=container.get_exposed_port(5432),
    )

    def stop():
        if dev:
            return

        connection.close()
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    cached_postgres = types.TestContainerSQL(
        container=types.TestContainerDocker(
            host_config=types.TestContainerUrlConfig(
                "postgresql",
                container.get_container_host_ip(),
                container.get_exposed_port(5432),
            ),
            container_config=types.TestContainerUrlConfig(
                "postgresql", container.get_wrapped_container().name, 5432
            ),
        ),
        conn=connection,
        env={
            "SIGNOZ_SQLSTORE_PROVIDER": "postgres",
            "SIGNOZ_SQLSTORE_POSTGRES_DSN": f"postgresql://{container.username}:{container.password}@{container.get_wrapped_container().name}:{5432}/{container.dbname}",  # pylint: disable=line-too-long
            "SIGNOZ_SQLSTORE_POSTGRES_DBNAME": container.dbname,
            "SIGNOZ_SQLSTORE_POSTGRES_USER": container.username,
            "SIGNOZ_SQLSTORE_POSTGRES_PASSWORD": container.password,
        },
    )

    if dev:
        pytestconfig.cache.set(
            "postgres.container", dataclasses.asdict(cached_postgres.container)
        )
        pytestconfig.cache.set("postgres.env", cached_postgres.env)

    return cached_postgres
