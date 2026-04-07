import json
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.jsontypeexporter import export_json_types, export_promoted_paths
from fixtures.logs import Logs
from fixtures.querier import (
    build_logs_aggregation,
    build_order_by,
    build_scalar_query,
    make_query_request,
)


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
    start_ms = case.get(
        "startMs", int((now - timedelta(seconds=10)).timestamp() * 1000)
    )
    end_ms = case.get("endMs", int(now.timestamp() * 1000))

    aggregation = case.get("aggregation")
    if aggregation and not isinstance(aggregation, list):
        aggregations = [build_logs_aggregation(aggregation)]
    elif aggregation:
        aggregations = aggregation
    else:
        aggregations = []

    order = case.get("order")
    if order is None and case["requestType"] == "raw":
        order = [build_order_by("timestamp", "desc")]

    query = build_scalar_query(
        name=case["name"],
        signal="logs",
        aggregations=aggregations,
        group_by=case.get("groupBy"),
        order=order,
        limit=case.get("limit", 100),
        filter_expression=case.get("expression"),
        step_interval=case.get("stepInterval") or 60,
    )

    response = make_query_request(
        signoz=signoz,
        token=token,
        start_ms=start_ms,
        end_ms=end_ms,
        queries=[query],
        request_type=case["requestType"],
    )
    assert response.status_code == 200, (
        f"HTTP {response.status_code} for case '{case['name']}': {response.text}"
    )
    assert case["validate"](response), (
        f"Validation failed for case '{case['name']}': {response.json()}"
    )


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
# Primitive path operations
# ============================================================================
#
# Data landscape (5 logs, 3 different services):
#   log1 — auth-service: full user object, all fields, status=200
#   log2 — auth-service: partial user (no email, no height), status=401
#   log3 — api-gateway:  full user object, different values, status=200
#   log4 — healthcheck:  completely flat, no user object at all
#   log5 — edge-case:    user.age is a STRING "unknown" (type ambiguity)
#
# This ensures the QB handles:
#   - queries against logs where the path exists vs doesn't exist
#   - type ambiguity (user.age: Int64 in some, String in others)
#   - structurally different logs in the same query window
#   - sparse fields (email/height present in some, absent in others)
# ============================================================================


def test_primitive_path_operations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc)

    # log1: auth-service — full structure
    log1 = json.dumps(
        {
            "user": {
                "name": "alice",
                "age": 25,
                "height": 5.4,
                "active": True,
                "email": "alice@test.com",
                "address": {"zip": 110001},
            },
            "status": 200,
            "http-status": 200,
        }
    )
    # log2: auth-service — partial user (no email, no height), different status
    log2 = json.dumps(
        {
            "user": {
                "name": "bob",
                "age": 30,
                "active": False,
                "address": {"zip": 220002},
            },
            "status": 401,
            "http-status": 401,
        }
    )
    # log3: api-gateway — full user, different values
    log3 = json.dumps(
        {
            "user": {
                "name": "charlie",
                "age": 35,
                "height": 6.1,
                "active": True,
                "address": {"zip": 330003},
            },
            "status": 200,
            "http-status": 200,
        }
    )
    # log4: healthcheck — completely different structure, no user
    log4 = json.dumps(
        {
            "message": "health check passed",
            "status": 200,
        }
    )
    # log5: legacy-service — user.age is a STRING, not int (type ambiguity)
    log5 = json.dumps(
        {
            "user": {
                "name": "diana",
                "age": "unknown",
                "active": True,
            },
            "status": 500,
        }
    )

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=5),
            resources={"service.name": "auth-service"},
            body_v2=log1,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=4),
            resources={"service.name": "auth-service"},
            body_v2=log2,
            body_promoted="",
            severity_text="ERROR",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "api-gateway"},
            body_v2=log3,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "healthcheck"},
            body_v2=log4,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "legacy-service"},
            body_v2=log5,
            body_promoted="",
            severity_text="WARN",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # ── positive operators ─────────────────────────────────────────────
        {
            "name": "prim.string_equal",
            "requestType": "raw",
            "expression": 'body.user.name = "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and json.loads(_get_rows(r)[0]["data"]["body"])["user"]["name"]
            == "alice",
        },
        # log1,log3,log4 have status=200 — log4 is flat with no user object
        {
            "name": "prim.int_equal_across_shapes",
            "requestType": "raw",
            "expression": "body.status = 200",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3,
        },
        # height only exists in log1,log3 — tests comparison on sparse field
        {
            "name": "prim.float_gt_sparse_field",
            "requestType": "raw",
            "expression": "body.user.height > 5.8",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and json.loads(_get_rows(r)[0]["data"]["body"])["user"]["height"]
            == 6.1,
        },
        # user.age: Int64 in log1-3, String "unknown" in log5 — type ambiguity
        {
            "name": "prim.int_lt_with_type_ambiguity",
            "requestType": "raw",
            "expression": "body.user.age < 30",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and json.loads(_get_rows(r)[0]["data"]["body"])["user"]["age"] == 25,
        },
        # Bool has distinct handling (not IndexSupported); log4 has no active field
        {
            "name": "prim.bool_equal_true",
            "requestType": "raw",
            "expression": "body.user.active = true",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3,
        },
        # CONTAINS uses ILIKE — distinct from =
        {
            "name": "prim.string_contains",
            "requestType": "raw",
            "expression": 'body.user.name CONTAINS "ali"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # CONTAINS on Float uses toString() wrapping — distinct code path
        {
            "name": "prim.float_contains",
            "requestType": "raw",
            "expression": "body.user.height Contains 5.4",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # LIKE — distinct operator (sb.Like)
        {
            "name": "prim.string_like",
            "requestType": "raw",
            "expression": "body.user.name LIKE '%li%'",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,  # alice, charlie
        },
        # REGEXP — distinct operator (match() function)
        {
            "name": "prim.string_regexp",
            "requestType": "raw",
            "expression": "body.user.name REGEXP '^[a-b].*'",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,  # alice, bob
        },
        # IN — distinct operator (sb.In)
        {
            "name": "prim.string_in",
            "requestType": "raw",
            "expression": "body.user.name IN ['alice', 'diana']",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # BETWEEN — distinct operator + type ambiguity (log5 "unknown" excluded)
        {
            "name": "prim.int_between_with_type_ambiguity",
            "requestType": "raw",
            "expression": "body.user.age BETWEEN 25 AND 30",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # EXISTS on sparse field — only log1 has email
        {
            "name": "prim.exists_sparse",
            "requestType": "raw",
            "expression": "body.user.email EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # Deep non-array nesting (a.b.c)
        {
            "name": "prim.deeply_nested_equal",
            "requestType": "raw",
            "expression": "body.user.address.zip = 110001",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # Hyphen in key name — special character path escaping
        {
            "name": "prim.hyphen_key_equal",
            "requestType": "raw",
            "expression": "body.http-status = 200",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # ── negative operators ─────────────────────────────────────────────
        # != uses assumeNotNull wrapping
        {
            "name": "prim.not_equal",
            "requestType": "raw",
            "expression": 'body.user.name != "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 3,
        },
        # NOT CONTAINS uses NOT ILIKE — distinct from !=
        {
            "name": "prim.not_contains",
            "requestType": "raw",
            "expression": 'body.user.name NOT CONTAINS "ali"',
            "aggregation": "count()",
            "validate": lambda r: all(
                "ali" not in json.loads(row["data"]["body"]).get("user", {}).get("name", "")
                for row in _get_rows(r)
            ),
        },
        # NOT EXISTS — IS NULL
        {
            "name": "prim.not_exists_sparse",
            "requestType": "raw",
            "expression": "body.user.email NOT EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 2,
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Array path operations
# ============================================================================
#
# Data landscape (4 logs from different services):
#   log1 — university-service: rich education[] with multiple entries,
#          awards[][] deep nesting, participated/team/branch full chain,
#          mixed array element structures (one entry has all fields, another sparse)
#   log2 — enrollment-service: single education entry, NO awards at all,
#          different parameters shape, minimal scores
#   log3 — research-service:  education with deeply nested awards/participated/team,
#          plus http-events with non-array intermediate paths
#   log4 — app-service:       NO education at all, has top-level ids (mixed-type),
#          plus interests[] 6-hop deep nesting
#
# This exercises the condition builder against:
#   - Array(JSON) + Array(Dynamic) dual branches (awards[])
#   - Multi-hop recursion (education[].awards[].participated[].team[].branch)
#   - Terminal typed arrays (scores: Array(Int64), parameters: Array(Float64))
#   - Sparse array elements (one entry has awards, another doesn't)
#   - Logs missing the array path entirely (log4 has no education)
#   - Non-array intermediate paths (http-events[].request-info.host)
#   - Super deep nesting (interests[]...ratings)
#   - Type ambiguity (education[].type: string in some, int in others)
# ============================================================================


def test_array_path_operations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc)

    # log1: university-service — rich, multi-entry education with deep nesting
    log1 = json.dumps(
        {
            "education": [
                {
                    "name": "IIT",
                    "type": "engineering",
                    "parameters": [1.65, 2.5, 3.0],
                    "scores": [90, 85, 95],
                    "awards": [
                        {
                            "name": "Iron Award",
                            "type": "sports",
                            "participated": [
                                {
                                    "team": [{"branch": "Civil"}, {"branch": "CS"}],
                                }
                            ],
                        },
                        {
                            "name": "Gold Award",
                            "type": "academic",
                        },
                    ],
                },
                {
                    "name": "MIT",
                    "type": 10001,
                },
            ],
        }
    )

    # log2: enrollment-service — single sparse entry, NO awards, NO type
    log2 = json.dumps(
        {
            "education": [
                {
                    "name": "Stanford",
                    "parameters": [1.65, 6.0],
                    "scores": [95, 88],
                }
            ],
        }
    )

    # log3: research-service — deep nesting, http-events with non-array intermediate
    log3 = json.dumps(
        {
            "education": [
                {
                    "name": "Harvard",
                    "type": "research",
                    "parameters": [7.0, 8.0],
                    "scores": [60, 65],
                    "awards": [
                        {
                            "name": "Silver Award",
                            "type": "research",
                            "participated": [
                                {
                                    "team": [{"branch": "Civil"}, {"branch": "EE"}],
                                },
                                {
                                    "team": [{"branch": "ME"}],
                                },
                            ],
                        }
                    ],
                }
            ],
            "http-events": [
                {"request-info": {"host": "example.com"}},
                {"request-info": {"host": "other.com"}},
            ],
        }
    )

    # log4: app-service — NO education, deep interests chain
    log4 = json.dumps(
        {
            "interests": [
                {
                    "entities": [
                        {
                            "reviews": [
                                {
                                    "entries": [
                                        {
                                            "metadata": [
                                                {
                                                    "positions": [
                                                        {
                                                            "ratings": [5, 4, 3],
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "http-events": [
                {"request-info": {"host": "test.com"}}
            ],
        }
    )

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=4),
            resources={"service.name": "university-service"},
            body_v2=log1,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "enrollment-service"},
            body_v2=log2,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "research-service"},
            body_v2=log3,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "app-service"},
            body_v2=log4,
            body_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # ── single-hop: education[].field ──────────────────────────────────
        # log1,log2,log3 have education[].name; log4 does not
        {
            "name": "arr.single_exists",
            "requestType": "raw",
            "expression": "body.education[].name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3,
        },
        {
            "name": "arr.single_string_equal",
            "requestType": "raw",
            "expression": 'body.education[].name = "IIT"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        {
            "name": "arr.single_string_contains",
            "requestType": "raw",
            "expression": 'body.education[].name Contains "Stan"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # education[].type: "engineering" (string) in log1[0], 10001 (int!) in log1[1],
        #                    absent in log2, "research" in log3 — type ambiguity
        {
            "name": "arr.single_type_ambiguity_string",
            "requestType": "raw",
            "expression": 'body.education[].type = "engineering"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # Terminal Array(Float64) + Array(Dynamic) dual branch traversal
        {
            "name": "arr.terminal_float_contains",
            "requestType": "raw",
            "expression": "body.education[].parameters CONTAINS 1.65",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # IN on terminal Array(Int64)
        {
            "name": "arr.terminal_int_in",
            "requestType": "raw",
            "expression": "body.education[].scores IN [90, 95]",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # ── single-hop negative ────────────────────────────────────────────
        # != wraps NOT at outer arrayExists level
        {
            "name": "arr.single_not_equal",
            "requestType": "raw",
            "expression": 'body.education[].name != "IIT"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # NOT EXISTS on array path — log4 has no education at all
        {
            "name": "arr.single_not_exists",
            "requestType": "raw",
            "expression": "body.education[].name NOT EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # Negative on dual-branch terminal (Array(Float64) + Array(Dynamic))
        {
            "name": "arr.terminal_not_contains_float",
            "requestType": "raw",
            "expression": "body.education[].parameters NOT CONTAINS 1.65",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # ── double-hop: education[].awards[].field ─────────────────────────
        # Only log1 and log3 have awards; log2 has no awards (sparse)
        {
            "name": "arr.double_exists",
            "requestType": "raw",
            "expression": "body.education[].awards[].name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # Array(JSON) + Array(Dynamic) dual branch at awards[] hop
        {
            "name": "arr.double_string_equal",
            "requestType": "raw",
            "expression": 'body.education[].awards[].name = "Iron Award"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # NOT at double-hop level
        {
            "name": "arr.double_not_equal",
            "requestType": "raw",
            "expression": 'body.education[].awards[].type != "sports"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # ── multi-hop: 4+ hops deep (participated[].team[].branch) ────────
        {
            "name": "arr.multi_hop_branch_contains",
            "requestType": "raw",
            "expression": 'body.education[].awards[].participated[].team[].branch Contains "Civil"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # ── non-array intermediate: http-events[].request-info.host ────────
        {
            "name": "arr.non_array_intermediate_equal",
            "requestType": "raw",
            "expression": 'body.http-events[].request-info.host = "example.com"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # ── super deep: 6-hop interests[]...ratings ────────────────────────
        {
            "name": "arr.super_deep_contains",
            "requestType": "raw",
            "expression": "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 4",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Array membership — has, hasAll, hasAny
# ============================================================================
#
# Data landscape (4 logs):
#   log1 — full: tags, ids, flags, permissions, education with deep participated/members
#   log2 — partial: tags, ids (different), flags (only false), permissions (read only)
#   log3 — different shape: tags but NO ids, NO flags, different permissions
#   log4 — unrelated: no tags, no ids, no flags, no user, no education
# ============================================================================


def test_array_membership_operations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc)

    # log1: full structure
    log1 = json.dumps(
        {
            "tags": ["production", "api", "critical"],
            "flags": [True, False, True],
            "user": {"permissions": ["read", "write", "admin"]},
            "education": [
                {
                    "awards": [
                        {
                            "participated": [
                                {"members": ["Piyush", "Tushar", "Raj"]}
                            ],
                        }
                    ],
                    "parameters": [1.65, 2.5],
                }
            ],
        }
    )
    # log2: different values, sparser
    log2 = json.dumps(
        {
            "tags": ["staging", "api"],
            "flags": [False],
            "user": {"permissions": ["read"]},
            "education": [
                {
                    "awards": [
                        {
                            "participated": [
                                {"members": ["Ankit", "Tushar"]}
                            ],
                        }
                    ],
                    "parameters": [4.0, 5.0],
                }
            ],
        }
    )
    # log3: has tags and permissions but no flags, no education
    log3 = json.dumps(
        {
            "tags": ["production", "web"],
            "user": {"permissions": ["read", "write"]},
        }
    )
    # log4: completely unrelated structure
    log4 = json.dumps(
        {
            "message": "cron job finished",
        }
    )

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=4),
            resources={"service.name": "api-svc"},
            body_v2=log1,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "staging-svc"},
            body_v2=log2,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "web-svc"},
            body_v2=log3,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "cron-svc"},
            body_v2=log4,
            body_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # has(tags, "production"): log1 and log3 (log2 has "staging", log4 has no tags)
        {
            "name": "membership.has_string",
            "requestType": "raw",
            "expression": 'has(body.tags, "production")',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # has(flags, true): only log1 (log2 has [false], log3/log4 have no flags)
        {
            "name": "membership.has_bool_sparse",
            "requestType": "raw",
            "expression": "has(body.flags, true)",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # has() on nested array terminal: parameters contains 1.65 → log1 only
        {
            "name": "membership.has_nested_float",
            "requestType": "raw",
            "expression": "has(body.education[].parameters, 1.65)",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1,
        },
        # hasAll(permissions, [read, write]): log1 and log3 (log2 only has read)
        {
            "name": "membership.hasall_permissions",
            "requestType": "raw",
            "expression": "hasAll(body.user.permissions, ['read', 'write'])",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # hasAny on deep nested path — distinct function + deep nesting
        {
            "name": "membership.hasany_deep_members",
            "requestType": "raw",
            "expression": "hasAny(body.education[].awards[].participated[].members, ['Piyush', 'Tushar'])",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Message / full-text search
# ============================================================================
#
# Data landscape (4 logs):
#   log1 — plain-text body (normalized to {"message": <text>})
#   log2 — JSON body with explicit message field
#   log3 — JSON body with message but no "Payment" keyword (control)
#   log4 — JSON body with NO message field at all (nested object)
# ============================================================================


def test_message_searches(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc)

    # Plain-text → normalized to {"message": "Payment processed successfully"}
    text_log = Logs(
        timestamp=now - timedelta(seconds=4),
        resources={"service.name": "payment-service"},
        body="Payment processed successfully",
        severity_text="INFO",
    )
    # JSON with message
    json_log = Logs(
        timestamp=now - timedelta(seconds=3),
        resources={"service.name": "payment-service"},
        body_v2=json.dumps(
            {"message": "Payment failed with error", "code": 500}
        ),
        body_promoted="",
        severity_text="ERROR",
    )
    # Control: has message but no "Payment"
    control_log = Logs(
        timestamp=now - timedelta(seconds=2),
        resources={"service.name": "db-service"},
        body_v2=json.dumps(
            {"message": "Database connection established", "code": 200}
        ),
        body_promoted="",
        severity_text="INFO",
    )
    # No message field at all — just nested data
    no_msg_log = Logs(
        timestamp=now - timedelta(seconds=1),
        resources={"service.name": "metrics-service"},
        body_v2=json.dumps(
            {"metric": "cpu_usage", "value": 78.5, "tags": {"host": "prod-1"}}
        ),
        body_promoted="",
        severity_text="INFO",
    )

    logs_list = [text_log, json_log, control_log, no_msg_log]
    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    def _body_messages(response: requests.Response) -> List[str]:
        return [
            json.loads(row["data"]["body"]).get("message", "")
            for row in _get_rows(response)
        ]

    payment_messages = {
        "Payment processed successfully",
        "Payment failed with error",
    }

    cases = [
        {
            "name": "msg.fts_body_contains",
            "requestType": "raw",
            "expression": 'body CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: (
                len(_get_rows(r)) == 2
                and set(_body_messages(r)) == payment_messages
            ),
        },
        {
            "name": "msg.body_message_contains",
            "requestType": "raw",
            "expression": 'body.message CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: (
                len(_get_rows(r)) == 2
                and set(_body_messages(r)) == payment_messages
            ),
        },
        {
            "name": "msg.message_key_contains",
            "requestType": "raw",
            "expression": 'message CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: (
                len(_get_rows(r)) == 2
                and set(_body_messages(r)) == payment_messages
            ),
        },
        # FTS — bare keyword
        {
            "name": "msg.fts_quoted",
            "requestType": "raw",
            "expression": '"Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2,
        },
        # = operator via body.message — tests exact match path
        {
            "name": "msg.body_message_exact",
            "requestType": "raw",
            "expression": 'body.message = "Payment processed successfully"',
            "aggregation": "count()",
            "validate": lambda r: (
                len(_get_rows(r)) == 1
                and _body_messages(r)[0] == "Payment processed successfully"
            ),
        },
        # message EXISTS: text_log, json_log, control_log have message; no_msg_log doesn't
        {
            "name": "msg.message_exists",
            "requestType": "raw",
            "expression": "message EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3,
        },
        # ── negative ──────────────────────────────────────────────────────
        # NOT CONTAINS "Payment": control_log and no_msg_log
        {
            "name": "msg.fts_body_not_contains",
            "requestType": "raw",
            "expression": 'body NOT CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 1
            and all(
                "Payment" not in _body_messages(r)
                for msg in _body_messages(r)
            ),
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# GroupBy time series
# ============================================================================
#
# Data landscape (6 logs, mixed shapes):
#   4 logs with user.name + user.age (repeated alice for count > 1)
#   1 log with user.name but NO user.age (sparse)
#   1 log with no user at all (different service)
# ============================================================================


def test_groupby_timeseries(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc)

    logs_data = [
        {"user": {"name": "alice", "age": 25}, "status": 200},
        {"user": {"name": "bob", "age": 30}, "status": 200},
        {"user": {"name": "alice", "age": 25}, "status": 201},
        {"user": {"name": "charlie", "age": 35}, "status": 200},
        {"user": {"name": "alice", "age": 25}, "status": 200},
        {"user": {"name": "diana"}, "status": 500},
        {"message": "health check", "status": 200},
    ]

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=len(logs_data) - i),
            resources={"service.name": "api-service"},
            attributes={},
            body_v2=json.dumps(log_data),
            body_promoted="",
            severity_text="INFO",
        )
        for i, log_data in enumerate(logs_data)
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        {
            "name": "groupby.age",
            "requestType": "time_series",
            "expression": None,
            "groupBy": [{"name": "body.user.age", "fieldDataType": "int64"}],
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": 60,
            "validate": lambda r: (
                {
                    _labels_to_map(s.get("labels")).get("user.age")
                    for s in _get_results(r)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.age")
                    is not None
                }
                in ({"25", "30", "35"}, {25, 30, 35})
            ),
        },
        # Multi-field GroupBy — distinct SQL (multiple group-by columns)
        {
            "name": "groupby.multi",
            "requestType": "time_series",
            "expression": None,
            "groupBy": [
                {"name": "body.user.name", "fieldDataType": "string"},
                {"name": "body.user.age", "fieldDataType": "int64"},
            ],
            "limit": 100,
            "aggregation": "count()",
            "stepInterval": 60,
            "validate": lambda r: (
                {
                    (
                        _labels_to_map(s.get("labels")).get("user.name"),
                        _labels_to_map(s.get("labels")).get("user.age"),
                    )
                    for s in _get_results(r)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.name")
                    is not None
                    and _labels_to_map(s.get("labels")).get("user.age")
                    is not None
                }.issuperset(
                    {("alice", "25"), ("bob", "30"), ("charlie", "35")}
                )
                or {
                    (
                        _labels_to_map(s.get("labels")).get("user.name"),
                        _labels_to_map(s.get("labels")).get("user.age"),
                    )
                    for s in _get_results(r)[0]["aggregations"][0]["series"]
                    if _labels_to_map(s.get("labels")).get("user.name")
                    is not None
                    and _labels_to_map(s.get("labels")).get("user.age")
                    is not None
                }.issuperset({("alice", 25), ("bob", 30), ("charlie", 35)})
            ),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Promoted time windows — temporarily disabled
# ============================================================================


@pytest.mark.skip(
    reason="Promotion is temporarily not supported; uncomment when promotion is back"
)
def test_promoted_time_windows(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
    export_promoted_paths: Callable[[List[str]], None],
) -> None:
    pass


@pytest.mark.skip(
    reason="Promotion is temporarily not supported; uncomment when promotion is back"
)
def test_groupby_timeseries_promoted(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
    export_promoted_paths: Callable[[List[str]], None],
) -> None:
    pass
