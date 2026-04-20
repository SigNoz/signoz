import docker
import docker.errors
import pytest
from testcontainers.core.container import Network
from testcontainers.keycloak import KeycloakContainer

from fixtures import dev, types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

IDP_ROOT_USERNAME = "admin"
IDP_ROOT_PASSWORD = "password"


@pytest.fixture(name="idp", scope="package")
def idp(
    network: Network,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.TestContainerIDP:
    """
    Package-scoped fixture for running an idp for SSO/SAML
    """

    def create() -> types.TestContainerIDP:
        container = KeycloakContainer(
            image="quay.io/keycloak/keycloak:26.3.0",
            username=IDP_ROOT_USERNAME,
            password=IDP_ROOT_PASSWORD,
            port=6060,
            management_port=6061,
        )
        container.with_env("KC_HTTP_PORT", "6060")
        container.with_env("KC_HTTP_MANAGEMENT_PORT", "6061")
        container.with_network(network)
        container.start()

        return types.TestContainerIDP(
            container=types.TestContainerDocker(
                id=container.get_wrapped_container().id,
                host_configs={
                    "6060": types.TestContainerUrlConfig(
                        "http",
                        container.get_container_host_ip(),
                        container.get_exposed_port(6060),
                    ),
                    "6061": types.TestContainerUrlConfig(
                        "http",
                        container.get_container_host_ip(),
                        container.get_exposed_port(6061),
                    ),
                },
                container_configs={
                    "6060": types.TestContainerUrlConfig(
                        "http", container.get_wrapped_container().name, 6060
                    ),
                    "6061": types.TestContainerUrlConfig(
                        "http", container.get_wrapped_container().name, 6061
                    ),
                },
            ),
        )

    def delete(container: types.TestContainerIDP):
        client = docker.from_env()

        try:
            client.containers.get(container_id=container.container.id).stop()
            client.containers.get(container_id=container.container.id).remove(v=True)
        except docker.errors.NotFound:
            logger.info(
                "Skipping removal of IDP, IDP(%s) not found. Maybe it was manually removed?",
                {"id": container.container.id},
            )

    def restore(cache: dict) -> types.TestContainerIDP:
        container = types.TestContainerDocker.from_cache(cache["container"])
        return types.TestContainerIDP(
            container=container,
        )

    return dev.wrap(
        request,
        pytestconfig,
        "idp",
        lambda: types.TestContainerIDP(
            container=types.TestContainerDocker(
                id="", host_configs={}, container_configs={}
            )
        ),
        create,
        delete,
        restore,
    )
