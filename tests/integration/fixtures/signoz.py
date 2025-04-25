import dataclasses
import platform
import time
from http import HTTPStatus

import pytest
import requests
from testcontainers.core.container import DockerContainer, Network
from testcontainers.core.image import DockerImage

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="signoz", scope="package")
def signoz(
    network: Network,
    zeus: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    """
    Package-scoped fixture for setting up SigNoz.
    """

    dev = request.config.getoption("--dev")
    if dev:
        cached_signoz = pytestconfig.cache.get("signoz.container", None)
        if cached_signoz:
            self = types.TestContainerDocker(
                host_config=types.TestContainerUrlConfig(
                    cached_signoz["host_config"]["scheme"],
                    cached_signoz["host_config"]["address"],
                    cached_signoz["host_config"]["port"],
                ),
                container_config=types.TestContainerUrlConfig(
                    cached_signoz["container_config"]["scheme"],
                    cached_signoz["container_config"]["address"],
                    cached_signoz["container_config"]["port"],
                ),
            )
            return types.SigNoz(
                self=self, sqlstore=sqlstore, telemetrystore=clickhouse, zeus=zeus
            )

    # Run the migrations for clickhouse
    request.getfixturevalue("migrator")

    # Build the image
    self = DockerImage(
        path="../../",
        dockerfile_path="ee/query-service/Dockerfile.integration",
        tag="signoz:integration",
    )

    arch = platform.machine()
    if arch == "x86_64":
        arch = "amd64"

    self.build(
        buildargs={
            "TARGETARCH": arch,
            "ZEUSURL": zeus.container_config.base(),
        }
    )

    env = (
        {
            "SIGNOZ_WEB_ENABLED": False,
            "SIGNOZ_INSTRUMENTATION_LOGS_LEVEL": "debug",
            "SIGNOZ_PROMETHEUS_ACTIVE__QUERY__TRACKER_ENABLED": False,
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
        container.with_volume_mapping(
            sqlstore.env["SIGNOZ_SQLSTORE_SQLITE_PATH"],
            sqlstore.env["SIGNOZ_SQLSTORE_SQLITE_PATH"],
            "rw",
        )

    container.start()

    def ready(container: DockerContainer) -> None:
        for attempt in range(5):
            try:
                response = requests.get(
                    f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}/api/v1/health",  # pylint: disable=line-too-long
                    timeout=2,
                )
                return response.status_code == HTTPStatus.OK
            except Exception:  # pylint: disable=broad-exception-caught
                logger.info(
                    "Attempt %s at readiness check for SigNoz container %s failed, going to retry ...",  # pylint: disable=line-too-long
                    attempt + 1,
                    container,
                )
                time.sleep(2)
        raise TimeoutError("timeout exceeded while waiting")

    try:
        ready(container=container)
    except Exception as e:  # pylint: disable=broad-exception-caught
        raise e

    def stop():
        if dev:
            logger.info("Skipping removal of SigNoz container %s ...", container)
            return
        else:
            logger.info("Removing SigNoz container %s ...", container)
            container.stop(delete_volume=True)

    request.addfinalizer(stop)

    cached_signoz = types.SigNoz(
        self=types.TestContainerDocker(
            host_config=types.TestContainerUrlConfig(
                "http",
                container.get_container_host_ip(),
                container.get_exposed_port(8080),
            ),
            container_config=types.TestContainerUrlConfig(
                "http",
                container.get_wrapped_container().name,
                8080,
            ),
        ),
        sqlstore=sqlstore,
        telemetrystore=clickhouse,
        zeus=zeus,
    )

    if dev:
        pytestconfig.cache.set(
            "signoz.container", dataclasses.asdict(cached_signoz.self)
        )

    return cached_signoz
