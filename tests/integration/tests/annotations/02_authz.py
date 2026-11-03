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
from fixtures.fs import get_testdata_file_path
from fixtures.logs import Logs
from fixtures.role import transaction_group
from fixtures.traces import Traces

ENDPOINT = "/api/v1/annotations"
user_password = "password123Z$"
users = {
    "metrics_only": ("annotations-metrics-only", "annotations-metrics-only@telemetry.test"),
    "traces_only": ("annotations-traces-only", "annotations-traces-only@telemetry.test"),
    "logs_only": ("annotations-logs-only", "annotations-logs-only@telemetry.test"),
    "both_wildcard": ("annotations-both-wildcard", "annotations-both-wildcard@telemetry.test"),
    "both_scoped": ("annotations-both-scoped", "annotations-both-scoped@telemetry.test"),
}


def test_setup(
    signoz: types.SigNoz,
    create_user_admin: types.Operation,  # pylint: disable=unused-argument
    make_http_mocks: Callable[[types.TestContainerDocker, list[Mapping]], None],
    get_token: Callable[[str, str], str],
    create_role: Callable[..., str],
) -> None:
    add_license(signoz, make_http_mocks, get_token)
    admin_token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    grants = {
        "metrics_only": [transaction_group("read", "telemetryresource", "metrics", ["builder_query/*"])],
        "traces_only": [transaction_group("read", "telemetryresource", "traces", ["builder_query/*"])],
        "logs_only": [transaction_group("read", "telemetryresource", "logs", ["builder_query/*"])],
        "both_wildcard": [
            transaction_group("read", "telemetryresource", "traces", ["builder_query/*"]),
            transaction_group("read", "telemetryresource", "logs", ["builder_query/*"]),
        ],
        "both_scoped": [
            transaction_group("read", "telemetryresource", "traces", ["builder_query/signoz.workspace.key.id/key-a"]),
            transaction_group("read", "telemetryresource", "logs", ["builder_query/signoz.workspace.key.id/key-a"]),
        ],
    }
    for name, (role, email) in users.items():
        create_role(admin_token, role, grants[name])
        user = create_active_user(signoz, admin_token, email=email, role="signoz-viewer", password=user_password)
        change_user_role(signoz, admin_token, user, "signoz-viewer", role)


@pytest.mark.parametrize(
    ("user", "expected"),
    [
        pytest.param("metrics_only", HTTPStatus.FORBIDDEN, id="metrics_only_denied"),
        pytest.param("traces_only", HTTPStatus.FORBIDDEN, id="traces_only_denied"),
        pytest.param("logs_only", HTTPStatus.FORBIDDEN, id="logs_only_denied"),
        pytest.param("both_wildcard", HTTPStatus.OK, id="both_wildcard_allowed"),
        pytest.param("both_scoped", HTTPStatus.FORBIDDEN, id="both_scoped_unfiltered_denied"),
        pytest.param("admin", HTTPStatus.OK, id="admin_allowed"),
        pytest.param(None, HTTPStatus.UNAUTHORIZED, id="anonymous"),
    ],
)
def test_list_route(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    user: str | None,
    expected: HTTPStatus,
) -> None:
    """The route declares traces and logs read; a grant on only one signal is denied."""
    now = datetime.now(tz=UTC)
    headers = {}
    if user == "admin":
        headers["Authorization"] = f"Bearer {get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)}"
    elif user is not None:
        headers["Authorization"] = f"Bearer {get_token(users[user][1], user_password)}"
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        json={"kind": "deployment", "start": int((now - timedelta(minutes=10)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 10},
        headers=headers,
        timeout=10,
    )
    assert response.status_code == expected, response.text


@pytest.mark.parametrize("user", ["metrics_only", "traces_only", "logs_only"])
def test_denied_message_names_wildcard(
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    user: str,
) -> None:
    now = datetime.now(tz=UTC)
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        json={"kind": "deployment", "start": int((now - timedelta(minutes=10)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 10},
        headers={"Authorization": f"Bearer {get_token(users[user][1], user_password)}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.FORBIDDEN, response.text
    assert "builder_query/*" in response.text


@pytest.mark.parametrize(
    ("user", "expression", "expected", "expected_markers"),
    [
        pytest.param("both_scoped", "signoz.workspace.key.id = 'key-a'", HTTPStatus.OK, {("checkout", "1.1.0"), ("tieA", "4.0.0"), ("tieB", "4.0.0"), ("sp`ec'ial", "5.0.0$0")}, id="scoped_granted_key"),
        pytest.param("both_scoped", "signoz.workspace.key.id = 'key-b'", HTTPStatus.FORBIDDEN, set(), id="scoped_other_key"),
        pytest.param("both_scoped", "signoz.workspace.key.id IN ('key-a', 'key-b')", HTTPStatus.FORBIDDEN, set(), id="scoped_both_keys"),
        pytest.param("both_scoped", "signoz.workspace.key.id = 'key-a' AND k8s.namespace.name = 'shop'", HTTPStatus.OK, {("checkout", "1.1.0"), ("tieA", "4.0.0"), ("tieB", "4.0.0"), ("sp`ec'ial", "5.0.0$0")}, id="scoped_granted_key_with_extra_filter"),
        pytest.param("both_wildcard", None, HTTPStatus.OK, {("checkout", "1.1.0"), ("cart", "2.0.0"), ("worker", "3.0.0"), ("tieA", "4.0.0"), ("tieB", "4.0.0"), ("api", "6.0.0"), ("sp`ec'ial", "5.0.0$0")}, id="wildcard_unfiltered"),
    ],
)
def test_scoped_read(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    signoz: types.SigNoz,
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    insert_logs: Callable[[list[Logs]], None],
    user: str,
    expression: str | None,
    expected: HTTPStatus,
    expected_markers: set[tuple[str, str]],
) -> None:
    """A key-scoped grant on both signals passes only when the filter pins that key, and
    the response then carries only that key's markers from either signal."""
    now = datetime.now(tz=UTC).replace(microsecond=0)
    insert_traces(Traces.load_from_file(get_testdata_file_path("annotations/traces.jsonl"), base_time=now - timedelta(hours=3)))
    insert_logs(Logs.load_from_file(get_testdata_file_path("annotations/logs.jsonl"), base_time=now - timedelta(hours=3)))

    body: dict = {"kind": "deployment", "start": int((now - timedelta(hours=1)).timestamp() * 1000), "end": int(now.timestamp() * 1000), "limit": 50}
    if expression:
        body["filter"] = {"expression": expression}
    response = requests.post(
        signoz.self.host_configs["8080"].get(ENDPOINT),
        json=body,
        headers={"Authorization": f"Bearer {get_token(users[user][1], user_password)}"},
        timeout=10,
    )
    assert response.status_code == expected, response.text
    if expected == HTTPStatus.OK:
        assert {(r["spec"]["service"], r["spec"]["version"]) for r in response.json()["data"]["records"]} == expected_markers
