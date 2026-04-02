from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logger import setup_logger
from fixtures.serviceaccount import (
    SERVICE_ACCOUNT_BASE,
    create_service_account_with_key,
)

logger = setup_logger(__name__)

ME_ENDPOINT = f"{SERVICE_ACCOUNT_BASE}/me"


def test_get_my_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Service account with API key calls GET /me, gets own details."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id, api_key = create_service_account_with_key(
        signoz, token, "sa-me-get"
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(ME_ENDPOINT),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()["data"]
    assert data["id"] == service_account_id
    assert data["name"] == "sa-me-get"


def test_get_me_requires_sa_identity(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """User JWT on GET /me should fail — no service account identity in claims."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(ME_ENDPOINT),
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )

    # user JWT has no service account ID in claims, should fail
    assert response.status_code in (
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.FORBIDDEN,
        HTTPStatus.NOT_FOUND,
        HTTPStatus.UNAUTHORIZED,
    ), f"Expected error for user JWT on service account /me, got {response.status_code}: {response.text}"


def test_update_my_service_account(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Service account calls PUT /me with new name, verify update."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    service_account_id, api_key = create_service_account_with_key(
        signoz, token, "sa-me-update"
    )

    response = requests.put(
        signoz.self.host_configs["8080"].get(ME_ENDPOINT),
        json={"name": "sa-me-updated"},
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    # verify the update via GET /me
    get_resp = requests.get(
        signoz.self.host_configs["8080"].get(ME_ENDPOINT),
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )
    assert get_resp.status_code == HTTPStatus.OK, get_resp.text
    assert get_resp.json()["data"]["name"] == "sa-me-updated"
    assert get_resp.json()["data"]["id"] == service_account_id


def test_update_me_invalid_name_rejected(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    """Service account calls PUT /me with invalid name, gets 400."""
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    _, api_key = create_service_account_with_key(signoz, token, "sa-me-invalid")

    response = requests.put(
        signoz.self.host_configs["8080"].get(ME_ENDPOINT),
        json={"name": "invalid name with spaces"},
        headers={"SIGNOZ-API-KEY": api_key},
        timeout=5,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
