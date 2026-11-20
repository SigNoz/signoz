import docker
import pytest
from testcontainers.core.container import Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def create_migrator(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "migrator",
    env_overrides: dict | None = None,
) -> types.Operation:
    """
    Factory function for running schema migrations. Accepts optional
    env_overrides to customize the migrator environment; the release comes
    from the --schema-migrator-version option.
    """

    def create() -> None:
        migrator_version = request.config.getoption("--schema-migrator-version")
        client = docker.from_env()

        environment = dict(env_overrides) if env_overrides else {}

        dsn = clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN"]
        for step in ("bootstrap", "sync up", "async up"):
            container = client.containers.run(
                image=f"signoz/signoz-otel-collector:{migrator_version}",
                command=f"migrate {step} --clickhouse-dsn={dsn} --clickhouse-cluster=cluster --clickhouse-replication=true --timeout=10m",
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
                raise RuntimeError(f"failed to run migrate {step} on clickhouse")

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
    return create_migrator(
        network=network,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
    )
