from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import BuilderQuery, build_order_by, make_query_request

ATTACHED_ROLE_001_TO_USER_020 = "ops@acme.com (user-010) attached role (role-001) to user (user-020)"
DETACHED_ROLE_001_FROM_USER_021 = "ops@acme.com (user-010) detached role (role-001) from user (user-021)"
ATTACHED_ROLE_002_TO_USER_020 = "ops@acme.com (user-010) attached role (role-002) to user (user-020)"
UPDATED_ROLE_001 = "ops@acme.com (user-010) updated role (role-001)"


@pytest.mark.parametrize(
    "filter_expression,expected_bodies",
    [
        pytest.param("event_name = 'signoz.audit.attach'", {ATTACHED_ROLE_001_TO_USER_020, ATTACHED_ROLE_002_TO_USER_020}, id="attach_events"),
        pytest.param("event_name = 'signoz.audit.detach'", {DETACHED_ROLE_001_FROM_USER_021}, id="detach_events"),
        pytest.param("signoz.resource.target.id = 'user-020'", {ATTACHED_ROLE_001_TO_USER_020, ATTACHED_ROLE_002_TO_USER_020}, id="by_target_id"),
        pytest.param("signoz.resource.id = 'role-001' AND signoz.resource.target.kind = 'user'", {ATTACHED_ROLE_001_TO_USER_020, DETACHED_ROLE_001_FROM_USER_021}, id="by_resource_and_target_kind"),
        pytest.param("signoz.resource.target.kind EXISTS", {ATTACHED_ROLE_001_TO_USER_020, DETACHED_ROLE_001_FROM_USER_021, ATTACHED_ROLE_002_TO_USER_020}, id="with_target"),
        pytest.param("signoz.resource.target.kind NOT EXISTS", {UPDATED_ROLE_001}, id="without_target"),
    ],
)
def test_audit_relation_filters(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
    filter_expression: str,
    expected_bodies: set[str],
) -> None:
    """Attach and detach events carry the counterpart as target attributes on the record; a plain update on the same resource carries none."""
    now = datetime.now(tz=UTC)
    principal = {"signoz.principal.id": "user-010", "signoz.principal.email": "ops@acme.com", "signoz.principal.type": "user", "signoz.audit.outcome": "success"}
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=4),
                resources={"service.name": "signoz", "signoz.resource.kind": "role", "signoz.resource.id": "role-001"},
                attributes={**principal, "signoz.audit.verb": "attach", "signoz.resource.target.kind": "user", "signoz.resource.target.id": "user-020"},
                body=ATTACHED_ROLE_001_TO_USER_020,
                event_name="signoz.audit.attach",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "signoz", "signoz.resource.kind": "role", "signoz.resource.id": "role-001"},
                attributes={**principal, "signoz.audit.verb": "detach", "signoz.resource.target.kind": "user", "signoz.resource.target.id": "user-021"},
                body=DETACHED_ROLE_001_FROM_USER_021,
                event_name="signoz.audit.detach",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "signoz", "signoz.resource.kind": "role", "signoz.resource.id": "role-002"},
                attributes={**principal, "signoz.audit.verb": "attach", "signoz.resource.target.kind": "user", "signoz.resource.target.id": "user-020"},
                body=ATTACHED_ROLE_002_TO_USER_020,
                event_name="signoz.audit.attach",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "signoz", "signoz.resource.kind": "role", "signoz.resource.id": "role-001"},
                attributes={**principal, "signoz.audit.verb": "update"},
                body=UPDATED_ROLE_001,
                event_name="signoz.audit.update",
            ),
        ]
    )
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

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
                filter_expression=filter_expression,
                order=[build_order_by("timestamp"), build_order_by("id")],
            ).to_dict()
        ],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0].get("rows") or []
    assert {row["data"]["body"]["message"] for row in rows} == expected_bodies
    for row in rows:
        if row["data"]["event_name"] == "signoz.audit.update":
            assert "signoz.resource.target.kind" not in row["data"]["attributes"]
        else:
            assert row["data"]["attributes"]["signoz.resource.target.kind"] == "user"
            assert row["data"]["resource"]["attributes"]["signoz.resource.kind"] == "role"
