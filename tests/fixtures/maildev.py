import re
from http import HTTPStatus

import docker
import docker.errors
import pytest
import requests
from testcontainers.core.container import DockerContainer, Network

from fixtures import reuse, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

MAILDEV_INCOMING_USER = "apikey"
MAILDEV_INCOMING_PASS = "integration-smtp-secret"

SMTP_TEST_FROM = "alertmanager@integration.test"

OLD_PROVIDER_SMTP_PASS = "old-provider-smtp-secret"
NEW_PROVIDER_SMTP_PASS = "new-provider-smtp-secret"


def signoz_smtp_env(maildev: "types.TestContainerDocker", password: str = MAILDEV_INCOMING_PASS) -> dict:
    return {
        "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__SMARTHOST": f"{maildev.container_configs['1025'].address}:{maildev.container_configs['1025'].port}",
        "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__FROM": SMTP_TEST_FROM,
        "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__AUTH__USERNAME": MAILDEV_INCOMING_USER,
        "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__AUTH__PASSWORD": password,
        "SIGNOZ_ALERTMANAGER_SIGNOZ_GLOBAL_SMTP__REQUIRE__TLS": "false",
    }


def create_maildev(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    cache_key: str = "maildev",
    incoming_user: str = MAILDEV_INCOMING_USER,
    incoming_pass: str = MAILDEV_INCOMING_PASS,
) -> types.TestContainerDocker:
    def create() -> types.TestContainerDocker:
        container = DockerContainer(image="maildev/maildev:2.2.1")
        container.with_env("MAILDEV_INCOMING_USER", incoming_user)
        container.with_env("MAILDEV_INCOMING_PASS", incoming_pass)
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
        cache_key,
        lambda: types.TestContainerDocker(id="", host_configs={}, container_configs={}),
        create,
        delete,
        restore,
    )


@pytest.fixture(name="maildev", scope="package")
def maildev(network: Network, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.TestContainerDocker:
    return create_maildev(network, request, pytestconfig)


def get_all_mails(_maildev: types.TestContainerDocker) -> list[dict]:
    url = _maildev.host_configs["1080"].get("/email")
    response = requests.get(url, timeout=5)
    assert response.status_code == HTTPStatus.OK, f"Failed to fetch emails from MailDev, status code: {response.status_code}, response: {response.text}"

    def addresses(entries: list[dict]) -> str:
        return ",".join(sorted(entry.get("address", "") for entry in entries))

    return [
        {
            "subject": email.get("subject", ""),
            "html": email.get("html", ""),
            "text": email.get("text", ""),
            "from": addresses(email.get("from", [])),
            "to": addresses(email.get("to", [])),
        }
        for email in response.json()
    ]


def verify_email_received(_maildev: types.TestContainerDocker, filters: dict) -> bool:
    def matches(expected, actual: str) -> bool:
        if isinstance(expected, re.Pattern):
            return expected.search(actual) is not None
        return expected == actual

    for email in get_all_mails(_maildev):
        if all(key in email and matches(filter_value, email[key]) for key, filter_value in filters.items()):
            return True
    return False


def delete_all_mails(_maildev: types.TestContainerDocker) -> None:
    url = _maildev.host_configs["1080"].get("/email/all")
    response = requests.delete(url, timeout=5)
    assert response.status_code == HTTPStatus.OK, f"Failed to delete emails from MailDev, status code: {response.status_code}, response: {response.text}"
