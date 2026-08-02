from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import assert_user_has_role, find_user_with_roles_by_email
from fixtures.logger import setup_logger

logger = setup_logger(__name__)

# Must match conftest.py's _trusted_header_env(), which is what the `signoz`
# and `signoz_auto_provision` fixtures in this package actually boot the
# server with.
SECRET_HEADER = "X-Signoz-Trusted-Secret"
SECRET_VALUE = "trusted-header-test-secret-do-not-reuse"
EMAIL_HEADER = "X-Forwarded-Email"
ROOT_USER_EMAIL = "trustedheader-root@integration.test"
ROOT_USER_PASSWORD = "password123Z$"

ME_PATH = "/api/v2/users/me"
USERS_PATH = "/api/v2/users"


def _get_me(signoz: types.SigNoz) -> requests.Response:
    return requests.get(
        signoz.self.host_configs["8080"].get(ME_PATH),
        headers={SECRET_HEADER: SECRET_VALUE, EMAIL_HEADER: ROOT_USER_EMAIL},
        timeout=5,
    )


def _get_me_for(signoz: types.SigNoz, email: str) -> requests.Response:
    return requests.get(
        signoz.self.host_configs["8080"].get(ME_PATH),
        headers={SECRET_HEADER: SECRET_VALUE, EMAIL_HEADER: email},
        timeout=5,
    )


def _user_exists(signoz: types.SigNoz, admin_token: str, email: str) -> bool:
    response = requests.get(
        signoz.self.host_configs["8080"].get(USERS_PATH),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.OK, response.text
    return any(u["email"] == email for u in response.json()["data"])


def test_auto_provision_false_unknown_email_rejected_and_no_user_created(
    signoz: types.SigNoz,
    signoz_ready: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """With auto_provision:false, an unknown email is rejected and no user
    record is created for it."""
    unknown_email = "trustedheader-unknown-noprovision@integration.test"

    response = _get_me_for(signoz, unknown_email)
    assert response.status_code == HTTPStatus.UNAUTHORIZED

    admin_token = get_token(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)
    assert not _user_exists(signoz, admin_token, unknown_email)


def test_auto_provision_true_unknown_email_creates_viewer(
    signoz_auto_provision: types.SigNoz,
    signoz_auto_provision_ready: None,  # pylint: disable=unused-argument
    get_token_auto_provision: Callable[[str, str], str],
) -> None:
    """With auto_provision:true, an unknown email creates exactly one user,
    and that user's role is Viewer."""
    unknown_email = "trustedheader-unknown-autoprovision@integration.test"

    response = _get_me_for(signoz_auto_provision, unknown_email)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"]["email"] == unknown_email

    admin_token = get_token_auto_provision(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

    users_response = requests.get(
        signoz_auto_provision.self.host_configs["8080"].get(USERS_PATH),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert users_response.status_code == HTTPStatus.OK
    matches = [u for u in users_response.json()["data"] if u["email"] == unknown_email]
    assert len(matches) == 1, f"expected exactly one user for {unknown_email}, found {len(matches)}"

    created = find_user_with_roles_by_email(signoz_auto_provision, admin_token, unknown_email)
    assert_user_has_role(created, "signoz-viewer")


def test_auto_provision_true_root_email_still_rejected_and_creates_nothing(
    signoz_auto_provision: types.SigNoz,
    signoz_auto_provision_ready: None,  # pylint: disable=unused-argument
    get_token_auto_provision: Callable[[str, str], str],
) -> None:
    """With auto_provision:true, asserting the root user's email is still
    rejected: GetOrCreateUser would otherwise find and return the existing
    root record, so the provider must refuse it explicitly rather than
    minting an admin-privileged identity. No new user is created for it.
    Depends on `signoz_auto_provision_ready` so root is actually reconciled
    by the time this runs, which is what makes the rejection prove the
    root-specific filter rather than a mere "email matches nobody yet"."""
    response = _get_me(signoz_auto_provision)
    assert response.status_code == HTTPStatus.UNAUTHORIZED

    admin_token = get_token_auto_provision(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

    users_response = requests.get(
        signoz_auto_provision.self.host_configs["8080"].get(USERS_PATH),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert users_response.status_code == HTTPStatus.OK
    matches = [u for u in users_response.json()["data"] if u["email"] == ROOT_USER_EMAIL]
    assert len(matches) == 1, "root user itself should still be the only record for this email"
    assert matches[0]["isRoot"] is True


def test_pending_invite_email_rejected_and_invite_remains_pending(
    signoz_auto_provision: types.SigNoz,
    signoz_auto_provision_ready: None,  # pylint: disable=unused-argument
    get_token_auto_provision: Callable[[str, str], str],
) -> None:
    """A pending-invite user's email is rejected, and the invite is left
    untouched: it does not get silently activated (with its role reset to
    Viewer) as a side effect of GetOrCreateUser, even though auto_provision
    is on and GetOrCreateUser would otherwise happily reactivate it."""
    admin_token = get_token_auto_provision(ROOT_USER_EMAIL, ROOT_USER_PASSWORD)

    pending_email = "trustedheader-pending-invite@integration.test"
    invite_response = requests.post(
        signoz_auto_provision.self.host_configs["8080"].get("/api/v1/invite"),
        json={"email": pending_email, "role": "EDITOR", "name": "pending invite"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert invite_response.status_code == HTTPStatus.CREATED, invite_response.text

    response = _get_me_for(signoz_auto_provision, pending_email)
    assert response.status_code == HTTPStatus.UNAUTHORIZED

    invited = find_user_with_roles_by_email(signoz_auto_provision, admin_token, pending_email)
    assert invited["status"] == "pending_invite"
    assert_user_has_role(invited, "signoz-editor")
