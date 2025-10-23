from http import HTTPStatus
from typing import Callable

import requests
from sqlalchemy import sql

from fixtures import types
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_change_password(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Create another admin user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "admin+password@integration.test", "role": "ADMIN"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.CREATED

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    invite_response = response.json()["data"]
    found_invite = next(
        (
            invite
            for invite in invite_response
            if invite["email"] == "admin+password@integration.test"
        ),
        None,
    )

    # Accept the invite with a bad password which should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": "password",
            "displayName": "admin password",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Accept the invite with a good password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": "password123Z$",
            "displayName": "admin password",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED

    # Get the user id
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (
            user
            for user in user_response
            if user["email"] == "admin+password@integration.test"
        ),
        None,
    )

    # Try logging in with the password
    token = get_token("admin+password@integration.test", "password123Z$")
    assert token is not None

    # Try changing the password with a bad old password which should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/changePassword/{found_user['id']}"
        ),
        json={
            "userId": f"{found_user['id']}",
            "oldPassword": "password",
            "newPassword": "password123Z$",
        },
        timeout=2,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Try changing the password with a good old password
    response = requests.post(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/changePassword/{found_user['id']}"
        ),
        json={
            "userId": f"{found_user['id']}",
            "oldPassword": "password123Z$",
            "newPassword": "password123Znew$",
        },
        timeout=2,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try logging in with the new password
    token = get_token("admin+password@integration.test", "password123Znew$")
    assert token is not None


def test_reset_password(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Get the user id for admin+password@integration.test
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (
            user
            for user in user_response
            if user["email"] == "admin+password@integration.test"
        ),
        None,
    )

    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/getResetPasswordToken/{found_user['id']}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    token = response.json()["data"]["token"]

    # Reset the password with a bad password which should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "password", "token": token},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Reset the password with a good password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "password123Z$NEWNEW#!", "token": token},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    token = get_token("admin+password@integration.test", "password123Z$NEWNEW#!")
    assert token is not None



def test_reset_password_with_no_password(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Get the user id for admin+password@integration.test
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == HTTPStatus.OK

    user_response = response.json()["data"]
    found_user = next(
        (
            user
            for user in user_response
            if user["email"] == "admin+password@integration.test"
        ),
        None,
    )

    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text("DELETE FROM factor_password WHERE user_id = :user_id"),
            {"user_id": found_user["id"]},
        )
        assert result.rowcount == 1

    # Generate a new reset password token
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/getResetPasswordToken/{found_user['id']}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.OK

    token = response.json()["data"]["token"]

    # Reset the password with a good password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "FINALPASSword123!#[", "token": token},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    token = get_token("admin+password@integration.test", "FINALPASSword123!#[")
    assert token is not None
