from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_global_config_returns_impersonation_enabled(signoz: types.SigNoz) -> None:
    """
    GET /api/v1/global/config without any auth header should return 200
    and report impersonation as enabled.
    """
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/global/config"),
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    data = response.json()["data"]
    assert data["identN"]["impersonation"]["enabled"] is True
    assert data["identN"]["tokenizer"]["enabled"] is False
    assert data["identN"]["apikey"]["enabled"] is False


def test_impersonated_user_is_admin(signoz: types.SigNoz) -> None:
    """
    The impersonated identity should have admin privileges.
    Listing users is an admin-only endpoint.
    """
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    users = response.json()["data"]
    assert len(users) >= 1

    root_user = next(
        (u for u in users if u.get("isRoot") is True),
        None,
    )
    assert root_user is not None
    assert root_user["role"] == "ADMIN"
