from http import HTTPStatus
from typing import Callable

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import Network
from wiremock.testing.testcontainer import WireMockContainer

from fixtures import dev, types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="notification_channel", scope="package")
def notification_channel(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerDocker:
    """
    Package-scoped fixture for WireMock container to receive notifications for Alert rules.
    """

    def create() -> types.TestContainerDocker:
        container = WireMockContainer(image="wiremock/wiremock:2.35.1-1", secure=False)
        container.with_network(network)
        container.start()

        return types.TestContainerDocker(
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
                    "http", container.get_wrapped_container().name, 8080
                )
            },
        )

    def delete(container: types.TestContainerDocker):
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.id).stop()
            client.containers.get(container_id=container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of NotificationChannel, NotificationChannel(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return dev.wrap(
        request,
        pytestconfig,
        "notification_channel",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="create_webhook_notification_channel", scope="function")
def create_webhook_notification_channel(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> Callable[[str, str, dict, bool], str]:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # function to create notification channel
    def _create_webhook_notification_channel(
        channel_name: str,
        webhook_url: str,
        http_config: dict = {},
        send_resolved: bool = True,
    ) -> str:
        response = requests.post(
            signoz.self.host_configs["8080"].get("/api/v1/channels"),
            json={
                "name": channel_name,
                "webhook_configs": [
                    {
                        "send_resolved": send_resolved,
                        "url": webhook_url,
                        "http_config": http_config,
                    }
                ],
            },
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.CREATED, (
            f"Failed to create channel, "
            f"Response: {response.text} "
            f"Response status: {response.status_code}"
        )

        channel_id = response.json()["data"]["id"]
        return channel_id

    return _create_webhook_notification_channel
