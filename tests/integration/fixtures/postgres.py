import docker
import docker.errors
import psycopg2
import pytest
from testcontainers.core.container import Network
from testcontainers.postgres import PostgresContainer

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="postgres", scope="package")
def postgres(
    network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config
) -> types.TestContainerSQL:
    """
    Package-scoped fixture for PostgreSQL TestContainer.
    """

    def create() -> types.TestContainerSQL:
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

        return types.TestContainerSQL(
            container=types.TestContainerDocker(
                id=container.get_wrapped_container().id,
                host_configs={
                    "5432": types.TestContainerUrlConfig(
                        "postgresql",
                        container.get_container_host_ip(),
                        container.get_exposed_port(5432),
                    )
                },
                container_configs={
                    "5432": types.TestContainerUrlConfig(
                        "postgresql", container.get_wrapped_container().name, 5432
                    )
                },
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

    def delete(container: types.TestContainerSQL):
        container.conn.close()
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.container.id).stop()
            client.containers.get(container_id=container.container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of Postgres, Postgres(%s) not found. Maybe it was manually removed?",
                {"id": container.container.id},
            )

    def restore(cache: dict) -> types.TestContainerSQL:
        container = types.TestContainerDocker.from_cache(cache["container"])
        host_config = container.host_configs["5432"]
        env = cache["env"]

        connection = psycopg2.connect(
            dbname=env["SIGNOZ_SQLSTORE_POSTGRES_DBNAME"],
            user=env["SIGNOZ_SQLSTORE_POSTGRES_USER"],
            password=env["SIGNOZ_SQLSTORE_POSTGRES_PASSWORD"],
            host=host_config.address,
            port=host_config.port,
        )

        return types.TestContainerSQL(
            container=container,
            conn=connection,
            env=env,
        )

    return dev.wrap(
        request,
        pytestconfig,
        "postgres",
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
