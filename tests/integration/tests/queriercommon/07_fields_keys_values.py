from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.traces import Traces


@pytest.mark.parametrize(
    "signal,field_context,present,absent",
    [
        pytest.param("logs", "log", {"severity_text": "log", "body": "log", "trace_id": "log"}, ["code.file", "scope_name"], id="log_context_lists_log_intrinsics"),
        pytest.param("logs", "scope", {"scope_name": "scope", "scope_version": "scope"}, ["severity_text", "body", "code.file"], id="scope_context_lists_scope_intrinsics_for_logs"),
        pytest.param("logs", "attribute", {"code.file": "attribute"}, ["body", "scope_name"], id="attribute_context_excludes_log_intrinsics"),
        pytest.param("traces", "span", {"name": "span", "has_error": "span", "isRoot": "span", "http.method": "attribute"}, ["scope.name"], id="span_context_lists_span_intrinsics_and_attributes"),
        pytest.param("traces", "scope", {"scope.name": "scope", "scope.version": "scope"}, ["name", "has_error", "isRoot"], id="scope_context_lists_scope_intrinsics_for_traces"),
        pytest.param("traces", "resource", {"host.name": "resource"}, ["name", "has_error", "isRoot", "http.method"], id="resource_context_excludes_span_intrinsics"),
        pytest.param("traces", "attribute", {"http.method": "attribute"}, ["name", "has_error", "isRoot", "host.name"], id="attribute_context_excludes_span_intrinsics"),
    ],
)
def test_fields_keys_by_context(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
    signal: str,
    field_context: str,
    present: dict[str, str],
    absent: list[str],
) -> None:
    """
    Setup:
    Insert a log with a code.file attribute and a span with an http.method attribute and a host.name resource.

    Tests:
    1. Keys for a context list that context's intrinsic columns and the stored keys the context maps to,
       each with its context; intrinsics of other contexts are not listed. The span context also keeps
       listing attributes because `span.<attribute>` resolves attributes in queries.
    """
    now = datetime.now(tz=UTC)
    insert_logs([Logs(timestamp=now, attributes={"code.file": "/opt/integration.go"}, body="a log line")])
    insert_traces([Traces(timestamp=now, resources={"host.name": "linux-001"}, attributes={"http.method": "GET"})])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": signal, "fieldContext": field_context},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    listed = {name: [key["fieldContext"] for key in keys.get(name, [])] for name in present}
    assert listed == {name: [context] for name, context in present.items()}, f"keys for the {field_context} context"
    assert [name for name in absent if name in keys] == [], f"keys that do not belong to the {field_context} context"


@pytest.mark.parametrize(
    "signal,field_context,field_data_type,present,absent",
    [
        pytest.param("traces", "span", "float64", ["duration_nano", "status_code"], ["name", "has_error"], id="float64_matches_number_span_intrinsics"),
        pytest.param("traces", "span", "int64", ["duration_nano", "status_code"], ["name", "has_error"], id="int64_matches_number_span_intrinsics"),
        pytest.param("traces", "span", "bool", ["has_error", "isRoot", "isEntryPoint"], ["name", "duration_nano"], id="bool_matches_bool_span_intrinsics"),
        pytest.param("traces", "span", "string", ["name", "http_method"], ["duration_nano", "has_error"], id="string_matches_string_span_intrinsics"),
        pytest.param("logs", "log", "number", ["severity_number", "trace_flags"], ["severity_text", "body"], id="number_matches_number_log_intrinsics"),
    ],
)
def test_fields_keys_by_data_type(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    signal: str,
    field_context: str,
    field_data_type: str,
    present: list[str],
    absent: list[str],
) -> None:
    """
    Tests:
    1. A data type filter keeps the intrinsic columns of that type; number, int64 and float64 are one family.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": signal, "fieldContext": field_context, "fieldDataType": field_data_type},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert [name for name in present if name not in keys] == [], f"intrinsics of type {field_data_type}"
    assert [name for name in absent if name in keys] == [], f"intrinsics not of type {field_data_type}"


@pytest.mark.parametrize(
    "signal,search_text,present",
    [
        pytest.param("logs", "SEVERITY", ["severity_text", "severity_number"], id="upper_case_search_logs"),
        pytest.param("traces", "HTTP_", ["http_method", "http_host", "http_url"], id="upper_case_search_traces"),
        pytest.param("traces", "Duration", ["duration_nano"], id="mixed_case_search_traces"),
        pytest.param("traces", "span.HAS_ERR", ["has_error"], id="context_prefix_with_upper_case_search"),
    ],
)
def test_fields_keys_search_matches_intrinsics_case_insensitively(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    signal: str,
    search_text: str,
    present: list[str],
) -> None:
    """
    Tests:
    1. The search text matches intrinsic columns case-insensitively, as it does for stored keys,
       with or without a context prefix.
    """
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/keys"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": signal, "searchText": search_text},
    )

    assert response.status_code == HTTPStatus.OK
    keys = response.json()["data"]["keys"]
    assert [name for name in present if name not in keys] == [], f"intrinsics matching {search_text!r}"


@pytest.mark.parametrize(
    "signal,params,expected",
    [
        pytest.param("traces", {"name": "has_error"}, [True, False], id="calculated_bool_span_field"),
        pytest.param("traces", {"name": "has_error", "fieldContext": "span"}, [True, False], id="calculated_bool_span_field_with_context"),
        pytest.param("traces", {"name": "has_error", "searchText": "tr"}, [True], id="search_text_narrows_bool_values"),
        pytest.param("logs", {"name": "retry"}, [True, False], id="bool_attribute_from_tag_rows"),
        pytest.param("logs", {"name": "retry", "fieldContext": "attribute"}, [True, False], id="bool_attribute_with_context"),
        pytest.param("logs", {"name": "never_seen", "fieldDataType": "bool"}, [True, False], id="declared_bool_type_needs_no_rows"),
    ],
)
def test_fields_values_bool_fields(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    signal: str,
    params: dict[str, str],
    expected: list[bool],
) -> None:
    """
    Setup:
    Insert a log with a bool attribute.

    Tests:
    1. Values for a bool field are true and false (narrowed by the search text): for the calculated span
       field, for a stored bool attribute whose tag rows carry no value, and for a key the caller declares bool.
    """
    insert_logs([Logs(timestamp=datetime.now(tz=UTC), attributes={"retry": True}, body="retrying")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={"signal": signal, **params},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["data"]["values"]["boolValues"] == expected
    assert response.json()["data"]["complete"] is True


@pytest.mark.parametrize("signal", [pytest.param("logs", id="logs"), pytest.param("traces", id="traces")])
def test_fields_values_start_excludes_values_not_seen_since(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
    signal: str,
) -> None:
    """
    Setup:
    Insert a log and a span three days old and a log and a span now, with different service names.

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
    insert_traces(
        [
            Traces(timestamp=now - timedelta(days=3), resources={"service.name": "archived-service"}),
            Traces(timestamp=now, resources={"service.name": "live-service"}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get("/api/v1/fields/values"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        params={
            "signal": signal,
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
        params={"signal": signal, "name": "service.name"},
    )

    assert response.status_code == HTTPStatus.OK
    assert set(response.json()["data"]["values"]["stringValues"]) == {"archived-service", "live-service"}
