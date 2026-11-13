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


@pytest.mark.parametrize(
    "filter_expression,expected_bodies",
    [
        pytest.param("signoz.principal.id = 'user-001'", {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD, ALICE_UPDATED_USER}, id="equal"),
        pytest.param("signoz.audit.verb != 'update'", {ALICE_CREATED_DASHBOARD, VIEWER_FAILED_DELETE_DASHBOARD, SA_CREATED_ALERT_RULE}, id="not_equal"),
        pytest.param("signoz.audit.verb IN ['create', 'delete']", {ALICE_CREATED_DASHBOARD, VIEWER_FAILED_DELETE_DASHBOARD, SA_CREATED_ALERT_RULE}, id="in_list"),
        pytest.param("signoz.resource.kind NOT IN ['dashboard']", {SA_CREATED_ALERT_RULE, ALICE_UPDATED_USER}, id="not_in_list"),
        pytest.param("signoz.resource.kind = 'dashboard' AND signoz.resource.id = 'dash-001'", {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD, VIEWER_FAILED_DELETE_DASHBOARD}, id="and"),
        pytest.param("signoz.audit.outcome = 'failure' OR signoz.principal.type = 'service_account'", {VIEWER_FAILED_DELETE_DASHBOARD, SA_CREATED_ALERT_RULE}, id="or"),
        pytest.param("NOT signoz.resource.kind = 'dashboard'", {SA_CREATED_ALERT_RULE, ALICE_UPDATED_USER}, id="not"),
        pytest.param("signoz.resource.kind = 'dashboard' AND (signoz.audit.verb = 'create' OR signoz.audit.verb = 'delete')", {ALICE_CREATED_DASHBOARD, VIEWER_FAILED_DELETE_DASHBOARD}, id="and_with_grouped_or"),
        pytest.param("exception.type EXISTS", {VIEWER_FAILED_DELETE_DASHBOARD}, id="exists"),
        pytest.param("exception.type NOT EXISTS", {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD, SA_CREATED_ALERT_RULE, ALICE_UPDATED_USER}, id="not_exists"),
        pytest.param("body CONTAINS 'failed'", {VIEWER_FAILED_DELETE_DASHBOARD}, id="contains"),
        pytest.param("body NOT CONTAINS 'dashboard'", {SA_CREATED_ALERT_RULE, ALICE_UPDATED_USER}, id="not_contains"),
        pytest.param("body LIKE '%failed%'", {VIEWER_FAILED_DELETE_DASHBOARD}, id="like"),
        pytest.param("body ILIKE '%ALERT-RULE%'", {SA_CREATED_ALERT_RULE}, id="ilike"),
        pytest.param("body REGEXP '^sa-001'", {SA_CREATED_ALERT_RULE}, id="regexp"),
        pytest.param("signoz.audit.fields_changed > 5", {ALICE_UPDATED_DASHBOARD, SA_CREATED_ALERT_RULE}, id="gt_number"),
        pytest.param("signoz.audit.fields_changed <= 8", {ALICE_CREATED_DASHBOARD, ALICE_UPDATED_DASHBOARD}, id="lte_number"),
    ],
)
def test_audit_filter_operators(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_audit_logs: Callable[[list[AuditLog]], None],
    filter_expression: str,
    expected_bodies: set[str],
) -> None:
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
