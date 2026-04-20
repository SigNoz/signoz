import json
import os
from pathlib import Path
from typing import List

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD


def _endpoint_file() -> Path:
    override = os.environ.get("SIGNOZ_E2E_ENDPOINT_FILE")
    if override:
        return Path(override)
    # tests/e2e/src/bootstrap/setup.py -> tests/e2e/.signoz-backend.json
    return Path(__file__).resolve().parents[2] / ".signoz-backend.json"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    seed_dashboards: List[str],  # pylint: disable=unused-argument
    seed_alert_rules: List[str],  # pylint: disable=unused-argument
    seed_e2e_telemetry: None,  # pylint: disable=unused-argument
) -> None:
    """
    Bring the SigNoz backend up, register the admin, seed API fixtures and
    telemetry, and persist endpoint coordinates for the Playwright side.
    """
    host_cfg = signoz.self.host_configs["8080"]
    out = _endpoint_file()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "base_url": host_cfg.base(),
                "admin_email": USER_ADMIN_EMAIL,
                "admin_password": USER_ADMIN_PASSWORD,
            }
        )
    )


def test_teardown(
    signoz: types.SigNoz,  # pylint: disable=unused-argument
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
) -> None:
    """Companion to test_setup — invoked with --teardown to free containers."""
