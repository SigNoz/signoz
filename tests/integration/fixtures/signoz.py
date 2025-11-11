from os import path
import platform
import time
from http import HTTPStatus

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import DockerContainer, Network
from testcontainers.core.image import DockerImage

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    Package-scoped fixture for setting up SigNoz.
    """

    def create() -> types.SigNoz:
        # Run the migrations for clickhouse
        request.getfixturevalue("migrator")

        arch = platform.machine()
        if arch == "x86_64":
            arch = "amd64"

        # Build the image
        self = DockerImage(
            path="../../",
            dockerfile_path="cmd/enterprise/Dockerfile.integration",
            tag="signoz:integration",
            buildargs={
                "TARGETARCH": arch,
                "ZEUSURL": zeus.container_configs["8080"].base(),
            },
        )

        self.build()

        env = (
            {
                "SIGNOZ_WEB_ENABLED": True,
                "SIGNOZ_WEB_DIRECTORY": "/root/web",
                "SIGNOZ_INSTRUMENTATION_LOGS_LEVEL": "debug",
                "SIGNOZ_PROMETHEUS_ACTIVE__QUERY__TRACKER_ENABLED": False,
                "SIGNOZ_GATEWAY_URL": gateway.container_configs["8080"].base(),
            }
            | sqlstore.env
            | clickhouse.env
        )

        container = DockerContainer("signoz:integration")
        for k, v in env.items():
            container.with_env(k, v)
        container.with_exposed_ports(8080)
        container.with_network(network=network)

        provider = request.config.getoption("--sqlstore-provider")
        if provider == "sqlite":
            dir_path = path.dirname(sqlstore.env["SIGNOZ_SQLSTORE_SQLITE_PATH"])            
            container.with_volume_mapping(
                dir_path,
                dir_path,
                "rw",
            )

        container.start()

        def ready(container: DockerContainer) -> None:
            for attempt in range(10):
                try:
                    response = requests.get(
                        f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}/api/v1/health",
                        timeout=2,
                    )
                    return response.status_code == HTTPStatus.OK
                except Exception:  # pylint: disable=broad-exception-caught
                    logger.info(
                        "Attempt %s at readiness check for SigNoz container %s failed, going to retry ...",
                        attempt + 1,
                        container,
                    )
                    time.sleep(2)
            raise TimeoutError("timeout exceeded while waiting")

        try:
            ready(container=container)
        except Exception as e:  # pylint: disable=broad-exception-caught
            raise e

        return types.SigNoz(
            self=types.TestContainerDocker(
                id=container.get_wrapped_container().id,
                host_configs={
                    "8080": types.TestContainerUrlConfig(
                        "http",
                        container.get_container_host_ip(),
                        container.get_exposed_port(8080),
                    )
                },
                container_configs={
                    "8080": types.TestContainerUrlConfig(
                        "http",
                        container.get_wrapped_container().name,
                        8080,
                    )
                },
            ),
            sqlstore=sqlstore,
            telemetrystore=clickhouse,
            zeus=zeus,
            gateway=gateway,
        )

    def delete(container: types.SigNoz) -> None:
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.self.id).stop()
            client.containers.get(container_id=container.self.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of SigNoz, SigNoz(%s) not found. Maybe it was manually removed?",
                {"id": container.self.id},
            )

    def restore(cache: dict) -> types.SigNoz:
        self = types.TestContainerDocker.from_cache(cache)
        return types.SigNoz(
            self=self,
            sqlstore=sqlstore,
            telemetrystore=clickhouse,
            zeus=zeus,
            gateway=gateway,
        )

    return dev.wrap(
        request,
        pytestconfig,
        "signoz",
        empty=lambda: types.SigNoz(
            self=types.TestContainerDocker(
                id="",
                host_configs={},
                container_configs={},
            ),
            sqlstore=sqlstore,
            telemetrystore=clickhouse,
            zeus=zeus,
            gateway=gateway,
        ),
        create=create,
        delete=delete,
        restore=restore,
    )
