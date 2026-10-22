from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    assert_user_has_role,
    find_user_with_roles_by_email,
)


def test_register_with_invalid_input(signoz: types.SigNoz) -> None:
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={"name": "admin", "orgId": "", "orgName": "integration.test", "email": USER_ADMIN_EMAIL, "password": "password"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={"name": "admin", "orgId": "", "orgName": "integration.test", "email": "admin", "password": USER_ADMIN_PASSWORD},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_register(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=5)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is False

    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/register"),
        json={"name": "admin", "orgId": "", "orgName": "integration.test", "email": USER_ADMIN_EMAIL, "password": USER_ADMIN_PASSWORD},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=5)
    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is True

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    found_user = find_user_with_roles_by_email(signoz, admin_token, USER_ADMIN_EMAIL)
    assert found_user["isRoot"] is True
    assert_user_has_role(found_user, "signoz-admin")
