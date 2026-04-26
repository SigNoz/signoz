from collections.abc import Callable
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auditor import attr_value, ensure_user_active, wait_for_event
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    USER_EDITOR_EMAIL,
    USER_EDITOR_NAME,
    USER_EDITOR_PASSWORD,
    change_user_role,
    find_user_by_email,
)
from fixtures.logger import setup_logger

logger = setup_logger(__name__)


def test_user_updated_event_appears_in_file(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    audit_file_path: str,
) -> None:
    """Admin renames an editor user via PUT /api/v2/users/{id}; the file provider
    writes user.updated with the editor id as the resource."""
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor_id = ensure_user_active(
        signoz,
        admin_token,
        USER_EDITOR_EMAIL,
        "EDITOR",
        USER_EDITOR_PASSWORD,
        USER_EDITOR_NAME,
    )

    response = requests.put(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{editor_id}"),
        json={"displayName": "Renamed Editor"},
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    record = wait_for_event(
        audit_file_path,
        "user.updated",
        **{
            "signoz.audit.outcome": "success",
            "signoz.audit.action": "update",
            "signoz.audit.resource.id": editor_id,
            "signoz.audit.principal.email": USER_ADMIN_EMAIL,
        },
    )
    assert attr_value(record, "signoz.audit.action_category") == "configuration_change"
    assert attr_value(record, "signoz.audit.resource.kind") == "user"


def test_user_role_change_emits_created_and_deleted_events(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    audit_file_path: str,
) -> None:
    """Toggling the editor user's managed role between signoz-editor and signoz-viewer
    fires both DELETE and POST against /api/v2/users/{id}/roles; the file provider
    writes one user-role.deleted and one user-role.created tied to the editor id.

    The toggle direction is computed from the current role so the test is idempotent
    across re-runs of the long-lived auditor SigNoz container.
    """
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    editor = find_user_by_email(signoz, admin_token, USER_EDITOR_EMAIL)
    editor_id = editor["id"]

    roles_response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v2/users/{editor_id}/roles"),
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert roles_response.status_code == HTTPStatus.OK, roles_response.text
    managed_role = next(
        (r for r in roles_response.json()["data"] if r["name"] in ("signoz-editor", "signoz-viewer")),
        None,
    )
    assert managed_role is not None, "editor user is missing both managed roles"

    if managed_role["name"] == "signoz-editor":
        old_role, new_role = "signoz-editor", "signoz-viewer"
    else:
        old_role, new_role = "signoz-viewer", "signoz-editor"

    change_user_role(signoz, admin_token, editor_id, old_role, new_role)

    deleted = wait_for_event(
        audit_file_path,
        "user-role.deleted",
        **{
            "signoz.audit.outcome": "success",
            "signoz.audit.action": "delete",
            "signoz.audit.resource.id": editor_id,
            "signoz.audit.principal.email": USER_ADMIN_EMAIL,
        },
    )
    assert attr_value(deleted, "signoz.audit.action_category") == "access_control"
    assert attr_value(deleted, "signoz.audit.resource.kind") == "user-role"

    created = wait_for_event(
        audit_file_path,
        "user-role.created",
        **{
            "signoz.audit.outcome": "success",
            "signoz.audit.action": "create",
            "signoz.audit.resource.id": editor_id,
            "signoz.audit.principal.email": USER_ADMIN_EMAIL,
        },
    )
    assert attr_value(created, "signoz.audit.action_category") == "access_control"
    assert attr_value(created, "signoz.audit.resource.kind") == "user-role"
