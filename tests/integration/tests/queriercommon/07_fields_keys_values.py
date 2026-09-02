from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.traces import Traces


def test_fields_keys_log_context_returns_intrinsic_log_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Insert a log with a string attribute.

    Tests:
    1. Keys for the log context are the intrinsic log columns; the attribute is not among them.
    """
    insert_logs([Logs(timestamp=datetime.now(tz=UTC), attributes={"code.file": "/opt/integration.go"}, body="a log line")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "logs", "fieldContext": "log"},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert keys["severity_text"][0]["fieldContext"] == "log", "intrinsic log columns must be listed for the log context"
    assert keys["body"][0]["fieldContext"] == "log", "intrinsic log columns must be listed for the log context"
    assert "code.file" not in keys, "attribute keys do not belong to the log context"
    assert "scope_name" not in keys, "scope intrinsics do not belong to the log context"


def test_fields_keys_span_context_returns_span_fields_and_attributes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Insert a span with an http.method attribute.

    Tests:
    1. Keys for the span context are the intrinsic and calculated span columns, typed, plus the
       span attributes: `span.<attribute>` resolves attributes in queries, so the lookup must
       keep returning them.
    """
    insert_traces([Traces(timestamp=datetime.now(tz=UTC), attributes={"http.method": "GET"})])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "traces", "fieldContext": "span"},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert keys["name"][0]["fieldContext"] == "span", "intrinsic span columns must be listed for the span context"
    assert keys["has_error"][0]["fieldDataType"] == "bool", "calculated span columns must be listed with their type"
    assert keys["isRoot"][0]["fieldDataType"] == "bool", "span scope selectors must carry a type"
    assert keys["http.method"][0]["fieldContext"] == "attribute", "span attributes must stay resolvable through the span context"
    assert "scope.name" not in keys, "scope intrinsics do not belong to the span context"


def test_fields_keys_resource_context_excludes_span_intrinsics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Setup:
    Insert a span with a host.name resource attribute.

    Tests:
    1. A resource-context search for "name" returns the resource key but not the span intrinsic `name`.
    """
    insert_traces([Traces(timestamp=datetime.now(tz=UTC), resources={"host.name": "linux-001"})])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "traces", "fieldContext": "resource", "searchText": "name"},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert keys["host.name"][0]["fieldContext"] == "resource"
    assert "name" not in keys, "span intrinsics do not belong to the resource context"


def test_fields_keys_search_matches_intrinsics_case_insensitively(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Tests:
    1. An upper-case search text still matches the lower-case intrinsic column, as it does for stored keys.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "logs", "searchText": "SEVERITY"},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert "severity_text" in keys, "intrinsic search must be case-insensitive"
    assert "severity_number" in keys, "intrinsic search must be case-insensitive"


def test_fields_keys_numeric_type_filter_matches_number_intrinsics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Tests:
    1. Asking for float64 keys in the span context returns the numeric intrinsics, which declare the number type.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "traces", "fieldContext": "span", "fieldDataType": "float64"},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert "duration_nano" in keys, "number intrinsics must match a float64 type filter"
    assert "name" not in keys, "string intrinsics must not match a float64 type filter"


def test_fields_values_bool_span_field_returns_true_and_false(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Tests:
    1. Values for the calculated bool span field has_error are true and false, without any data.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "traces", "name": "has_error"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"]["boolValues"] == [True, False]
    assert response.json()["data"]["complete"] is True


def test_fields_values_bool_attribute_returns_true_and_false(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Insert a log with a bool attribute.

    Tests:
    1. Values for the bool attribute are true and false even though the tag table stores no value for bools.
    """
    insert_logs([Logs(timestamp=datetime.now(tz=UTC), attributes={"retry": True}, body="retrying")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "logs", "name": "retry"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"]["boolValues"] == [True, False]


def test_fields_values_start_excludes_values_not_seen_since(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    Insert one log three days old and one log now, with different service names.

    Tests:
    1. Values with startUnixMilli an hour ago contain only the service seen now.
    2. Values without a start contain both services.
    """
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(timestamp=now - timedelta(days=3), resources={"service.name": "archived-service"}, body="old"),
            Logs(timestamp=now, resources={"service.name": "live-service"}, body="new"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": "logs",
            "name": "service.name",
            "startUnixMilli": int((now - timedelta(hours=1)).timestamp() * 1000),
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"]["stringValues"] == ["live-service"], "values last seen before the start must be dropped"

    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": "logs", "name": "service.name"},
    )

    assert response.status_code == HTTPStatus.OK
    assert set(response.json()["data"]["values"]["stringValues"]) == {"archived-service", "live-service"}
