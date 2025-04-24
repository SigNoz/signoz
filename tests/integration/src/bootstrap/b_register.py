from http import HTTPStatus

import requests

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_register(signoz: types.SigNoz) -> None:
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

    assert response.status_code == HTTPStatus.OK

    invite_response = response.json()
    assert "email" in invite_response
    assert "inviteToken" in invite_response

    assert invite_response["email"] == "editor@integration.test"

    # Register the editor user using the invite token
    response = requests.post(
        signoz.self.host_config.get("/api/v1/register"),
        json={
            "email": "editor@integration.test",
            "password": "password",
            "name": "editor",
            "token": f"{invite_response["inviteToken"]}",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK

    # Verify that the invite token has been deleted
    response = requests.get(
        signoz.self.host_config.get(
            f"/api/v1/invite/{invite_response["inviteToken"]}"
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

    user_response = response.json()
    found_user = next(
        (user for user in user_response if user["email"] == "editor@integration.test"),
        None,
    )

    assert found_user is not None
    assert found_user["role"] == "EDITOR"
    assert found_user["name"] == "editor"
    assert found_user["email"] == "editor@integration.test"
