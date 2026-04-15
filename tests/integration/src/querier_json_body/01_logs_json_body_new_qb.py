import json
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
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


def _get_bodies(response: requests.Response) -> List[Dict[str, Any]]:
    return [json.loads(row["data"]["body"]) for row in _get_rows(response)]


def _get_scalar_rows(response: requests.Response) -> List[List[Any]]:
    """Return table rows from a scalar GroupBy response.

    Scalar response shape: results[0]["data"] = [[group_key..., agg_value], ...]
    """
    results = response.json().get("data", {}).get("data", {}).get("results", [])
    return results[0].get("data", []) if results else []


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
    assert (
        response.status_code == 200
    ), f"HTTP {response.status_code} for case '{case['name']}': {response.text}"
    assert case["validate"](
        response
    ), f"Validation failed for case '{case['name']}': {response.json()}"


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
    create_json_index: Callable[[str, List[Dict[str, Any]]], None],
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
                "age": "28",
                "active": True,
            },
            "status": 500,
        }
    )
    # log6: zero-service — all default/empty/falsy values (edge case for indexed EXISTS)
    #   user.name=""  → indexed String EXISTS uses != "", so empty string = "not exists"
    #   user.age=0    → indexed Int64 EXISTS uses != 0, so zero = "not exists"
    #   user.active=False → Bool is NOT IndexSupported; IS NOT NULL correctly finds it
    log6 = json.dumps(
        {
            "user": {
                "name": "",
                "age": 0,
                "active": False,
            },
            "status": 0,
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
        Logs(
            timestamp=now - timedelta(seconds=0),
            resources={"service.name": "zero-service"},
            body_v2=log6,
            body_promoted="",
            severity_text="DEBUG",
        ),
    ]

    # Token must be obtained before insert_logs so it is available for
    # create_json_body_index, which must run BEFORE the data is inserted.
    # New data parts written after the index exists are covered automatically;
    # no MATERIALIZE INDEX step is required.
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)
    export_json_types(logs_list)
    create_json_index(
        token,
        [
            # ngrambf on String paths activates the indexed EXISTS code path:
            #   assumeNotNull(val) != "" AND IS NOT NULL(val)
            # This means body.user.name="" is treated as non-existent (edge case).
            {
                "path": "body.user.name",
                "indexes": [
                    {
                        "column_type": "String",
                        "type": "ngrambf_v1(3, 256, 2, 0)",
                        "granularity": 1,
                    }
                ],
            },
            # minmax on Int64 paths activates the indexed EXISTS code path:
            #   assumeNotNull(val) != 0 AND IS NOT NULL(val)
            # This means body.user.age=0 is treated as non-existent (edge case).
            {
                "path": "body.user.age",
                "indexes": [
                    {
                        "column_type": "Int64",
                        "type": "minmax",
                        "granularity": 1,
                    }
                ],
            },
        ],
    )
    insert_logs(logs_list)

    cases = [
        # ── positive operators ─────────────────────────────────────────────
        {
            "name": "prim.string_equal",
            "requestType": "raw",
            "expression": 'body.user.name = "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and json.loads(_get_rows(r)[0]["data"]["body"])["user"]["name"] == "alice",
        },
        # log1,log3,log4 have status=200 — log4 is flat with no user object
        {
            "name": "prim.int_equal_across_shapes",
            "requestType": "raw",
            "expression": "body.status = 200",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3
            and all(b["status"] == 200 for b in _get_bodies(r)),
        },
        # height only exists in log1,log3 — tests comparison on sparse field
        {
            "name": "prim.float_gt_sparse_field",
            "requestType": "raw",
            "expression": "body.user.height > 5.8",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and json.loads(_get_rows(r)[0]["data"]["body"])["user"]["height"] == 6.1,
        },
        # user.age: Int64 in log1, String "28" in log5, Int64 0 in log6 — type ambiguity
        # log6 (age=0) is now also < 30, so count increases from 2 to 3
        {
            "name": "prim.int_lt_with_type_ambiguity",
            "requestType": "raw",
            "expression": "body.user.age < 30",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3
        },
        # Bool has distinct handling (not IndexSupported); log4 has no active field
        {
            "name": "prim.bool_equal_true",
            "requestType": "raw",
            "expression": "body.user.active = true",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3
            and {b["user"]["name"] for b in _get_bodies(r)}
            == {"alice", "charlie", "diana"},
        },
        # CONTAINS uses ILIKE — distinct from =
        {
            "name": "prim.string_contains",
            "requestType": "raw",
            "expression": 'body.user.name CONTAINS "ali"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["name"] == "alice",
        },
        # CONTAINS on Float uses toString() wrapping — distinct code path
        {
            "name": "prim.float_contains",
            "requestType": "raw",
            "expression": "body.user.height Contains 5.4",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["height"] == 5.4,
        },
        # LIKE — distinct operator (sb.Like)
        {
            "name": "prim.string_like",
            "requestType": "raw",
            "expression": "body.user.name LIKE '%li%'",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "charlie"},
        },
        # REGEXP — distinct operator (match() function)
        {
            "name": "prim.string_regexp",
            "requestType": "raw",
            "expression": "body.user.name REGEXP '^[a-b].*'",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "bob"},
        },
        # IN — distinct operator (sb.In)
        {
            "name": "prim.string_in",
            "requestType": "raw",
            "expression": "body.user.name IN ['alice', 'diana']",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "diana"},
        },
        # BETWEEN — distinct operator + type ambiguity (log5 "28" included)
        {
            "name": "prim.int_between_with_type_ambiguity",
            "requestType": "raw",
            "expression": "body.user.age BETWEEN 25 AND 30",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3
            and {b["user"]["age"] for b in _get_bodies(r)} == {25, 30, "28"},
        },
        # EXISTS on sparse field — only log1 has email
        {
            "name": "prim.exists_sparse",
            "requestType": "raw",
            "expression": "body.user.email EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["email"] == "alice@test.com",
        },
        # Deep non-array nesting (a.b.c)
        {
            "name": "prim.deeply_nested_equal",
            "requestType": "raw",
            "expression": "body.user.address.zip = 110001",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["address"]["zip"] == 110001,
        },
        # Hyphen in key name — special character path escaping
        {
            "name": "prim.hyphen_key_equal",
            "requestType": "raw",
            "expression": "body.http-status = 200",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(b["http-status"] == 200 for b in _get_bodies(r)),
        },
        # ── negative operators ─────────────────────────────────────────────
        # != uses assumeNotNull wrapping
        {
            "name": "prim.not_equal",
            "requestType": "raw",
            "expression": 'body.user.name != "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 3
            and all(b.get("user", {}).get("name") != "alice" for b in _get_bodies(r)),
        },
        # NOT CONTAINS uses NOT ILIKE — distinct from !=
        {
            "name": "prim.not_contains",
            "requestType": "raw",
            "expression": 'body.user.name NOT CONTAINS "ali"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 3
            and all(
                "ali" not in b.get("user", {}).get("name", "") for b in _get_bodies(r)
            ),
        },
        # NOT EXISTS — IS NULL
        {
            "name": "prim.not_exists_sparse",
            "requestType": "raw",
            "expression": "body.user.email NOT EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 2
            and all("email" not in b.get("user", {}) for b in _get_bodies(r)),
        },
        # ── missing negative operators ─────────────────────────────────────
        # NOT IN — operator present in applyOperator but not tested until now
        {
            "name": "prim.string_not_in",
            "requestType": "raw",
            "expression": "body.user.name NOT IN ['alice', 'charlie']",
            "aggregation": "count()",
            # log1(alice) and log3(charlie) are excluded
            # bob, diana, "" (log6), healthcheck (no user) are included
            "validate": lambda r: len(_get_rows(r)) >= 2
            and all(
                b.get("user", {}).get("name") not in ("alice", "charlie")
                for b in _get_bodies(r)
            ),
        },
        # NOT BETWEEN — operator present in applyOperator but not tested until now
        {
            "name": "prim.int_not_between",
            "requestType": "raw",
            "expression": "body.user.age NOT BETWEEN 26 AND 34",
            "aggregation": "count()",
            # log2(age=30) is the only Int64 value inside [26,34] → excluded
            # log1(25) and log3(35) are clearly outside → included
            "validate": lambda r: (
                not any(b.get("user", {}).get("age") == 30 for b in _get_bodies(r))
                and {25, 35}.issubset(
                    {b.get("user", {}).get("age") for b in _get_bodies(r)}
                )
            ),
        },
        # ── indexed-path EXISTS edge cases (log6 exercises these) ──────────
        # Indexed String EXISTS: `assumeNotNull(val) != "" AND IS NOT NULL(val)`.
        # log6 (name="") passes IS NOT NULL but fails != "" → treated as absent.
        # log4 (healthcheck, no user) also absent. Result: 4 (alice, bob, charlie, diana).
        {
            "name": "edge.empty_string_not_matched_by_indexed_exists",
            "requestType": "raw",
            "expression": "body.user.name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 4
            and not any(b.get("user", {}).get("name") == "" for b in _get_bodies(r)),
        },
        # Indexed Int64 EXISTS: `assumeNotNull(val) != 0 AND IS NOT NULL(val)`.
        # log6 (age=0): assumeNotNull(0)=0 → 0!=0=false → not matched.
        # log5("28" String) is found via its own String-type plan branch.
        # Result: log1(25), log2(30), log3(35), log5("28") = 4. NOT log4 or log6.
        {
            "name": "edge.zero_int_not_matched_by_indexed_exists",
            "requestType": "raw",
            "expression": "body.user.age EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 4
            and not any(b.get("user", {}).get("age") == 0 for b in _get_bodies(r)),
        },
        # Bool is NOT IndexSupported → EXISTS uses plain IS NOT NULL(dynamicElement(..., 'Bool')).
        # false is a concrete stored value (not NULL) → IS NOT NULL(false) = true → found.
        # Contrast with above: log6(active=False) IS found; log6(age=0) is NOT.
        # log1(True), log2(False), log3(True), log5(True), log6(False) all have active.
        # log4 (healthcheck, no user.active) is the only exclusion → 5 results.
        {
            "name": "edge.false_bool_correctly_matched_by_exists",
            "requestType": "raw",
            "expression": "body.user.active EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 5
            and all(
                "active" in b.get("user", {})
                for b in _get_bodies(r)
                if "user" in b
            ),
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
            "http-events": [{"request-info": {"host": "test.com"}}],
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
            "validate": lambda r: len(_get_rows(r)) == 3
            and all(all("name" in e for e in b["education"]) for b in _get_bodies(r)),
        },
        {
            "name": "arr.single_string_equal",
            "requestType": "raw",
            "expression": 'body.education[].name = "IIT"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and any(e["name"] == "IIT" for e in _get_bodies(r)[0]["education"]),
        },
        # education[].type: "engineering" (string) in log1[0], 10001 (int!) in log1[1],
        #                    absent in log2, "research" in log3 — type ambiguity
        {
            "name": "arr.single_type_ambiguity_string",
            "requestType": "raw",
            "expression": 'body.education[].type = "engineering"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and any(
                e.get("type") == "engineering" for e in _get_bodies(r)[0]["education"]
            ),
        },
        # Terminal Array(Float64) + Array(Dynamic) dual branch traversal
        {
            "name": "arr.terminal_float_contains",
            "requestType": "raw",
            "expression": "body.education[].parameters CONTAINS 1.65",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                any(1.65 in e.get("parameters", []) for e in b["education"])
                for b in _get_bodies(r)
            ),
        },
        # IN on terminal Array(Int64)
        {
            "name": "arr.terminal_int_in",
            "requestType": "raw",
            "expression": "body.education[].scores IN [90, 95]",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                any(set(e.get("scores", [])) & {90, 95} for e in b["education"])
                for b in _get_bodies(r)
            ),
        },
        # ── single-hop negative ────────────────────────────────────────────
        # != wraps NOT at outer arrayExists level
        {
            "name": "arr.single_not_equal",
            "requestType": "raw",
            "expression": 'body.education[].name != "IIT"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 3
            and all(
                not any(e.get("name") == "IIT" for e in b.get("education", []))
                for b in _get_bodies(r)
            ),
        },
        # NOT EXISTS on array path — log4 has no education at all
        {
            "name": "arr.single_not_exists",
            "requestType": "raw",
            "expression": "body.education[].name NOT EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and all("education" not in b for b in _get_bodies(r)),
        },
        # Negative on dual-branch terminal (Array(Float64) + Array(Dynamic))
        {
            "name": "arr.terminal_not_contains_float",
            "requestType": "raw",
            "expression": "body.education[].parameters NOT CONTAINS 1.65",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                not any(1.65 in e.get("parameters", []) for e in b.get("education", []))
                for b in _get_bodies(r)
            ),
        },
        # ── double-hop: education[].awards[].field ─────────────────────────
        # Only log1 and log3 have awards; log2 has no awards (sparse)
        {
            "name": "arr.double_exists",
            "requestType": "raw",
            "expression": "body.education[].awards[].name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                any(
                    any("name" in a for a in e.get("awards", []))
                    for e in b["education"]
                )
                for b in _get_bodies(r)
            ),
        },
        # Array(JSON) + Array(Dynamic) dual branch at awards[] hop
        {
            "name": "arr.double_string_equal",
            "requestType": "raw",
            "expression": 'body.education[].awards[].name = "Iron Award"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and any(
                any(a.get("name") == "Iron Award" for a in e.get("awards", []))
                for e in _get_bodies(r)[0]["education"]
            ),
        },
        # ── multi-hop: 4+ hops deep (participated[].team[].branch) ────────
        {
            "name": "arr.multi_hop_branch_contains",
            "requestType": "raw",
            "expression": 'body.education[].awards[].participated[].team[].branch Contains "Civil"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                any(
                    any(
                        any(
                            any(
                                "Civil" in t.get("branch", "")
                                for t in p.get("team", [])
                            )
                            for p in a.get("participated", [])
                        )
                        for a in e.get("awards", [])
                    )
                    for e in b["education"]
                )
                for b in _get_bodies(r)
            ),
        },
        # ── non-array intermediate: http-events[].request-info.host ────────
        {
            "name": "arr.non_array_intermediate_equal",
            "requestType": "raw",
            "expression": 'body.http-events[].request-info.host = "example.com"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and any(
                e["request-info"]["host"] == "example.com"
                for e in _get_bodies(r)[0]["http-events"]
            ),
        },
        # ── super deep: 6-hop interests[]...ratings ────────────────────────
        {
            "name": "arr.super_deep_contains",
            "requestType": "raw",
            "expression": "body.interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 4",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and any(
                any(
                    any(
                        any(
                            any(
                                any(
                                    4 in pos.get("ratings", [])
                                    for pos in meta.get("positions", [])
                                )
                                for meta in entry.get("metadata", [])
                            )
                            for entry in rev.get("entries", [])
                        )
                        for rev in ent.get("reviews", [])
                    )
                    for ent in interest.get("entities", [])
                )
                for interest in _get_bodies(r)[0]["interests"]
            ),
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
                            "participated": [{"members": ["Piyush", "Tushar", "Raj"]}],
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
                            "participated": [{"members": ["Ankit", "Tushar"]}],
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
            "validate": lambda r: len(_get_rows(r)) == 2
            and all("production" in b["tags"] for b in _get_bodies(r)),
        },
        # has(flags, true): only log1 (log2 has [false], log3/log4 have no flags)
        {
            "name": "membership.has_bool_sparse",
            "requestType": "raw",
            "expression": "has(body.flags, true)",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and True in _get_bodies(r)[0]["flags"],
        },
        # has() on nested array terminal: parameters contains 1.65 → log1 only
        {
            "name": "membership.has_nested_float",
            "requestType": "raw",
            "expression": "has(body.education[].parameters, 1.65)",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and any(
                1.65 in e.get("parameters", []) for e in _get_bodies(r)[0]["education"]
            ),
        },
        {
            "name": "membership.hasall_permissions",
            "requestType": "raw",
            "expression": "hasAll(body.user.permissions, ['read', 'write'])",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                {"read", "write"}.issubset(set(b["user"]["permissions"]))
                for b in _get_bodies(r)
            ),
        },
        {
            "name": "membership.hasany_deep_members",
            "requestType": "raw",
            "expression": "hasAny(body.education[].awards[].participated[].members, ['Piyush', 'Tushar'])",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all(
                any(
                    any(
                        any(
                            {"Piyush", "Tushar"} & set(p.get("members", []))
                            for p in a.get("participated", [])
                        )
                        for a in e.get("awards", [])
                    )
                    for e in b["education"]
                )
                for b in _get_bodies(r)
            ),
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
        body_v2=json.dumps({"message": "Payment failed with error", "code": 500}),
        body_promoted="",
        severity_text="ERROR",
    )
    # Control: has message but no "Payment"
    control_log = Logs(
        timestamp=now - timedelta(seconds=2),
        resources={"service.name": "db-service"},
        body_v2=json.dumps({"message": "Database connection established", "code": 200}),
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
                len(_get_rows(r)) == 2 and set(_body_messages(r)) == payment_messages
            ),
        },
        {
            "name": "msg.body_message_contains",
            "requestType": "raw",
            "expression": 'body.message CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: (
                len(_get_rows(r)) == 2 and set(_body_messages(r)) == payment_messages
            ),
        },
        {
            "name": "msg.message_key_contains",
            "requestType": "raw",
            "expression": 'message CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: (
                len(_get_rows(r)) == 2 and set(_body_messages(r)) == payment_messages
            ),
        },
        # FTS — bare keyword
        {
            "name": "msg.fts_quoted",
            "requestType": "raw",
            "expression": '"Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 2
            and all("Payment" in b.get("message", "") for b in _get_bodies(r)),
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
            "validate": lambda r: len(_get_rows(r)) == 3
            and all("message" in b for b in _get_bodies(r)),
        },
        # ── negative ──────────────────────────────────────────────────────
        # NOT CONTAINS "Payment": control_log and no_msg_log
        {
            "name": "msg.fts_body_not_contains",
            "requestType": "raw",
            "expression": 'body NOT CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) >= 1
            and all("Payment" not in msg for msg in _body_messages(r)),
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)

# ============================================================================
# Corrupted / Polluted Data
# ============================================================================
#
# This means inserting an attribute with key `body.user.name` deliberately
# pollutes all `body.user.name` queries. The QueryBuilder returns logs based on that
# attribute even when the body JSON does not contain the matching field.
#
# ============================================================================

def test_polluted_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[List[Logs]], None],
    export_json_types: Callable[[List[Logs]], None],
) -> None:
    now = datetime.now(tz=timezone.utc)

    # Clean baseline — no attribute pollution
    log_clean = json.dumps({"user": {"name": "alice"}})
    # Collision: attribute key is the full dotted path "body.user.name"
    log_body_attr_clash = json.dumps({"user": {"name": "bob"}})
    # Ghost: body has NO user.name; only the attribute key "body.user.name" exists
    log_ghost = json.dumps({"status": 200})
    # Flat attr: attribute key is "user.name" (without body. prefix) — no collision expected
    log_flat_attr = json.dumps({"user": {"name": "charlie"}})

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=4),
            resources={"service.name": "clean-svc"},
            body_v2=log_clean,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "polluted-svc"},
            attributes={"body.user.name": "impostor"},
            body_v2=log_body_attr_clash,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "ghost-svc"},
            attributes={"body.user.name": "ghost"},
            body_v2=log_ghost,
            body_promoted="",
            severity_text="WARN",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "flat-attr-svc"},
            attributes={"user.name": "shadow"},
            body_v2=log_flat_attr,
            body_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # ── attribute "body.user.name" collides with body.user.name queries ──
        # body says "bob"; QB generates: body_json_cond OR attrs['body.user.name']='impostor'
        # The attribute branch fires → FALSE POSITIVE: returned log whose body ≠ "impostor"
        {
            "name": "polluted.attr_key_with_body_prefix_collides",
            "requestType": "raw",
            "expression": 'body.user.name = "impostor"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["name"] == "bob",
        },
        # Ghost log: body has NO user.name path at all; only the attribute fires.
        # Clearest false-positive: a log with no user data surfaces in a user query.
        {
            "name": "polluted.ghost_log_returned_via_attr_branch",
            "requestType": "raw",
            "expression": 'body.user.name = "ghost"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and "user" not in _get_bodies(r)[0],
        },
        # Flat attribute "user.name" does NOT collide with "body.user.name" queries.
        # VisitKey second lookup is fieldKeys["body.user.name"]; flat key is absent there.
        {
            "name": "polluted.flat_attr_key_no_collision_with_body_prefix",
            "requestType": "raw",
            "expression": 'user.name = "shadow"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["name"] == "charlie",
        },
        # EXISTS — all 4 logs match through OR:
        #   log_clean:           body path hit
        #   log_body_attr_clash: body path hit (OR attribute hit)
        #   log_ghost:           body path misses BUT attribute branch hits
        #   log_flat_attr:       body path hit (flat attr "user.name" doesn't interfere)
        {
            "name": "polluted.exists_affected_by_attr_collision",
            "requestType": "raw",
            "expression": "body.user.name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 4,
        },
        # Explicitly querying the attribute by its full dotted key name
        {
            "name": "polluted.explicit_attr_query_with_dotted_key",
            "requestType": "raw",
            "expression": 'attribute.body.user.name = "impostor"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["name"] == "bob",
        },
        # Flat attribute query — "user.name" holds "shadow" on log_flat_attr
        {
            "name": "polluted.flat_attr_key_explicit_query",
            "requestType": "raw",
            "expression": 'attribute.user.name = "shadow"',
            "aggregation": "count()",
            "validate": lambda r: len(_get_rows(r)) == 1
            and _get_bodies(r)[0]["user"]["name"] == "charlie",
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# GroupBy — scalar aggregation
# ============================================================================
#
# Uses requestType="scalar" (flat table: [group_key..., count]) instead of
# time_series, because the test goal is to verify body JSON path resolution
# in GROUP BY SQL — not time-bucketing semantics.  Scalar results are a
# plain list of rows, far simpler to assert than navigating
# aggregations[0]["series"][*]["labels"].
#
# Data landscape (7 logs, mixed shapes):
#   3 × alice (age=25) — count > 1 exercises the aggregation correctly
#   1 × bob   (age=30)
#   1 × charlie (age=35)
#   1 × diana  (no age — sparse field)
#   1 × health check (no user at all)
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
        # Scalar GroupBy: results[0]["data"] = [[group_key, count], ...]
        # Simpler to validate than time_series which nests inside aggregations[0]["series"].
        {
            "name": "groupby.age",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [{"name": "body.user.age", "fieldDataType": "int64"}],
            "limit": 100,
            "aggregation": "count()",
            # Each row: [age_value, count]
            # Verify the three distinct ages appear as group keys (str or int).
            "validate": lambda r: {str(row[0]) for row in _get_scalar_rows(r) if row}
            >= {"25", "30", "35"},
        },
        # Multi-field GroupBy — distinct SQL (multiple group-by columns)
        {
            "name": "groupby.multi",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [
                {"name": "body.user.name", "fieldDataType": "string"},
                {"name": "body.user.age", "fieldDataType": "int64"},
            ],
            "limit": 100,
            "aggregation": "count()",
            # Each row: [name, age, count]
            # Verify the three (name, age) pairs all appear as group keys.
            "validate": lambda r: {
                (str(row[0]), str(row[1])) for row in _get_scalar_rows(r) if len(row) >= 2
            }.issuperset({("alice", "25"), ("bob", "30"), ("charlie", "35")}),
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)
