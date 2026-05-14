import time
from http import HTTPStatus

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import DockerContainer, Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="seeder", scope="package")
def seeder(
    network: Network,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """HTTP seeder container exposing POST/DELETE endpoints for per-test telemetry."""

    def create() -> types.TestContainerDocker:
        docker_client = docker.from_env()
        docker_client.images.build(
            path=str(pytestconfig.rootpath),
            dockerfile="Dockerfile.seeder",
            tag="signoz-tests-seeder:latest",
            rm=True,
        )

        container = DockerContainer("signoz-tests-seeder:latest")
        container.with_env("CH_HOST", clickhouse.container.container_configs["8123"].address)
        container.with_env("CH_PORT", str(clickhouse.container.container_configs["8123"].port))
        container.with_env("CH_USER", clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_USERNAME"])
        container.with_env("CH_PASSWORD", clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_PASSWORD"])
        container.with_env("CH_CLUSTER", clickhouse.env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_CLUSTER"])
        container.with_exposed_ports(8080)
        container.with_network(network=network)
        container.start()

        host = container.get_container_host_ip()
        host_port = container.get_exposed_port(8080)

        for attempt in range(20):
            try:
                response = requests.get(f"http://{host}:{host_port}/healthz", timeout=2)
                if response.status_code == HTTPStatus.OK:
                    break
            except Exception as e:  # pylint: disable=broad-exception-caught
                logger.info("seeder attempt %d: %s", attempt + 1, e)
            time.sleep(1)
        else:
            raise TimeoutError("seeder container did not become ready")

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "8080": types.TestContainerUrlConfig("http", host, host_port),
            },
            container_configs={
                "8080": types.TestContainerUrlConfig("http", container.get_wrapped_container().name, 8080),
            },
        )

    def delete(container: types.TestContainerDocker) -> None:
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.id).stop()
            client.containers.get(container_id=container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info("Seeder container %s already gone", container.id)

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return reuse.wrap(
        request,
        pytestconfig,
        "seeder",
        empty=lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create=create,
        delete=delete,
        restore=restore,
    )
