from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests
from wiremock.resources.mappings import Mapping

from fixtures import types
from fixtures.auth import (
    USER_ADMIN_EMAIL,
    USER_ADMIN_PASSWORD,
    add_license,
    change_user_role,
    create_active_user,
)
from fixtures.logs import Logs
from fixtures.querier import build_raw_query, get_column_data_from_response, make_query_request
from fixtures.role import transaction_group

user_password = "password123Z$"
scoped_role = "telemetry-scope-key-a"
scoped_email = "scope-key-a@telemetry.test"


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)

    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    create_role(
        admin_token,
        scoped_role,
        [
            transaction_group("read", "telemetryresource", "logs", ["builder_query/signoz.workspace.key.id/key-a"]),
            transaction_group("read", "telemetryresource", "traces", ["builder_query/signoz.workspace.key.id/key-a"]),
        ],
    )
    user_id = create_active_user(signoz, admin_token, email=scoped_email, role="VIEWER", password=user_password)
    change_user_role(signoz, admin_token, user_id, "signoz-viewer", scoped_role)


@pytest.mark.parametrize(
    "selector",
    [
        "signoz.workspace.key.id = 'key-a'",  # expression form, not the wire form
        "unknown_query_type/signoz.workspace.key.id/key-a",  # unsupported query type
        "builder_query/service.name/frontend",  # service.name is not a supported grant key
        "*/signoz.workspace.key.id/key-a",  # non-prefix wildcard
        "builder_query/signoz.workspace.key.id/",  # empty value
        "builder_query/signoz.workspace.key.id",  # missing value, not a wildcard
        "clickhouse_sql/signoz.workspace.key.id/key-a",  # clickhouse_sql does not support key-scoped selectors
    ],
)
def test_invalid_telemetry_selector_rejected(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    selector: str,
) -> None:
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v1/roles"),
        json={
            "name": "telemetry-invalid-selector",
            "transactionGroups": [transaction_group("read", "telemetryresource", "logs", [selector])],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=5,
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


@pytest.mark.parametrize(
    "expression",
    [
        "signoz.workspace.key.id = 'key-a'",
        "signoz.workspace.key.id IN ('key-a')",
        "resource.signoz.workspace.key.id = 'key-a'",
        "signoz.workspace.key.id = 'key-a' AND severity_text = 'ERROR'",
    ],
)
def test_allowed(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
) -> None:
    now = datetime.now(tz=UTC)
    # Seed a key-a log so the resource-attribute key resolves; without any
    # ingested data the querier rejects the filter with "key not found".
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources={"signoz.workspace.key.id": "key-a"}, body="key-a-0")])

    response = make_query_request(
        signoz,
        get_token(scoped_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=expression)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text


@pytest.mark.parametrize(
    "expression",
    [
        None,  # no filter
        "signoz.workspace.key.id = 'key-b'",
        "signoz.workspace.key.id IN ('key-a', 'key-b')",
        "signoz.workspace.key.id = 'key-a' OR severity_text = 'ERROR'",
        "NOT signoz.workspace.key.id = 'key-a'",
        "signoz.workspace.key.id != 'key-b'",
        # Same result set as IN ('key-a','key-b'), but the OR spelling is not
        # yet recognized as a bounded set, so it is denied today. This flips to
        # allowed-with-both-grants once the where-clause bound evaluation lands.
        "signoz.workspace.key.id = 'key-a' OR signoz.workspace.key.id = 'key-b'",
    ],
)
def test_denied(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    expression: str | None,
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(scoped_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression=expression)],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert "not authorized" in response.text


def test_denied_message_names_resource(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
) -> None:
    now = datetime.now(tz=UTC)
    response = make_query_request(
        signoz,
        get_token(scoped_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression="signoz.workspace.key.id = 'key-b'")],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert "builder_query/signoz.workspace.key.id/key-b" in response.text


def test_variables_resolve_into_gate(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources={"signoz.workspace.key.id": "key-a"}, body="key-a-0")])
    start, end = int((now - timedelta(minutes=10)).timestamp() * 1000), int(now.timestamp() * 1000)
    token = get_token(scoped_email, user_password)

    allowed = make_query_request(
        signoz,
        token,
        start,
        end,
        [build_raw_query("A", "logs", limit=50, filter_expression="signoz.workspace.key.id = $key")],
        request_type="raw",
        variables={"key": {"value": "key-a"}},
    )
    assert allowed.status_code == HTTPStatus.OK, allowed.text

    denied = make_query_request(
        signoz,
        token,
        start,
        end,
        [build_raw_query("A", "logs", limit=50, filter_expression="signoz.workspace.key.id = $key")],
        request_type="raw",
        variables={"key": {"value": "key-b"}},
    )
    assert denied.status_code == HTTPStatus.FORBIDDEN, denied.text


def test_returns_only_scoped_rows(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"signoz.workspace.key.id": "key-a"}, body=f"key-a-{i}") for i in range(3)] + [Logs(timestamp=now - timedelta(seconds=i + 1), resources={"signoz.workspace.key.id": "key-b"}, body=f"key-b-{i}") for i in range(3)])

    response = make_query_request(
        signoz,
        get_token(scoped_email, user_password),
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int(now.timestamp() * 1000),
        [build_raw_query("A", "logs", limit=50, filter_expression="signoz.workspace.key.id = 'key-a'")],
        request_type="raw",
    )
    assert response.status_code == HTTPStatus.OK, response.text
    bodies = get_column_data_from_response(response.json(), "body")
    assert bodies, "expected rows for key-a"
    assert all(body.startswith("key-a") for body in bodies), bodies
