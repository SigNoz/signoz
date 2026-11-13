from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.audit import (
    ALICE_CREATED_DASHBOARD,
    ALICE_UPDATED_DASHBOARD,
    ALICE_UPDATED_USER,
    SA_CREATED_ALERT_RULE,
    VIEWER_FAILED_DELETE_DASHBOARD,
    AuditLog,
    sample_audit_logs,
)
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import BuilderQuery, build_order_by, make_query_request

ALL_SAMPLE_BODIES = {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD, VIEWER_FAILED_DELETE_DASHBOARD, SA_CREATED_ALERT_RULE, ALICE_UPDATED_USER}
BARE_SCOPE_KEYS_SKIP = pytest.mark.skip(reason="bare scope_name and scope_version resolve to attributes in the audit schema; only the scope. prefix reaches the scope column")


@pytest.mark.parametrize(
    "filter_expression,expected_bodies",
    [
        pytest.param("signoz.resource.id = 'alert-001'", {SA_CREATED_ALERT_RULE}, id="resource_key_bare"),
        pytest.param("resource.signoz.resource.id = 'alert-001'", {SA_CREATED_ALERT_RULE}, id="resource_key_prefixed"),
        pytest.param("signoz.principal.email = 'alice@acme.com'", {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD, ALICE_UPDATED_USER}, id="attribute_key_bare"),
        pytest.param("attribute.signoz.principal.email = 'alice@acme.com'", {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD, ALICE_UPDATED_USER}, id="attribute_key_prefixed"),
        pytest.param("severity_text = 'ERROR'", {VIEWER_FAILED_DELETE_DASHBOARD}, id="intrinsic_key_bare"),
        pytest.param("log.severity_text = 'ERROR'", {VIEWER_FAILED_DELETE_DASHBOARD}, id="intrinsic_key_prefixed"),
        pytest.param("event_name = 'signoz.audit.create'", {ALICE_CREATED_DASHBOARD, SA_CREATED_ALERT_RULE}, id="intrinsic_event_name"),
        pytest.param("scope.name = 'signoz.audit'", ALL_SAMPLE_BODIES, id="scope_name_prefixed"),
        pytest.param("scope.name = 'other'", set(), id="scope_name_prefixed_no_match"),
        pytest.param("scope.version = '2.0.0'", {ALICE_UPDATED_USER}, id="scope_version_prefixed"),
        pytest.param("scope_name = 'signoz.audit'", ALL_SAMPLE_BODIES, marks=BARE_SCOPE_KEYS_SKIP, id="scope_name_bare"),
        pytest.param("scope_version = '2.0.0'", {ALICE_UPDATED_USER}, marks=BARE_SCOPE_KEYS_SKIP, id="scope_version_bare"),
    ],
)
def test_audit_filter_by_field_context(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
    filter_expression: str,
    expected_bodies: set[str],
) -> None:
    """A bare key resolves to the resource column for the keys the audit writer emits, to a built-in column for intrinsics, and to attributes otherwise; a context prefix pins it."""
    now = datetime.now(tz=UTC)
    insert_audit_logs(sample_audit_logs(now))
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
