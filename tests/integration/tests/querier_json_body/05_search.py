import json
from collections import namedtuple
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import build_order_by, build_raw_query, get_rows, make_query_request

# search() with use_json_body on (see conftest.py): body matches run against body_v2 via
# LOWER(toString(body_v2)); the map/log fan-out is unchanged from querierlogs/15_search.
# The response `body` comes back as parsed JSON, so a plain-string body is {"message": <body>}.

Bodies = namedtuple("Bodies", ["a", "b", "c", "d"])


@pytest.mark.parametrize(
    "expression,expected",
    [
        # body matches now run through body_v2 (toString of {"message": <body>})
        pytest.param("search('login')", lambda b: {b.a}, id="keyless_body"),
        pytest.param("search('checkout')", lambda b: {b.a, b.d}, id="keyless_body_and_resource"),
        pytest.param("search('CHECKOUT')", lambda b: {b.a, b.d}, id="keyless_case_insensitive"),
        pytest.param("search('login', body)", lambda b: {b.a}, id="scope_body"),
        pytest.param("search('checkout', body)", lambda b: {b.a}, id="scope_body_excludes_resource"),
        # the map / log fan-out is flag-independent — sanity that it still works here
        pytest.param("search('checkout', resource)", lambda b: {b.a, b.d}, id="scope_resource"),
        pytest.param("search('acme', attribute)", lambda b: {b.a, b.c}, id="scope_attribute"),
        pytest.param("search('error', log)", lambda b: {b.b, b.d}, id="scope_log_severity"),
        pytest.param("search('checkout', body, resource)", lambda b: {b.a, b.d}, id="scopes_union"),
        pytest.param("NOT search('login')", lambda b: {b.b, b.c, b.d}, id="negated"),
    ],
)
def test_search(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected: Callable[[Bodies], set[str]],
) -> None:
    """Four self-naming logs assert keyless/body-scoped search() matches through the
    body_v2 JSON column, while resource/attribute/log scopes fan out unchanged."""
    body = Bodies(
        a="alpha checkout login ok",  # service checkout / region useast / tenant acme    / INFO
        b="bravo declined",  # service payment  / region euwest / tenant globex  / ERROR
        c="charlie miss",  # service cart     / region useast / tenant acme    / WARN
        d="delta slow",  # service checkout / region apac   / tenant initech / ERROR
    )
    # (body, resources, attributes, severity_text)
    specs = [
        (body.a, {"service.name": "checkout", "region": "useast"}, {"tenant": "acme"}, "INFO"),
        (body.b, {"service.name": "payment", "region": "euwest"}, {"tenant": "globex"}, "ERROR"),
        (body.c, {"service.name": "cart", "region": "useast"}, {"tenant": "acme"}, "WARN"),
        (body.d, {"service.name": "checkout", "region": "apac"}, {"tenant": "initech"}, "ERROR"),
    ]

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    logs = [Logs(timestamp=now - timedelta(seconds=i + 1), resources=res, attributes=attrs, body=b, severity_text=sev) for i, (b, res, attrs, sev) in enumerate(specs)]
    insert_logs(logs)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[
            build_raw_query(
                "A",
                "logs",
                filter_expression=expression,
                order=[build_order_by("timestamp", "desc"), build_order_by("id", "desc")],
                limit=100,
            )
        ],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    # body_v2 comes back parsed; a plain-string body is {"message": <body>}.
    assert {row["data"]["body"]["message"] for row in get_rows(response)} == expected(body)


@pytest.mark.parametrize(
    "needle",
    [
        pytest.param("eve@acme.io", id="nested_string_value"),
        pytest.param("503", id="nested_numeric_value"),
        pytest.param("status", id="nested_key"),
    ],
)
def test_search_body_reaches_nested_json(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    needle: str,
) -> None:
    """A body-scoped search matches values and keys nested inside the body_v2 JSON."""
    # searchable content lives only in nested fields, not a top-level message
    nested_body = json.dumps({"user": {"email": "eve@acme.io"}, "http": {"status": 503}}, separators=(",", ":"))

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    insert_logs([Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "api"}, body=nested_body, severity_text="INFO")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(minutes=5)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[build_raw_query("A", "logs", filter_expression=f"search('{needle}', body)", order=[build_order_by("timestamp", "desc")], limit=100)],
    )

    assert response.status_code == HTTPStatus.OK, response.text
    rows = get_rows(response)
    assert len(rows) == 1
    assert rows[0]["data"]["body"]["user"]["email"] == "eve@acme.io"
