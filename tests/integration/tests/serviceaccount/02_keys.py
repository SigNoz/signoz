import time
from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.serviceaccount import (
    SERVICE_ACCOUNT_BASE,
    create_service_account,
    find_service_account_by_name,
)

logger = setup_logger(__name__)


def test_create_api_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-for-keys")

    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "my-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    data = response.json()["data"]
    assert "id" in data
    assert "key" in data
    assert len(data["key"]) > 0


def test_create_api_key_duplicate_name(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account = find_service_account_by_name(signoz, token, "sa-for-keys")

    # creating a key with the same name should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}/keys"
        ),
        json={"name": "my-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.CONFLICT, response.text


def test_list_api_keys(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account = find_service_account_by_name(signoz, token, "sa-for-keys")

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}/keys"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert isinstance(data, list)
    assert len(data) >= 1

    key_entry = data[0]
    assert "id" in key_entry
    assert "name" in key_entry
    assert key_entry["name"] == "my-key"


def test_update_api_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account = find_service_account_by_name(signoz, token, "sa-for-keys")

    keys_resp = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}/keys"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    key_id = keys_resp.json()["data"][0]["id"]

    response = requests.put(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account['id']}/keys/{key_id}"
        ),
        json={"name": "renamed-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_revoke_api_key(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-revoke-key")

    create_resp = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "key-to-revoke", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert create_resp.status_code == HTTPStatus.CREATED
    key_id = create_resp.json()["data"]["id"]

    response = requests.delete(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys/{key_id}"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text


def test_create_api_key_with_expiry(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Key created with a future expiresAt should be usable."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-key-expiry")

    future_ts = int(time.time()) + 3600  # 1 hour from now
    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "future-key", "expiresAt": future_ts},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    api_key = response.json()["data"]["key"]

    # key should work since it hasn't expired
    dash_resp = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert dash_resp.status_code == HTTPStatus.OK, dash_resp.text

    # verify expiresAt is stored correctly
    keys_resp = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    key_entry = next(k for k in keys_resp.json()["data"] if k["name"] == "future-key")
    assert key_entry["expiresAt"] == future_ts


def test_create_api_key_with_past_expiry_rejected(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Creating a key with an already-past expiresAt should be rejected."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-key-past-expiry")

    past_ts = int(time.time()) - 60  # 1 minute ago
    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "expired-key", "expiresAt": past_ts},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert (
        response.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400 for past expiresAt, got {response.status_code}: {response.text}"


def test_create_api_key_no_expiry(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Key with expiresAt=0 should never expire."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-key-no-expiry")

    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "forever-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    api_key = response.json()["data"]["key"]

    dash_resp = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert dash_resp.status_code == HTTPStatus.OK, dash_resp.text

    # verify expiresAt is 0
    keys_resp = requests.get(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    key_entry = next(k for k in keys_resp.json()["data"] if k["name"] == "forever-key")
    assert key_entry["expiresAt"] == 0


def test_update_api_key_expiry(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Updating expiresAt to a past value should be rejected."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id = create_service_account(signoz, token, "sa-key-update-expiry")

    # create with no expiry
    create_resp = requests.post(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys"
        ),
        json={"name": "update-expiry-key", "expiresAt": 0},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert create_resp.status_code == HTTPStatus.CREATED
    key_id = create_resp.json()["data"]["id"]
    api_key = create_resp.json()["data"]["key"]

    # updating to expire in the past should be rejected
    past_ts = int(time.time()) - 60
    update_resp = requests.put(
        signoz.self.host_configs["8080"].get(
            f"{SERVICE_ACCOUNT_BASE}/{service_account_id}/keys/{key_id}"
        ),
        json={"name": "update-expiry-key", "expiresAt": past_ts},
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert (
        update_resp.status_code == HTTPStatus.BAD_REQUEST
    ), f"Expected 400 for past expiresAt update, got {update_resp.status_code}: {update_resp.text}"

    # key should still work since the update was rejected
    dash_resp = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/dashboards"),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert (
        dash_resp.status_code == HTTPStatus.OK
    ), f"Key should still work after rejected update, got {dash_resp.status_code}: {dash_resp.text}"
