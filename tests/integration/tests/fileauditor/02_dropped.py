import uuid
from collections.abc import Callable

from sqlalchemy import sql

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.fileauditor import list_audit_events, wait_for_audit_event
from fixtures.savedview import create_saved_view


def test_unlicensed_create_writes_no_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    with signoz.sqlstore.conn.begin() as conn:
        licenses = conn.execute(sql.text("SELECT id, created_at, updated_at, key, data, last_validated_at, org_id FROM license")).mappings().all()
        assert len(licenses) > 0
        conn.execute(sql.text("DELETE FROM license"))

    try:
        unlicensed_view_id = create_saved_view(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")
    finally:
        with signoz.sqlstore.conn.begin() as conn:
            conn.execute(
                sql.text("INSERT INTO license (id, created_at, updated_at, key, data, last_validated_at, org_id) VALUES (:id, :created_at, :updated_at, :key, :data, :last_validated_at, :org_id)"),
                [dict(row) for row in licenses],
            )

    marker_view_id = create_saved_view(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")
    wait_for_audit_event(signoz, "signoz.audit.create", marker_view_id)

    assert all(event["resource"].get("signoz.resource.id") != unlicensed_view_id for event in list_audit_events(signoz))


def test_login_writes_no_event(
    signoz: types.SigNoz,
    apply_license: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    marker_view_id = create_saved_view(signoz, token, f"fileauditor-{uuid.uuid4().hex[:8]}")
    wait_for_audit_event(signoz, "signoz.audit.create", marker_view_id)

    assert all(event["attributes"].get("http.route") != "/api/v2/sessions/email_password" for event in list_audit_events(signoz))
