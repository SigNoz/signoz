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
    build_raw_query,
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
    q = build_raw_query(
        name=name,
        signal="logs",
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
# Filter · GroupBy · Aggregation — non-body fields across all three contexts
#
# Five cases, one dataset. Each case crosses a different combination of
# resource attr / log attr / top-level field in WHERE, GROUP BY, and agg:
#
#   case 1  filter      resource + log attr + top-level in WHERE       (raw)
#   case 2  group by    resource × top-level multi-key                 (scalar)
#   case 3  aggregation count_distinct(log attr) grouped by top-level  (scalar)
#   case 4  agg+filter  count by resource, body-field WHERE guard       (scalar)
#   case 5  agg+filter  count_distinct(resource) by log attr, top-level filter (scalar)
#
# Data landscape (5 logs):
#   log1 — auth-svc, GET,    INFO,  score=80,  user=alice
#   log2 — auth-svc, POST,   ERROR, score=90,  user=bob
#   log3 — auth-svc, GET,    INFO,  score=60,  user=carol
#   log4 — api-gw,   GET,    WARN,  score=70,  user=diana
#   log5 — worker,   DELETE, ERROR, score=100, user=eve
# ============================================================================


def test_non_body_filter_groupby_aggregation(
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
        ("auth-svc", "GET", "INFO", {"score": 80, "user": "alice"}),
        ("auth-svc", "POST", "ERROR", {"score": 90, "user": "bob"}),
        ("auth-svc", "GET", "INFO", {"score": 60, "user": "carol"}),
        ("api-gw", "GET", "WARN", {"score": 70, "user": "diana"}),
        ("worker", "DELETE", "ERROR", {"score": 100, "user": "eve"}),
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
        # 1. Filter — resource + log attr + top-level in WHERE (all three non-body contexts at once)
        {
            "name": "filter.cross_context",
            "requestType": "raw",
            "expression": 'service.name = "auth-svc" AND http.method = "GET" AND severity_text = "INFO"',
            "validate": lambda r: len(get_rows(r)) == 2 and _body_users(r) == {"alice", "carol"},
        },
        # 2. GroupBy — resource × top-level multi-key, no filter
        #    Proves both contexts resolve correctly as simultaneous GROUP BY keys.
        {
            "name": "groupby.resource_x_toplevel",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [build_group_by_field("service.name"), {"name": "severity_text"}],
            "aggregation": "count()",
            # auth-svc+INFO=2, auth-svc+ERROR=1, api-gw+WARN=1, worker+ERROR=1
            "validate": lambda r: (p := {(str(row[0]), str(row[1])): row[-1] for row in get_scalar_table_data(r.json()) if len(row) >= 3}) and p.get(("auth-svc", "INFO")) == 2 and p.get(("auth-svc", "ERROR")) == 1 and p.get(("api-gw", "WARN")) == 1 and p.get(("worker", "ERROR")) == 1,
        },
        # 3. Aggregation — count_distinct(log attr) grouped by top-level
        #    ERROR logs use {POST, DELETE} → 2 distinct methods; INFO/WARN use only GET → 1.
        {
            "name": "agg.count_distinct_attr_by_toplevel",
            "requestType": "scalar",
            "expression": None,
            "groupBy": [{"name": "severity_text"}],
            "aggregation": "count_distinct(http.method)",
            "validate": lambda r: (rows := _counts(r)) and int(rows["INFO"]) == 1 and int(rows["ERROR"]) == 2 and int(rows["WARN"]) == 1,
        },
        # 4. Aggregation + body filter — count by resource WHERE body score >= 80
        #    Body field gates the logs; non-body field drives the GROUP BY.
        {
            "name": "agg.count_by_resource_body_filter",
            "requestType": "scalar",
            "expression": "score >= 80",
            "groupBy": [build_group_by_field("service.name")],
            "aggregation": "count()",
            # score>=80: alice(80), bob(90), eve(100) → auth-svc: 2, worker: 1; api-gw excluded
            "validate": lambda r: (rows := _counts(r)) and int(rows["auth-svc"]) == 2 and int(rows["worker"]) == 1 and "api-gw" not in rows,
        },
        # 5. Aggregation + top-level filter — count_distinct(resource) grouped by log attr
        #    Aggregates a resource attr, groups by a log attr, filtered by a top-level field.
        {
            "name": "agg.count_distinct_resource_by_attr_toplevel_filter",
            "requestType": "scalar",
            "expression": "severity_text IN ['INFO', 'WARN']",
            "groupBy": [{"name": "http.method"}],
            "aggregation": "count_distinct(service.name)",
            # INFO/WARN logs: GET(auth-svc×2, api-gw) → 2 distinct svcs; POST/DELETE excluded
            "validate": lambda r: (rows := _counts(r)) and int(rows["GET"]) == 2 and "POST" not in rows and "DELETE" not in rows,
        },
    ]

    for case in cases:
        case.setdefault("groupBy", None)
        _run_case(signoz, token, start_ms, end_ms, case)


# ============================================================================
# OrderBy — non-body fields as primary sort keys
#
# Four cases cover every non-body context as the primary ORDER BY key:
#   orderby.service_asc          resource attr    (service.name ASC)
#   orderby.timestamp_desc       top-level        (timestamp DESC)
#   orderby.severity_asc         top-level        (severity_text ASC)
#   orderby.multi_method_then_score  log attr primary, body path secondary
#
# Data landscape:
#   log1 — svc-a, GET,    INFO, score=80, ts=now-4s
#   log2 — svc-a, POST,   INFO, score=90, ts=now-3s
#   log3 — svc-b, GET,    WARN, score=60, ts=now-2s
#   log4 — svc-b, DELETE, WARN, score=70, ts=now-1s
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
        Logs(timestamp=now - timedelta(seconds=4), resources={"service.name": "svc-a"}, attributes={"http.method": "GET"}, body_v2=json.dumps({"score": 80}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=3), resources={"service.name": "svc-a"}, attributes={"http.method": "POST"}, body_v2=json.dumps({"score": 90}), body_promoted="", severity_text="INFO"),
        Logs(timestamp=now - timedelta(seconds=2), resources={"service.name": "svc-b"}, attributes={"http.method": "GET"}, body_v2=json.dumps({"score": 60}), body_promoted="", severity_text="WARN"),
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
