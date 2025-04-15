import platform
import time
from http import HTTPStatus

import pytest
import requests
from testcontainers.core.container import DockerContainer, Network
from testcontainers.core.image import DockerImage

from fixtures import types


@pytest.fixture(name="signoz", scope="package")
def signoz(
    network: Network,
    zeus: types.TestContainerWiremock,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
) -> types.SigNoz:
    """
    Package-scoped fixture for setting up SigNoz.
    """

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

    env = {
        "SIGNOZ_WEB_ENABLED": False,
        "SIGNOZ_INSTRUMENTATION_LOGS_LEVEL": "debug",
        "SIGNOZ_PROMETHEUS_ACTIVE__QUERY__TRACKER_ENABLED": False
        } | sqlstore.env | clickhouse.env

    container = DockerContainer(self.tag)
    for k, v in env.items():
        container.with_env(k, v)
    container.with_exposed_ports(8080)
    container.with_network(network=network)

    container.start()

    def ready(container: DockerContainer) -> None:
        for attempt in range(30):
            try:
                response = requests.get(
                    f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}/api/v1/health", # pylint: disable=line-too-long
                    timeout=2,
                )
                return response.status_code == HTTPStatus.OK
            except Exception: #pylint: disable=broad-exception-caught
                print(f"attempt {attempt} at health check failed")
                time.sleep(2)
        raise TimeoutError("timeout exceceded while waiting")

    ready(container=container)

    def stop():
        logs = container.get_wrapped_container().logs(tail=100)
        print(logs.decode(encoding="utf-8"))
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return types.SigNoz(
        self=types.TestContainerDocker(
            container=container,
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
