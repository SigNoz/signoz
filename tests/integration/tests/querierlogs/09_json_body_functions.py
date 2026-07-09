import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs

# Body-JSON array/token functions on the logs body. has() success paths are already
# covered by 06_json_body.py::test_logs_json_body_array_membership; this file adds the
# sibling functions hasAny / hasAll / hasToken (success) and the function-operator error
# paths (has/hasToken on a non-body key, non-string token) which must be rejected.


@pytest.mark.xfail(
    reason="hasAny/hasAll over a body-JSON array return 500 in legacy body mode (use_json_body off): ClickHouse 'Argument 0 for hasAny must be an array but has type String'. has() handles body arrays here; hasAny/hasAll do not (they work only in JSON-body mode).",
    strict=False,
)
def test_logs_json_body_has_any(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasAny(body.tags, [...]) matches a log whose array shares ANY value."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["staging", "api", "test"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # log1 has "critical", log2 has "test", log3 has neither -> 2 matches
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "disabled": False,
                            "limit": 100,
                            "offset": 0,
                            "filter": {"expression": "hasAny(body.tags, ['critical', 'test'])"},
                            "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 2
    tags_list = [json.loads(row["data"]["body"])["tags"] for row in rows]
    assert all(("critical" in tags) or ("test" in tags) for tags in tags_list)


@pytest.mark.xfail(
    reason="hasAny/hasAll over a body-JSON array return 500 in legacy body mode (use_json_body off): ClickHouse 'Argument 0 for hasAll must be an array but has type String'. has() handles body arrays here; hasAny/hasAll do not (they work only in JSON-body mode).",
    strict=False,
)
def test_logs_json_body_has_all(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasAll(body.tags, [...]) matches only a log whose array has ALL values."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # only the second log has both "production" AND "web"
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "disabled": False,
                            "limit": 100,
                            "offset": 0,
                            "filter": {"expression": "hasAll(body.tags, ['production', 'web'])"},
                            "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 1
    tags = json.loads(rows[0]["data"]["body"])["tags"]
    assert "production" in tags and "web" in tags


def test_logs_json_body_has_token(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
) -> None:
    """hasToken(body, 'token') matches logs whose body text contains the token."""
    now = datetime.now(tz=UTC)
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "api", "critical"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["staging", "api", "test"]}),
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                body=json.dumps({"tags": ["production", "web", "important"]}),
                severity_text="INFO",
            ),
        ]
    )
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # "production" appears in the first and third log bodies
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "disabled": False,
                            "limit": 100,
                            "offset": 0,
                            "filter": {"expression": 'hasToken(body, "production")'},
                            "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )
    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 2
    assert all("production" in row["data"]["body"] for row in rows)


@pytest.mark.parametrize(
    "expression",
    [
        pytest.param('has(code.function, "main")', id="has_non_body_key"),
        pytest.param('hasToken(code.function, "main")', id="hastoken_non_body_key"),
        pytest.param("hasToken(body, 123)", id="hastoken_non_string_value"),
    ],
)
def test_logs_json_body_function_errors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    expression: str,
) -> None:
    """has/hasToken support only the body JSON field; misuse is rejected (400)."""
    now = datetime.now(tz=UTC)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "raw",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "disabled": False,
                            "limit": 100,
                            "offset": 0,
                            "filter": {"expression": expression},
                            "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
