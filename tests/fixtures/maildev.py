import json
from http import HTTPStatus

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import DockerContainer, Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


@pytest.fixture(name="maildev", scope="package")
def maildev(network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.TestContainerDocker:
    """
    Package-scoped fixture for MailDev container.
    Provides SMTP (port 1025) and HTTP API (port 1080) for email testing.
    """

    def create() -> types.TestContainerDocker:
        container = DockerContainer(image="maildev/maildev:2.2.1")
        container.with_exposed_ports(1025, 1080)
        container.with_network(network=network)
        container.start()

        return types.TestContainerDocker(
            id=container.get_wrapped_container().id,
            host_configs={
                "1025": types.TestContainerUrlConfig(
                    scheme="smtp",
                    address=container.get_container_host_ip(),
                    port=container.get_exposed_port(1025),
                ),
                "1080": types.TestContainerUrlConfig(
                    scheme="http",
                    address=container.get_container_host_ip(),
                    port=container.get_exposed_port(1080),
                ),
            },
            container_configs={
                "1025": types.TestContainerUrlConfig(
                    scheme="smtp",
                    address=container.get_wrapped_container().name,
                    port=1025,
                ),
                "1080": types.TestContainerUrlConfig(
                    scheme="http",
                    address=container.get_wrapped_container().name,
                    port=1080,
                ),
            },
        )

    def delete(container: types.TestContainerDocker):
        client = docker.from_env()
        try:
            client.containers.get(container_id=container.id).stop()
            client.containers.get(container_id=container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of MailDev, MailDev(%s) not found. Maybe it was manually removed?",
                {"id": container.id},
            )

    def restore(cache: dict) -> types.TestContainerDocker:
        return types.TestContainerDocker.from_cache(cache)

    return reuse.wrap(
        request,
        pytestconfig,
        "maildev",
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )


def get_all_mails(_maildev: types.TestContainerDocker) -> list[dict]:
    """
    Fetches all emails from the MailDev HTTP API.
    Returns list of dicts with keys: subject, html, text.
    """
    url = _maildev.host_configs["1080"].get("/email")
    response = requests.get(url, timeout=5)
    assert response.status_code == HTTPStatus.OK, f"Failed to fetch emails from MailDev, status code: {response.status_code}, response: {response.text}"
    emails = response.json()
    # logger.info("Emails: %s", json.dumps(emails, indent=2))
    return [
        {
            "subject": email.get("subject", ""),
            "html": email.get("html", ""),
            "text": email.get("text", ""),
        }
        for email in emails
    ]


def verify_email_received(_maildev: types.TestContainerDocker, filters: dict) -> bool:
    """
    Checks if any email in MailDev matches all the given filters.
    Filters are matched with exact equality against the email fields (subject, html, text).
    Returns True if at least one matching email is found.
    """
    emails = get_all_mails(_maildev)
    for email in emails:
        logger.info("Email: %s", json.dumps(email, indent=2))
        if all(key in email and filter_value == email[key] for key, filter_value in filters.items()):
            return True
    return False


def delete_all_mails(_maildev: types.TestContainerDocker) -> None:
    """
    Deletes all emails from the MailDev inbox.
    """
    url = _maildev.host_configs["1080"].get("/email/all")
    response = requests.delete(url, timeout=5)
    assert response.status_code == HTTPStatus.OK, f"Failed to delete emails from MailDev, status code: {response.status_code}, response: {response.text}"
