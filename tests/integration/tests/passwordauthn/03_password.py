from collections.abc import Callable
from http import HTTPStatus

import requests
from sqlalchemy import sql

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, create_active_user, find_user_by_email
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

PASSWORD_USER_EMAIL = "admin+password@integration.test"
PASSWORD_USER_PASSWORD = "password123Z$"


def test_change_password(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    create_active_user(
        signoz,
        admin_token,
        email=PASSWORD_USER_EMAIL,
        role="signoz-admin",
        password=PASSWORD_USER_PASSWORD,
    )

    # Try logging in with the password
    token = get_token(PASSWORD_USER_EMAIL, PASSWORD_USER_PASSWORD)
    assert token is not None

    # Try changing the password with a bad old password which should fail
    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/factor_password"),
        json={
            "oldPassword": "password",
            "newPassword": PASSWORD_USER_PASSWORD,
        },
        timeout=2,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Try changing the password with a good old password
    response = requests.put(
        signoz.self.host_configs["8080"].get("/api/v2/users/me/factor_password"),
        json={
            "oldPassword": PASSWORD_USER_PASSWORD,
            "newPassword": "password123Znew$",
        },
        timeout=2,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try logging in with the new password
    token = get_token(PASSWORD_USER_EMAIL, "password123Znew$")
    assert token is not None


def test_reset_password(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Get the user id via v2
    found_user = find_user_by_email(signoz, admin_token, PASSWORD_USER_EMAIL)

    # Create a reset password token via v2 PUT
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{found_user['id']}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    token_data = response.json()["data"]
    assert "token" in token_data
    assert "expiresAt" in token_data
    token = token_data["token"]

    # Calling PUT again should return the same token (still valid)
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{found_user['id']}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    assert response.json()["data"]["token"] == token

    # GET should also return the same token
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{found_user['id']}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["token"] == token

    # Reset the password with a bad password which should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password", "token": token},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Reset the password with a good password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password123Z$NEWNEW#!", "token": token},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    assert get_token(PASSWORD_USER_EMAIL, "password123Z$NEWNEW#!") is not None

    # The token is single use, so replaying it no longer resolves
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "password123Z$REPLAY#!", "token": token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


def test_reset_password_with_no_password(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # Get the user id via v2
    found_user = find_user_by_email(signoz, admin_token, PASSWORD_USER_EMAIL)

    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text("DELETE FROM factor_password WHERE user_id = :user_id"),
            {"user_id": found_user["id"]},
        )
        assert result.rowcount == 1

    # GET should return 404 since there's no password (and thus no token)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{found_user['id']}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text

    # Generate a new reset password token via v2 PUT
    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{found_user['id']}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    token_data = response.json()["data"]
    assert "expiresAt" in token_data
    token = token_data["token"]

    # Reset the password with a good password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "FINALPASSword123!#[", "token": token},
        timeout=2,
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    token = get_token(PASSWORD_USER_EMAIL, "FINALPASSword123!#[")
    assert token is not None


def test_forgot_password_returns_204_for_nonexistent_email(
    signoz: types.SigNoz,
) -> None:
    """
    Test that forgotPassword returns 204 even for non-existent emails
    (for security reasons - doesn't reveal if user exists).
    """
    # Get org ID first (needed for the forgot password request)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": USER_ADMIN_EMAIL,
            "ref": f"{signoz.self.host_configs['8080'].base()}",
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    org_id = response.json()["data"]["orgs"][0]["id"]

    # Call forgot password with a non-existent email
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/forgot"),
        json={
            "email": "nonexistent@integration.test",
            "orgId": org_id,
            "frontendBaseURL": signoz.self.host_configs["8080"].base(),
        },
        timeout=5,
    )

    # Should return 204 even for non-existent email (security)
    assert response.status_code == HTTPStatus.NO_CONTENT


def test_forgot_password_creates_reset_token(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    """
    Test the full forgot password flow:
    1. Call forgotPassword endpoint for existing user
    2. Verify reset password token is created in database
    3. Use the token to reset password
    4. Verify user can login with new password
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    forgot_email = "forgot@integration.test"

    # Create a user specifically for testing forgot password
    create_active_user(
        signoz,
        admin_token,
        email=forgot_email,
        role="signoz-editor",
        password="originalPassword123Z$",
        name="forgotpassword user",
    )

    # Get org ID
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": forgot_email,
            "ref": f"{signoz.self.host_configs['8080'].base()}",
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    org_id = response.json()["data"]["orgs"][0]["id"]

    # Call forgot password endpoint
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/forgot"),
        json={
            "email": forgot_email,
            "orgId": org_id,
            "frontendBaseURL": signoz.self.host_configs["8080"].base(),
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify reset password token was created via the v2 GET endpoint
    found_user = find_user_by_email(signoz, admin_token, forgot_email)

    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{found_user['id']}/reset_password_tokens"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    token_data = response.json()["data"]
    reset_token = token_data["token"]
    assert reset_token is not None
    assert reset_token != ""
    assert "expiresAt" in token_data

    # Reset password with a valid strong password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "newSecurePassword123Z$!", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify user can login with the new password
    user_token = get_token(forgot_email, "newSecurePassword123Z$!")
    assert user_token is not None

    # Verify old password no longer works
    try:
        get_token(forgot_email, "originalPassword123Z$")
        assert False, "Old password should not work after reset"
    except AssertionError:
        pass  # Expected - old password should fail


def test_reset_password_with_expired_token(signoz: types.SigNoz, get_token: Callable[[str, str], str]) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    forgot_email = "forgot@integration.test"

    # Get user ID via v2
    found_user = find_user_by_email(signoz, admin_token, forgot_email)

    # Get org ID
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": forgot_email,
            "ref": f"{signoz.self.host_configs['8080'].base()}",
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    org_id = response.json()["data"]["orgs"][0]["id"]

    # Call forgot password to generate a new token
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/forgot"),
        json={
            "email": forgot_email,
            "orgId": org_id,
            "frontendBaseURL": signoz.self.host_configs["8080"].base(),
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Query the database to get the token and then expire it
    reset_token = None
    with signoz.sqlstore.conn.connect() as conn:
        # First get the token
        result = conn.execute(
            sql.text(
                """
                SELECT rpt.token, rpt.id
                FROM reset_password_token rpt
                JOIN factor_password fp ON rpt.password_id = fp.id
                WHERE fp.user_id = :user_id
            """
            ),
            {"user_id": found_user["id"]},
        )
        row = result.fetchone()
        assert row is not None, "Reset password token should exist"
        reset_token = row[0]
        token_id = row[1]

        # Now expire the token by setting expires_at to a past time
        conn.execute(
            sql.text(
                """
                UPDATE reset_password_token
                SET expires_at = :expired_time
                WHERE id = :token_id
            """
            ),
            {
                "expired_time": "2020-01-01 00:00:00",
                "token_id": token_id,
            },
        )
        conn.commit()

    assert reset_token is not None

    # Try to use the expired token - should fail with 401 Unauthorized
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/reset"),
        json={"password": "expiredTokenPassword123Z$!", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
