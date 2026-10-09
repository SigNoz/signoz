import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.auth import license_applier, register_admin
from fixtures.signoz import create_signoz

# The e2e stack served under a URL path prefix, as SIGNOZ_GLOBAL_EXTERNAL__URL
# deploys it. These shadow the root fixtures of the same name; the separate
# cache keys keep the two stacks from restoring each other's containers.
BASE_PATH = "/signoz"


@pytest.fixture(name="base_path", scope="package")
def base_path() -> str:
    return BASE_PATH


@pytest.fixture(name="signoz", scope="package")
def signoz_base_path(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    e2e_env: dict,
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
        cache_key="signoz_base_path",
        env_overrides=e2e_env | {"SIGNOZ_GLOBAL_EXTERNAL__URL": f"http://localhost:8080{BASE_PATH}"},
    )


@pytest.fixture(name="create_user_admin", scope="package")
def create_user_admin_base_path(signoz: types.SigNoz, request: pytest.FixtureRequest, pytestconfig: pytest.Config) -> types.Operation:
    return register_admin(signoz, request, pytestconfig, cache_key="create_user_admin_base_path", base_path=BASE_PATH)


@pytest.fixture(name="apply_license", scope="package")
def apply_license_base_path(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
) -> types.Operation:
    return license_applier(signoz, request, pytestconfig, cache_key="apply_license_base_path", base_path=BASE_PATH)
