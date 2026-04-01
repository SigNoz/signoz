from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.serviceaccount import (
    SERVICE_ACCOUNT_BASE,
    create_service_account,
    delete_service_account,
    find_service_account_by_name,
)

logger = setup_logger(__name__)


def test_create_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": "test-sa"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    data = response.json()["data"]
    assert "id" in data
    assert len(data["id"]) > 0


def test_create_service_account_invalid_name(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # name with spaces should be rejected
    response = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": "invalid name"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_create_service_account_missing_name(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Creating a service account with an empty name should be rejected."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": ""},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_list_service_accounts(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert isinstance(data, list)

    # should contain the SA we created in the earlier test
    names = [service_account["name"] for service_account in data]
    assert "test-sa" in names


def test_get_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account = find_service_account_by_name(signoz, token, "test-sa")

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["id"] == service_account["id"]
    assert data["name"] == "test-sa"
    assert data["status"] == "active"
    assert "email" in data
    assert "serviceAccountRoles" in data


def test_get_service_account_not_found(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/00000000-0000-0000-0000-000000000000"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


def test_update_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account = find_service_account_by_name(signoz, token, "test-sa")

    response = requests.put(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}"
        ),
        json={"name": "test-sa-updated"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # verify the update
    get_resp = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert get_resp.json()["data"]["name"] == "test-sa-updated"


def test_delete_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-to-disable")

    delete_service_account(signoz, token, service_account_id)

    # verify status changed to deleted
    get_resp = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert get_resp.json()["data"]["status"] == "deleted"


def test_create_after_delete_reuses_name(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """The partial unique index on (name, org_id) excludes deleted rows,
    so create → delete → create with the same name must succeed."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_name = "sa-reuse-name"

    # 1. create
    first_id = create_service_account(signoz, token, service_account_name)

    # 2. creating again with the same name should fail (conflict)
    dup_resp = requests.post(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        json={"name": service_account_name},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert dup_resp.status_code == HTTPStatus.CONFLICT, dup_resp.text

    # 3. soft-delete the first one
    delete_service_account(signoz, token, first_id)

    # 4. now creating with the same name should succeed
    second_id = create_service_account(signoz, token, service_account_name)
    assert second_id != first_id, "New SA should have a different ID"


def test_delete_already_deleted_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Deleting an already-deleted service account should be handled gracefully."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-double-delete")

    # first delete
    delete_service_account(signoz, token, service_account_id)

    # second delete should be handled gracefully (idempotent or error)
    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert (
        response.status_code == HTTPStatus.NOT_IMPLEMENTED
    ), f"Expected 501 for already-deleted SA, got {response.status_code}: {response.text}"
