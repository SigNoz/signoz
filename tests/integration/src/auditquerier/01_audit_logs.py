"""Integration tests for audit log querying via /api/v5/query_range.

Tests verify that audit events inserted directly into signoz_audit ClickHouse
tables can be queried back through the standard query_range API with
signal=logs, source=audit.

Each test maps to a real user query pattern from the audit logs design doc.
"""

from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import pytest

from fixtures import types
from fixtures.audit import AuditLog
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    BuilderQuery,
    build_logs_aggregation,
    build_order_by,
    build_scalar_query,
    make_query_request,
)


def _insert_standard_audit_events(
    insert_audit_logs: Callable[[List[AuditLog]], None],
) -> None:
    """Insert a representative set of audit events for testing."""
    now = datetime.now(tz=timezone.utc)

    insert_audit_logs(
        [
            AuditLog(
                timestamp=now - timedelta(seconds=5),
                resources={
                    "service.name": "signoz",
                    "service.version": "0.90.0",
                    "signoz.audit.resource.kind": "dashboard",
                    "signoz.audit.resource.id": "dash-001",
                },
                attributes={
                    "signoz.audit.principal.id": "user-001",
                    "signoz.audit.principal.email": "alice@acme.com",
                    "signoz.audit.principal.type": "user",
                    "signoz.audit.principal.org_id": "org-001",
                    "signoz.audit.action": "create",
                    "signoz.audit.action_category": "configuration_change",
                    "signoz.audit.outcome": "success",
                },
                body="alice@acme.com (user-001) created dashboard (dash-001)",
                event_name="dashboard.created",
                severity_text="INFO",
                scope_name="signoz.audit",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=4),
                resources={
                    "service.name": "signoz",
                    "service.version": "0.90.0",
                    "signoz.audit.resource.kind": "dashboard",
                    "signoz.audit.resource.id": "dash-001",
                },
                attributes={
                    "signoz.audit.principal.id": "user-001",
                    "signoz.audit.principal.email": "alice@acme.com",
                    "signoz.audit.principal.type": "user",
                    "signoz.audit.principal.org_id": "org-001",
                    "signoz.audit.action": "update",
                    "signoz.audit.action_category": "configuration_change",
                    "signoz.audit.outcome": "success",
                },
                body="alice@acme.com (user-001) updated dashboard (dash-001)",
                event_name="dashboard.updated",
                severity_text="INFO",
                scope_name="signoz.audit",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=3),
                resources={
                    "service.name": "signoz",
                    "service.version": "0.90.0",
                    "signoz.audit.resource.kind": "dashboard",
                    "signoz.audit.resource.id": "dash-001",
                },
                attributes={
                    "signoz.audit.principal.id": "user-002",
                    "signoz.audit.principal.email": "viewer@acme.com",
                    "signoz.audit.principal.type": "user",
                    "signoz.audit.principal.org_id": "org-001",
                    "signoz.audit.action": "delete",
                    "signoz.audit.action_category": "configuration_change",
                    "signoz.audit.outcome": "failure",
                    "signoz.audit.error.type": "forbidden",
                    "signoz.audit.error.code": "authz_forbidden",
                },
                body="viewer@acme.com (user-002) failed to delete dashboard (dash-001): forbidden (authz_forbidden)",
                event_name="dashboard.deleted",
                severity_text="ERROR",
                scope_name="signoz.audit",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=2),
                resources={
                    "service.name": "signoz",
                    "service.version": "0.90.0",
                    "signoz.audit.resource.kind": "serviceaccount",
                    "signoz.audit.resource.id": "sa-001",
                },
                attributes={
                    "signoz.audit.principal.id": "sa-001",
                    "signoz.audit.principal.email": "",
                    "signoz.audit.principal.type": "service_account",
                    "signoz.audit.principal.org_id": "org-001",
                    "signoz.audit.action": "create",
                    "signoz.audit.action_category": "access_control",
                    "signoz.audit.outcome": "success",
                },
                body="sa-001 created serviceaccount (sa-001)",
                event_name="serviceaccount.apikey.created",
                severity_text="INFO",
                scope_name="signoz.audit",
            ),
            AuditLog(
                timestamp=now - timedelta(seconds=1),
                resources={
                    "service.name": "signoz",
                    "service.version": "0.90.0",
                    "signoz.audit.resource.kind": "session",
                    "signoz.audit.resource.id": "*",
                },
                attributes={
                    "signoz.audit.principal.id": "user-001",
                    "signoz.audit.principal.email": "alice@acme.com",
                    "signoz.audit.principal.type": "user",
                    "signoz.audit.principal.org_id": "org-001",
                    "signoz.audit.action": "login",
                    "signoz.audit.action_category": "access_control",
                    "signoz.audit.outcome": "success",
                },
                body="alice@acme.com (user-001) login session (*)",
                event_name="session.login",
                severity_text="INFO",
                scope_name="signoz.audit",
            ),
        ]
    )


def test_audit_list_all(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[List[AuditLog]], None],
) -> None:
    """List all audit events — verify correct count and ordering."""
    _insert_standard_audit_events(insert_audit_logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
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

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    rows = results[0]["rows"]
    assert len(rows) == 5

    assert rows[0]["data"]["event_name"] == "session.login"
    assert rows[4]["data"]["event_name"] == "dashboard.created"


@pytest.mark.parametrize(
    "filter_expression,expected_count,expected_event_names",
    [
        pytest.param(
            "signoz.audit.principal.id = 'user-001'",
            3,
            {"session.login", "dashboard.updated", "dashboard.created"},
            id="filter_by_principal_id",
        ),
        pytest.param(
            "signoz.audit.outcome = 'failure'",
            1,
            {"dashboard.deleted"},
            id="filter_by_outcome_failure",
        ),
        pytest.param(
            "signoz.audit.resource.kind = 'dashboard'"
            " AND signoz.audit.resource.id = 'dash-001'",
            3,
            {"dashboard.deleted", "dashboard.updated", "dashboard.created"},
            id="filter_by_resource_kind_and_id",
        ),
        pytest.param(
            "signoz.audit.principal.type = 'service_account'",
            1,
            {"serviceaccount.apikey.created"},
            id="filter_by_principal_type",
        ),
        pytest.param(
            "signoz.audit.resource.kind = 'dashboard'"
            " AND signoz.audit.action = 'delete'",
            1,
            {"dashboard.deleted"},
            id="filter_by_resource_kind_and_action",
        ),
    ],
)
def test_audit_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[List[AuditLog]], None],
    filter_expression: str,
    expected_count: int,
    expected_event_names: set,
) -> None:
    """Parametrized audit filter tests covering the documented query patterns."""
    _insert_standard_audit_events(insert_audit_logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
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
    insert_audit_logs: Callable[[List[AuditLog]], None],
) -> None:
    """Q6: Alert query — count failed actions (scalar aggregation)."""
    _insert_standard_audit_events(insert_audit_logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
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
                aggregations=[build_logs_aggregation("count()")],
                filter_expression="signoz.audit.outcome = 'failure'",
            )
        ],
        request_type="scalar",
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"

    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1

    scalar_data = results[0].get("data", [])
    assert len(scalar_data) == 1
    assert scalar_data[0][0] == 1


def test_audit_does_not_leak_into_logs(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[List[AuditLog]], None],
) -> None:
    """Audit data in signoz_audit must not appear when querying signal=logs without source=audit."""
    _insert_standard_audit_events(insert_audit_logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    now = datetime.now(tz=timezone.utc)
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

    audit_bodies = [
        row["data"]["body"]
        for row in rows
        if "signoz.audit"
        in row["data"].get("attributes_string", {}).get("signoz.audit.action", "")
    ]
    assert len(audit_bodies) == 0
