import psycopg2
import pytest
from testcontainers.core.container import Network
from testcontainers.postgres import PostgresContainer

from fixtures import types


@pytest.fixture(name="postgres", scope="package")
def postgres(
    network: Network, request: pytest.FixtureRequest
) -> types.TestContainerSQL:
    """
    Package-scoped fixture for PostgreSQL TestContainer.
    """
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
        connection.close()
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return types.TestContainerSQL(
        container=container,
        host_config=types.TestContainerUrlConfig(
            "postgresql",
            container.get_container_host_ip(),
            container.get_exposed_port(5432),
        ),
        container_config=types.TestContainerUrlConfig(
            "postgresql", container.get_wrapped_container().name, 5432
        ),
        conn=connection,
        env={
            "SIGNOZ_SQLSTORE_PROVIDER": "postgres",
            "SIGNOZ_SQLSTORE_POSTGRES_DSN": f"postgresql://{container.username}:{container.password}@{container.get_wrapped_container().name}:{5432}/{container.dbname}"  # pylint: disable=line-too-long
        },
    )
