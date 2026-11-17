from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import BuilderQuery, build_order_by, make_query_request


def test_audit_list_all(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    """List audit events across multiple resource types — verify count, ordering, and fields."""
    now = datetime.now(tz=UTC)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=3),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "alert-rule",
                    "signoz.resource.id": "alert-001",
                },
                attributes={
                    "signoz.principal.id": "user-010",
                    "signoz.principal.email": "ops@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "create",
                    "signoz.audit.outcome": "success",
                },
                body="ops@acme.com (user-010) created alert-rule (alert-001)",
                event_name="signoz.audit.create",
                severity_text="INFO",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=2),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "saved-view",
                    "signoz.resource.id": "view-001",
                },
                attributes={
                    "signoz.principal.id": "user-010",
                    "signoz.principal.email": "ops@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.outcome": "success",
                },
                body="ops@acme.com (user-010) updated saved-view (view-001)",
                event_name="signoz.audit.update",
                severity_text="INFO",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "user",
                    "signoz.resource.id": "user-020",
                },
                attributes={
                    "signoz.principal.id": "user-010",
                    "signoz.principal.email": "ops@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.action_category": "access_control",
                    "signoz.audit.outcome": "success",
                },
                body="ops@acme.com (user-010) updated user (user-020)",
                event_name="signoz.audit.update",
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            BuilderQuery(
                signal="logs",
                source="audit",
                limit=100,
                order=[build_order_by("timestamp"), build_order_by("id")],
            ).to_dict()
        ],
        request_type="raw",
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 3

    # Most recent first
    assert [row["data"]["event_name"] for row in rows] == ["signoz.audit.update", "signoz.audit.update", "signoz.audit.create"]
    assert [row["data"]["body"]["message"] for row in rows] == [
        "ops@acme.com (user-010) updated user (user-020)",
        "ops@acme.com (user-010) updated saved-view (view-001)",
        "ops@acme.com (user-010) created alert-rule (alert-001)",
    ]

    # Verify event_name and body are present
    assert rows[0]["data"]["body"] == {"message": "ops@acme.com (user-010) updated user (user-020)"}
    assert rows[0]["data"]["severity_text"] == "INFO"

    assert rows[0]["data"]["resource"] == {
        "attributes": {
            "service.name": "signoz",
            "signoz.resource.kind": "user",
            "signoz.resource.id": "user-020",
        }
    }
    assert rows[0]["data"]["attributes"]["signoz.audit.action_category"] == "access_control"
    assert rows[0]["data"]["scope"]["name"] == "signoz.audit"


def test_audit_does_not_leak_into_logs(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    """A single audit event in signoz_audit must not appear in regular log queries."""
    now = datetime.now(tz=UTC)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "organization",
                    "signoz.resource.id": "org-999",
                },
                attributes={
                    "signoz.principal.id": "user-admin",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.outcome": "success",
                },
                body="user-admin updated organization (org-999)",
                event_name="signoz.audit.update",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=30)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        queries=[
            BuilderQuery(
                signal="logs",
                limit=100,
                order=[build_order_by("timestamp"), build_order_by("id")],
            ).to_dict()
        ],
        request_type="raw",
    )

    assert response.status_code == HTTPStatus.OK

    rows = response.json()["data"]["data"]["results"][0].get("rows") or []

    audit_bodies = [row["data"]["body"] for row in rows if "signoz.audit" in row["data"].get("attributes_string", {}).get("signoz.audit.verb", "")]
    assert len(audit_bodies) == 0
