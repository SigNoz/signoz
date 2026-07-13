import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import get_rows, make_query_request

# Positive coverage for the body-JSON array functions hasAny / hasAll in JSON-body
# mode (BODY_JSON_QUERY_ENABLED=true). Here body_v2 arrays resolve to real ClickHouse
# Arrays via dynamicElement, so these succeed — unlike legacy body mode, where
# hasAny/hasAll xfail (see querierlogs/09_json_body_functions.py).
# export_json_types registers the body paths + array element types (tags -> []string,
# ids -> []int64) so the builder resolves body.tags/body.ids as arrays.


def test_logs_json_body_has_any_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAny over a []string body array: matches logs sharing ANY listed value."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "api", "critical"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["staging", "api", "test"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "web", "important"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # log1 has "critical", log2 has "test", log3 has neither -> 2 matches
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "disabled": False, "limit": 100, "offset": 0, "filter": {"expression": "hasAny(body.tags, ['critical', 'test'])"}, "order": [{"key": {"name": "timestamp"}, "direction": "desc"}], "aggregations": [{"expression": "count()"}]}}],
    )
    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 2
    assert all(("critical" in row["data"]["body"]["tags"]) or ("test" in row["data"]["body"]["tags"]) for row in rows)


def test_logs_json_body_has_all_string(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAll over a []string body array: matches only logs having ALL listed values."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "api", "critical"]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"tags": ["production", "web", "important"]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # only the second log has both "production" AND "web"
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "disabled": False, "limit": 100, "offset": 0, "filter": {"expression": "hasAll(body.tags, ['production', 'web'])"}, "order": [{"key": {"name": "timestamp"}, "direction": "desc"}], "aggregations": [{"expression": "count()"}]}}],
    )
    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 1
    tags = rows[0]["data"]["body"]["tags"]
    assert "production" in tags and "web" in tags


def test_logs_json_body_has_any_number(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    """hasAny over a []int64 body array."""
    now = datetime.now(tz=UTC)
    logs = [
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "app-service"}, body_v2=json.dumps({"ids": [100, 200, 300]}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "app-service"}, body_v2=json.dumps({"ids": [400, 600, 700]}), body_promoted="", severity_text="INFO"),
    ]
    export_json_types(logs)
    insert_logs(logs)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    # only the first log has 300 in ids; 999 matches nothing
    response = make_query_request(
        signoz,
        token,
        start_ms=int((now - timedelta(seconds=10)).timestamp() * 1000),
        end_ms=int(now.timestamp() * 1000),
        request_type="raw",
        queries=[{"type": "builder_query", "spec": {"name": "A", "signal": "logs", "disabled": False, "limit": 100, "offset": 0, "filter": {"expression": "hasAny(body.ids, [300, 999])"}, "order": [{"key": {"name": "timestamp"}, "direction": "desc"}], "aggregations": [{"expression": "count()"}]}}],
    )
    assert response.status_code == HTTPStatus.OK
    rows = get_rows(response)
    assert len(rows) == 1
    assert 300 in rows[0]["data"]["body"]["ids"]
