import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_logs_aggregation,
    build_order_by,
    build_scalar_query,
    get_column_data_from_response,
    get_rows,
    get_scalar_table_data,
    make_query_request,
)


def _get_bodies(response: requests.Response) -> list[dict[str, Any]]:
    return [json.loads(row["data"]["body"]) for row in get_rows(response)]


def _run_query_case(signoz: types.SigNoz, token: str, now: datetime, case: dict[str, Any]) -> None:
    start_ms = case.get("startMs", int((now - timedelta(seconds=10)).timestamp() * 1000))
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
    assert response.status_code == 200, f"HTTP {response.status_code} for case '{case['name']}': {response.text}"
    assert case["validate"](response), f"Validation failed for case '{case['name']}': {response.json()}"


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
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

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
    # log6: zero-service — all default/empty/falsy values
    #   user.name=""   exercises NOT IN / String operator edge cases
    #   user.age=0     exercises int_lt (0 < 30)
    #   user.active=False  exercises bool EXISTS (false ≠ NULL)
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
            timestamp=now - timedelta(milliseconds=500),
            resources={"service.name": "zero-service"},
            body_v2=log6,
            body_promoted="",
            severity_text="DEBUG",
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
            "expression": 'user.name = "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["name"] == "alice",
        },
        # log1,log3,log4 have status=200 — log4 is flat with no user object
        {
            "name": "prim.int_equal_across_shapes",
            "requestType": "raw",
            "expression": "status = 200",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and all(b["status"] == 200 for b in _get_bodies(r)),
        },
        # height only exists in log1,log3 — tests comparison on sparse field
        {
            "name": "prim.float_gt_sparse_field",
            "requestType": "raw",
            "expression": "user.height > 5.8",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["height"] == 6.1,
        },
        # user.age: Int64 in log1, String "28" in log5, Int64 0 in log6 — type ambiguity.
        # Matches: log1 (25 < 30), log5 ("28" via type ambiguity), log6 (0 < 30) → 3 results.
        {
            "name": "prim.int_lt_with_type_ambiguity",
            "requestType": "raw",
            "expression": "user.age < 30",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3,
        },
        # Bool has distinct handling (not IndexSupported); log4 has no active field
        {
            "name": "prim.bool_equal_true",
            "requestType": "raw",
            "expression": "user.active = true",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "charlie", "diana"},
        },
        # CONTAINS uses ILIKE — distinct from =
        {
            "name": "prim.string_contains",
            "requestType": "raw",
            "expression": 'user.name CONTAINS "ali"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["name"] == "alice",
        },
        # CONTAINS on Float uses toString() wrapping — distinct code path
        {
            "name": "prim.float_contains",
            "requestType": "raw",
            "expression": "user.height Contains 5.4",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["height"] == 5.4,
        },
        # LIKE — distinct operator (sb.Like)
        {
            "name": "prim.string_like",
            "requestType": "raw",
            "expression": "user.name LIKE '%li%'",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "charlie"},
        },
        # REGEXP — distinct operator (match() function)
        {
            "name": "prim.string_regexp",
            "requestType": "raw",
            "expression": "user.name REGEXP '^[a-b].*'",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "bob"},
        },
        # IN — distinct operator (sb.In)
        {
            "name": "prim.string_in",
            "requestType": "raw",
            "expression": "user.name IN ['alice', 'diana']",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and {b["user"]["name"] for b in _get_bodies(r)} == {"alice", "diana"},
        },
        # BETWEEN — distinct operator + type ambiguity (log5 "28" included)
        {
            "name": "prim.int_between_with_type_ambiguity",
            "requestType": "raw",
            "expression": "user.age BETWEEN 25 AND 30",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and {b["user"]["age"] for b in _get_bodies(r)} == {25, 30, "28"},
        },
        # EXISTS on sparse field — only log1 has email
        {
            "name": "prim.exists_sparse",
            "requestType": "raw",
            "expression": "user.email EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["email"] == "alice@test.com",
        },
        # Deep non-array nesting (a.b.c)
        {
            "name": "prim.deeply_nested_equal",
            "requestType": "raw",
            "expression": "user.address.zip = 110001",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["address"]["zip"] == 110001,
        },
        # Hyphen in key name — special character path escaping
        {
            "name": "prim.hyphen_key_equal",
            "requestType": "raw",
            "expression": "http-status = 200",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(b["http-status"] == 200 for b in _get_bodies(r)),
        },
        # ── negative operators ─────────────────────────────────────────────
        # != uses assumeNotNull wrapping
        {
            "name": "prim.not_equal",
            "requestType": "raw",
            "expression": 'user.name != "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) >= 3 and all(b.get("user", {}).get("name") != "alice" for b in _get_bodies(r)),
        },
        # NOT CONTAINS uses NOT ILIKE — distinct from !=
        {
            "name": "prim.not_contains",
            "requestType": "raw",
            "expression": 'user.name NOT CONTAINS "ali"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) >= 3 and all("ali" not in b.get("user", {}).get("name", "") for b in _get_bodies(r)),
        },
        # NOT EXISTS — IS NULL
        {
            "name": "prim.not_exists_sparse",
            "requestType": "raw",
            "expression": "user.email NOT EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) >= 2 and all("email" not in b.get("user", {}) for b in _get_bodies(r)),
        },
        # NOT IN — complement of prim.string_in
        {
            "name": "prim.string_not_in",
            "requestType": "raw",
            "expression": "user.name NOT IN ['alice', 'charlie']",
            "aggregation": "count()",
            # log1(alice) and log3(charlie) are excluded
            # bob, diana, "" (log6), healthcheck (no user) are included
            "validate": lambda r: len(get_rows(r)) >= 2 and all(b.get("user", {}).get("name") not in ("alice", "charlie") for b in _get_bodies(r)),
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Indexed path behavior
#
# Indexes: body.user.name (String/ngrambf), body.user.age (Int64/minmax).
# log4 has no user; log6 has zero/empty values (age=0, name="").
# ============================================================================


def test_indexed_paths(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
    create_json_index: Callable[[str, list[dict[str, Any]]], None],
    check_query_log: Callable[[datetime, str, Callable[[str], bool]], None],
) -> None:
    now = datetime.now(tz=UTC)

    log1 = json.dumps({"user": {"raw-data": {"name": "alice", "age": 25, "active": True}}})
    log2 = json.dumps({"user": {"raw-data": {"name": "bob", "age": 30, "active": False}}})
    log3 = json.dumps({"user": {"raw-data": {"name": "charlie", "age": 35, "active": True}}})
    log4 = json.dumps({"message": "health check passed"})
    log5 = json.dumps({"user": {"raw-data": {"name": "diana", "age": "28", "active": True}}})
    log6 = json.dumps({"user": {"raw-data": {"name": "", "age": 0, "active": False}}})

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
            timestamp=now - timedelta(milliseconds=500),
            resources={"service.name": "zero-service"},
            body_v2=log6,
            body_promoted="",
            severity_text="DEBUG",
        ),
    ]

    export_json_types(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)
    create_json_index(
        token,
        [
            {
                "path": "body.user.raw-data.name",
                "indexes": [
                    {
                        "fieldDataType": "string",
                        "type": "ngrambf_v1(3, 256, 2, 0)",
                        "granularity": 1,
                    }
                ],
            },
            {
                "path": "body.user.raw-data.age",
                "indexes": [
                    {
                        "fieldDataType": "int64",
                        "type": "minmax",
                        "granularity": 1,
                    }
                ],
            },
        ],
    )
    insert_logs(logs_list)

    cases = [
        # ── EXISTS: !isExistsCheck guard → indexed path skipped → plain IS NOT NULL ──────
        # String ngrambf index on body.user.name: EXISTS skips the indexed path.
        # IS NOT NULL("") = true → log6 (name="") IS found.
        # log4 (no user) is the only exclusion → 5 results.
        # query_log check: dynamicElement(...) IS NOT NULL — no assumeNotNull.
        {
            "name": "indexed.string_exists_skips_index_finds_empty",
            "requestType": "raw",
            "expression": "user.raw-data.name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 5 and any(b.get("user", {}).get("raw-data", {}).get("name") == "" for b in _get_bodies(r)),
            "check_query": lambda q: "IS NOT NULL" in q and "assumeNotNull" not in q,
        },
        # Int64 minmax index on body.user.age: EXISTS skips the indexed path.
        # IS NOT NULL(0) = true → log6 (age=0) IS found.
        # log4 (no user) is the only exclusion → 5 results.
        # query_log check: dynamicElement(...) IS NOT NULL — no assumeNotNull.
        {
            "name": "indexed.int64_exists_skips_index_finds_zero",
            "requestType": "raw",
            "expression": "user.raw-data.age EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 5 and any(b.get("user", {}).get("raw-data", {}).get("age") == 0 for b in _get_bodies(r)),
            "check_query": lambda q: "IS NOT NULL" in q and "assumeNotNull" not in q,
        },
        # body.user.name = "": `assumeNotNull(dynamicElement(..., 'String')) = ''
        #                       AND IS NOT NULL(dynamicElement(..., 'String'))`.
        # log6 (name=""):    assumeNotNull("")="" matches AND IS NOT NULL("")=true → FOUND.
        # log4 (no user):    IS NOT NULL(null)=false → NOT found.
        # query_log check: both assumeNotNull (indexed condition) and IS NOT NULL
        #                  (zero-value disambiguation) must appear.
        {
            "name": "indexed.string_empty_eq_disambiguates_absent_field",
            "requestType": "raw",
            "expression": 'user.raw-data.name = ""',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["raw-data"]["name"] == "",
            "check_query": lambda q: "assumeNotNull" in q and "IS NOT NULL" in q,
        },
        # ── Non-EXISTS, non-zero value: indexed condition is self-contained ──────────────
        # body.user.age = 25: `assumeNotNull(dynamicElement(..., 'Int64')) = 25` → only log1.
        # query_log check: assumeNotNull present, no IS NOT NULL (value is non-zero).
        {
            "name": "indexed.int64_nonzero_eq_uses_index",
            "requestType": "raw",
            "expression": "user.raw-data.age = 25",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["raw-data"]["age"] == 25,
            "check_query": lambda q: "assumeNotNull" in q and "IS NOT NULL" not in q,
        },
        # body.user.name = "alice": `assumeNotNull(dynamicElement(..., 'String')) = 'alice'`
        # → only log1.
        # query_log check: assumeNotNull present, no IS NOT NULL (value is non-empty).
        {
            "name": "indexed.string_nonempty_eq_uses_index",
            "requestType": "raw",
            "expression": 'user.raw-data.name = "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["raw-data"]["name"] == "alice",
            "check_query": lambda q: "assumeNotNull" in q and "IS NOT NULL" not in q,
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        before = datetime.now(tz=UTC)
        _run_query_case(signoz, token, now, case)
        if "check_query" in case:
            check_query_log(
                before,
                case["name"],
                case["check_query"],
                tables=["signoz_logs.distributed_logs_v2"],
                must_contain=["body_v2"],
                limit=1,
            )


# ============================================================================
# Select + OrderBy on JSON body paths
#
# 4 logs: unique status (200/201/404/500), unique score (85/72/91/60),
# items[].tags[] gives 2-level array nesting.
# ============================================================================


def test_select_order_by(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

    log1 = json.dumps(
        {
            "status": 200,
            "user": {"name": "alice", "score": 85},
            "items": [{"id": 1, "tags": ["a", "b"]}, {"id": 2, "tags": ["c"]}],
        }
    )
    log2 = json.dumps(
        {
            "status": 404,
            "user": {"name": "bob", "score": 72},
            "items": [{"id": 3, "tags": ["d"]}],
        }
    )
    log3 = json.dumps(
        {
            "status": 500,
            "user": {"name": "charlie", "score": 91},
            "items": [{"id": 4, "tags": ["e", "f"]}],
        }
    )
    log4 = json.dumps(
        {
            "status": 201,
            "user": {"name": "diana", "score": 60},
            "items": [{"id": 5, "tags": ["g"]}],
        }
    )

    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=4),
            resources={"service.name": "svc-a"},
            body_v2=log1,
            body_promoted="",
            severity_text="INFO",
        ),
        Logs(
            timestamp=now - timedelta(seconds=3),
            resources={"service.name": "svc-b"},
            body_v2=log2,
            body_promoted="",
            severity_text="WARN",
        ),
        Logs(
            timestamp=now - timedelta(seconds=2),
            resources={"service.name": "svc-c"},
            body_v2=log3,
            body_promoted="",
            severity_text="ERROR",
        ),
        Logs(
            timestamp=now - timedelta(seconds=1),
            resources={"service.name": "svc-d"},
            body_v2=log4,
            body_promoted="",
            severity_text="INFO",
        ),
    ]

    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    def _run(case: dict[str, Any]) -> None:
        query = build_scalar_query(
            name=case["name"],
            signal="logs",
            aggregations=[build_logs_aggregation("count()")],
            order=case["order"],
            limit=100,
            step_interval=60,
        )
        query["spec"]["selectFields"] = case["selectFields"]
        response = make_query_request(
            signoz=signoz,
            token=token,
            start_ms=start_ms,
            end_ms=end_ms,
            queries=[query],
            request_type="raw",
        )
        assert response.status_code == 200, f"HTTP {response.status_code} for '{case['name']}': {response.text}"
        assert case["validate"](response), f"Validation failed for '{case['name']}': {response.json()}"

    # Timestamp-based ordering helper: the 4 logs are inserted at now-4s/3s/2s/1s,
    # which map to statuses 200/404/500/201 respectively.
    # When ordered by body.status ASC (200→201→404→500) the row timestamps follow
    # the pattern: ts[0] < ts[2] < ts[3] < ts[1]  (i.e. -4s, -3s, -2s, -1s reordered).
    def _ts(r: requests.Response) -> list[int]:
        return [row["data"]["timestamp"] for row in get_rows(r)]

    cases = [
        # select array, order by scalar (status not selected — verify via timestamps)
        {
            "name": "sel_ord.select_items_order_by_status",
            "selectFields": [{"name": "items"}],
            "order": [build_order_by("status", "asc")],
            "validate": lambda r: (
                len(get_rows(r)) == 4
                # items field is present and is a list in every row
                and all(isinstance(x, list) for x in get_column_data_from_response(r.json(), "items"))
                # status ASC maps to timestamp order: [-4s, -1s, -3s, -2s]
                # i.e. ts[0] < ts[2] < ts[3] < ts[1]
                and _ts(r)[0] < _ts(r)[2] < _ts(r)[3] < _ts(r)[1]
            ),
        },
        # select array, order by array field (all arrays are [], order is non-deterministic)
        {
            "name": "sel_ord.select_items_order_by_items",
            "selectFields": [{"name": "items"}],
            "order": [build_order_by("items", "asc")],
            "validate": lambda r: len(get_rows(r)) == 4 and all(isinstance(x, list) for x in get_column_data_from_response(r.json(), "items")),
        },
        # select scalar + array, order by scalar — verify exact status ordering
        {
            "name": "sel_ord.select_status_and_items_order_by_status",
            "selectFields": [{"name": "status"}, {"name": "items"}],
            "order": [build_order_by("status", "asc")],
            "validate": lambda r: get_column_data_from_response(r.json(), "status") == [200, 201, 404, 500] and all(isinstance(x, list) for x in get_column_data_from_response(r.json(), "items")),
        },
        # select scalar + array, order by array field (all arrays are [], order is non-deterministic)
        {
            "name": "sel_ord.select_status_and_items_order_by_items",
            "selectFields": [{"name": "status"}, {"name": "items"}],
            "order": [build_order_by("items", "desc")],
            "validate": lambda r: len(get_rows(r)) == 4 and set(get_column_data_from_response(r.json(), "status")) == {200, 201, 404, 500} and all(isinstance(x, list) for x in get_column_data_from_response(r.json(), "items")),
        },
    ]

    for case in cases:
        _run(case)


# ============================================================================
# Array path operations
# ============================================================================


def test_array_path_operations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

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
            "expression": "education[].name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and all(all("name" in e for e in b["education"]) for b in _get_bodies(r)),
        },
        {
            "name": "arr.single_string_equal",
            "requestType": "raw",
            "expression": 'education[].name = "IIT"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and any(e["name"] == "IIT" for e in _get_bodies(r)[0]["education"]),
        },
        # education[].type: "engineering" (string) in log1[0], 10001 (int!) in log1[1],
        #                    absent in log2, "research" in log3 — type ambiguity
        {
            "name": "arr.single_type_ambiguity_string",
            "requestType": "raw",
            "expression": 'education[].type = "engineering"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and any(e.get("type") == "engineering" for e in _get_bodies(r)[0]["education"]),
        },
        # Terminal Array(Float64) + Array(Dynamic) dual branch traversal
        {
            "name": "arr.terminal_float_contains",
            "requestType": "raw",
            "expression": "education[].parameters CONTAINS 1.65",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(any(1.65 in e.get("parameters", []) for e in b["education"]) for b in _get_bodies(r)),
        },
        # IN on terminal Array(Int64)
        {
            "name": "arr.terminal_int_in",
            "requestType": "raw",
            "expression": "education[].scores IN [90, 95]",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(any(set(e.get("scores", [])) & {90, 95} for e in b["education"]) for b in _get_bodies(r)),
        },
        # ── single-hop negative ────────────────────────────────────────────
        # != wraps NOT at outer arrayExists level
        {
            "name": "arr.single_not_equal",
            "requestType": "raw",
            "expression": 'education[].name != "IIT"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and all(not any(e.get("name") == "IIT" for e in b.get("education", [])) for b in _get_bodies(r)),
        },
        # NOT EXISTS on array path — log4 has no education at all
        {
            "name": "arr.single_not_exists",
            "requestType": "raw",
            "expression": "education[].name NOT EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and all("education" not in b for b in _get_bodies(r)),
        },
        # NOT CONTAINS 1.65: log1 (has 1.65 → excluded), log2 (has 1.65 → excluded).
        # Matches: log3 (params [7.0, 8.0]), log4 (no education — passes NOT CONTAINS).
        # Exercises negation on dual-branch terminal (Array(Float64) + Array(Dynamic)).
        {
            "name": "arr.terminal_not_contains_float",
            "requestType": "raw",
            "expression": "education[].parameters NOT CONTAINS 1.65",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(not any(1.65 in e.get("parameters", []) for e in b.get("education", [])) for b in _get_bodies(r)),
        },
        # ── double-hop: education[].awards[].field ─────────────────────────
        # Only log1 and log3 have awards; log2 has no awards (sparse)
        {
            "name": "arr.double_exists",
            "requestType": "raw",
            "expression": "education[].awards[].name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(any(any("name" in a for a in e.get("awards", [])) for e in b["education"]) for b in _get_bodies(r)),
        },
        # Array(JSON) + Array(Dynamic) dual branch at awards[] hop
        {
            "name": "arr.double_string_equal",
            "requestType": "raw",
            "expression": 'education[].awards[].name = "Iron Award"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and any(any(a.get("name") == "Iron Award" for a in e.get("awards", [])) for e in _get_bodies(r)[0]["education"]),
        },
        # ── multi-hop: 4+ hops deep (participated[].team[].branch) ────────
        {
            "name": "arr.multi_hop_branch_contains",
            "requestType": "raw",
            "expression": 'education[].awards[].participated[].team[].branch Contains "Civil"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(any(any(any(any("Civil" in t.get("branch", "") for t in p.get("team", [])) for p in a.get("participated", [])) for a in e.get("awards", [])) for e in b["education"]) for b in _get_bodies(r)),
        },
        # ── non-array intermediate: http-events[].request-info.host ────────
        {
            "name": "arr.non_array_intermediate_equal",
            "requestType": "raw",
            "expression": 'http-events[].request-info.host = "example.com"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and any(e["request-info"]["host"] == "example.com" for e in _get_bodies(r)[0]["http-events"]),
        },
        # ── super deep: 6-hop interests[]...ratings ────────────────────────
        {
            "name": "arr.super_deep_contains",
            "requestType": "raw",
            "expression": "interests[].entities[].reviews[].entries[].metadata[].positions[].ratings Contains 4",
            "aggregation": "count()",
            "validate": lambda r: (
                len(get_rows(r)) == 1
                and any(any(any(any(any(any(4 in pos.get("ratings", []) for pos in meta.get("positions", [])) for meta in entry.get("metadata", [])) for entry in rev.get("entries", [])) for rev in ent.get("reviews", [])) for ent in interest.get("entities", [])) for interest in _get_bodies(r)[0]["interests"])
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


def test_array_membership_operations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

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
            "expression": 'has(tags, "production")',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all("production" in b["tags"] for b in _get_bodies(r)),
        },
        # has(flags, true): only log1 (log2 has [false], log3/log4 have no flags)
        {
            "name": "membership.has_bool_sparse",
            "requestType": "raw",
            "expression": "has(flags, true)",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and True in _get_bodies(r)[0]["flags"],
        },
        # has() on nested array terminal: parameters contains 1.65 → log1 only
        {
            "name": "membership.has_nested_float",
            "requestType": "raw",
            "expression": "has(education[].parameters, 1.65)",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and any(1.65 in e.get("parameters", []) for e in _get_bodies(r)[0]["education"]),
        },
        {
            "name": "membership.hasall_permissions",
            "requestType": "raw",
            "expression": "hasAll(user.permissions, ['read', 'write'])",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all({"read", "write"}.issubset(set(b["user"]["permissions"])) for b in _get_bodies(r)),
        },
        {
            "name": "membership.hasany_deep_members",
            "requestType": "raw",
            "expression": "hasAny(education[].awards[].participated[].members, ['Piyush', 'Tushar'])",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all(any(any(any({"Piyush", "Tushar"} & set(p.get("members", [])) for p in a.get("participated", [])) for a in e.get("awards", [])) for e in b["education"]) for b in _get_bodies(r)),
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Message / full-text search
# ============================================================================


def test_message_searches(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

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
        body_v2=json.dumps({"metric": "cpu_usage", "value": 78.5, "tags": {"host": "prod-1"}}),
        body_promoted="",
        severity_text="INFO",
    )

    logs_list = [text_log, json_log, control_log, no_msg_log]
    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    def _body_messages(response: requests.Response) -> list[str]:
        return [json.loads(row["data"]["body"]).get("message", "") for row in get_rows(response)]

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
            "validate": lambda r: len(get_rows(r)) == 2 and set(_body_messages(r)) == payment_messages,
        },
        {
            "name": "msg.body_message_contains",
            "requestType": "raw",
            "expression": 'message CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and set(_body_messages(r)) == payment_messages,
        },
        {
            "name": "msg.message_key_contains",
            "requestType": "raw",
            "expression": 'message CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and set(_body_messages(r)) == payment_messages,
        },
        # FTS — String bare keyword
        {
            "name": "msg.fts_quoted",
            "requestType": "raw",
            "expression": '"Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all("Payment" in b.get("message", "") for b in _get_bodies(r)) and r.json().get("data", {}).get("warning") is not None,
        },
        # FTS — bare keyword
        {
            "name": "msg.fts_quoted_without_quotes",
            "requestType": "raw",
            "expression": "Payment",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and all("Payment" in b.get("message", "") for b in _get_bodies(r)) and r.json().get("data", {}).get("warning") is not None,
        },
        # = operator via body.message — tests exact match path
        {
            "name": "msg.body_message_exact",
            "requestType": "raw",
            "expression": 'message = "Payment processed successfully"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _body_messages(r)[0] == "Payment processed successfully",
        },
        # message EXISTS: text_log, json_log, control_log have message; no_msg_log doesn't
        {
            "name": "msg.message_exists",
            "requestType": "raw",
            "expression": "message EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and all("message" in b for b in _get_bodies(r)),
        },
        # ── negative ──────────────────────────────────────────────────────
        # NOT CONTAINS "Payment": control_log and no_msg_log
        {
            "name": "msg.fts_body_not_contains",
            "requestType": "raw",
            "expression": 'body NOT CONTAINS "Payment"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) >= 1 and all("Payment" not in msg for msg in _body_messages(r)),
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        case.setdefault("stepInterval", None)
        _run_query_case(signoz, token, now, case)


# ============================================================================
# Polluted Data — body-path isolation verified against attribute key pollution
# ============================================================================


def test_polluted_data(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

    # Clean baseline — no attribute pollution
    log_clean = json.dumps({"user": {"name": "alice"}})
    # Collision: attribute key is the full dotted path "body.user.name"
    log_body_attr_clash = json.dumps({"user": {"name": "shadow"}})
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
        # ── body-path vs attribute isolation ─────────────────────────────────
        # user.name IS ambiguous (flat-attr-svc has attribute key "user.name" and
        # body.user.name="charlie") so the QB emits a warning and ORs both contexts.
        # However, polluted-svc stores the value under the DIFFERENT key
        # "body.user.name" (not "user.name"), so:
        #   body search  → no match ("impostor" not in any body)
        #   attr search  → no match ("impostor" under "body.user.name", not "user.name")
        # → 0 rows despite the ambiguity warning.  Proves that the "body." prefix
        # in an attribute key does NOT merge into the body-path lookup.
        {
            "name": "polluted.body_prefix_isolated_from_literal_attr_value",
            "requestType": "raw",
            "expression": 'user.name = "impostor"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 0 and r.json().get("data", {}).get("warning") is not None,
        },
        # ghost-svc stores the value under attribute key "body.user.name", not
        # "user.name", and the body has no user object.  Same reasoning → 0 rows.
        {
            "name": "polluted.ghost_log_not_returned_for_body_query",
            "requestType": "raw",
            "expression": 'user.name = "ghost"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 0,
        },
        # Body queries still find real body values when the value exists only in the
        # body (alice only lives in body, not in any attribute) → 1 row.
        {
            "name": "polluted.clean_body_query_unaffected",
            "requestType": "raw",
            "expression": 'user.name = "alice"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 1 and _get_bodies(r)[0]["user"]["name"] == "alice",
        },
        # EXISTS with an ambiguous key uses OR across contexts:
        # body-EXISTS: log_clean(alice), log_body_attr_clash(shadow), log_flat_attr(charlie) → 3
        # attr-EXISTS ("user.name" only): log_flat_attr(shadow) → 1 (already in body set)
        # log_ghost is NOT included — its attr key is "body.user.name", not "user.name".
        # Union: 3 unique logs (alice, shadow, charlie).
        {
            "name": "polluted.exists_scoped_to_body_paths_only",
            "requestType": "raw",
            "expression": "user.name EXISTS",
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 3 and {b.get("user", {}).get("name") for b in _get_bodies(r)} == {"alice", "shadow", "charlie"},
        },
        # ── new: OR match across body AND attribute in the same query ──────────
        # "shadow" exists in body (log_body_attr_clash: body.user.name="shadow") AND
        # in attribute (log_flat_attr: attributes_string["user.name"]="shadow").
        # The ambiguous-OR returns both logs → 2 rows.
        {
            "name": "polluted.ambiguous_key_or_finds_both_body_and_attr_match",
            "requestType": "raw",
            "expression": 'user.name = "shadow"',
            "aggregation": "count()",
            "validate": lambda r: len(get_rows(r)) == 2 and r.json().get("data", {}).get("warning") is not None and {row["data"]["resources_string"].get("service.name") for row in get_rows(r)} == {"polluted-svc", "flat-attr-svc"},
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


def test_groupby_scalar(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)

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
            "groupBy": [{"name": "user.age"}],
            "limit": 100,
            "aggregation": "count()",
            # Each row: [age_value, count]. alice×3→count=3, bob×1→count=1, charlie×1→count=1.
            "validate": lambda r: len(rows := {str(row[0]): row[-1] for row in get_scalar_table_data(r.json()) if row}) >= 3 and rows.get("25") == 3 and rows.get("30") == 1 and rows.get("35") == 1,
        },
        # Multi-field GroupBy — distinct SQL (multiple group-by columns)
        {
            "name": "groupby.multi",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [
                {"name": "user.name"},
                {"name": "user.age"},
            ],
            "limit": 100,
            "aggregation": "count()",
            # Each row: [name, age, count]. Verify (alice,25)→3, (bob,30)→1, (charlie,35)→1.
            "validate": lambda r: len(pairs := {(str(row[0]), str(row[1])): row[-1] for row in get_scalar_table_data(r.json()) if len(row) >= 3}) >= 3 and pairs.get(("alice", "25")) == 3 and pairs.get(("bob", "30")) == 1 and pairs.get(("charlie", "35")) == 1,
        },
    ]

    for case in cases:
        _run_query_case(signoz, token, now, case)
