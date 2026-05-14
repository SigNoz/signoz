import pytest
from testcontainers.core.container import Network

from fixtures import types
from fixtures.signoz import create_signoz


@pytest.fixture(name="signoz", scope="package")
def signoz(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    network: Network,
    zeus: types.TestContainerDocker,
    gateway: types.TestContainerDocker,
    sqlstore: types.TestContainerSQL,
    clickhouse: types.TestContainerClickhouse,
    request: pytest.FixtureRequest,
    pytestconfig: pytest.Config,
    audit_dir: str,
    audit_file_path: str,
) -> types.SigNoz:
    """Package-scoped SigNoz container configured with the file auditor.

    BatchSize is set to 1 so every audited request flushes to disk on the moreC
    path without waiting on the periodic ticker. FlushInterval stays short so
    the periodic flush has bounded lag if BatchSize is ever raised. The audit
    directory is bind-mounted from the host (see fixtures.auditor.audit_dir)
    so tests can read the file with a plain open() call.
    """
    return create_signoz(
        network=network,
        zeus=zeus,
        gateway=gateway,
        sqlstore=sqlstore,
        clickhouse=clickhouse,
        request=request,
        pytestconfig=pytestconfig,
        cache_key="signoz_auditor",
        env_overrides={
            "SIGNOZ_AUDITOR_PROVIDER": "file",
            "SIGNOZ_AUDITOR_FILE_PATH": audit_file_path,
            "SIGNOZ_AUDITOR_BATCH__SIZE": "1",
            "SIGNOZ_AUDITOR_FLUSH__INTERVAL": "100ms",
        },
        volume_mappings=[(audit_dir, audit_dir)],
    )
