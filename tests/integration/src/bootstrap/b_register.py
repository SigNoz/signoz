from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_register(signoz: types.SigNoz, get_jwt_token) -> None:
    response = requests.get(signoz.self.host_config.get("/api/v1/version"), timeout=2)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is False

    response = requests.post(
        signoz.self.host_config.get("/api/v1/register"),
        json={
            "name": "admin",
            "orgId": "",
            "orgName": "integration.test",
            "email": "admin@integration.test",
            "password": "password",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK

    response = requests.get(signoz.self.host_config.get("/api/v1/version"), timeout=2)

    assert response.status_code == HTTPStatus.OK
    assert response.json()["setupCompleted"] is True

    admin_token = get_jwt_token("admin@integration.test", "password")

    response = requests.get(
        signoz.self.host_config.get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (user for user in user_response if user["email"] == "admin@integration.test"),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "ADMIN"

    response = requests.get(
        signoz.self.host_config.get(f"/api/v1/user/{found_user["id"]}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["role"] == "ADMIN"


def test_invite_and_register(signoz: types.SigNoz, get_jwt_token) -> None:
    # Generate an invite token for the editor user
    response = requests.post(
        signoz.self.host_config.get("/api/v1/invite"),
        json={"email": "editor@integration.test", "role": "EDITOR"},
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_jwt_token("admin@integration.test", "password")}"  # pylint: disable=line-too-long
        },
    )

    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_config.get("/api/v1/invite"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_jwt_token("admin@integration.test", "password")}"  # pylint: disable=line-too-long
        },
    )

    invite_response = response.json()["data"]
    found_invite = next(
        (invite for invite in invite_response if invite["email"] == "editor@integration.test"),
        None,
    )

    # Register the editor user using the invite token
    response = requests.post(
        signoz.self.host_config.get("/api/v1/invite/accept"),
        json={
            "password": "password",
            "displayName": "editor",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK

    # Verify that the invite token has been deleted
    response = requests.get(
        signoz.self.host_config.get(
            f"/api/v1/invite/{found_invite['token']}"
        ),  # pylint: disable=line-too-long
        timeout=2,
    )

    assert response.status_code in (HTTPStatus.NOT_FOUND, HTTPStatus.BAD_REQUEST)

    # Verify that an admin endpoint cannot be called by the editor user
    response = requests.get(
        signoz.self.host_config.get("/api/v1/user"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_jwt_token("editor@integration.test", "password")}"  # pylint: disable=line-too-long
        },
    )

    assert response.status_code == HTTPStatus.FORBIDDEN

    # Verify that the editor has been created
    response = requests.get(
        signoz.self.host_config.get("/api/v1/user"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_jwt_token("admin@integration.test", "password")}"  # pylint: disable=line-too-long
        },
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (user for user in user_response if user["email"] == "editor@integration.test"),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "EDITOR"
    assert found_user["displayName"] == "editor"
    assert found_user["email"] == "editor@integration.test"


def test_revoke_invite_and_register(signoz: types.SigNoz, get_jwt_token) -> None:
    admin_token = get_jwt_token("admin@integration.test", "password")
    # Generate an invite token for the viewer user
    response = requests.post(
        signoz.self.host_config.get("/api/v1/invite"),
        json={"email": "viewer@integration.test", "role": "VIEWER"},
        timeout=2,
        headers={
            "Authorization": f"Bearer {admin_token}"  # pylint: disable=line-too-long
        },
    )

    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_config.get("/api/v1/invite"),
        timeout=2,
        headers={
            "Authorization": f"Bearer {get_jwt_token("admin@integration.test", "password")}"  # pylint: disable=line-too-long
        },
    )

    invite_response = response.json()["data"]
    found_invite = next(
        (invite for invite in invite_response if invite["email"] == "viewer@integration.test"),
        None,
    )

    response = requests.delete(
        signoz.self.host_config.get(f"/api/v1/invite/{found_invite['id']}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try registering the viewer user with the invite token
    response = requests.post(
        signoz.self.host_config.get("/api/v1/invite/accept"),
        json={
            "password": "password",
            "displayName": "viewer",
            "token": f"{found_invite["token"]}",
        },
        timeout=2,
    )

    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_self_access(signoz: types.SigNoz, get_jwt_token) -> None:
    admin_token = get_jwt_token("admin@integration.test", "password")

    response = requests.get(
        signoz.self.host_config.get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (user for user in user_response if user["email"] == "editor@integration.test"),
        None,
    )

    response = requests.get(
        signoz.self.host_config.get(f"/api/v1/user/{found_user['id']}"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["role"] == "EDITOR"
