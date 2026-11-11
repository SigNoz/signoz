from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    BuilderQuery,
    build_aggregation,
    build_order_by,
    build_scalar_query,
    make_query_request,
)


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
    assert [row["data"]["body"] for row in rows] == [
        "ops@acme.com (user-010) updated user (user-020)",
        "ops@acme.com (user-010) updated saved-view (view-001)",
        "ops@acme.com (user-010) created alert-rule (alert-001)",
    ]

    # Verify event_name and body are present
    assert rows[0]["data"]["body"] == "ops@acme.com (user-010) updated user (user-020)"
    assert rows[0]["data"]["severity_text"] == "INFO"


@pytest.mark.parametrize(
    "filter_expression,expected_count,expected_event_names",
    [
        pytest.param(
            "signoz.principal.id = 'user-001'",
            3,
            {"signoz.audit.update", "signoz.audit.create"},
            id="filter_by_principal_id",
        ),
        pytest.param(
            "signoz.audit.outcome = 'failure'",
            1,
            {"signoz.audit.delete"},
            id="filter_by_outcome_failure",
        ),
        pytest.param(
            "signoz.resource.kind = 'dashboard' AND signoz.resource.id = 'dash-001'",
            3,
            {"signoz.audit.delete", "signoz.audit.update", "signoz.audit.create"},
            id="filter_by_resource_kind_and_id",
        ),
        pytest.param(
            "signoz.principal.type = 'service_account'",
            1,
            {"signoz.audit.create"},
            id="filter_by_principal_type",
        ),
        pytest.param(
            "signoz.resource.kind = 'dashboard' AND signoz.audit.verb = 'delete'",
            1,
            {"signoz.audit.delete"},
            id="filter_by_resource_kind_and_action",
        ),
    ],
)
def test_audit_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
    filter_expression: str,
    expected_count: int,
    expected_event_names: set,
) -> None:
    """Parametrized audit filter tests covering the documented query patterns."""
    now = datetime.now(tz=UTC)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=5),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-001",
                },
                attributes={
                    "signoz.principal.id": "user-001",
                    "signoz.principal.email": "alice@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "create",
                    "signoz.audit.action_category": "configuration_changes",
                    "signoz.audit.outcome": "success",
                },
                body="alice@acme.com created dashboard",
                event_name="signoz.audit.create",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=4),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-001",
                },
                attributes={
                    "signoz.principal.id": "user-001",
                    "signoz.principal.email": "alice@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.action_category": "configuration_changes",
                    "signoz.audit.outcome": "success",
                },
                body="alice@acme.com updated dashboard",
                event_name="signoz.audit.update",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=3),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-001",
                },
                attributes={
                    "signoz.principal.id": "user-002",
                    "signoz.principal.email": "viewer@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "delete",
                    "signoz.audit.action_category": "configuration_changes",
                    "signoz.audit.outcome": "failure",
                    "exception.type": "forbidden",
                },
                body="viewer@acme.com failed to delete dashboard",
                event_name="signoz.audit.delete",
                severity_text="ERROR",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=2),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "serviceaccount",
                    "signoz.resource.id": "sa-001",
                },
                attributes={
                    "signoz.principal.id": "sa-001",
                    "signoz.principal.type": "service_account",
                    "signoz.audit.verb": "create",
                    "signoz.audit.action_category": "access_control",
                    "signoz.audit.outcome": "success",
                },
                body="sa-001 created serviceaccount",
                event_name="signoz.audit.create",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "session",
                    "signoz.resource.id": "*",
                },
                attributes={
                    "signoz.principal.id": "user-001",
                    "signoz.principal.email": "alice@acme.com",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "create",
                    "signoz.audit.action_category": "access_control",
                    "signoz.audit.outcome": "success",
                },
                body="alice@acme.com created session",
                event_name="signoz.audit.create",
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
                filter_expression=filter_expression,
                order=[build_order_by("timestamp"), build_order_by("id")],
            ).to_dict()
        ],
        request_type="raw",
    )

    assert response.status_code == HTTPStatus.OK

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == expected_count

    actual_event_names = {row["data"]["event_name"] for row in rows}
    assert actual_event_names == expected_event_names


def test_audit_scalar_count_failures(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
) -> None:
    """Alert query — count multiple failures from different principals."""
    now = datetime.now(tz=UTC)
    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=3),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-100",
                },
                attributes={
                    "signoz.principal.id": "user-050",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "delete",
                    "signoz.audit.outcome": "failure",
                },
                body="user-050 failed to delete dashboard",
                event_name="signoz.audit.delete",
                severity_text="ERROR",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=2),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "alert-rule",
                    "signoz.resource.id": "alert-200",
                },
                attributes={
                    "signoz.principal.id": "user-060",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.outcome": "failure",
                },
                body="user-060 failed to update alert-rule",
                event_name="signoz.audit.update",
                severity_text="ERROR",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={
                    "service.name": "signoz",
                    "signoz.resource.kind": "dashboard",
                    "signoz.resource.id": "dash-100",
                },
                attributes={
                    "signoz.principal.id": "user-050",
                    "signoz.principal.type": "user",
                    "signoz.audit.verb": "update",
                    "signoz.audit.outcome": "success",
                },
                body="user-050 updated dashboard",
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
            build_scalar_query(
                name="A",
                signal="logs",
                source="audit",
                aggregations=[build_aggregation("count()")],
                filter_expression="signoz.audit.outcome = 'failure'",
            )
        ],
        request_type="scalar",
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    scalar_data = response.json()["data"]["data"]["results"][0].get("data", [])
    assert len(scalar_data) == 1
    assert scalar_data[0][0] == 2


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
