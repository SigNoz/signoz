from http import HTTPStatus
import platform
import time

import pytest
import requests
from dotenv import dotenv_values
from testcontainers.core.container import DockerContainer, Network
from testcontainers.core.image import DockerImage
import logging

from fixtures import types

LOGGER = logging.getLogger(__name__)


@pytest.fixture(scope="package")
def signoz(
    network: Network,
    zeus: types.TestContainerWiremock,
    request: pytest.FixtureRequest,
) -> types.SigNoz:
    """Package-scoped fixture for setting up SigNoz"""

    self = DockerImage(
        path="../../",
        dockerfile_path="ee/query-service/Dockerfile.integration",
        tag="signoz:integration",
    )

    arch = platform.machine()
    if arch == 'x86_64':
        arch = 'amd64'

    self.build(
        buildargs={
            "TARGETARCH": arch,
            "ZEUSURL": zeus.container_config.base_url(),
        }
    )

    config = request.config.getoption(name="--env")
    env = dotenv_values(config)

    sql_provider = env.get("SIGNOZ_SQLSTORE_PROVIDER", "sqlite")
    if sql_provider == "postgres":
        sqlstore = request.getfixturevalue("postgres")
        env["SIGNOZ_SQLSTORE_POSTGRES_DSN"] = sqlstore.container_config["dsn"]
    elif sql_provider == "sqlite":
        path = env.get("SIGNOZ_SQLSTORE_SQLITE_PATH")
        sqlstore = request.getfixturevalue("sqlite")(path)
        env["SIGNOZ_SQLSTORE_SQLITE_PATH"] = sqlstore.config["path"]
    else:
        raise pytest.FixtureLookupError(
            argname="f{provider}",
            request=request,
            msg=f"{sql_provider} does not have a fixture",
        )

    telemetrystore = request.getfixturevalue("clickhouse")
    env["SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN"] = telemetrystore.container_config["dsn"]

    request.getfixturevalue("migration")

    container = DockerContainer(self.tag)
    for k, v in env.items():
        container.with_env(k, v)
    container.with_exposed_ports(8080)
    container.with_network(network=network)

    container.start()

    def ready(container: DockerContainer) -> None:
        for attempt_no in range(30):
            try:
                response = requests.get(
                    f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}/api/v1/health"
                )
                return response.status_code == HTTPStatus.OK
            except Exception:
                time.sleep(2)
        raise TimeoutError(f"timeout exceceded while waiting")

    ready(container=container)

    def stop():
        logs = container.get_wrapped_container().logs(tail=100)
        LOGGER.info(logs.decode(encoding="utf-8"))
        container.stop(delete_volume=True)

    request.addfinalizer(stop)

    return types.SigNoz(
        self=types.TestContainerConfig(
            container=container,
            host_config=types.TestContainerConnectionConfig(
                "http",
                container.get_container_host_ip(),
                container.get_exposed_port(8080),
            ),
            container_config=types.TestContainerConnectionConfig(
                "http", container.get_wrapped_container().name, 8080
            ),
        ),
        sqlstore=sqlstore,
        telemetrystore=telemetrystore,
        zeus=zeus,
    )


@pytest.fixture(scope="function")
def create_first_user(signoz: types.SigNoz) -> None:
    def _create_user(name: str, email: str, password: str) -> None:
        response = requests.get(signoz.self.host_config.get_url("/api/v1/version"))

        assert response.status_code == HTTPStatus.OK
        assert response.json()["setupCompleted"] == False

        response = requests.post(
            signoz.self.host_config.get_url("/api/v1/register"),
            json={
                "name": name,
                "orgId": "",
                "orgName": "",
                "email": email,
                "password": password,
            },
        )
        assert response.status_code == HTTPStatus.OK

        response = requests.get(signoz.self.host_config.get_url("/api/v1/version"))

        assert response.status_code == HTTPStatus.OK
        assert response.json()["setupCompleted"] == True

    yield _create_user


@pytest.fixture(scope="function")
def jwt_token(signoz: types.SigNoz) -> str:
    def _jwt_token(email: str, password: str) -> str:
        response = requests.post(
            signoz.self.host_config.get_url("/api/v1/login"),
            json={
                "email": email,
                "password": password,
            },
        )
        assert response.status_code == HTTPStatus.OK

        return response.json()["accessJwt"]

    return _jwt_token
