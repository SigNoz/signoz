import os
import subprocess
from pathlib import Path

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def test_e2e(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    seeder: types.TestContainerDocker,
) -> None:
    """
    One-command e2e: pytest brings up the backend and starts the seeder
    container, then shells out to `yarn test` so Playwright runs against
    the provisioned instance. Each spec owns its own data via the seeder.
    Intended as the primary CI entrypoint.
    """
    e2e_dir = Path(__file__).resolve().parents[1]  # bootstrap/ -> e2e/
    host_cfg = signoz.self.host_configs["8080"]
    seeder_cfg = seeder.host_configs["8080"]
    env = {
        **os.environ,
        "SIGNOZ_E2E_BASE_URL": host_cfg.base(),
        "SIGNOZ_E2E_USERNAME": USER_ADMIN_EMAIL,
        "SIGNOZ_E2E_PASSWORD": USER_ADMIN_PASSWORD,
        "SIGNOZ_E2E_SEEDER_URL": seeder_cfg.base(),
    }
    result = subprocess.run(
        ["yarn", "test"],
        cwd=str(e2e_dir),
        env=env,
        check=False,
    )
    assert result.returncode == 0, f"Playwright exited with code {result.returncode}"
