import os
import platform
import shutil
import subprocess
import threading
import time
from dataclasses import dataclass
from http import HTTPStatus
from os import path
from pathlib import Path

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import DockerContainer, Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class SigNozImageBuild:
    process: subprocess.Popen
    command: list[str]
    cache_path: Path | None = None
    next_cache_path: Path | None = None
    reader: threading.Thread | None = None


def _stream_build_output(pipe, log) -> None:
    try:
        for line in iter(pipe.readline, ""):
            log.info("buildx: %s", line.rstrip())
    finally:
        pipe.close()


def start_signoz_image_build(pytestconfig: pytest.Config, dockerfile_path: str, arch: str, zeus_url: str) -> SigNozImageBuild:
    root = pytestconfig.rootpath.parent
    command = [
        "docker",
        "buildx",
        "build",
        "--load",
        "--progress",
        "plain",
        "--tag",
        "signoz:integration",
        "--file",
        dockerfile_path,
        "--build-arg",
        f"TARGETARCH={arch}",
        "--build-arg",
        f"ZEUSURL={zeus_url}",
        str(root),
    ]

    cache_path = None
    next_cache_path = None
    if os.environ.get("ACTIONS_RUNTIME_TOKEN"):
        # Running in GitHub Actions — use BuildKit's native GHA cache backend.
        # Avoids the local-write races and partial exports seen with type=local.
        scope = os.environ.get("SIGNOZ_BUILDX_GHA_SCOPE", "signoz-integration")
        command.extend(["--cache-from", f"type=gha,scope={scope}"])
        command.extend(["--cache-to", f"type=gha,scope={scope},mode=max"])
    elif build_cache_dir := os.environ.get("SIGNOZ_INTEGRATION_BUILD_CACHE_DIR"):
        # Local cache for developer machines / non-GHA CI.
        cache_path = Path(build_cache_dir)
        next_cache_path = Path(f"{build_cache_dir}-next")
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.rmtree(next_cache_path, ignore_errors=True)

        if cache_path.exists():
            command.extend(["--cache-from", f"type=local,src={cache_path}"])
        command.extend(["--cache-to", f"type=local,dest={next_cache_path},mode=max"])

    logger.info("Building SigNoz integration image with %s", " ".join(command))
    process = subprocess.Popen(
        command,
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    reader = threading.Thread(target=_stream_build_output, args=(process.stdout, logger), daemon=True)
    reader.start()

    return SigNozImageBuild(
        process=process,
        command=command,
        cache_path=cache_path,
        next_cache_path=next_cache_path,
        reader=reader,
    )


def wait_for_signoz_image_build(build: SigNozImageBuild) -> None:
    returncode = build.process.wait()
    if build.reader is not None:
        build.reader.join(timeout=5)
    if returncode != 0:
        raise subprocess.CalledProcessError(returncode, build.command)

    if build.cache_path and build.next_cache_path and build.next_cache_path.exists():
        shutil.rmtree(build.cache_path, ignore_errors=True)
        shutil.move(build.next_cache_path, build.cache_path)


def stop_signoz_image_build(build: SigNozImageBuild) -> None:
    if build.process.poll() is not None:
        return

    build.process.terminate()
    try:
        build.process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        build.process.kill()
        build.process.wait()

    if build.reader is not None:
        build.reader.join(timeout=5)


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
) -> types.SigNoz:
    """
    Factory function for creating a SigNoz container.
    Accepts optional env_overrides to customize the container environment.
    """

    def create() -> types.SigNoz:
        # Get the no-web flag
        with_web = pytestconfig.getoption("--with-web")

        arch = platform.machine()
        if arch == "x86_64":
            arch = "amd64"

        # Build the image
        dockerfile_path = "cmd/enterprise/Dockerfile.integration"
        if with_web:
            dockerfile_path = "cmd/enterprise/Dockerfile.with-web.integration"

        # The SigNoz image build does not depend on ClickHouse migrations, so
        # build it while the migrator container runs.
        image_build = start_signoz_image_build(pytestconfig, dockerfile_path, arch, zeus.container_configs["8080"].base())
        try:
            request.getfixturevalue("migrator")
            wait_for_signoz_image_build(image_build)
        except Exception:  # pylint: disable=broad-exception-caught
            stop_signoz_image_build(image_build)
            raise

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
    )


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
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
    )
