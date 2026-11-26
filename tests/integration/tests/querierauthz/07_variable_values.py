from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD, change_user_role, create_active_user
from fixtures.role import transaction_group

user_password = "password123Z$"
reader_role = "variables-telemetry-reader"
reader_email = "variables-reader@telemetry.test"
dashboard_only_role = "variables-dashboard-only"
dashboard_only_email = "variables-dashboard-only@telemetry.test"
viewer_email = "variables-viewer@telemetry.test"

now = datetime.now(tz=UTC)
substitute_vars_body = {
    "schemaVersion": "v1",
    "start": int((now - timedelta(hours=1)).timestamp() * 1000),
    "end": int(now.timestamp() * 1000),
    "requestType": "time_series",
    "compositeQuery": {
        "queries": [
            {
                "type": "builder_query",
                "spec": {"name": "A", "signal": "traces", "aggregations": [{"expression": "count()"}], "filter": {"expression": "service.name = $service"}},
            }
        ]
    },
    "variables": {"service": {"type": "dynamic", "value": "frontend"}},
}


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    dashboard_grants = [transaction_group("read", "metaresource", "dashboard", ["*"]), transaction_group("list", "metaresource", "dashboard", ["*"])]

    create_role(
        admin_token,
        reader_role,
        dashboard_grants
        + [
            transaction_group("read", "telemetryresource", "logs", ["*"]),
            transaction_group("read", "telemetryresource", "traces", ["*"]),
            transaction_group("read", "telemetryresource", "metrics", ["*"]),
            transaction_group("read", "telemetryresource", "meter-metrics", ["*"]),
        ],
    )
    reader_user = create_active_user(signoz, admin_token, email=reader_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, reader_user, "signoz-viewer", reader_role)

    create_role(admin_token, dashboard_only_role, dashboard_grants)
    dashboard_only_user = create_active_user(signoz, admin_token, email=dashboard_only_email, role="signoz-viewer", password=user_password)
    change_user_role(signoz, admin_token, dashboard_only_user, "signoz-viewer", dashboard_only_role)

    create_active_user(signoz, admin_token, email=viewer_email, role="signoz-viewer", password=user_password)


@pytest.mark.parametrize(
    ("method", "path", "params", "body"),
    [
        ("GET", "/api/v1/fields/values", {"signal": "traces", "name": "service.name"}, None),
        ("GET", "/api/v1/fields/values", {"name": "service.name"}, None),
        ("GET", "/api/v1/fields/keys", {"signal": "logs"}, None),
        ("POST", "/api/v5/substitute_vars", None, substitute_vars_body),
        ("POST", "/api/v2/variables/query", None, {"query": "SELECT 'frontend' AS service", "variables": {}}),
    ],
    ids=["dynamic_values_traces", "dynamic_values_all_signals", "field_keys_logs", "substitute_vars", "clickhouse_variable"],
)
@pytest.mark.parametrize(
    ("email", "expected"),
    [
        (reader_email, HTTPStatus.OK),
        (dashboard_only_email, HTTPStatus.FORBIDDEN),
        (viewer_email, HTTPStatus.OK),
        (USER_ADMIN_EMAIL, HTTPStatus.OK),
    ],
    ids=["telemetry_reader", "dashboard_only", "viewer", "admin"],
)
def test_variable_routes_follow_telemetry_grants(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    method: str,
    path: str,
    params: dict | None,
    body: dict | None,
    email: str,
    expected: HTTPStatus,
) -> None:
    token = get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)

    response = requests.request(
        method,
        signoz.self.host_configs["8080"].get(path),
        params=params,
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.FORBIDDEN:
        assert "is not authorized to perform" in response.text, response.text


@pytest.mark.parametrize(
    ("email", "expected"),
    [(USER_ADMIN_EMAIL, HTTPStatus.OK), (reader_email, HTTPStatus.FORBIDDEN), (viewer_email, HTTPStatus.FORBIDDEN)],
    ids=["admin", "telemetry_reader", "viewer"],
)
def test_audit_field_keys_need_audit_grant(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    email: str,
    expected: HTTPStatus,
) -> None:
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        params={"signal": "logs", "source": "audit"},
        headers={"Authorization": f"Bearer {get_token(email, USER_ADMIN_PASSWORD if email == USER_ADMIN_EMAIL else user_password)}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
