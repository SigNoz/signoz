from collections.abc import Callable
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USERS_BASE,
    create_active_user,
)

EDITOR_EMAIL = "editor+quickfilter@integration.test"
VIEWER_EMAIL = "viewer+quickfilter@integration.test"
NON_ADMIN_PASSWORD = "password123Z$"


def test_create_non_admin_users(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
):
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get(USERS_BASE),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    existing_emails = {user["email"] for user in response.json()["data"]}

    for email, role, name in [
        (EDITOR_EMAIL, "signoz-editor", "quickfilter-editor"),
        (VIEWER_EMAIL, "signoz-viewer", "quickfilter-viewer"),
    ]:
        if email not in existing_emails:
            create_active_user(
                signoz,
                admin_token,
                email=email,
                role=role,
                password=NON_ADMIN_PASSWORD,
                name=name,
            )


@pytest.mark.parametrize("email", [EDITOR_EMAIL, VIEWER_EMAIL], ids=["editor", "viewer"])
def test_non_admin_can_read_quick_filters(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    email: str,
):
    token = get_token(email, NON_ADMIN_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters/traces"),
        headers={"Authorization": f"Bearer {token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text


@pytest.mark.parametrize("email", [EDITOR_EMAIL, VIEWER_EMAIL], ids=["editor", "viewer"])
def test_non_admin_cannot_update_quick_filters(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    email: str,
):
    token = get_token(email, NON_ADMIN_PASSWORD)

    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/quick_filters"),
        json={
            "signal": "traces",
            "filters": [{"name": "service.name", "fieldContext": "resource", "fieldDataType": "string"}],
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
