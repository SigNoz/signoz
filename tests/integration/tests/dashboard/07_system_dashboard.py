from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.dashboards import DASHBOARDS_BASE_URL, MAX_LIST_LIMIT
from fixtures.types import Operation, SigNoz

SYSTEM_BASE_URL = "/api/v2/dashboards/system"

# Provisioned for every org by the reconciler; the path segment is the bare
# definition name, the stored name carries the reserved prefix.
SYSTEM_DASHBOARD_NAME = "ai-o11y-overview"
SYSTEM_DASHBOARD_PREFIX = "signoz---"


def test_get_system_dashboard(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SYSTEM_BASE_URL}/{SYSTEM_DASHBOARD_NAME}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    dashboard = response.json()["data"]
    assert dashboard["name"] == SYSTEM_DASHBOARD_PREFIX + SYSTEM_DASHBOARD_NAME
    assert dashboard["source"] == "system"
    assert dashboard["createdBy"] == "signoz"
    assert dashboard["schemaVersion"] == "v6"


def test_get_system_dashboard_rejects_prefixed_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SYSTEM_BASE_URL}/{SYSTEM_DASHBOARD_PREFIX}{SYSTEM_DASHBOARD_NAME}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "must not carry" in response.json()["error"]["message"]


def test_get_missing_system_dashboard_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SYSTEM_BASE_URL}/no-such-dashboard"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


def test_system_dashboard_hidden_from_list_but_gettable_by_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SYSTEM_BASE_URL}/{SYSTEM_DASHBOARD_NAME}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    dashboard_id = response.json()["data"]["id"]

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}?limit={MAX_LIST_LIMIT}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    listed = response.json()["data"]["dashboards"] or []
    assert all(dashboard["source"] != "system" for dashboard in listed)
    assert all(dashboard["id"] != dashboard_id for dashboard in listed)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}/{dashboard_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["source"] == "system"


def test_system_dashboard_is_immutable(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SYSTEM_BASE_URL}/{SYSTEM_DASHBOARD_NAME}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    dashboard = response.json()["data"]
    dashboard_id = dashboard["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}/{dashboard_id}"),
        json={
            "schemaVersion": dashboard["schemaVersion"],
            "name": dashboard["name"],
            "tags": [],
            "spec": dashboard["spec"],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json()["error"]["code"] == "dashboard_immutable"

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}/{dashboard_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json()["error"]["code"] == "dashboard_immutable"

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}/{dashboard_id}/lock"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json()["error"]["code"] == "dashboard_immutable"

    response = requests.post(
        signoz.self.host_configs["8080"].get(f"{DASHBOARDS_BASE_URL}/{dashboard_id}/clone"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert response.json()["error"]["code"] == "dashboard_immutable"


def test_create_rejects_reserved_prefix_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(DASHBOARDS_BASE_URL),
        json={
            "schemaVersion": "v6",
            "name": f"{SYSTEM_DASHBOARD_PREFIX}custom",
            "tags": [],
            "spec": {
                "display": {"name": "Custom"},
                "variables": [],
                "panels": {},
                "layouts": [],
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "reserved for system dashboards" in response.json()["error"]["message"]
