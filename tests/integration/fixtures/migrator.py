import docker
import pytest
from testcontainers.core.container import Network

from fixtures import types


@pytest.fixture(name="migrator", scope="package")
def migrator(
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> None:
    """
    Package-scoped fixture for running schema migrations.
    """
    dev = request.config.getoption("--dev")
    if dev:
        cached_migrator = pytestconfig.cache.get("migrator", None)
        if cached_migrator is not None and cached_migrator is True:
            return None

    version = request.config.getoption("--schema-migrator-version")

    client = docker.from_env()

    container = client.containers.run(
        image=f"signoz/signoz-schema-migrator:{version}",
        command=f"sync --replication=true --cluster-name=cluster --up= --dsn={clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN"]}",  # pylint: disable=line-too-long
        detach=True,
        auto_remove=False,
        network=network.id,
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
        command=f"async --replication=true --cluster-name=cluster --up= --dsn={clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN"]}",  # pylint: disable=line-too-long
        detach=True,
        auto_remove=False,
        network=network.id,
    )

    result = container.wait()

    if result["StatusCode"] != 0:
        logs = container.logs().decode(encoding="utf-8")
        container.remove()
        print(logs)
        raise RuntimeError("failed to run migrations on clickhouse")

    container.remove()

    if dev:
        pytestconfig.cache.set("migrator", True)
