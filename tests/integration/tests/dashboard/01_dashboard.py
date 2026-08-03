import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests
from wiremock.resources.mappings import Mapping

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, add_license
from fixtures.types import Operation, SigNoz, TestContainerDocker

DOCS_LINK = "https://signoz.io/docs/dashboards/dashboards-v2-api/"


def test_apply_license(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    """
    This applies a license to the signoz instance.
    """
    add_license(signoz, make_http_mocks, get_token)


@pytest.mark.parametrize(
    "deprecated_request",
    [
        ("POST", "/api/v1/dashboards", {"title": "Sample Title", "uploadedGrafana": False, "version": "v5"}),
        ("GET", "/api/v1/dashboards", None),
        ("GET", f"/api/v1/dashboards/{uuid.uuid4()}", None),
        ("PUT", f"/api/v1/dashboards/{uuid.uuid4()}", {"title": "Sample Title"}),
        ("DELETE", f"/api/v1/dashboards/{uuid.uuid4()}", None),
        ("PUT", f"/api/v1/dashboards/{uuid.uuid4()}/lock", {"lock": True}),
    ],
)
def test_v1_dashboard_endpoints_are_deprecated(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    deprecated_request: tuple[str, str, dict | None],
):
    """Every v1 dashboard endpoint is superseded by v2 and answers with a
    deprecation error naming its replacement — the id in the path is never
    resolved, so a random one still gets the deprecation error rather than a 404."""
    method, path, body = deprecated_request
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.request(
        method,
        signoz.self.host_configs["8080"].get(path),
        json=body,
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NOT_IMPLEMENTED, response.text
    error = response.json()["error"]
    assert error["code"] == "dashboard_deprecated"
    assert "the v1 dashboard API is deprecated" in error["message"]
    assert "/api/v2/dashboards" in error["message"]
    assert DOCS_LINK in error["message"]
