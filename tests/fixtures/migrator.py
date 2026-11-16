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
    from the --signoz-otel-collector-version option.
    """

    def create() -> None:
        collector_version = request.config.getoption("--signoz-otel-collector-version")
        client = docker.from_env()

        environment = {
            "SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_DSN": clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN"],
            "SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_CLUSTER": "cluster",
            "SIGNOZ_OTEL_COLLECTOR_CLICKHOUSE_REPLICATION": "true",
            "SIGNOZ_OTEL_COLLECTOR_TIMEOUT": "10m",
            **(env_overrides or {}),
        }

        container = client.containers.run(
            image=f"signoz/signoz-otel-collector:{collector_version}",
            entrypoint="/bin/sh",
            command=[
                "-c",
                "/signoz-otel-collector migrate bootstrap && /signoz-otel-collector migrate sync up && /signoz-otel-collector migrate async up",
            ],
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
    return create_migrator(
        network=network,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
    )
