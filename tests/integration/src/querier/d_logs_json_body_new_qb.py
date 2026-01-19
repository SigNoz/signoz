import json
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.jsontypeexporter import JSONPathType, export_json_types
from fixtures.logs import Logs


def _assert_ok(response: requests.Response) -> None:
    if response.status_code != HTTPStatus.OK:
        raise AssertionError(f"HTTP {response.status_code}: {response.text}")


# ============================================================================
# NEW QB TESTS - Comprehensive integration tests for new JSON Query Builder
# ============================================================================
# These tests use body_json and body_json_promoted columns and require
# BODY_JSON_QUERY_ENABLED=true environment variable
# ============================================================================


def test_logs_json_body_new_qb_simple_searches(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with JSON bodies using new QB columns (body_json, body_json_promoted)
    Export JSON type metadata

    Tests:
    1. Search by body.message Contains "value"
    2. Search by body.status = 200 (numeric)
    3. Search by body.active = true (boolean)
    4. Search by body.level = "error" with CONTAINS
    5. Search by body.code > 100 (comparison)
    6. Search with body_json_promoted column
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

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "auth-service"},
            attributes={},
            body=log1_body,
            body_json=log1_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "auth-service"},
            attributes={},
            body=log2_body,
            body_json=log2_body,
            body_json_promoted="",
            severity_text="ERROR",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "db-service"},
            attributes={},
            body=log3_body,
            body_json=log3_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
    ]

    # Export JSON type metadata - auto-extract from logs (jsontypeexporter behavior)
    export_json_types(logs_list)

    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: Search by body.message CONTAINS "logged in"
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
                            "filter": {"expression": 'body.message CONTAINS "logged in"'},
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

    _assert_ok(response)
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

    _assert_ok(response)
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

    _assert_ok(response)
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

    _assert_ok(response)
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # log2 (401) and log3 (200) have code > 100
    codes = [json.loads(row["data"]["body"])["code"] for row in rows]
    assert all(c > 100 for c in codes)

    # Test 6: Search with promoted column (body_json_promoted)
    # Insert a log with promoted data
    log4_body = json.dumps({"message": "Promoted message", "status": 201})
    log4_promoted = json.dumps({"message": "Promoted message"})  # Only message is promoted

    insert_logs(
        [
            Logs(
                timestamp=now,
                resources={"service.name": "promoted-service"},
                attributes={},
                body=log4_body,
                body_json=log4_body,
                body_json_promoted=log4_promoted,
                severity_text="INFO",
            ),
        ]
    )

    # Search using promoted field
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int((now + timedelta(seconds=5)).timestamp() * 1000),
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
                            "filter": {"expression": 'body.message = "Promoted message"'},
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) >= 1  # Should find the promoted log
    assert any("Promoted message" in json.loads(row["data"]["body"])["message"] for row in rows)


def test_logs_json_body_new_qb_nested_keys(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[JSONPathType]], None],
) -> None:
    """
    Setup:
    Insert logs with nested JSON bodies using new QB

    Tests:
    1. Search by body.user.name = "value"
    2. Search by body.request.secure = true (boolean)
    3. Search by body.response.latency = 123.45 (floating point)
    4. Search by body.response.status.code = 200 (deeply nested)
    5. Search with EXISTS operator
    """
    now = datetime.now(tz=timezone.utc)

    log1_body = json.dumps(
        {
            "user": {
                "name": "john_doe",
                "id": 12345,
                "email": "john@example.com",
            },
            "request": {
                "method": "GET",
                "secure": True,
                "headers": {
                    "content_type": "application/json",
                },
            },
            "response": {
                "status": {
                    "code": 200,
                    "message": "OK",
                },
                "latency": 123.45,
            },
        }
    )

    log2_body = json.dumps(
        {
            "user": {
                "name": "jane_smith",
                "id": 67890,
            },
            "request": {
                "method": "POST",
                "secure": False,
            },
            "response": {
                "status": {
                    "code": 201,
                },
                "latency": 456.78,
            },
        }
    )

    # Export JSON type metadata for nested paths
    export_json_types(
        [
            JSONPathType(path="user.name", type="String"),
            JSONPathType(path="user.id", type="Int64"),
            JSONPathType(path="user.email", type="String"),
            JSONPathType(path="request.method", type="String"),
            JSONPathType(path="request.secure", type="Bool"),
            JSONPathType(path="request.headers.content_type", type="String"),
            JSONPathType(path="response.status.code", type="Int64"),
            JSONPathType(path="response.status.message", type="String"),
            JSONPathType(path="response.latency", type="Float64"),
        ]
    )

    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources={"service.name": "api-service"},
                attributes={},
                body=log1_body,
                body_json=log1_body,
                body_json_promoted="",
                severity_text="INFO",
            ),
            Logs(
                timestamp=now - timedelta(seconds=1),
                resources={"service.name": "api-service"},
                attributes={},
                body=log2_body,
                body_json=log2_body,
                body_json_promoted="",
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1
    assert json.loads(rows[0]["data"]["body"])["user"]["name"] == "john_doe"

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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1
    assert json.loads(rows[0]["data"]["body"])["request"]["secure"] is True

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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1
    assert json.loads(rows[0]["data"]["body"])["response"]["latency"] == 123.45

    # Test 4: Search by body.response.status.code = 200 (deeply nested)
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1
    assert json.loads(rows[0]["data"]["body"])["response"]["status"]["code"] == 200

    # Test 5: Search with EXISTS operator
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
                            "filter": {"expression": "body.user.email EXISTS"},
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1  # Only log1 has user.email
    assert "email" in json.loads(rows[0]["data"]["body"])["user"]


def test_logs_json_body_new_qb_array_paths(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with JSON bodies containing arrays

    Tests:
    1. Search by body.education[].name EXISTS (array path exists)
    2. Search by body.education[].name = "IIT" (array path equals)
    3. Search by body.education[].awards[].name = "Iron Award" (nested array)
    4. Search by body.education[].parameters CONTAINS 1.65 (array contains)
    """
    now = datetime.now(tz=timezone.utc)

    log1_body = json.dumps(
        {
            "education": [
                {
                    "name": "IIT",
                    "year": 2020,
                    "awards": [
                        {"name": "Iron Award", "type": "sports"},
                        {"name": "Gold Award", "type": "academic"},
                    ],
                    "parameters": [1.65, 2.5, 3.0],
                },
                {
                    "name": "MIT",
                    "year": 2022,
                    "awards": [
                        {"name": "Silver Award", "type": "research"},
                    ],
                    "parameters": [4.0, 5.0],
                },
            ]
        }
    )

    log2_body = json.dumps(
        {
            "education": [
                {
                    "name": "Stanford",
                    "year": 2021,
                    "awards": [
                        {"name": "Bronze Award", "type": "sports"},
                    ],
                    "parameters": [1.65, 6.0],
                }
            ]
        }
    )

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "app-service"},
            attributes={},
            body=log1_body,
            body_json=log1_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "app-service"},
            attributes={},
            body=log2_body,
            body_json=log2_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: Search by body.education[].name EXISTS
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
                            "filter": {"expression": "body.education[].name EXISTS"},
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # Both logs have education[].name

    # Test 2: Search by body.education[].name = "IIT"
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
                            "filter": {"expression": 'body.education[].name = "IIT"'},
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1  # Only log1 has "IIT"
    assert any(
        "IIT" in edu["name"] for edu in json.loads(rows[0]["data"]["body"])["education"]
    )

    # Test 3: Search by body.education[].awards[].name = "Iron Award" (nested array)
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
                            "filter": {"expression": 'body.education[].awards[].name = "Iron Award"'},
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 1  # Only log1 has "Iron Award"
    education = json.loads(rows[0]["data"]["body"])["education"]
    assert any(
        any(award["name"] == "Iron Award" for award in edu.get("awards", []))
        for edu in education
    )

    # Test 4: Search by body.education[].parameters CONTAINS 1.65
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
                            "filter": {"expression": "body.education[].parameters CONTAINS 1.65"},
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

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    rows = results[0]["rows"]
    assert len(rows) == 2  # Both logs have 1.65 in parameters
    for row in rows:
        education = json.loads(row["data"]["body"])["education"]
        assert any(1.65 in edu.get("parameters", []) for edu in education)


def test_logs_json_body_new_qb_groupby_timeseries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    """
    Setup:
    Insert logs with JSON bodies for GroupBy testing

    Tests:
    1. Time series query with GroupBy on body.user.age
    2. Time series query with GroupBy on body.user.name
    3. Time series query with multiple GroupBy fields
    """
    now = datetime.now(tz=timezone.utc)

    logs_data = [
        {"user": {"name": "alice", "age": 25}, "status": 200},
        {"user": {"name": "bob", "age": 30}, "status": 200},
        {"user": {"name": "alice", "age": 25}, "status": 201},
        {"user": {"name": "charlie", "age": 35}, "status": 200},
        {"user": {"name": "alice", "age": 25}, "status": 200},
    ]

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=5 - i),
            resources={"service.name": "api-service"},
            attributes={},
            body=json.dumps(log_data),
            body_json=json.dumps(log_data),
            body_json_promoted="",
            severity_text="INFO",
        )
        for i, log_data in enumerate(logs_data)
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    # Test 1: Time series query with GroupBy on body.user.age
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "time_series",
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
                            "groupBy": [
                                {
                                    "name": "body.user.age",
                                    "fieldDataType": "int64",
                                    "fieldContext": "body",
                                }
                            ],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    # Should have series grouped by age: 25, 30, 35
    age_values = {s["labels"]["body.user.age"] for s in series if "body.user.age" in s["labels"]}
    assert age_values == {"25", "30", "35"} or age_values == {25, 30, 35}

    # Test 2: Time series query with GroupBy on body.user.name
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "time_series",
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
                            "groupBy": [
                                {
                                    "name": "body.user.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "body",
                                }
                            ],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    # Should have series grouped by name: alice, bob, charlie
    name_values = {s["labels"]["body.user.name"] for s in series if "body.user.name" in s["labels"]}
    assert "alice" in name_values
    assert "bob" in name_values
    assert "charlie" in name_values

    # Test 3: Time series query with multiple GroupBy fields
    response = requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json={
            "schemaVersion": "v1",
            "start": int((now - timedelta(seconds=10)).timestamp() * 1000),
            "end": int(now.timestamp() * 1000),
            "requestType": "time_series",
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
                            "groupBy": [
                                {
                                    "name": "body.user.name",
                                    "fieldDataType": "string",
                                    "fieldContext": "body",
                                },
                                {
                                    "name": "body.user.age",
                                    "fieldDataType": "int64",
                                    "fieldContext": "body",
                                },
                            ],
                            "aggregations": [{"expression": "count()"}],
                        },
                    }
                ]
            },
            "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
        },
    )

    _assert_ok(response)
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    aggregations = results[0]["aggregations"]
    assert len(aggregations) == 1
    series = aggregations[0]["series"]
    # Should have series grouped by both name and age
    # alice+25 should appear (3 times), bob+30 (1 time), charlie+35 (1 time)
    grouped_labels = [
        (s["labels"].get("body.user.name"), s["labels"].get("body.user.age"))
        for s in series
        if "body.user.name" in s["labels"] and "body.user.age" in s["labels"]
    ]
    assert ("alice", "25") in grouped_labels or ("alice", 25) in grouped_labels
    assert ("bob", "30") in grouped_labels or ("bob", 30) in grouped_labels
    assert ("charlie", "35") in grouped_labels or ("charlie", 35) in grouped_labels
