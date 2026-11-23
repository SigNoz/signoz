import secrets
from collections.abc import Callable
from http import HTTPStatus

import pytest
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
        params={"query": "test-sa"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert isinstance(data["serviceAccounts"], list)
    assert data["total"] >= 1

    # should contain the SA we created in the earlier test
    names = [service_account["name"] for service_account in data["serviceAccounts"]]
    assert "test-sa" in names


def test_list_service_accounts_filters_and_pages(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    suffix = secrets.token_hex(4)
    names = [f"sa-alpha-{suffix}", f"sa-beta-{suffix}", f"sa-gamma-{suffix}"]
    ids = [create_service_account(signoz, token, name) for name in names]
    delete_service_account(signoz, token, ids[2])

    for query, total in [
        (f"'{suffix}'", 3),
        (f"'{suffix.upper()}'", 3),
        (f"'{suffix}@'", 3),
        (f"'{suffix}' AND status = active", 2),
        (f"'{suffix}' AND status = deleted", 1),
        (f"'{suffix}' AND status IN (active, deleted)", 3),
        (f"name = 'sa-alpha-{suffix}'", 1),
        (f"email CONTAINS '{suffix}' AND NOT name CONTAINS alpha", 2),
    ]:
        response = requests.get(
            signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
            params={"query": query},
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
        assert response.status_code == HTTPStatus.OK, response.text
        assert response.json()["data"]["total"] == total, query

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params={"query": f"'{suffix}' AND status = deleted"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [sa["name"] for sa in response.json()["data"]["serviceAccounts"]] == [names[2]]

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params={"query": f"'{suffix}'", "sort": "name", "order": "asc"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [sa["name"] for sa in response.json()["data"]["serviceAccounts"]] == names

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params={"query": f"'{suffix}'", "sort": "created_at", "order": "desc"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert [sa["name"] for sa in response.json()["data"]["serviceAccounts"]] == list(reversed(names))

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params={"query": f"'{suffix}'", "sort": "name", "order": "asc", "limit": 2},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 3
    assert [sa["name"] for sa in response.json()["data"]["serviceAccounts"]] == names[:2]

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params={"query": f"'{suffix}'", "sort": "name", "order": "asc", "limit": 2, "offset": 2},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 3
    assert [sa["name"] for sa in response.json()["data"]["serviceAccounts"]] == names[2:]

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params={"query": f"'{suffix}'", "offset": 10},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["total"] == 3
    assert response.json()["data"]["serviceAccounts"] == []


@pytest.mark.parametrize(
    "params",
    [
        pytest.param({"sort": "email"}, id="sort_outside_the_enum"),
        pytest.param({"order": "sideways"}, id="order_outside_the_enum"),
        pytest.param({"limit": -1}, id="negative_limit"),
        pytest.param({"offset": -1}, id="negative_offset"),
        pytest.param({"query": "owner = ci"}, id="query_key_outside_the_reserved_set"),
        pytest.param({"query": "status CONTAINS act"}, id="query_operator_not_allowed_on_status"),
        pytest.param({"query": "name ="}, id="query_syntax_error"),
    ],
)
def test_list_rejects_invalid_params(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    params: dict,
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(SERVICE_ACCOUNT_BASE),
        params=params,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_get_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account = find_service_account_by_name(signoz, token, "test-sa")

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}"),
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
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/00000000-0000-0000-0000-000000000000"),
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
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}"),
        json={"name": "test-sa-updated"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # verify the update
    get_resp = requests.get(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}"),
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
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"),
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
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-double-delete")

    # first delete
    delete_service_account(signoz, token, service_account_id)

    # second delete should be handled gracefully (idempotent or error)
    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"{SERVICE_ACCOUNT_BASE}/{service_account_id}"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, f"Expected 404 for already-deleted SA, got {response.status_code}: {response.text}"
