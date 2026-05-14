import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    build_group_by_field,
    build_logs_aggregation,
    build_order_by,
    build_scalar_query,
    get_rows,
    get_scalar_table_data,
    make_query_request,
)


def _raw(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    name: str,
    *,
    expression: str | None = None,
    order: list[dict] | None = None,
    limit: int = 100,
) -> requests.Response:
    q = build_scalar_query(
        name=name,
        signal="logs",
        aggregations=[build_logs_aggregation("count()")],
        filter_expression=expression,
        order=order or [build_order_by("timestamp", "desc")],
        limit=limit,
        step_interval=60,
    )
    r = make_query_request(signoz, token, start_ms, end_ms, queries=[q], request_type="raw")
    assert r.status_code == 200, f"HTTP {r.status_code} for '{name}': {r.text}"
    return r


def _scalar(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    name: str,
    aggregation: str,
    *,
    expression: str | None = None,
    group_by: list[dict] | None = None,
) -> requests.Response:
    q = build_scalar_query(
        name=name,
        signal="logs",
        aggregations=[build_logs_aggregation(aggregation)],
        filter_expression=expression,
        group_by=group_by,
        step_interval=60,
    )
    r = make_query_request(signoz, token, start_ms, end_ms, queries=[q], request_type="scalar")
    assert r.status_code == 200, f"HTTP {r.status_code} for '{name}': {r.text}"
    return r


def _body_users(response: requests.Response) -> set[str | None]:
    return {json.loads(row["data"]["body"]).get("user") for row in get_rows(response)}


def _body_scores(response: requests.Response) -> list[int | None]:
    return [json.loads(row["data"]["body"]).get("score") for row in get_rows(response)]


def _services(response: requests.Response) -> list[str]:
    return [row["data"]["resources_string"].get("service.name", "") for row in get_rows(response)]


def _counts(response: requests.Response) -> dict[str, Any]:
    return {str(row[0]): row[-1] for row in get_scalar_table_data(response.json()) if row}


def _run_case(
    signoz: types.SigNoz,
    token: str,
    start_ms: int,
    end_ms: int,
    case: dict[str, Any],
) -> None:
    if case["requestType"] == "raw":
        response = _raw(signoz, token, start_ms, end_ms, case["name"], expression=case.get("expression"), order=case.get("order"))
    else:
        response = _scalar(signoz, token, start_ms, end_ms, case["name"], case["aggregation"], expression=case.get("expression"), group_by=case.get("groupBy"))
    assert case["validate"](response), f"Validation failed for '{case['name']}': {response.json()}"


# ============================================================================
# Filter and GroupBy — resource attributes, log attributes, top-level fields
#
# A single 5-log dataset exercises both filtering (raw) and group-by (scalar),
# covering all three non-body field contexts as WHERE and GROUP BY keys.
#
# Data landscape:
#   log1 — auth-svc, GET,    INFO,  user=alice, status=200
#   log2 — auth-svc, POST,   ERROR, user=bob,   status=500
#   log3 — auth-svc, GET,    INFO,  user=carol, status=200
#   log4 — api-gw,   GET,    WARN,  user=diana, status=204
#   log5 — worker,   DELETE, ERROR, user=eve,   status=400
# ============================================================================


def test_non_body_filter_and_groupby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    log_data = [
        ("auth-svc", "GET",    "INFO",  {"user": "alice", "status": 200}),
        ("auth-svc", "POST",   "ERROR", {"user": "bob",   "status": 500}),
        ("auth-svc", "GET",    "INFO",  {"user": "carol", "status": 200}),
        ("api-gw",   "GET",    "WARN",  {"user": "diana", "status": 204}),
        ("worker",   "DELETE", "ERROR", {"user": "eve",   "status": 400}),
    ]
    logs_list = [
        Logs(
            timestamp=now - timedelta(seconds=len(log_data) - i),
            resources={"service.name": svc},
            attributes={"http.method": method},
            body_v2=json.dumps(body),
            body_promoted="",
            severity_text=sev,
        )
        for i, (svc, method, sev, body) in enumerate(log_data)
    ]
    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # ── top-level field filters ────────────────────────────────────────
        {
            "name": "filter.sev_eq_error",
            "requestType": "raw",
            "expression": 'severity_text = "ERROR"',
            "validate": lambda r: len(get_rows(r)) == 2 and _body_users(r) == {"bob", "eve"},
        },
        {
            "name": "filter.sev_not_eq_info",
            "requestType": "raw",
            "expression": 'severity_text != "INFO"',
            "validate": lambda r: len(get_rows(r)) == 3 and _body_users(r) == {"bob", "diana", "eve"},
        },
        {
            "name": "filter.sev_in",
            "requestType": "raw",
            "expression": "severity_text IN ['INFO', 'WARN']",
            "validate": lambda r: len(get_rows(r)) == 3 and _body_users(r) == {"alice", "carol", "diana"},
        },
        # ── resource attribute filters ─────────────────────────────────────
        {
            "name": "filter.res_contains",
            "requestType": "raw",
            "expression": 'service.name CONTAINS "auth"',
            "validate": lambda r: len(get_rows(r)) == 3 and _body_users(r) == {"alice", "bob", "carol"},
        },
        # ── log attribute filters ──────────────────────────────────────────
        {
            "name": "filter.attr_in",
            "requestType": "raw",
            "expression": "http.method IN ['GET', 'DELETE']",
            "validate": lambda r: len(get_rows(r)) == 4 and _body_users(r) == {"alice", "carol", "diana", "eve"},
        },
        # ── combined filters (cross-context) ──────────────────────────────
        # log attr + top-level
        {
            "name": "filter.attr_and_sev",
            "requestType": "raw",
            "expression": 'http.method = "GET" AND severity_text = "INFO"',
            "validate": lambda r: len(get_rows(r)) == 2 and _body_users(r) == {"alice", "carol"},
        },
        # resource attr + log attr + body field (all three contexts)
        {
            "name": "filter.all_three",
            "requestType": "raw",
            "expression": 'service.name = "auth-svc" AND http.method = "POST" AND status = 500',
            "validate": lambda r: len(get_rows(r)) == 1 and _body_users(r) == {"bob"},
        },
        # ── group by ──────────────────────────────────────────────────────
        # resource attribute: auth-svc×3, api-gw×1, worker×1
        {
            "name": "groupby.service_name",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [build_group_by_field("service.name")],
            "aggregation": "count()",
            "validate": lambda r: (lambda rows: rows.get("auth-svc") == 3 and rows.get("api-gw") == 1 and rows.get("worker") == 1)(_counts(r)),
        },
        # log attribute: GET×3, POST×1, DELETE×1 (no fieldContext — backend auto-resolves from metadata)
        {
            "name": "groupby.http_method",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [{"name": "http.method"}],
            "aggregation": "count()",
            "validate": lambda r: (lambda rows: rows.get("GET") == 3 and rows.get("POST") == 1 and rows.get("DELETE") == 1)(_counts(r)),
        },
        # top-level field: INFO×2, ERROR×2, WARN×1
        {
            "name": "groupby.severity_text",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [{"name": "severity_text"}],
            "aggregation": "count()",
            "validate": lambda r: (lambda rows: rows.get("INFO") == 2 and rows.get("ERROR") == 2 and rows.get("WARN") == 1)(_counts(r)),
        },
        # multi-field: resource attr + log attr (no fieldContext on http.method — auto-resolved)
        {
            "name": "groupby.multi_svc_method",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [build_group_by_field("service.name"), {"name": "http.method"}],
            "aggregation": "count()",
            # auth-svc+GET=2, auth-svc+POST=1, api-gw+GET=1, worker+DELETE=1
            "validate": lambda r: (lambda pairs: pairs.get(("auth-svc", "GET")) == 2 and pairs.get(("auth-svc", "POST")) == 1 and pairs.get(("api-gw", "GET")) == 1 and pairs.get(("worker", "DELETE")) == 1)(
                {(str(row[0]), str(row[1])): row[-1] for row in get_scalar_table_data(r.json()) if len(row) >= 3}
            ),
        },
        # resource attr group by with top-level filter: only INFO logs → auth-svc=2, no other group
        {
            "name": "groupby.svc_filtered_by_sev",
            "requestType": "scalar",
            "expression": 'severity_text = "INFO"',
            "groupBy": [build_group_by_field("service.name")],
            "aggregation": "count()",
            "validate": lambda r: (lambda rows: rows.get("auth-svc") == 2 and len(rows) == 1)(_counts(r)),
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        _run_case(signoz, token, start_ms, end_ms, case)


# ============================================================================
# Aggregation — grouped by non-body fields
#
# A single 4-log dataset with varied attributes exercises aggregation GROUP BY
# across all three non-body contexts (resource attr, log attr, top-level).
#
# Data landscape:
#   log1 — svc-a, GET,    INFO, score=80, ts=now-4s
#   log2 — svc-a, POST,   INFO, score=90, ts=now-3s
#   log3 — svc-b, GET,    WARN, score=60, ts=now-2s
#   log4 — svc-b, DELETE, WARN, score=70, ts=now-1s
#
# Aggregation cross-reference:
#   GROUP BY service.name  → svc-a: sum=170, svc-b: sum=130
#   GROUP BY severity_text → INFO: count=2, WARN: count=2
#   GROUP BY http.method   → GET: sum=140(80+60), POST: sum=90, DELETE: sum=70
# ============================================================================


def test_non_body_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    logs_list = [
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "svc-a"}, attributes={"http.method": "GET"},    body_v2=json.dumps({"score": 80}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "svc-a"}, attributes={"http.method": "POST"},   body_v2=json.dumps({"score": 90}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "svc-b"}, attributes={"http.method": "GET"},    body_v2=json.dumps({"score": 60}), body_promoted="", severity_text="WARN"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "svc-b"}, attributes={"http.method": "DELETE"}, body_v2=json.dumps({"score": 70}), body_promoted="", severity_text="WARN"),
    ]
    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # ── aggregation (scalar) — non-body agg functions, cross-context GROUP BY + filter
        # count() by resource attr, filtered by log attr
        {
            "name": "agg.count_resource_groupby_attr_filter",
            "requestType": "scalar",
            "expression": 'http.method = "GET"',
            "groupBy": [build_group_by_field("service.name")],
            "aggregation": "count()",
            # GET logs only: svc-a/GET, svc-b/GET → each service has 1
            "validate": lambda r: (lambda rows: int(rows["svc-a"]) == 1 and int(rows["svc-b"]) == 1)(_counts(r)),
        },
        # count() by log attr, filtered by top-level
        {
            "name": "agg.count_attr_groupby_toplevel_filter",
            "requestType": "scalar",
            "expression": 'severity_text = "WARN"',
            "groupBy": [build_group_by_field("http.method", "string", "attribute")],
            "aggregation": "count()",
            # WARN logs: svc-b/GET and svc-b/DELETE; POST(INFO) excluded
            "validate": lambda r: (lambda rows: int(rows["GET"]) == 1 and int(rows["DELETE"]) == 1 and "POST" not in rows)(_counts(r)),
        },
        # count_distinct(http.method) by resource attr — aggregates a log attr grouped by resource attr
        {
            "name": "agg.count_distinct_attr_by_resource",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [build_group_by_field("service.name")],
            "aggregation": "count_distinct(http.method)",
            # svc-a: {GET, POST} → 2 distinct, svc-b: {GET, DELETE} → 2 distinct
            "validate": lambda r: (lambda rows: int(rows["svc-a"]) == 2 and int(rows["svc-b"]) == 2)(_counts(r)),
        },
        # count_distinct(service.name) by top-level, filtered by log attr — aggregates resource attr
        {
            "name": "agg.count_distinct_resource_by_toplevel_attr_filter",
            "requestType": "scalar",
            "expression": 'http.method = "GET"',
            "groupBy": [{"name": "severity_text"}],
            "aggregation": "count_distinct(service.name)",
            # GET logs: svc-a/INFO and svc-b/WARN → INFO: 1 distinct svc, WARN: 1 distinct svc
            "validate": lambda r: (lambda rows: int(rows["INFO"]) == 1 and int(rows["WARN"]) == 1)(_counts(r)),
        },
        # count() by (resource, log attr) multi-key GROUP BY, filtered by top-level
        {
            "name": "agg.count_multi_groupby_toplevel_filter",
            "requestType": "scalar",
            "expression": 'severity_text = "INFO"',
            "groupBy": [build_group_by_field("service.name"), build_group_by_field("http.method", "string", "attribute")],
            "aggregation": "count()",
            # INFO logs only: svc-a/GET=1, svc-a/POST=1; svc-b logs are WARN → excluded
            "validate": lambda r: (lambda pairs: pairs.get(("svc-a", "GET")) == 1 and pairs.get(("svc-a", "POST")) == 1 and all(k[0] != "svc-b" for k in pairs))(
                {(str(row[0]), str(row[1])): row[-1] for row in get_scalar_table_data(r.json()) if len(row) >= 3}
            ),
        }
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        _run_case(signoz, token, start_ms, end_ms, case)

# ============================================================================
# OrderBy — Non body paths ordered by non-body fields
#
# A single 4-log dataset with varied attributes exercises ORDER BY
# across resource attribute, and top-level fields.
#
# Data landscape:
#   log1 — svc-a, GET,    INFO, score=80, ts=now-4s
#   log2 — svc-a, POST,   INFO, score=90, ts=now-3s
#   log3 — svc-b, GET,    WARN, score=60, ts=now-2s
#   log4 — svc-b, DELETE, WARN, score=70, ts=now-1s
#
# Aggregation cross-reference:
#   GROUP BY service.name  → svc-a: sum=170, svc-b: sum=130
#   GROUP BY severity_text → INFO: count=2, WARN: count=2
#   GROUP BY http.method   → GET: sum=140(80+60), POST: sum=90, DELETE: sum=70
# ============================================================================


def test_non_body_orderby(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    export_json_types: Callable[[list[Logs]], None],
) -> None:
    now = datetime.now(tz=UTC)
    start_ms = int((now - timedelta(seconds=10)).timestamp() * 1000)
    end_ms = int(now.timestamp() * 1000)

    logs_list = [
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "svc-a"}, attributes={"http.method": "GET"},    body_v2=json.dumps({"score": 80}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "svc-a"}, attributes={"http.method": "POST"},   body_v2=json.dumps({"score": 90}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "svc-b"}, attributes={"http.method": "GET"},    body_v2=json.dumps({"score": 60}), body_promoted="", severity_text="WARN"),
        Logs(timestamp=now - timedelta(seconds=1), resources={"service.name": "svc-b"}, attributes={"http.method": "DELETE"}, body_v2=json.dumps({"score": 70}), body_promoted="", severity_text="WARN"),
    ]
    export_json_types(logs_list)
    insert_logs(logs_list)
    token = get_token(email=USER_ADMIN_EMAIL, password=USER_ADMIN_PASSWORD)

    cases = [
        # resource attr ASC: svc-a×2 before svc-b×2
        {
            "name": "orderby.service_asc",
            "requestType": "raw",
            "order": [build_order_by("service.name", "asc")],
            "validate": lambda r: len(get_rows(r)) == 4 and _services(r)[:2] == ["svc-a", "svc-a"] and _services(r)[2:] == ["svc-b", "svc-b"],
        },
        # top-level timestamp DESC: ts-1s(svc-b/70), ts-2s(svc-b/60), ts-3s(svc-a/90), ts-4s(svc-a/80)
        {
            "name": "orderby.timestamp_desc",
            "requestType": "raw",
            "order": [build_order_by("timestamp", "desc")],
            "validate": lambda r: len(get_rows(r)) == 4 and _body_scores(r) == [70, 60, 90, 80] and _services(r) == ["svc-b", "svc-b", "svc-a", "svc-a"],
        },
        # top-level severity_text ASC: INFO(svc-a×2) before WARN(svc-b×2)
        {
            "name": "orderby.severity_asc",
            "requestType": "raw",
            "order": [build_order_by("severity_text", "asc")],
            "validate": lambda r: len(get_rows(r)) == 4 and _services(r)[:2] == ["svc-a", "svc-a"] and _services(r)[2:] == ["svc-b", "svc-b"],
        },
        # multi-key: http.method ASC then score ASC — DELETE(70), GET(60,80), POST(90)
        {
            "name": "orderby.multi_method_then_score",
            "requestType": "raw",
            "order": [build_order_by("http.method", "asc"), build_order_by("score", "asc")],
            # DELETE < GET < POST alphabetically; within GET scores go 60→80
            "validate": lambda r: len(get_rows(r)) == 4 and _body_scores(r) == [70, 60, 80, 90],
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        _run_case(signoz, token, start_ms, end_ms, case)
