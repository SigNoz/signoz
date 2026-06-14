import uuid
from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.types import Operation, SigNoz

BASE_URL = "/api/v2/dashboard_views"


# ─── failure cases (create no views) ─────────────────────────────────────────


def test_create_rejects_missing_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    body = response.json()
    assert body["status"] == "error"
    assert body["error"]["code"] == "dashboard_view_invalid_input"
    assert body["error"]["message"] == "name is required"


def test_create_rejects_blank_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "   ", "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_view_invalid_input"
    assert response.json()["error"]["message"] == "name is required"


def test_create_rejects_whitespace_name(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "  Storage  ", "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_view_invalid_input"
    assert response.json()["error"]["message"] == "name must not have leading or trailing whitespace"


def test_create_rejects_name_too_long(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "x" * 33, "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_view_invalid_input"
    assert response.json()["error"]["message"] == "name must be at most 32 characters, got 33"


def test_create_rejects_wrong_schema_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "wrong-version", "data": {"version": "v2"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_view_invalid_input"
    assert response.json()["error"]["message"] == 'version must be "v1", got "v2"'


def test_create_rejects_missing_version(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "missing-version", "data": {}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_view_invalid_input"
    assert response.json()["error"]["message"] == 'version must be "v1", got ""'


def test_create_rejects_unknown_field(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "rejects-unknown", "data": {"version": "v1"}, "unknownfield": "boom"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_view_invalid_input"


@pytest.mark.parametrize(
    "data",
    [
        {"version": "v1", "sort": "bogus"},
        {"version": "v1", "order": "bogus"},
        {"version": "v1", "query": "x" * 1025},
    ],
)
def test_create_rejects_invalid_filter(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    data: dict,
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "invalid-filter", "data": data},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json()["error"]["code"] == "dashboard_list_invalid"


def test_update_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        json={"name": "x", "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_update_missing_view_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        json={"name": "x", "data": {"version": "v1"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["code"] == "dashboard_view_not_found"


def test_delete_rejects_malformed_id(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/not-a-uuid"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_delete_missing_view_returns_not_found(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{uuid.uuid4()}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert response.json()["error"]["code"] == "dashboard_view_not_found"


# ─── lifecycle ───────────────────────────────────────────────────────────────
# A single end-to-end flow through create → list → update → list → delete.
# Saved views are shared org-wide and there is no get-by-id endpoint, so every
# read goes through the list.


def test_dashboard_view_lifecycle(
    signoz: SigNoz,
    create_user_admin: Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Saved views share this package's DB and it's reused across runs, so start
    # from a clean slate: delete every view. This test then owns the whole view
    # space and asserts on global counts.
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    for view in response.json()["data"]["views"]:
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view['id']}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )

    # ── stage 1: create and verify the round-tripped shape ───────────────────
    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={
            "name": "Pulse Prod",
            "data": {
                "version": "v1",
                "query": "team = 'pulse' AND env = 'prod'",
                "sort": "name",
                "order": "asc",
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    created = response.json()["data"]
    view_id = created["id"]
    assert created["name"] == "Pulse Prod"
    assert created["data"]["version"] == "v1"
    assert created["data"]["query"] == "team = 'pulse' AND env = 'prod'"

    response = requests.post(
        signoz.self.host_configs["8080"].get(BASE_URL),
        json={"name": "Storage", "data": {"version": "v1", "query": "team = 'storage'"}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    storage = response.json()["data"]
    assert storage["name"] == "Storage"
    assert storage["data"]["query"] == "team = 'storage'"
    assert storage["data"]["sort"] == ""
    assert storage["data"]["order"] == ""

    # ── stage 2: list returns both views ─────────────────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    views = response.json()["data"]["views"]
    assert len(views) == 2
    assert {v["name"] for v in views} == {"Pulse Prod", "Storage"}

    # ── stage 3: update replaces name and data ───────────────────────────────
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
        json={
            "name": "Pulse Staging",
            "data": {
                "version": "v1",
                "query": "team = 'pulse' AND env = 'staging'",
                "sort": "created_at",
                "order": "desc",
            },
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    updated = response.json()["data"]
    assert updated["id"] == view_id
    assert updated["name"] == "Pulse Staging"
    assert updated["data"]["query"] == "team = 'pulse' AND env = 'staging'"
    assert updated["data"]["sort"] == "created_at"
    assert updated["data"]["order"] == "desc"

    # ── stage 4: the update is reflected in the list ─────────────────────────
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    listed = {v["name"]: v for v in response.json()["data"]["views"]}
    assert set(listed) == {"Pulse Staging", "Storage"}
    assert listed["Pulse Staging"]["data"]["query"] == "team = 'pulse' AND env = 'staging'"

    # ── stage 5: delete removes the view from the list ───────────────────────
    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NO_CONTENT
    )
    response = requests.get(
        signoz.self.host_configs["8080"].get(BASE_URL),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    views = response.json()["data"]["views"]
    assert {v["name"] for v in views} == {"Storage"}

    # deleting an already-deleted view is a 404
    assert (
        requests.delete(
            signoz.self.host_configs["8080"].get(f"{BASE_URL}/{view_id}"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        ).status_code
        == HTTPStatus.NOT_FOUND
    )
