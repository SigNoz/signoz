import json
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs


def test_logs_json_body_simple_searches(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with JSON bodies containing simple key-value pairs

    Tests:
    1. Search by body.message Contains "value"
    2. Search by body.status = 200 (numeric)
    3. Search by body.active = true (boolean)
    4. Search by body.level = "error" with CONTAINS
    5. Search by body.code > 100 (comparison)
    """
    now = datetime.now(tz=timezone.utc)

    # Log with simple JSON body
    log1_body = json.dumps(
        {
            "message": "User logged in successfully",
            "status": 200,
            "active": True,
            "level": "info",
            "code": 100,
        }
    )

    log2_body = json.dumps(
        {
            "message": "User authentication failed",
            "status": 401,
            "active": False,
            "level": "error",
            "code": 401,
        }
    )

    log3_body = json.dumps(
        {
            "message": "Database connection established",
            "status": 200,
            "active": True,
            "level": "info",
            "code": 200,
        }
    )

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "auth-service"},
                attributes={},
                body=log1_body,
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "auth-service"},
                attributes={},
                body=log2_body,
                severity_text="ERROR",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "db-service"},
                attributes={},
                body=log3_body,
                severity_text="INFO",
            ),
        ]
    )

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: Search by body.message = "User logged in successfully"
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
                            "filter": {
                                "expression": 'body.message CONTAINS "logged in"'
                            },
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1
    assert "logged in" in json.loads(rows[0]["data"]["body"])["message"]

    # Test 2: Search by body.status = 200
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
                            "filter": {"expression": "body.status = 200"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have status 200
    statuses = [json.loads(row["data"]["body"])["status"] for row in rows]
    assert all(s == 200 for s in statuses)

    # Test 3: Search by body.active = true
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
                            "filter": {"expression": "body.active = true"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have active = true
    active_values = [json.loads(row["data"]["body"])["active"] for row in rows]
    assert all(a is True for a in active_values)

    # Test 4: Search by body.level CONTAINS "error"
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
                            "filter": {"expression": 'body.level CONTAINS "error"'},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1  # Only log2 has level "error"
    assert json.loads(rows[0]["data"]["body"])["level"] == "error"

    # Test 5: Search by body.code > 100
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
                            "filter": {"expression": "body.code > 100"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log2 (401) and log3 (200) have code > 100
    codes = [json.loads(row["data"]["body"])["code"] for row in rows]
    assert all(c > 100 for c in codes)


def test_logs_json_body_nested_keys(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with JSON bodies containing nested objects

    Tests:
    1. Search by body.user.name = "value"
    2. Search by body.request.secure = true (boolean)
    3. Search by body.response.latency = 123.45 (floating point)
    4. Search by body.response.status.code = 200
    """
    now = datetime.now(tz=timezone.utc)

    log1_body = json.dumps(
        {
            "user": {"name": "john_doe", "id": 12345, "email": "john@example.com"},
            "request": {
                "method": "GET",
                "secure": True,
                "headers": {
                    "content_type": "application/json",
                    "authorization": "Bearer token123",
                },
            },
            "metadata": {"tags": {"environment": "production", "region": "us-east-1"}},
            "response": {"status": {"code": 200, "message": "OK"}, "latency": 123.45},
        }
    )

    log2_body = json.dumps(
        {
            "user": {"name": "jane_smith", "id": 67890, "email": "jane@example.com"},
            "request": {
                "method": "POST",
                "secure": False,
                "headers": {
                    "content_type": "text/html",
                    "authorization": "Bearer token456",
                },
            },
            "metadata": {"tags": {"environment": "staging", "region": "us-west-2"}},
            "response": {
                "status": {"code": 201, "message": "Created"},
                "latency": 456.78,
            },
        }
    )

    log3_body = json.dumps(
        {
            "user": {"name": "john_doe", "id": 11111, "email": "john2@example.com"},
            "request": {
                "method": "PUT",
                "secure": True,
                "headers": {
                    "content_type": "application/json",
                    "authorization": "Bearer token789",
                },
            },
            "metadata": {"tags": {"environment": "production", "region": "eu-west-1"}},
            "response": {"status": {"code": 200, "message": "OK"}, "latency": 123.45},
        }
    )

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "api-service"},
                attributes={},
                body=log1_body,
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "api-service"},
                attributes={},
                body=log2_body,
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "api-service"},
                attributes={},
                body=log3_body,
                severity_text="INFO",
            ),
        ]
    )

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: Search by body.user.name = "john_doe"
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
                            "filter": {"expression": 'body.user.name = "john_doe"'},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have user.name = "john_doe"
    user_names = [json.loads(row["data"]["body"])["user"]["name"] for row in rows]
    assert all(name == "john_doe" for name in user_names)

    # Test 2: Search by body.request.secure = true
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
                            "filter": {"expression": "body.request.secure = true"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have secure = true
    secure_values = [
        json.loads(row["data"]["body"])["request"]["secure"] for row in rows
    ]
    assert all(secure is True for secure in secure_values)

    # Test 3: Search by body.response.latency = 123.45
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
                            "filter": {"expression": "body.response.latency = 123.45"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have latency = 123.45
    latencies = [json.loads(row["data"]["body"])["response"]["latency"] for row in rows]
    assert all(lat == 123.45 for lat in latencies)

    # Test 4: Search by body.response.status.code = 200
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
                            "filter": {"expression": "body.response.status.code = 200"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have status.code = 200
    status_codes = [
        json.loads(row["data"]["body"])["response"]["status"]["code"] for row in rows
    ]
    assert all(code == 200 for code in status_codes)


def test_logs_json_body_array_membership(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with JSON bodies containing arrays

    Tests:
    1. Search by has(body.tags[*], "value") - string array
    2. Search by has(body.ids[*], 123) - numeric array
    3. Search by has(body.flags[*], true) - boolean array
    """
    now = datetime.now(tz=timezone.utc)

    log1_body = json.dumps(
        {
            "tags": ["production", "api", "critical"],
            "ids": [100, 200, 300],
            "flags": [True, False, True],
            "users": [
                {"name": "alice", "role": "admin"},
                {"name": "bob", "role": "user"},
            ],
        }
    )

    log2_body = json.dumps(
        {
            "tags": ["staging", "api", "test"],
            "ids": [200, 400, 500],
            "flags": [False, False, True],
            "users": [
                {"name": "charlie", "role": "user"},
                {"name": "david", "role": "admin"},
            ],
        }
    )

    log3_body = json.dumps(
        {
            "tags": ["production", "web", "important"],
            "ids": [100, 600, 700],
            "flags": [True, True, False],
            "users": [
                {"name": "alice", "role": "admin"},
                {"name": "eve", "role": "user"},
            ],
        }
    )

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=3),
                resources={"service.name": "app-service"},
                attributes={},
                body=log1_body,
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "app-service"},
                attributes={},
                body=log2_body,
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "app-service"},
                attributes={},
                body=log3_body,
                severity_text="INFO",
            ),
        ]
    )

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: Search by has(body.tags[*], "production")
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
                            "filter": {"expression": 'has(body.tags[*], "production")'},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log3 have "production" in tags
    tags_list = [json.loads(row["data"]["body"])["tags"] for row in rows]
    assert all("production" in tags for tags in tags_list)

    # Test 2: Search by has(body.ids[*], 200)
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
                            "filter": {"expression": "has(body.ids[*], 200)"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log1 and log2 have 200 in ids
    ids_list = [json.loads(row["data"]["body"])["ids"] for row in rows]
    assert all(200 in ids for ids in ids_list)

    # Test 3: Search by has(body.flags[*], true)
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
                            "filter": {"expression": "has(body.flags[*], true)"},
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 3  # All logs have true in flags
    flags_list = [json.loads(row["data"]["body"])["flags"] for row in rows]
    assert all(True in flags for flags in flags_list)


def test_logs_json_body_listing(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert multiple logs with JSON bodies

    Tests:
    1. List all logs with JSON bodies
    2. List logs with pagination (limit and offset)
    3. List logs ordered by timestamp
    4. List logs with multiple filters combined (AND/OR)
    5. Count logs matching JSON body filters
    """
    now = datetime.now(tz=timezone.utc)

    logs_data = [
        {
            "timestamp": now - timedelta(seconds=5),
            "body": json.dumps(
                {
                    "id": "log-1",
                    "service": "auth",
                    "action": "login",
                    "status": "success",
                    "user_id": 1,
                }
            ),
            "severity": "INFO",
        },
        {
            "timestamp": now - timedelta(seconds=4),
            "body": json.dumps(
                {
                    "id": "log-2",
                    "service": "auth",
                    "action": "logout",
                    "status": "success",
                    "user_id": 2,
                }
            ),
            "severity": "INFO",
        },
        {
            "timestamp": now - timedelta(seconds=3),
            "body": json.dumps(
                {
                    "id": "log-3",
                    "service": "payment",
                    "action": "charge",
                    "status": "success",
                    "user_id": 1,
                }
            ),
            "severity": "INFO",
        },
        {
            "timestamp": now - timedelta(seconds=2),
            "body": json.dumps(
                {
                    "id": "log-4",
                    "service": "auth",
                    "action": "login",
                    "status": "failed",
                    "user_id": 3,
                }
            ),
            "severity": "ERROR",
        },
        {
            "timestamp": now - timedelta(seconds=1),
            "body": json.dumps(
                {
                    "id": "log-5",
                    "service": "payment",
                    "action": "refund",
                    "status": "success",
                    "user_id": 2,
                }
            ),
            "severity": "INFO",
        },
    ]

    insert_logs(
        [
            Logs(
                timestamp=log_data["timestamp"],
                resources={"service.name": "test-service"},
                attributes={},
                body=log_data["body"],
                severity_text=log_data["severity"],
            )
            for log_data in logs_data
        ]
    )

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: List all logs with JSON bodies
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
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 5  # All 5 logs should be returned

    # Test 2: List logs with pagination (limit=2, offset=0)
    # Should return the 1st and 2nd logs (log-5 and log-4) when ordered by timestamp desc
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
                            "limit": 2,
                            "offset": 0,
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # Only 2 logs should be returned
    # Verify we got the 1st and 2nd logs (log-5 and log-4) when ordered by timestamp desc
    log_ids = [json.loads(row["data"]["body"])["id"] for row in rows]
    assert set(log_ids) == {"log-5", "log-4"}

    # Test 3: List logs with pagination (limit=2, offset=2)
    # Should return the 3rd and 4th logs (log-3 and log-2) when ordered by timestamp desc
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
                            "limit": 2,
                            "offset": 2,
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # Should return exactly 2 logs
    # Verify we got the 3rd and 4th logs (log-3 and log-2) when ordered by timestamp desc
    log_ids = [json.loads(row["data"]["body"])["id"] for row in rows]
    assert set(log_ids) == {"log-3", "log-2"}

    # Test 4: List logs with multiple filters combined (AND)
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
                            "filter": {
                                "expression": 'body.service = "auth" AND body.action = "login"'
                            },
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # 2 logs match: service="auth" AND action="login"
    for row in rows:
        body_data = json.loads(row["data"]["body"])
        assert body_data["service"] == "auth"
        assert body_data["action"] == "login"

    # Test 5: List logs with OR filter
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
                            "filter": {
                                "expression": 'body.service = "auth" OR body.service = "payment"'
                            },
                            "order": [
                                {"key": {"name": "timestamp"}, "direction": "desc"},
                            ],
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
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 5  # All 5 logs match: service="auth" OR service="payment"
    for row in rows:
        body_data = json.loads(row["data"]["body"])
        assert body_data["service"] in ["auth", "payment"]

    # Test 6: Count logs matching JSON body filters
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "scalar",
            "compositeQuery": {
                "queries": [
                    {
                        "type": "builder_query",
                        "spec": {
                            "name": "A",
                            "signal": "logs",
                            "disabled": False,
                            "filter": {"expression": 'body.status = "success"'},
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": True, "fillGaps": False},
        },
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    count = results[0]["data"][0][0]
    assert count == 4  # 4 logs have status="success"
