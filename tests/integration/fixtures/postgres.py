import docker
import docker.errors
import pytest
from sqlalchemy import create_engine, sql
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
        )
        container.with_network(network)
        container.start()

        engine = create_engine(
            f"postgresql+psycopg2://{container.username}:{container.password}@{container.get_container_host_ip()}:{container.get_exposed_port(5432)}/{container.dbname}"
        )

        with engine.connect() as conn:
            result = conn.execute(sql.text("SELECT 1"))
            assert result.fetchone()[0] == 1

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
            conn=engine,
            env={
                "SIGNOZ_SQLSTORE_PROVIDER": "postgres",
                "SIGNOZ_SQLSTORE_POSTGRES_DSN": f"postgresql://{container.username}:{container.password}@{container.get_wrapped_container().name}:{5432}/{container.dbname}",
                "SIGNOZ_SQLSTORE_POSTGRES_DBNAME": container.dbname,
                "SIGNOZ_SQLSTORE_POSTGRES_USER": container.username,
                "SIGNOZ_SQLSTORE_POSTGRES_PASSWORD": container.password,
            },
        )

    def delete(container: types.TestContainerSQL):
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

        engine = create_engine(
            f"postgresql+psycopg2://{env['SIGNOZ_SQLSTORE_POSTGRES_USER']}:{env['SIGNOZ_SQLSTORE_POSTGRES_PASSWORD']}@{host_config.address}:{host_config.port}/{env['SIGNOZ_SQLSTORE_POSTGRES_DBNAME']}"
        )

        with engine.connect() as conn:
            result = conn.execute(sql.text("SELECT 1"))
            assert result.fetchone()[0] == 1

        return types.TestContainerSQL(
            container=container,
            conn=engine,
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
