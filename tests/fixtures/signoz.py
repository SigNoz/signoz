import os
import platform
import subprocess
import time
from http import HTTPStatus
from os import path

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import DockerContainer, Network

from fixtures import reuse, types
from fixtures.logger import setup_logger
from fixtures.tls import CA_CONTAINER_PATH, CA_ID_LABEL, ca_id

logger = setup_logger(__name__)


def create_signoz(
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "signoz",
    env_overrides: dict | None = None,
    tls: types.TLS | None = None,
) -> types.SigNoz:
    """
    Factory function for creating a SigNoz container.
    Accepts optional env_overrides to customize the container environment, and
    an optional integration CA (tls) to trust in addition to the system roots.
    """

    def create() -> types.SigNoz:
        # Run the migrations for clickhouse
        request.getfixturevalue("migrator")

        # Get the no-web flag
        with_web = pytestconfig.getoption("--with-web")

        arch = platform.machine()
        if arch == "x86_64":
            arch = "amd64"

        # Build the image
        dockerfile_path = "cmd/enterprise/Dockerfile.integration"
        if with_web:
            dockerfile_path = "cmd/enterprise/Dockerfile.with-web.integration"

        # Docker build context is the repo root — one up from pytest's
        # rootdir (tests/).
        context = pytestconfig.rootpath.parent

        # The docker CLI is required: the Dockerfiles use BuildKit cache
        # mounts, which docker-py does not support.
        subprocess.run(
            [
                "docker",
                "build",
                "--file",
                str(context / dockerfile_path),
                "--tag",
                "signoz:integration",
                "--build-arg",
                f"TARGETARCH={arch}",
                "--build-arg",
                f"ZEUSURL={zeus.container_configs['8080'].base()}",
                str(context),
            ],
            check=True,
            env=os.environ | {"DOCKER_BUILDKIT": "1"},
        )

        env = (
            {
                "SIGNOZ_WEB_ENABLED": False,
                "SIGNOZ_WEB_DIRECTORY": "/root/web",
                "SIGNOZ_INSTRUMENTATION_LOGS_LEVEL": "debug",
                "SIGNOZ_PROMETHEUS_ACTIVE__QUERY__TRACKER_ENABLED": False,
                "SIGNOZ_GATEWAY_URL": gateway.container_configs["8080"].base(),
                "SIGNOZ_TOKENIZER_JWT_SECRET": "secret",
                "SIGNOZ_GLOBAL_INGESTION__URL": "https://ingest.test.signoz.cloud",
                "SIGNOZ_USER_PASSWORD_RESET_ALLOW__SELF": True,
                "SIGNOZ_USER_PASSWORD_RESET_MAX__TOKEN__LIFETIME": "6h",
                "RULES_EVAL_DELAY": "0s",
                "SIGNOZ_ALERTMANAGER_SIGNOZ_POLL__INTERVAL": "5s",
                "SIGNOZ_ALERTMANAGER_SIGNOZ_ROUTE_GROUP__WAIT": "1s",
                "SIGNOZ_ALERTMANAGER_SIGNOZ_ROUTE_GROUP__INTERVAL": "5s",
                "SIGNOZ_CLOUDINTEGRATION_AGENT_VERSION": "v0.0.8",
                "SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_SETTINGS_MAX__QUERY__SIZE": "350000",
            }
            | sqlstore.env
            | clickhouse.env
        )

        if with_web:
            env["SIGNOZ_WEB_ENABLED"] = True

        if env_overrides:
            env = env | env_overrides

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

        # The CA lands in the directory Go scans for system roots, so tests can
        # stand in for real TLS hosts (e.g. the fake accounts.google.com) while
        # the bundled roots keep working for everything else.
        if tls:
            container.with_volume_mapping(tls.ca_cert_path, CA_CONTAINER_PATH, "ro")
            container.with_kwargs(labels={CA_ID_LABEL: ca_id(tls)})

        container.start()

        def ready(container: DockerContainer) -> None:
            for attempt in range(10):
                try:
                    response = requests.get(
                        f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}/api/v2/healthz",
                        timeout=2,
                    )
                    if response.status_code == HTTPStatus.OK:
                        return
                    if response.status_code == HTTPStatus.SERVICE_UNAVAILABLE:
                        logger.error(
                            "Attempt %s: SigNoz container %s not ready yet:\n%s",
                            attempt + 1,
                            container,
                            response.text,
                        )
                except Exception as e:  # pylint: disable=broad-exception-caught
                    logger.error(
                        "Attempt %s at readiness check for SigNoz container %s failed: %s",
                        attempt + 1,
                        container,
                        e,
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

    def stale(container: types.SigNoz) -> bool:
        if not tls:
            return False
        client = docker.from_env()
        try:
            labels = client.containers.get(container_id=container.self.id).attrs["Config"]["Labels"]
        except docker.errors.NotFound:
            return True
        return labels.get(CA_ID_LABEL) != ca_id(tls)

    return reuse.wrap(
        request,
        pytestconfig,
        cache_key,
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
        rebuild=pytestconfig.getoption("--rebuild"),
        stale=stale,
    )


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    tls: types.TLS,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.SigNoz:
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        tls=tls,
    )
