from http import HTTPStatus

import pytest
import requests

from fixtures import types


@pytest.mark.parametrize(
    "path",
    [
        "/api/v2/users/me",
        "/api/v1/stats",
        "/api/v1/features",
        "/api/v2/features",
        "/api/v4/licenses/active",
        "/api/v2/dashboards",
    ],
)
def test_protected_routes_reject_missing_credentials(signoz: types.SigNoz, path: str) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get(path), timeout=5)

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
    assert response.json()["error"]["code"] == "unauthenticated"


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/version",
        "/api/v1/health",
        "/api/v2/healthz",
        "/api/v2/readyz",
        "/api/v2/livez",
        "/api/v1/global/config",
        "/",
    ],
)
def test_public_routes_serve_missing_credentials(signoz: types.SigNoz, path: str) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get(path), timeout=5)

    assert response.status_code == HTTPStatus.OK, response.text
