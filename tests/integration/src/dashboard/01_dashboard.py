from http import HTTPStatus
from typing import Callable, List

import requests
from wiremock.resources.mappings import Mapping

from fixtures.auth import add_license
from fixtures.signoz import ROOT_USER_EMAIL, ROOT_USER_PASSWORD
from fixtures.types import SigNoz, TestContainerDocker


def test_create_and_delete_dashboard_without_license(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        json={"title": "Sample Title", "uploadedGrafana": False, "version": "v5"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["status"] == "success"
    data = response.json()["data"]
    dashboard_id = data["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{dashboard_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT


def test_apply_license(
    signoz: SigNoz,
    make_http_mocks: Callable[[TestContainerDocker, List[Mapping]], None],
    get_token: Callable[[str, str], str],
) -> None:
    """
    This applies a license to the signoz instance.
    """
    add_license(signoz, make_http_mocks, get_token)


def test_create_and_delete_dashboard_with_license(
    signoz: SigNoz,
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        json={"title": "Sample Title", "uploadedGrafana": False, "version": "v5"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED
    assert response.json()["status"] == "success"
    data = response.json()["data"]
    dashboard_id = data["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/dashboards/{dashboard_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT
