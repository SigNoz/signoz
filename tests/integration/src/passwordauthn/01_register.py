from http import HTTPStatus
from typing import Callable

import requests

from fixtures import types
from fixtures.logger import setup_logger
from fixtures.signoz import ROOT_USER_EMAIL, ROOT_USER_PASSWORD
from fixtures.auth import USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD, USER_EDITOR_NAME

logger = setup_logger(__name__)


# def test_register_with_invalid_input(signoz: types.SigNoz) -> None:
#     """
#     Test the register endpoint with invalid input.
#     1. Invalid Password
#     2. Invalid Email
#     """
#     response = requests.post(
#         signoz.self.host_configs["8080"].get("/api/v1/register"),
#         json={
#             "name": "admin",
#             "orgId": "",
#             "orgName": "integration.test",
#             "email": "admin@integration.test",
#             "password": "password",  # invalid password
#         },
#         timeout=2,
#     )

#     assert response.status_code == HTTPStatus.BAD_REQUEST

#     response = requests.post(
#         signoz.self.host_configs["8080"].get("/api/v1/register"),
#         json={
#             "name": "admin",
#             "orgId": "",
#             "orgName": "integration.test",
#             "email": "admin",  # invalid email
#             "password": "password123Z$",
#         },
#         timeout=2,
#     )

#     assert response.status_code == HTTPStatus.BAD_REQUEST


# def test_register(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
#     response = requests.get(
#         signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2
#     )

#     assert response.status_code == HTTPStatus.OK
#     assert response.json()["setupCompleted"] is False

#     response = requests.post(
#         signoz.self.host_configs["8080"].get("/api/v1/register"),
#         json={
#             "name": "admin",
#             "orgId": "",
#             "orgName": "integration.test",
#             "email": "admin@integration.test",
#             "password": "password123Z$",
#         },
#         timeout=2,
#     )
#     assert response.status_code == HTTPStatus.OK

#     response = requests.get(
#         signoz.self.host_configs["8080"].get("/api/v1/version"), timeout=2
#     )

#     assert response.status_code == HTTPStatus.OK
#     assert response.json()["setupCompleted"] is True

#     admin_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

#     response = requests.get(
#         signoz.self.host_configs["8080"].get("/api/v1/user"),
#         timeout=2,
#         headers={"Authorization": f"Bearer {admin_token}"},
#     )

#     assert response.status_code == HTTPStatus.OK

#     user_response = response.json()["data"]
#     found_user = next(
#         (user for user in user_response if user["email"] == "admin@integration.test"),
#         None,
#     )

#     assert found_user is not None
#     assert found_user["role"] == "ADMIN"

#     response = requests.get(
#         signoz.self.host_configs["8080"].get(f"/api/v1/user/{found_user['id']}"),
#         timeout=2,
#         headers={"Authorization": f"Bearer {admin_token}"},
#     )

#     assert response.status_code == HTTPStatus.OK
#     assert response.json()["data"]["role"] == "ADMIN"


def test_invite_and_register(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    # Generate an invite token for the editor user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": USER_EDITOR_EMAIL, "role": "EDITOR", "name": USER_EDITOR_NAME},
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)}"
        },
    )

    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)}"
        },
    )

    invite_response = response.json()["data"]
    found_invite = next(
        (
            invite
            for invite in invite_response
            if invite["email"] == USER_EDITOR_EMAIL
        ),
        None,
    )

    # Register the editor user using the invite token
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": USER_EDITOR_PASSWORD,
            "displayName": USER_EDITOR_NAME,
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED

    # Verify that the invite token has been deleted
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/invite/{found_invite['token']}"),
        timeout=2,
    )

    assert response.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST)

    # Verify that an admin endpoint cannot be called by the editor user
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_token(USER_EDITOR_EMAIL, USER_EDITOR_PASSWORD)}"
        },
    )

    assert response.status_code == HTTPStatus.FORBIDDEN

    # Verify that the editor has been created
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)}"
        },
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (user for user in user_response if user["email"] == USER_EDITOR_EMAIL),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "EDITOR"
    assert found_user["displayName"] == USER_EDITOR_NAME
    assert found_user["email"] == USER_EDITOR_EMAIL


def test_revoke_invite_and_register(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    admin_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)
    # Generate an invite token for the viewer user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "viewer@integration.test", "role": "VIEWER"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)}"
        },
    )

    invite_response = response.json()["data"]
    found_invite = next(
        (
            invite
            for invite in invite_response
            if invite["email"] == "viewer@integration.test"
        ),
        None,
    )

    response = requests.delete(
        signoz.self.host_configs["8080"].get(f"/api/v1/invite/{found_invite['id']}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try registering the viewer user with the invite token
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": "password123Z$",
            "displayName": "viewer",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )

    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_self_access(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    admin_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (user for user in user_response if user["email"] == USER_EDITOR_EMAIL),
        None,
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/user/{found_user['id']}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["role"] == "EDITOR"
