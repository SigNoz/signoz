from http import HTTPStatus

import requests

from fixtures import types
from fixtures.authutils import assert_user_has_role
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
        signoz.self.host_configs["8080"].get("/api/v2/users"),
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

    # Verify root user has admin role via v2 detail endpoint
    root_detail = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{root_user['id']}"),
        timeout=2,
    )
    assert root_detail.status_code == HTTPStatus.OK
    assert_user_has_role(root_detail.json()["data"], "signoz-admin")
