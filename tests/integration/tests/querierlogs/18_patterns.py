from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import RequestType, build_order_by, build_raw_query, get_column_data_from_response, make_query_request

# Log patterns: a log's pattern is its body_v2.message with the values that
# change replaced by placeholders (<IP>, <*>, ...). requestType "pattern"
# lists them, counted on a sample (every log here: far under the sample
# target, so sampleRate is 1 and counts are exact), and pattern('<text>')
# filters any logs query by them.

USER_LOGIN = "User alice logged in from <IP>"
ORDER_FAILED = "order <*> failed after <*>"
CACHE_MISS = "cache miss key=<*>"


def _seed_logs(insert_logs: Callable[[list[Logs]], None]) -> datetime:
    """Ten logs over three patterns: six logins (auth and web), three failed
    orders (checkout) and one cache miss (cart), the last tagged with an
    attribute named pattern."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    specs: list[tuple[str, str, str, dict[str, Any]]] = [
        *[(f"User alice logged in from 10.0.0.{i}", "auth" if i < 4 else "web", "INFO", {}) for i in range(6)],
        *[(f"order {9000 + i} failed after {120 * (i + 1)}ms", "checkout", "ERROR", {}) for i in range(3)],
        ('cache miss key="session:ab12"', "cart", "WARN", {"pattern": "x"}),
    ]
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=i + 1),
                resources={"service.name": service},
                attributes=attributes,
                body=body,
                severity_text=severity,
            )
            for i, (body, service, severity, attributes) in enumerate(specs)
        ]
    )
    return now


def _window(now: datetime) -> tuple[int, int]:
    return int((now - timedelta(minutes=5)).timestamp() * 1000), int(now.timestamp() * 1000)


def _patterns_query(*, filter_expression: str | None = None, group_by: list[str] | None = None, limit: int | None = None, signal: str = "logs") -> dict:
    spec: dict[str, Any] = {"name": "A", "signal": signal}
    if filter_expression:
        spec["filter"] = {"expression": filter_expression}
    if group_by:
        spec["groupBy"] = [{"name": name} for name in group_by]
    if limit is not None:
        spec["limit"] = limit
    return {"type": "builder_query", "spec": spec}


def _patterns_result(response) -> dict:
    assert response.status_code == HTTPStatus.OK, response.text
    body = response.json()
    assert body["status"] == "success", body
    results = body["data"]["data"]["results"]
    assert len(results) == 1
    return results[0]


def test_patterns_list(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """Every pattern per service, most logs first, with exact counts,
    percentages, samples, severities and a trend that adds up to the count."""
    now = _seed_logs(insert_logs)
    start_ms, end_ms = _window(now)

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.PATTERN,
        queries=[_patterns_query()],
    )
    result = _patterns_result(response)

    assert result["queryName"] == "A"
    assert result["sampleRate"] == 1
    assert result["total"] == 10

    # patterns are counted per service, so the logins come back once for auth
    # and once for web, under the same pattern and ID
    patterns = result["patterns"]

    def service(pattern: dict) -> str:
        return next(label["value"] for label in pattern["labels"] if label["key"]["name"] == "service.name")

    assert [(p["pattern"], service(p)) for p in patterns] == [
        (USER_LOGIN, "auth"),
        (ORDER_FAILED, "checkout"),
        (USER_LOGIN, "web"),
        (CACHE_MISS, "cart"),
    ]
    assert [p["count"] for p in patterns] == [4, 3, 2, 1]
    assert [p["percent"] for p in patterns] == pytest.approx([40, 30, 20, 10])

    login_auth, order, login_web, cache = patterns
    assert login_auth["id"].isdigit()
    assert login_auth["id"] == login_web["id"]
    assert len({p["id"] for p in patterns}) == 3
    assert login_auth["severities"] == ["INFO"]
    assert order["severities"] == ["ERROR"]
    assert cache["samples"] == ['cache miss key="session:ab12"']
    for login in (login_auth, login_web):
        assert all(sample.startswith("User alice logged in from 10.0.0.") for sample in login["samples"])
        assert 1 <= len(login["samples"]) <= 3
    for pattern in patterns:
        assert start_ms <= pattern["firstSeen"] <= pattern["lastSeen"] <= end_ms
        assert sum(point["count"] for point in pattern["trend"]) == pattern["count"]


def test_patterns_group_by_and_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """A group by splits a pattern per value and labels each row; the limit
    keeps the top rows."""
    now = _seed_logs(insert_logs)
    start_ms, end_ms = _window(now)

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.PATTERN,
        queries=[_patterns_query(group_by=["service.name"], limit=2)],
    )
    patterns = _patterns_result(response)["patterns"]

    rows = [(p["pattern"], p["labels"][0]["key"]["name"], p["labels"][0]["value"], p["count"]) for p in patterns]
    assert rows == [(USER_LOGIN, "service.name", "auth", 4), (ORDER_FAILED, "service.name", "checkout", 3)]


@pytest.mark.parametrize(
    "expression,expected_patterns",
    [
        pytest.param(f"NOT pattern('{USER_LOGIN}')", [ORDER_FAILED, CACHE_MISS], id="exclude_pattern"),
        pytest.param("severity_text = 'ERROR'", [ORDER_FAILED], id="field_filter"),
    ],
)
def test_patterns_with_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_patterns: list[str],
) -> None:
    """The patterns of the logs the query's filter keeps, total included."""
    now = _seed_logs(insert_logs)
    start_ms, end_ms = _window(now)

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.PATTERN,
        queries=[_patterns_query(filter_expression=expression)],
    )
    result = _patterns_result(response)

    assert [p["pattern"] for p in result["patterns"]] == expected_patterns
    assert result["total"] == sum(p["count"] for p in result["patterns"])


@pytest.mark.parametrize(
    "expression,expected_count",
    [
        pytest.param(f"pattern('{USER_LOGIN}')", 6, id="one_pattern"),
        pytest.param(f"pattern('{ORDER_FAILED}', '{CACHE_MISS}')", 4, id="any_of_patterns"),
        pytest.param(f"NOT pattern('{USER_LOGIN}')", 4, id="exclude"),
        pytest.param(f"pattern('{ORDER_FAILED}') AND service.name = 'checkout'", 3, id="and_resource_filter"),
        pytest.param(f"pattern('{ORDER_FAILED}') AND service.name = 'auth'", 0, id="and_resource_filter_no_match"),
        pytest.param("pattern('order <*>')", 0, id="whole_text_must_match"),
        pytest.param(f'pattern("{USER_LOGIN}")', 6, id="double_quoted"),
        pytest.param("pattern = 'x'", 1, id="pattern_key_stays_an_attribute"),
    ],
)
def test_pattern_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_count: int,
) -> None:
    """pattern() keeps exactly the logs of the given patterns in a log list,
    and composes with NOT and other filters."""
    now = _seed_logs(insert_logs)
    start_ms, end_ms = _window(now)

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
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
    assert response.json()["status"] == "success"
    assert len(get_column_data_from_response(response.json(), "body")) == expected_count


@pytest.mark.parametrize(
    "request_type,query,error",
    [
        pytest.param(RequestType.PATTERN, _patterns_query(signal="traces"), "support only a logs builder query", id="patterns_traces"),
        pytest.param(RequestType.PATTERN, _patterns_query(limit=1001), "at most 1000 patterns", id="patterns_limit"),
        pytest.param(
            RequestType.PATTERN,
            {"type": "builder_query", "spec": {"name": "A", "signal": "logs", "aggregations": [{"expression": "count()"}]}},
            "takes no aggregations",
            id="patterns_aggregations",
        ),
        pytest.param(
            RequestType.RAW,
            build_raw_query("A", "traces", filter_expression=f"pattern('{USER_LOGIN}')", limit=10),
            "supported only for logs",
            id="pattern_filter_traces",
        ),
    ],
)
def test_patterns_rejected(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    request_type: str,
    query: dict,
    error: str,
) -> None:
    """A pattern request is one logs builder query without aggregations, and
    pattern() filters only logs."""
    now = datetime.now(tz=UTC)
    start_ms, end_ms = _window(now)

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=request_type,
        queries=[query],
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert error in response.text


@pytest.mark.parametrize(
    "expression,expected_users",
    [
        pytest.param("pattern('User <*> logged in from <IP>')", {"uuid", "number", "email"}, id="wildcard_matches_any_placeholder"),
        pytest.param("pattern('User <*> logged in from <*>')", {"uuid", "number", "email"}, id="wildcard_matches_named_placeholder"),
        pytest.param("pattern('User <UUID> logged in from <IP>')", {"uuid", "number"}, id="named_placeholder_matches_itself_or_wildcard"),
        pytest.param("pattern('User <EMAIL> logged in from <IP>')", {"email", "number"}, id="named_placeholder_never_matches_another"),
        pytest.param("pattern('User <*> logged in from <IP>', 'User alice logged in from <IP>')", {"uuid", "number", "email", "word"}, id="wildcard_or_exact"),
        pytest.param("NOT pattern('User <*> logged in from <IP>')", {"word"}, id="exclude_wildcard"),
    ],
)
def test_pattern_filter_wildcard(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    expression: str,
    expected_users: set[str],
) -> None:
    """In pattern(), two placeholders match when they are the same or either
    is <*>; two different named placeholders never match, and a word is never
    a placeholder."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    users = {
        "uuid": "User 7f9c1e2a-1b2c-4d5e-8f90-123456789abc logged in from 10.0.0.1",  # User <UUID> logged in from <IP>
        "number": "User 42 logged in from 10.0.0.2",  # User <*> logged in from <IP>
        "email": "User jane@corp.io logged in from 10.0.0.3",  # User <EMAIL> logged in from <IP>
        "word": "User alice logged in from 10.0.0.4",  # User alice logged in from <IP>
    }
    insert_logs([Logs(timestamp=now - timedelta(seconds=i + 1), resources={"service.name": "auth"}, body=body) for i, body in enumerate(users.values())])
    start_ms, end_ms = _window(now)

    response = make_query_request(
        signoz,
        get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD),
        start_ms=start_ms,
        end_ms=end_ms,
        request_type=RequestType.RAW,
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
    assert response.json()["status"] == "success"
    assert set(get_column_data_from_response(response.json(), "body")) == {users[name] for name in expected_users}
