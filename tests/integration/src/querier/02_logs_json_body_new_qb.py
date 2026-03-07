import json
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Any, Callable, Dict, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.jsontypeexporter import export_json_types, export_promoted_paths
from fixtures.logs import Logs


def _assert_ok(response: requests.Response) -> None:
    if response.status_code != HTTPStatus.OK:
        raise AssertionError(f"HTTP {response.status_code}: {response.text}")


def _post_query_range(
    signoz: types.SigNoz, token: str, payload: Dict[str, Any]
) -> requests.Response:
    return requests.post(
        signoz.self.host_configs["8080"].get("/api/v5/query_range"),
        timeout=2,
        headers={"authorization": f"Bearer {token}"},
        json=payload,
    )


def _build_query_payload(
    now: datetime, case: Dict[str, Any], start_offset_seconds: int = 10
) -> Dict[str, Any]:
    start_ms = case.get(
        "startMs", int((now - timedelta(seconds=start_offset_seconds)).timestamp() * 1000)
    )
    end_ms = case.get("endMs", int(now.timestamp() * 1000))
    expression = case.get("expression")
    group_by = case.get("groupBy")
    aggregation = case.get("aggregation")
    order = case.get("order")
    step_interval = case.get("stepInterval")

    if aggregation and not isinstance(aggregation, list):
        aggregation = [{"expression": aggregation}]
    if order is None and case["requestType"] == "raw":
        order = [{"key": {"name": "timestamp"}, "direction": "desc"}]

    payload: Dict[str, Any] = {
        "schemaVersion": "v1",
        "start": start_ms,
        "end": end_ms,
        "requestType": case["requestType"],
        "compositeQuery": {
            "queries": [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": case["name"],
                        "signal": "logs",
                        "disabled": False,
                        "limit": case.get("limit", 100),
                        "offset": 0,
                        "filter": {"expression": expression} if expression else None,
                        "groupBy": group_by,
                        "aggregations": aggregation,
                        "order": order,
                        "stepInterval": step_interval,
                    },
                }
            ]
        },
        "formatOptions": {"formatTableResultForUI": False, "fillGaps": False},
    }
    return payload


def _get_results(response: requests.Response) -> List[Dict[str, Any]]:
    assert response.json()["status"] == "success"
    results = response.json()["data"]["data"]["results"]
    assert len(results) == 1
    return results


def _get_rows(response: requests.Response) -> List[Dict[str, Any]]:
    results = _get_results(response)
    return results[0]["rows"]


def _run_query_case(
    signoz: types.SigNoz, token: str, now: datetime, case: Dict[str, Any]
) -> None:
    payload = _build_query_payload(now, case)
    response = _post_query_range(signoz, token, payload)
    _assert_ok(response)
    assert case["validate"](response)


def _labels_to_map(labels: Any) -> Dict[str, Any]:
    if isinstance(labels, list):
        mapped: Dict[str, Any] = {}
        for entry in labels:
            key = entry.get("key", {}) if isinstance(entry, dict) else {}
            name = key.get("name")
            if name:
                mapped[name] = entry.get("value")
        return mapped
    if isinstance(labels, dict):
        return labels
    return {}


# ============================================================================
# NEW QB TESTS - Comprehensive integration tests for new JSON Query Builder
# ============================================================================
# These tests use body_json and body_json_promoted columns and require
# BODY_JSON_QUERY_ENABLED=true environment variable
# Breadcrumbs for promoted-path tests:
# - body is empty for JSON logs; the API returns a merged view from JSON columns
# - body_json contains only non-promoted fields for post-promotion logs
#   (pre-promotion logs may still carry the full JSON in body_json)
# - body_json_promoted contains only promoted paths (no full JSON duplication)
# - export_json_types is fed full JSON payloads so metadata paths/types exist
#   even if a log only stores promoted fields in body_json_promoted
# - export_promoted_paths seeds signoz_metadata.distributed_json_promoted_paths
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
            body_json=log1_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "auth-service"},
            attributes={},
            body_json=log2_body,
            body_json_promoted="",
            severity_text="ERROR",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "db-service"},
            attributes={},
            body_json=log3_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
    ]

    # Export JSON type metadata - auto-extract from logs (jsontypeexporter behavior)
    export_json_types(logs_list)

    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        {
            "name": "simple_search.message_contains",
            "requestType": "raw",
            "expression": 'body.message CONTAINS "logged in"',
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and "logged in"
                in json.loads(_get_rows(response)[0]["data"]["body"])["message"]
            ),
        },
        {
            "name": "simple_search.status_200",
            "requestType": "raw",
            "expression": "body.status = 200",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 2
                and all(
                    json.loads(row["data"]["body"])["status"] == 200
                    for row in _get_rows(response)
                )
            ),
        },
        {
            "name": "simple_search.active_true",
            "requestType": "raw",
            "expression": "body.active = true",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 2
                and all(
                    json.loads(row["data"]["body"])["active"] is True
                    for row in _get_rows(response)
                )
            ),
        },
        {
            "name": "simple_search.level_error",
            "requestType": "raw",
            "expression": 'body.level CONTAINS "error"',
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and json.loads(_get_rows(response)[0]["data"]["body"])["level"] == "error"
            ),
        },
        {
            "name": "simple_search.code_gt_100",
            "requestType": "raw",
            "expression": "body.code > 100",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 2
                and all(
                    json.loads(row["data"]["body"])["code"] > 100
                    for row in _get_rows(response)
                )
            ),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)

    # Test 6: Search with promoted column (body_json_promoted)
    # Insert a log where message is only in promoted JSON
    log4_body = json.dumps({})
    log4_promoted = json.dumps({"message": "Promoted message"})

    insert_logs(
        [
            Logs(
                timestamp=now,
                resources={"service.name": "promoted-service"},
                attributes={},
                body_json=log4_body,
                body_json_promoted=log4_promoted,
                severity_text="INFO",
            ),
        ]
    )

    promoted_case = {
        "name": "simple_search.promoted_message",
        "requestType": "raw",
        "expression": 'body.message = "Promoted message"',
        "groupBy": None,
        "limit": 100,
        "aggregation": "count()",
        "stepInterval": None,
        "endMs": int((now + timedelta(seconds=5)).timestamp() * 1000),
        "validate": lambda response: (
            len(_get_rows(response)) >= 1
            and any(
                "Promoted message" in json.loads(row["data"]["body"])["message"]
                for row in _get_rows(response)
            )
        ),
    }

    _run_query_case(signoz, token, now, promoted_case)


def test_logs_json_body_new_qb_nested_keys(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
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

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "api-service"},
            attributes={},
            body_json=log1_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "api-service"},
            attributes={},
            body_json=log2_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        {
            "name": "nested_keys.user_name",
            "requestType": "raw",
            "expression": 'body.user.name = "john_doe"',
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and json.loads(_get_rows(response)[0]["data"]["body"])["user"]["name"]
                == "john_doe"
            ),
        },
        {
            "name": "nested_keys.request_secure",
            "requestType": "raw",
            "expression": "body.request.secure = true",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and json.loads(_get_rows(response)[0]["data"]["body"])["request"]["secure"]
                is True
            ),
        },
        {
            "name": "nested_keys.response_latency",
            "requestType": "raw",
            "expression": "body.response.latency = 123.45",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and json.loads(_get_rows(response)[0]["data"]["body"])["response"][
                    "latency"
                ]
                == 123.45
            ),
        },
        {
            "name": "nested_keys.response_status_code",
            "requestType": "raw",
            "expression": "body.response.status.code = 200",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and json.loads(_get_rows(response)[0]["data"]["body"])["response"][
                    "status"
                ]["code"]
                == 200
            ),
        },
        {
            "name": "nested_keys.user_email_exists",
            "requestType": "raw",
            "expression": "body.user.email EXISTS",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and "email"
                in json.loads(_get_rows(response)[0]["data"]["body"])["user"]
            ),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)


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
            body_json=log1_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=log2_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)
    cases = [
        {
            "name": "array_paths.exists",
            "requestType": "raw",
            "expression": "body.education[].name EXISTS",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: len(_get_rows(response)) == 2,
        },
        {
            "name": "array_paths.equals_iit",
            "requestType": "raw",
            "expression": 'body.education[].name = "IIT"',
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and any(
                    "IIT" in edu["name"]
                    for edu in json.loads(_get_rows(response)[0]["data"]["body"])[
                        "education"
                    ]
                )
            ),
        },
        {
            "name": "array_paths.nested_awards",
            "requestType": "raw",
            "expression": 'body.education[].awards[].name = "Iron Award"',
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 1
                and any(
                    any(award["name"] == "Iron Award" for award in edu.get("awards", []))
                    for edu in json.loads(_get_rows(response)[0]["data"]["body"])[
                        "education"
                    ]
                )
            ),
        },
        {
            "name": "array_paths.parameters_contains",
            "requestType": "raw",
            "expression": "body.education[].parameters CONTAINS 1.65",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 2
                and all(
                    any(
                        1.65 in edu.get("parameters", [])
                        for edu in json.loads(row["data"]["body"])["education"]
                    )
                    for row in _get_rows(response)
                )
            ),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)


def test_logs_json_body_new_qb_promoted_time_windows(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
    export_promoted_paths: Callable[[List[str]], None],
) -> None:
    """
    Setup:
    Insert logs before/after a promotion timestamp so some fields are read
    from body_json (before) and body_json_promoted (after).

    Tests:
    1. startMs/endMs before promotion timestamp
    2. startMs before and endMs after promotion timestamp
    3. startMs/endMs after promotion timestamp
    """
    now = datetime.now(tz=timezone.utc)
    promotion_ts = now - timedelta(minutes=20)

    log1_full = {
        "id": "pre_15m",
        "message": "before alpha",
        "user": {"name": "alice", "age": 25},
        "tags": ["prod", "alpha"],
        "status": 200,
        "education": [
            {
                "name": "IIT",
                "year": 2020,
                "awards": [{"name": "Iron Award", "type": "sports"}],
                "parameters": [1.65, 2.5],
            }
        ],
    }
    log2_full = {
        "id": "pre_5m",
        "message": "before beta",
        "user": {"name": "bob", "age": 30},
        "tags": ["stage", "beta"],
        "status": 201,
        "education": [
            {
                "name": "MIT",
                "year": 2022,
                "awards": [{"name": "Silver Award", "type": "research"}],
                "parameters": [2.75, 3.5],
            }
        ],
    }
    log3_full = {
        "id": "post_2m",
        "message": "after gamma",
        "user": {"name": "carol", "age": 35},
        "tags": ["prod", "gamma"],
        "status": 202,
        "education": [
            {
                "name": "Stanford",
                "year": 2023,
                "awards": [{"name": "Gold Award", "type": "research"}],
                "parameters": [3.5],
            }
        ],
    }
    log4_full = {
        "id": "post_10m",
        "message": "after delta",
        "user": {"name": "dan", "age": 40},
        "tags": ["stage", "delta"],
        "status": 203,
        "education": [
            {
                "name": "Harvard",
                "year": 2024,
                "awards": [{"name": "Silver Award", "type": "research"}],
                "parameters": [2.75],
            }
        ],
    }

    promoted_paths = [
        "message",
        "user.name",
        "user.age",
        "tags",
        "education",
    ]

    def _promoted_part(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "message": payload["message"],
            "user": payload["user"],
            "tags": payload["tags"],
            "education": payload["education"],
        }

    def _non_promoted_part(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": payload["id"],
            "status": payload["status"],
        }

    logs_list = [
        Logs(
            timestamp=promotion_ts - timedelta(minutes=15),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=json.dumps(log1_full),
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts - timedelta(minutes=5),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=json.dumps(log2_full),
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts + timedelta(minutes=2),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=json.dumps(_non_promoted_part(log3_full)),
            body_json_promoted=json.dumps(_promoted_part(log3_full)),
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts + timedelta(minutes=10),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=json.dumps(_non_promoted_part(log4_full)),
            body_json_promoted=json.dumps(_promoted_part(log4_full)),
            severity_text="INFO",
        ),
    ]

    export_json_types(
        [
            json.dumps(log1_full),
            json.dumps(log2_full),
            json.dumps(log3_full),
            json.dumps(log4_full),
        ]
    )
    export_promoted_paths(promoted_paths)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    def _row_ids(
        response: requests.Response, context: str, expected_ids: set[str]
    ) -> set[str]:
        results = _get_results(response)
        rows = results[0].get("rows")
        if rows is None:
            if expected_ids:
                raise AssertionError(
                    f"{context}: rows is null, response={response.json()}"
                )
            return set()
        return {json.loads(row["data"]["body"])["id"] for row in rows}

    def _assert_expected_ids(
        response: requests.Response, context: str, expected_ids: set[str]
    ) -> None:
        actual_ids = _row_ids(response, context, expected_ids)
        if actual_ids != expected_ids:
            raise AssertionError(
                f"{context}: expected_ids={expected_ids}, "
                f"actual_ids={actual_ids}, response={response.json()}"
            )

    windows = [
        {
            "name": "before_promotion",
            "startMs": int(
                (promotion_ts - timedelta(minutes=20)).timestamp() * 1000
            ),
            "endMs": int((promotion_ts - timedelta(minutes=1)).timestamp() * 1000),
        },
        {
            "name": "spanning_promotion",
            "startMs": int(
                (promotion_ts - timedelta(minutes=20)).timestamp() * 1000
            ),
            "endMs": int((promotion_ts + timedelta(minutes=20)).timestamp() * 1000),
        },
        {
            "name": "after_promotion",
            "startMs": int((promotion_ts + timedelta(minutes=1)).timestamp() * 1000),
            "endMs": int((promotion_ts + timedelta(minutes=20)).timestamp() * 1000),
        },
    ]

    cases = [
        {
            "name": "promoted_time_window.message_contains_before",
            "expression": 'body.message CONTAINS "before"',
            "expected_ids": {
                "before_promotion": {"pre_15m", "pre_5m"},
                "spanning_promotion": {"pre_15m", "pre_5m"},
                "after_promotion": set(),
            },
        },
        {
            "name": "promoted_time_window.user_name_equals_bob",
            "expression": 'body.user.name = "bob"',
            "expected_ids": {
                "before_promotion": {"pre_5m"},
                "spanning_promotion": {"pre_5m"},
                "after_promotion": set(),
            },
        },
        {
            "name": "promoted_time_window.awards_equals_silver",
            "expression": 'body.education[].awards[].name = "Silver Award"',
            "expected_ids": {
                "before_promotion": {"pre_5m"},
                "spanning_promotion": {"pre_5m", "post_10m"},
                "after_promotion": {"post_10m"},
            },
        },
        {
            "name": "promoted_time_window.parameters_contains",
            "expression": "body.education[].parameters CONTAINS 2.75",
            "expected_ids": {
                "before_promotion": {"pre_5m"},
                "spanning_promotion": {"pre_5m", "post_10m"},
                "after_promotion": {"post_10m"},
            },
        },
        {
            "name": "promoted_time_window.tags_has_prod",
            "expression": 'has(body.tags, "prod")',
            "expected_ids": {
                "before_promotion": {"pre_15m"},
                "spanning_promotion": {"pre_15m", "post_2m"},
                "after_promotion": {"post_2m"},
            },
        },
        {
            "name": "promoted_time_window.user_age_gt_30",
            "expression": "body.user.age > 30",
            "expected_ids": {
                "before_promotion": set(),
                "spanning_promotion": {"post_2m", "post_10m"},
                "after_promotion": {"post_2m", "post_10m"},
            },
        },
    ]

    for case in cases:
        for window in windows:
            expected = case["expected_ids"][window["name"]]
            case_name = f"{case['name']}.{window['name']}"
            run_case = {
                "name": case_name,
                "requestType": "raw",
                "expression": case["expression"],
                "groupBy": None,
                "limit": 100,
                "aggregation": "count()",
                "stepInterval": None,
                "startMs": window["startMs"],
                "endMs": window["endMs"],
                "validate": lambda response, expected_ids=expected, name=case_name: (
                    _assert_expected_ids(response, name, expected_ids) is None
                ),
            }
            _run_query_case(signoz, token, now, run_case)


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
            body_json=json.dumps(log_data),
            body_json_promoted="",
            severity_text="INFO",
        )
        for i, log_data in enumerate(logs_data)
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)
    cases = [
        {
            "name": "groupby_timeseries.age",
            "requestType": "time_series",
            "expression": None,
            "groupBy": [
                {
                    "name": "body.user.age",
                    "fieldDataType": "int64",
                }
            ],
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": 60,
            "validate": lambda response: (
                {
                    _labels_to_map(s.get("labels")).get("user.age")
                    for s in _get_results(response)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.age") is not None
                }
                in ({"25", "30", "35"}, {25, 30, 35})
            ),
        },
        {
            "name": "groupby_timeseries.name",
            "requestType": "time_series",
            "expression": None,
            "groupBy": [
                {
                    "name": "body.user.name",
                    "fieldDataType": "string",
                }
            ],
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": 60,
            "validate": lambda response: {"alice", "bob", "charlie"}.issubset(
                {
                    _labels_to_map(s.get("labels")).get("user.name")
                    for s in _get_results(response)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.name") is not None
                }
            ),
        },
        {
            "name": "groupby_timeseries.multi",
            "requestType": "time_series",
            "expression": None,
            "groupBy": [
                {
                    "name": "body.user.name",
                    "fieldDataType": "string",
                },
                {
                    "name": "body.user.age",
                    "fieldDataType": "int64",
                },
            ],
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": 60,
            "validate": lambda response: (
                {
                    (
                        _labels_to_map(s.get("labels")).get("user.name"),
                        _labels_to_map(s.get("labels")).get("user.age"),
                    )
                    for s in _get_results(response)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.name") is not None
                    and _labels_to_map(s.get("labels")).get("user.age") is not None
                }.issuperset(
                    {("alice", "25"), ("bob", "30"), ("charlie", "35")}
                )
                or {
                    (
                        _labels_to_map(s.get("labels")).get("user.name"),
                        _labels_to_map(s.get("labels")).get("user.age"),
                    )
                    for s in _get_results(response)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.name") is not None
                    and _labels_to_map(s.get("labels")).get("user.age") is not None
                }.issuperset({("alice", 25), ("bob", 30), ("charlie", 35)})
            ),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)



def test_logs_json_body_new_qb_groupby_timeseries_promoted(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
    export_promoted_paths: Callable[[List[str]], None],
) -> None:
    """
    Setup:
    Insert logs before/after a promotion timestamp so group-by values are
    present in body_json (before) and body_json_promoted (after).

    Tests:
    1. startMs/endMs before promotion timestamp
    2. startMs before and endMs after promotion timestamp
    3. startMs/endMs after promotion timestamp
    """
    now = datetime.now(tz=timezone.utc)
    promotion_ts = now - timedelta(minutes=20)

    log1_full = {"id": "pre_15m", "user": {"name": "alice", "age": 25}, "status": 200}
    log2_full = {"id": "pre_5m", "user": {"name": "bob", "age": 30}, "status": 201}
    log3_full = {"id": "post_2m", "user": {"name": "carol", "age": 35}, "status": 202}
    log4_full = {"id": "post_10m", "user": {"name": "dan", "age": 40}, "status": 203}

    promoted_paths = [
        "user.name",
        "user.age",
    ]

    def _promoted_part(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {"user": payload["user"]}

    def _non_promoted_part(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": payload["id"],
            "status": payload["status"],
        }

    logs_list = [
        Logs(
            timestamp=promotion_ts - timedelta(minutes=15),
            resources={"service.name": "api-service"},
            attributes={},
            body_json=json.dumps(log1_full),
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts - timedelta(minutes=5),
            resources={"service.name": "api-service"},
            attributes={},
            body_json=json.dumps(log2_full),
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts + timedelta(minutes=2),
            resources={"service.name": "api-service"},
            attributes={},
            body_json=json.dumps(_non_promoted_part(log3_full)),
            body_json_promoted=json.dumps(_promoted_part(log3_full)),
            severity_text="INFO",
        ),
        Logs(
            timestamp=promotion_ts + timedelta(minutes=10),
            resources={"service.name": "api-service"},
            attributes={},
            body_json=json.dumps(_non_promoted_part(log4_full)),
            body_json_promoted=json.dumps(_promoted_part(log4_full)),
            severity_text="INFO",
        ),
    ]

    export_json_types(
        [
            json.dumps(log1_full),
            json.dumps(log2_full),
            json.dumps(log3_full),
            json.dumps(log4_full),
        ]
    )
    export_promoted_paths(promoted_paths)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    def _label_values(response: requests.Response, key: str) -> set[Any]:
        return {
            _labels_to_map(s.get("labels")).get(key)
            for s in _get_results(response)[0]["aggregations"][0]["series"]
            if _labels_to_map(s.get("labels")).get(key) is not None
        }

    def _label_pairs(response: requests.Response) -> set[tuple[Any, Any]]:
        return {
            (
                _labels_to_map(s.get("labels")).get("user.name"),
                _labels_to_map(s.get("labels")).get("user.age"),
            )
            for s in _get_results(response)[0]["aggregations"][0]["series"]
            if _labels_to_map(s.get("labels")).get("user.name") is not None
            and _labels_to_map(s.get("labels")).get("user.age") is not None
        }

    windows = [
        {
            "name": "before_promotion",
            "startMs": int(
                (promotion_ts - timedelta(minutes=20)).timestamp() * 1000
            ),
            "endMs": int((promotion_ts - timedelta(minutes=1)).timestamp() * 1000),
        },
        {
            "name": "spanning_promotion",
            "startMs": int(
                (promotion_ts - timedelta(minutes=20)).timestamp() * 1000
            ),
            "endMs": int((promotion_ts + timedelta(minutes=20)).timestamp() * 1000),
        },
        {
            "name": "after_promotion",
            "startMs": int((promotion_ts + timedelta(minutes=1)).timestamp() * 1000),
            "endMs": int((promotion_ts + timedelta(minutes=20)).timestamp() * 1000),
        },
    ]

    cases = [
        {
            "name": "groupby_timeseries.promoted_age",
            "groupBy": [{"name": "body.user.age", "fieldDataType": "int64"}],
            "expected": {
                "before_promotion": {25, 30},
                "spanning_promotion": {25, 30, 35, 40},
                "after_promotion": {35, 40},
            },
        },
        {
            "name": "groupby_timeseries.promoted_name",
            "groupBy": [{"name": "body.user.name", "fieldDataType": "string"}],
            "expected": {
                "before_promotion": {"alice", "bob"},
                "spanning_promotion": {"alice", "bob", "carol", "dan"},
                "after_promotion": {"carol", "dan"},
            },
        },
        {
            "name": "groupby_timeseries.promoted_multi",
            "groupBy": [
                {
                    "name": "body.user.name",
                    "fieldDataType": "string",
                },
                {
                    "name": "body.user.age",
                    "fieldDataType": "int64",
                },
            ],
            "expected": {
                "before_promotion": {("alice", 25), ("bob", 30)},
                "spanning_promotion": {
                    ("alice", 25),
                    ("bob", 30),
                    ("carol", 35),
                    ("dan", 40),
                },
                "after_promotion": {("carol", 35), ("dan", 40)},
            },
        },
    ]

    for case in cases:
        for window in windows:
            expected = case["expected"][window["name"]]
            run_case = {
                "name": f"{case['name']}.{window['name']}",
                "requestType": "time_series",
                "expression": None,
                "groupBy": case["groupBy"],
                "limit": 100,
                "aggregation": "count()",
                "stepInterval": 60,
                "startMs": window["startMs"],
                "endMs": window["endMs"],
                "validate": None,
            }
            if case["name"].endswith("promoted_age"):
                expected_str = {str(v) for v in expected}
                run_case["validate"] = lambda response, exp=expected, exp_str=expected_str: (
                    _label_values(response, "user.age") == exp
                    or _label_values(response, "user.age") == exp_str
                )
            elif case["name"].endswith("promoted_name"):
                run_case["validate"] = lambda response, exp=expected: (
                    _label_values(response, "user.name") == exp
                )
            else:
                expected_str = {(name, str(age)) for name, age in expected}
                run_case["validate"] = lambda response, exp=expected, exp_str=expected_str: (
                    _label_pairs(response) == exp or _label_pairs(response) == exp_str
                )
            _run_query_case(signoz, token, now, run_case)


def test_logs_json_body_array_membership(
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
    1. Search by has(body.tags, "value") - string array
    2. Search by has(body.ids, 123) - numeric array
    3. Search by has(body.flags, true) - boolean array
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

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=log1_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=log2_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "app-service"},
            attributes={},
            body_json=log3_body,
            body_json_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)

    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        {
            "name": "array_membership.tags_contains_production",
            "requestType": "raw",
            "expression": 'has(body.tags, "production")',
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 2
                and all(
                    "production" in json.loads(row["data"]["body"])["tags"]
                    for row in _get_rows(response)
                )
            ),
        },
        {
            "name": "array_membership.ids_contains_200",
            "requestType": "raw",
            "expression": "has(body.ids, 200)",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 2
                and all(
                    200 in json.loads(row["data"]["body"])["ids"]
                    for row in _get_rows(response)
                )
            ),
        },
        {
            "name": "array_membership.flags_contains_true",
            "requestType": "raw",
            "expression": "has(body.flags, true)",
            "groupBy": None,
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": None,
            "validate": lambda response: (
                len(_get_rows(response)) == 3
                and all(
                    True in json.loads(row["data"]["body"])["flags"]
                    for row in _get_rows(response)
                )
            ),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)
