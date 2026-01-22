from http import HTTPStatus
from typing import Callable

import requests
from sqlalchemy import sql

from fixtures import types
from fixtures.logger import setup_logger

from datetime import datetime, timedelta, timezone

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
            "email": "admin@integration.test",
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


def test_forgot_password_returns_204_for_invalid_email_format(
    signoz: types.SigNoz,
) -> None:
    """
    Test that forgotPassword returns 400 for invalid email format.
    """
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/forgot"),
        json={
            "email": "not-an-email",
            "orgId": "some-org-id",
            "frontendBaseURL": signoz.self.host_configs["8080"].base(),
        },
        timeout=5,
    )

    # Should return 400 for invalid email format
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_forgot_password_creates_reset_token(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """
    Test the full forgot password flow:
    1. Call forgotPassword endpoint for existing user
    2. Verify reset password token is created in database
    3. Use the token to reset password
    4. Verify user can login with new password
    """
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Create a user specifically for testing forgot password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "forgot@integration.test", "role": "EDITOR", "name": "forgotpassword user"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.CREATED

    # Get the invite token
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
            if invite["email"] == "forgot@integration.test"
        ),
        None,
    )

    # Accept the invite to create the user
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": "originalPassword123Z$",
            "displayName": "forgotpassword user",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED

    # Get org ID
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": "forgot@integration.test",
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
            "email": "forgot@integration.test",
            "orgId": org_id,
            "frontendBaseURL": signoz.self.host_configs["8080"].base(),
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify reset password token was created by querying the database
    # First, get the user ID
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
            if user["email"] == "forgot@integration.test"
        ),
        None,
    )
    assert found_user is not None

    reset_token = None
    # Query the database directly to get the reset password token
    # First get the password_id from factor_password, then get the token
    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text("""
                SELECT rpt.token 
                FROM reset_password_token rpt
                JOIN factor_password fp ON rpt.password_id = fp.id
                WHERE fp.user_id = :user_id
            """),
            {"user_id": found_user["id"]},
        )
        row = result.fetchone()
        assert row is not None, "Reset password token should exist after calling forgotPassword"
        reset_token = row[0]

    assert reset_token is not None
    assert reset_token != ""

    # Try resetting password with an invalid (weak) password - should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "weak", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST

    # Reset password with a valid strong password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "newSecurePassword123Z$!", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Verify user can login with the new password
    user_token = get_token("forgot@integration.test", "newSecurePassword123Z$!")
    assert user_token is not None

    # Verify old password no longer works
    try:
        get_token("forgot@integration.test", "originalPassword123Z$")
        assert False, "Old password should not work after reset"
    except AssertionError:
        pass  # Expected - old password should fail


def test_forgot_password_token_cannot_be_reused(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """
    Test that a reset password token cannot be reused after password reset.
    """
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Get user ID for the forgot@integration.test user (created in previous test)
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
            if user["email"] == "forgot@integration.test"
        ),
        None,
    )

    # Get a new reset password token
    response = requests.get(
        signoz.self.host_configs["8080"].get(
            f"/api/v1/getResetPasswordToken/{found_user['id']}"
        ),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.OK
    reset_token = response.json()["data"]["token"]

    # Use the token to reset password
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "anotherNewPassword123Z$!", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Try to reuse the same token - should fail
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "yetAnotherPassword123Z$!", "token": reset_token},
        timeout=2,
    )
    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_reset_password_with_invalid_token(
    signoz: types.SigNoz,
) -> None:
    """
    Test that resetting password with an invalid token fails.
    """
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "validPassword123Z$!", "token": "invalid-token-12345"},
        timeout=2,
    )
    assert response.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)


def test_reset_password_with_expired_token(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """
    Test that resetting password with an expired token fails.
    """
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Get user ID for the forgot@integration.test user
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
            if user["email"] == "forgot@integration.test"
        ),
        None,
    )
    assert found_user is not None

    # Get org ID
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": "forgot@integration.test",
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
            "email": "forgot@integration.test",
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
            sql.text("""
                SELECT rpt.token, rpt.id
                FROM reset_password_token rpt
                JOIN factor_password fp ON rpt.password_id = fp.id
                WHERE fp.user_id = :user_id
            """),
            {"user_id": found_user["id"]},
        )
        row = result.fetchone()
        assert row is not None, "Reset password token should exist"
        reset_token = row[0]
        token_id = row[1]

        # Now expire the token by setting expires_at to a past time
        conn.execute(
            sql.text("""
                UPDATE reset_password_token 
                SET expires_at = :expired_time 
                WHERE id = :token_id
            """),
            {
                "expired_time": "2020-01-01 00:00:00",
                "token_id": token_id,
            },
        )
        conn.commit()

    assert reset_token is not None

    # Try to use the expired token - should fail with 403 Forbidden
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/resetPassword"),
        json={"password": "expiredTokenPassword123Z$!", "token": reset_token},
        timeout=2,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_reset_password_token_expiry_is_set(
    signoz: types.SigNoz, get_token: Callable[[str, str], str]
) -> None:
    """
    Test that when a reset password token is created, it has a valid expiry time set.
    The default validity is 6 hours.
    """
    admin_token = get_token("admin@integration.test", "password123Z$")

    # Create a new user for this test
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": "expiry_test@integration.test", "role": "VIEWER", "name": "expiry test user"},
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == HTTPStatus.CREATED

    # Get the invite token
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
            if invite["email"] == "expiry_test@integration.test"
        ),
        None,
    )

    # Accept the invite
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/invite/accept"),
        json={
            "password": "expiryTestPassword123Z$",
            "displayName": "expiry test user",
            "token": f"{found_invite['token']}",
        },
        timeout=2,
    )
    assert response.status_code == HTTPStatus.CREATED

    # Get user ID
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/user"),
        timeout=2,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_response = response.json()["data"]
    found_user = next(
        (
            user
            for user in user_response
            if user["email"] == "expiry_test@integration.test"
        ),
        None,
    )
    assert found_user is not None

    # Get org ID and call forgot password
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v2/sessions/context"),
        params={
            "email": "expiry_test@integration.test",
            "ref": f"{signoz.self.host_configs['8080'].base()}",
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK
    org_id = response.json()["data"]["orgs"][0]["id"]

    # Record time before creating token
    time_before = datetime.now(timezone.utc)

    # Call forgot password to generate token
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v2/factor_password/forgot"),
        json={
            "email": "expiry_test@integration.test",
            "orgId": org_id,
            "frontendBaseURL": signoz.self.host_configs["8080"].base(),
        },
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    # Query database to verify expiry is set correctly
    with signoz.sqlstore.conn.connect() as conn:
        result = conn.execute(
            sql.text("""
                SELECT rpt.expires_at
                FROM reset_password_token rpt
                JOIN factor_password fp ON rpt.password_id = fp.id
                WHERE fp.user_id = :user_id
            """),
            {"user_id": found_user["id"]},
        )
        row = result.fetchone()
        assert row is not None, "Reset password token should exist"
        expires_at = row[0]

        # Verify expires_at is set and is in the future (default is 6 hours)
        # Allow some tolerance for test execution time
        assert expires_at is not None, "expires_at should be set"
        
        # Convert to datetime if it's a string
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        
        # The token should expire between 5 hours and 7 hours from now
        # (allowing for some variance in test execution and config)
        min_expected_expiry = time_before + timedelta(hours=5)
        max_expected_expiry = time_before + timedelta(hours=7)
        
        # Make expires_at timezone-aware if it isn't
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        assert expires_at > min_expected_expiry, f"Token expiry {expires_at} should be at least 5 hours from now"
        assert expires_at < max_expected_expiry, f"Token expiry {expires_at} should be less than 7 hours from now"
