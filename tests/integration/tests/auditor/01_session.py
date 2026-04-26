from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_VIEWER_EMAIL,
    USER_VIEWER_NAME,
    USER_VIEWER_PASSWORD,
    find_user_by_email,
)
from fixtures.logger import setup_logger

from .conftest import attr_value, ensure_user_active, wait_for_event

logger = setup_logger(__name__)


def test_session_deleted_event_appears_in_file(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """An admin logout posts to DELETE /api/v2/sessions; the audit middleware
    captures the post-auth claims and the file provider writes session.deleted."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.delete(
        signoz.self.host_configs["8080"].get("/api/v2/sessions"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    record = wait_for_event(
        signoz,
        "session.deleted",
        **{
            "signoz.audit.outcome": "success",
            "signoz.audit.action": "delete",
            "signoz.audit.principal.email": USER_ADMIN_EMAIL,
        },
    )
    assert attr_value(record, "signoz.audit.resource.kind") == "session"
    assert attr_value(record, "signoz.audit.action_category") == "access_control"
    assert record["severityText"] == "INFO"


def test_audit_records_failure_outcome(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """A viewer hitting an admin-only mutation must produce an audit record with
    outcome=failure and the captured error.type. Proves the middleware writes
    on the 4xx path, not just the happy path."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    ensure_user_active(
        signoz,
        admin_token,
        USER_VIEWER_EMAIL,
        "VIEWER",
        USER_VIEWER_PASSWORD,
        USER_VIEWER_NAME,
    )

    admin_user = find_user_by_email(signoz, admin_token, USER_ADMIN_EMAIL)
    viewer_token = get_token(USER_VIEWER_EMAIL, USER_VIEWER_PASSWORD)

    forbidden = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{admin_user['id']}"),
        json={"displayName": "should not work"},
        headers={"Authorization": f"Bearer {viewer_token}"},
        timeout=5,
    )
    assert forbidden.status_code == HTTPStatus.FORBIDDEN, forbidden.text

    record = wait_for_event(
        signoz,
        "user.updated",
        **{
            "signoz.audit.outcome": "failure",
            "signoz.audit.principal.email": USER_VIEWER_EMAIL,
            "signoz.audit.resource.id": admin_user["id"],
        },
    )
    assert record["severityText"] == "ERROR"
    assert attr_value(record, "signoz.audit.error.type") is not None
