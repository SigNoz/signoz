import json
import os
from pathlib import Path

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def _endpoint_file() -> Path:
    override = os.environ.get("SIGNOZ_E2E_ENDPOINT_FILE")
    if override:
        return Path(override)
    # tests/e2e/bootstrap/setup.py -> tests/e2e/.signoz-backend.json
    return Path(__file__).resolve().parents[1] / ".signoz-backend.json"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    seeder: types.TestContainerDocker,
) -> None:
    """
    Bring the SigNoz backend up, register the admin, start the HTTP seeder
    container, and persist endpoint coordinates for the Playwright side.
    Each spec owns its own data via the seeder — no global pre-seed here.
    """
    host_cfg = signoz.self.host_configs["8080"]
    seeder_cfg = seeder.host_configs["8080"]
    out = _endpoint_file()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "base_url": host_cfg.base(),
                "admin_email": USER_ADMIN_EMAIL,
                "admin_password": USER_ADMIN_PASSWORD,
                "seeder_url": seeder_cfg.base(),
            }
        )
    )


def test_teardown(
    signoz: types.SigNoz,  # pylint: disable=unused-argument
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    seeder: types.TestContainerDocker,  # pylint: disable=unused-argument
) -> None:
    """Companion to test_setup — invoked with --teardown to free containers."""
