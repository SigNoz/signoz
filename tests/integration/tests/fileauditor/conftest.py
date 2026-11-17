import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.fileauditor import AUDIT_FILE_PATH
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz_fileauditor(
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
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
        cache_key="signoz-fileauditor",
        env_overrides={
            "SIGNOZ_AUDITOR_PROVIDER": "file",
            "SIGNOZ_AUDITOR_FILE_PATH": AUDIT_FILE_PATH,
        },
    )
