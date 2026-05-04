import docker
import pytest
from testcontainers.core.container import Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def create_migrator(
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "migrator",
    env_overrides: dict | None = None,
) -> types.Operation:
    """
    Factory function for running schema migrations.
    Accepts optional env_overrides to customize the migrator environment.
    """

    def create() -> None:
        version = request.config.getoption("--schema-migrator-version")
        client = docker.from_env()

        environment = dict(env_overrides) if env_overrides else {}

        container = client.containers.run(
            image=f"signoz/signoz-schema-migrator:{version}",
            command=f"sync --replication=true --cluster-name=cluster --up= --dsn={clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN']}",
            detach=True,
            auto_remove=False,
            network=network.id,
            environment=environment,
        )

        result = container.wait()

        if result["StatusCode"] != 0:
            logs = container.logs().decode(encoding="utf-8")
            container.remove()
            print(logs)
            raise RuntimeError("failed to run migrations on clickhouse")

        container.remove()

        container = client.containers.run(
            image=f"signoz/signoz-schema-migrator:{version}",
            command=f"async --replication=true --cluster-name=cluster --up= --dsn={clickhouse.env['SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN']}",
            detach=True,
            auto_remove=False,
            network=network.id,
            environment=environment,
        )

        result = container.wait()

        if result["StatusCode"] != 0:
            logs = container.logs().decode(encoding="utf-8")
            container.remove()
            print(logs)
            raise RuntimeError("failed to run migrations on clickhouse")

        container.remove()

        return types.Operation(name=cache_key)

    def delete(_: types.Operation) -> None:
        pass

    def restore(cache: dict) -> types.Operation:
        return types.Operation(name=cache["name"])

    return reuse.wrap(
        request,
        pytestconfig,
        cache_key,
        lambda: types.Operation(name=""),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="migrator", scope="package")
def migrator(
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.Operation:
    """
    Package-scoped fixture for running schema migrations.
    """
    return create_migrator(
        network=network,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
    )
