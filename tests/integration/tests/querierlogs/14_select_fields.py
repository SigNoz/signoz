from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import BuilderQuery, OrderBy, TelemetryFieldKey, get_all_warnings, get_rows, make_query_request

# Select-field projection for logs — the logs counterpart of the traces
# select-field tests (queriertraces/01_list.py). A raw logs query with no
# selectFields returns the whole row (body + the resources_string / attributes_*
# maps); projecting specific fields instead returns each one flattened to a
# top-level key by its short name, with its value type preserved.

SERVICE = "select-svc"


@pytest.mark.parametrize(
    "select_name,key,expected,expected_type",
    [
        pytest.param("string_attr", "string_attr", "hello", str, id="string_attr"),
        pytest.param("number_attr", "number_attr", 42.5, float, id="number_attr"),
        pytest.param("bool_attr", "bool_attr", True, bool, id="bool_attr"),
        pytest.param("severity_text", "severity_text", "ERROR", str, id="intrinsic_severity_text"),
    ],
)
def test_logs_list_select_field_types(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    select_name: str,
    key: str,
    expected: Any,
    expected_type: type,
) -> None:
    """
    Setup:
    One log carrying typed attributes (string / number / bool) and severity ERROR.

    Tests:
    Projecting a string / number / bool attribute or the severity_text intrinsic
    returns the value with the right Python type under its short-name key.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": SERVICE},
                attributes={"string_attr": "hello", "number_attr": 42.5, "bool_attr": True},
                body="select test",
                severity_text="ERROR",
            )
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            BuilderQuery(
                signal="logs",
                name="A",
                limit=10,
                filter_expression=f'service.name = "{SERVICE}"',
                select_fields=[TelemetryFieldKey(select_name)],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    data = rows[0]["data"]
    assert data[key] == expected
    assert isinstance(data[key], expected_type)


def test_logs_list_select_projects_columns(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """
    Setup:
    One log with a string attribute plus body and resources.

    Tests:
    Projecting a single field returns it as a top-level key and drops the default
    row payload — the resources_string / attributes_* maps and body are no longer
    present when a selectFields list is given.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": SERVICE},
                attributes={"string_attr": "hello"},
                body="select test",
            )
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            BuilderQuery(
                signal="logs",
                name="A",
                limit=10,
                filter_expression=f'service.name = "{SERVICE}"',
                select_fields=[TelemetryFieldKey("string_attr")],
                order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
            ).to_dict()
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    data = rows[0]["data"]
    assert data["string_attr"] == "hello"
    # Projection drops the default full-row payload.
    assert "attributes_string" not in data
    assert "resources_string" not in data


@pytest.mark.parametrize("surface", ["filter", "select", "order"])
def test_logs_list_unknown_log_context_synthesizes(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    surface: str,
) -> None:
    """
    Setup:
    One log.

    Tests:
    The intrinsic `log.` context is forgiving, like bare / `attribute.` /
    `resource.` keys (and the traces `span.` context): an unknown key there
    synthesizes against the log attribute maps (and the body path) rather than
    erroring, because existence is a property of the data, not of metadata. A
    filter reference matches nothing and surfaces a not-found warning (under the
    stripped name); a select projects a null column; an order clause succeeds
    and returns the log.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "log-forgiving-ctx-svc"
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": service}, body="forgiving ctx")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)
    key = "log.does_not_exist"
    svc = f'service.name = "{service}"'

    if surface == "filter":
        query = BuilderQuery(signal="logs", name="A", limit=10, filter_expression=f"{svc} AND {key} = 'nope'")
    elif surface == "select":
        query = BuilderQuery(
            signal="logs",
            name="A",
            limit=10,
            filter_expression=svc,
            select_fields=[TelemetryFieldKey(key)],
            order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
        )
    else:  # order
        query = BuilderQuery(signal="logs", name="A", limit=10, filter_expression=svc, order=[OrderBy(TelemetryFieldKey(key), "desc")])

    response = make_query_request(
        signoz,
        token,
        start_ms=start_ms,
        end_ms=end_ms,
        request_type="raw",
        queries=[query.to_dict()],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)

    if surface == "filter":
        assert rows == []
        messages = [w.get("message", "") for w in get_all_warnings(response.json())]
        assert any("does_not_exist" in m and "not found" in m for m in messages), messages
    elif surface == "select":
        assert len(rows) == 1
        assert rows[0]["data"]["does_not_exist"] is None
    else:  # order
        assert len(rows) == 1
