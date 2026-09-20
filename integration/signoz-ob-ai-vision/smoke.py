#!/usr/bin/env python3
"""End-to-end OTLP -> SigNoz OceanBase profile -> AI Vision smoke test.

Only the Python standard library is used.  The script never connects to the
database: every read assertion goes through the public query contracts that AI
Vision uses.
"""

from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


class SmokeFailure(RuntimeError):
    """A failed smoke-test assertion with a user-facing message."""


def _safe_url(raw: str) -> str:
    """Return a URL suitable for logs even if the input contains userinfo."""
    parsed = urlsplit(raw)
    host = parsed.hostname or ""
    if parsed.port:
        host = f"{host}:{parsed.port}"
    if parsed.username or parsed.password:
        host = f"***@{host}"
    return urlunsplit((parsed.scheme, host, parsed.path, parsed.query, ""))


def _join_url(base: str, path: str) -> str:
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


class JSONClient:
    def __init__(self, base_url: str, headers: dict[str, str], request_timeout: float):
        self.base_url = base_url.rstrip("/")
        self.headers = dict(headers)
        self.request_timeout = request_timeout

    def request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, Any] | None = None,
        payload: Any | None = None,
    ) -> Any:
        url = _join_url(self.base_url, path)
        if query:
            url = f"{url}?{urlencode(query)}"
        headers = {"Accept": "application/json", **self.headers}
        body = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            body = _json_bytes(payload)
        request = Request(url, data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=self.request_timeout) as response:
                raw = response.read()
                if not 200 <= response.status < 300:
                    raise SmokeFailure(f"{method} {_safe_url(url)} returned HTTP {response.status}")
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")[:1200]
            raise SmokeFailure(
                f"{method} {_safe_url(url)} returned HTTP {exc.code}: {response_body}"
            ) from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise SmokeFailure(f"{method} {_safe_url(url)} failed: {exc}") from exc

        if not raw.strip():
            return {}
        try:
            result = json.loads(raw)
            # Main domain routes use the normal SigNoz response envelope.
            if path.startswith("/api/v1/ai-vision/"):
                return _unwrap_success(result)
            return result
        except json.JSONDecodeError as exc:
            preview = raw.decode("utf-8", errors="replace")[:300]
            raise SmokeFailure(
                f"{method} {_safe_url(url)} did not return JSON: {preview}"
            ) from exc

    def get(self, path: str, *, query: dict[str, Any] | None = None) -> Any:
        return self.request("GET", path, query=query)

    def post(self, path: str, payload: Any) -> Any:
        return self.request("POST", path, payload=payload)


def _string_attr(key: str, value: str) -> dict[str, Any]:
    return {"key": key, "value": {"stringValue": value}}


def _int_attr(key: str, value: int) -> dict[str, Any]:
    # OTLP/JSON represents int64 as a base-10 string.
    return {"key": key, "value": {"intValue": str(value)}}


@dataclass(frozen=True)
class RunData:
    run_id: str
    session_id: str
    space_id: str
    user_id: str
    agent_product: str
    service_name: str
    metric_name: str
    trace_id: str
    root_span_id: str
    child_span_id: str
    log_event_id: str
    start_ms: int
    end_ms: int
    trace_payload: dict[str, Any]
    log_payload: dict[str, Any]
    metric_payload: dict[str, Any]


CODEX_PERSONAL_DASHBOARD_CONTRACTS = {
    "codex.tokens.summary": "input_tokens",
    "codex.sessions.summary": "total_sessions",
    "codex.sessions.list": "session_id",
    "codex.sessions.timeseries": "session_count",
    "codex.events.timeseries": "event_name",
    "codex.user_prompt.detail": "prompt",
    "codex.models.summary": "model",
    "codex.models.timeseries": "event_name",
    "codex.api.errors": "total_requests",
    "codex.models.latency_timeseries": "model",
    "codex.models.token_timeseries": "model",
    "codex.models.api_detail": "model",
    "codex.tools.summary": "tool_name",
    "codex.tools.timeseries": "tool_name",
    "codex.tools.decision_timeseries": "decision",
    "codex.tools.detail": "tool",
}

CODEX_SPACE_DASHBOARD_CONTRACTS = {
    "codex.team.summary": "total_users",
    "codex.team.member_ranking": "username",
    "codex.team.member_trend.users": "active_users",
    "codex.team.member_trend.tokens": "total_tokens",
    "codex.team.model_distribution": "model",
}


def build_run(args: argparse.Namespace) -> RunData:
    entropy = secrets.token_hex(6)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_id = f"smoke-{stamp}-{entropy}"
    session_id = f"session-{run_id}"
    space_id = args.space_id
    user_id = args.user_id or f"user-{run_id}"
    trace_id = secrets.token_hex(16)
    root_span_id = secrets.token_hex(8)
    child_span_id = secrets.token_hex(8)
    log_event_id = f"event-{run_id}"

    base_ns = time.time_ns() - 2_000_000_000
    child_start_ns = base_ns + 200_000_000
    child_end_ns = child_start_ns + 350_000_000
    root_end_ns = base_ns + 1_000_000_000
    log_ns = base_ns + 600_000_000
    metric_ns = base_ns + 800_000_000
    start_ms = base_ns // 1_000_000 - 60_000
    end_ms = root_end_ns // 1_000_000 + 60_000

    resource_attributes = [
        _string_attr("service.name", args.service_name),
        _string_attr("org.id", args.org_id),
        _string_attr("ai.vision.space.id", space_id),
        _string_attr("run.id", run_id),
        _string_attr("ant.username", user_id),
        _string_attr("ant.agent.product", args.agent_product),
        _string_attr("ant.agent.env", "smoke"),
        _string_attr("ant.agent.scene", "integration"),
        _string_attr("agent.name", args.agent_product),
        _string_attr("deployment.environment.name", "smoke"),
    ]
    common_signal_attributes = [
        _string_attr("run.id", run_id),
        _string_attr("conversation.id", session_id),
        _string_attr("ant.username", user_id),
        _string_attr("agent.name", args.agent_product),
        _string_attr("app.version", "smoke-1.0"),
        _string_attr("terminal.type", "integration"),
        _string_attr("smoke.run_id", run_id),
    ]

    trace_payload = {
        "resourceSpans": [
            {
                "resource": {"attributes": resource_attributes},
                "scopeSpans": [
                    {
                        "scope": {"name": "signoz-ob-ai-vision-smoke", "version": "1"},
                        "spans": [
                            {
                                "traceId": trace_id,
                                "spanId": root_span_id,
                                "name": "codex.agent.run",
                                "kind": 2,
                                "startTimeUnixNano": str(base_ns),
                                "endTimeUnixNano": str(root_end_ns),
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("gen_ai.input.messages", f"smoke input {run_id}"),
                                    _int_attr("gen_ai.usage.input_tokens", 11),
                                    _int_attr("gen_ai.usage.output_tokens", 7),
                                    _int_attr("gen_ai.usage.total_tokens", 18),
                                ],
                                "status": {"code": 1},
                            },
                            {
                                "traceId": trace_id,
                                "spanId": child_span_id,
                                "parentSpanId": root_span_id,
                                "name": "codex.tool.smoke",
                                "kind": 3,
                                "startTimeUnixNano": str(child_start_ns),
                                "endTimeUnixNano": str(child_end_ns),
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("gen_ai.output.messages", f"smoke output {run_id}"),
                                    _string_attr("tool.name", "integration-smoke"),
                                ],
                                "events": [
                                    {
                                        "timeUnixNano": str(child_start_ns + 10_000_000),
                                        "name": "smoke.checkpoint",
                                        "attributes": [_string_attr("smoke.run_id", run_id)],
                                    }
                                ],
                                "status": {"code": 1},
                            },
                        ],
                    }
                ],
            }
        ]
    }

    log_payload = {
        "resourceLogs": [
            {
                "resource": {"attributes": resource_attributes},
                "scopeLogs": [
                    {
                        "scope": {"name": "signoz-ob-ai-vision-smoke", "version": "1"},
                        "logRecords": [
                            {
                                "timeUnixNano": str(log_ns),
                                "observedTimeUnixNano": str(log_ns),
                                "traceId": trace_id,
                                "spanId": root_span_id,
                                "severityNumber": 9,
                                "severityText": "INFO",
                                "body": {"stringValue": f"AI Vision smoke event {run_id}"},
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("event.name", "codex.api_request"),
                                    _string_attr("event.id", f"{log_event_id}-api"),
                                    _string_attr("model", "smoke-model"),
                                    _int_attr("duration_ms", 350),
                                    _int_attr("http.response.status_code", 200),
                                    _int_attr("input_token_count", 11),
                                    _int_attr("output_token_count", 7),
                                    _int_attr("cached_token_count", 3),
                                ],
                            },
                            {
                                "timeUnixNano": str(log_ns + 10_000_000),
                                "observedTimeUnixNano": str(log_ns + 10_000_000),
                                "traceId": trace_id,
                                "spanId": root_span_id,
                                "severityNumber": 9,
                                "severityText": "INFO",
                                "body": {"stringValue": f"response completed {run_id}"},
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("event.name", "codex.sse_event"),
                                    _string_attr("event.kind", "response.completed"),
                                    _string_attr("event.id", f"{log_event_id}-sse"),
                                    _string_attr("model", "smoke-model"),
                                    _int_attr("duration_ms", 350),
                                    _int_attr("input_token_count", 11),
                                    _int_attr("output_token_count", 7),
                                    _int_attr("cached_token_count", 3),
                                ],
                            },
                            {
                                "timeUnixNano": str(log_ns + 20_000_000),
                                "observedTimeUnixNano": str(log_ns + 20_000_000),
                                "traceId": trace_id,
                                "spanId": root_span_id,
                                "severityNumber": 9,
                                "severityText": "INFO",
                                "body": {"stringValue": f"smoke prompt {run_id}"},
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("event.name", "codex.user_prompt"),
                                    _string_attr("event.id", f"{log_event_id}-prompt"),
                                    _string_attr("prompt", f"smoke prompt {run_id}"),
                                    _int_attr("prompt_length", 24),
                                    _int_attr("duration_ms", 10),
                                ],
                            },
                            {
                                "timeUnixNano": str(log_ns + 30_000_000),
                                "observedTimeUnixNano": str(log_ns + 30_000_000),
                                "traceId": trace_id,
                                "spanId": child_span_id,
                                "severityNumber": 9,
                                "severityText": "INFO",
                                "body": {"stringValue": f"tool completed {run_id}"},
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("event.name", "codex.tool_result"),
                                    _string_attr("event.id", f"{log_event_id}-tool-result"),
                                    _string_attr("tool_name", "integration-smoke"),
                                    _int_attr("duration_ms", 25),
                                ],
                            },
                            {
                                "timeUnixNano": str(log_ns + 40_000_000),
                                "observedTimeUnixNano": str(log_ns + 40_000_000),
                                "traceId": trace_id,
                                "spanId": child_span_id,
                                "severityNumber": 9,
                                "severityText": "INFO",
                                "body": {"stringValue": f"tool approved {run_id}"},
                                "attributes": common_signal_attributes
                                + [
                                    _string_attr("event.name", "codex.tool_decision"),
                                    _string_attr("event.id", f"{log_event_id}-tool-decision"),
                                    _string_attr("tool_name", "integration-smoke"),
                                    _string_attr("decision", "approved"),
                                ],
                            },
                        ],
                    }
                ],
            }
        ]
    }

    metric_payload = {
        "resourceMetrics": [
            {
                "resource": {"attributes": resource_attributes},
                "scopeMetrics": [
                    {
                        "scope": {"name": "signoz-ob-ai-vision-smoke", "version": "1"},
                        "metrics": [
                            {
                                "name": args.metric_name,
                                "description": "Correlated AI Vision smoke requests",
                                "unit": "1",
                                "gauge": {
                                    "dataPoints": [
                                        {
                                            "startTimeUnixNano": str(base_ns),
                                            "timeUnixNano": str(metric_ns),
                                            "asDouble": 1.0,
                                            "attributes": common_signal_attributes,
                                        }
                                    ]
                                },
                            }
                        ],
                    }
                ],
            }
        ]
    }

    return RunData(
        run_id=run_id,
        session_id=session_id,
        space_id=space_id,
        user_id=user_id,
        agent_product=args.agent_product,
        service_name=args.service_name,
        metric_name=args.metric_name,
        trace_id=trace_id,
        root_span_id=root_span_id,
        child_span_id=child_span_id,
        log_event_id=log_event_id,
        start_ms=start_ms,
        end_ms=end_ms,
        trace_payload=trace_payload,
        log_payload=log_payload,
        metric_payload=metric_payload,
    )


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeFailure(message)


def _number(value: Any, label: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise SmokeFailure(f"{label} is not numeric: {value!r}") from exc


def _unwrap_success(payload: Any) -> Any:
    if isinstance(payload, dict) and payload.get("status") == "success" and "data" in payload:
        return payload["data"]
    return payload


def _unwrap_ai_vision(payload: Any) -> Any:
    _require(isinstance(payload, dict), "AI Vision response is not an object")
    if "code" in payload:
        _require(payload.get("code") == 0, f"AI Vision returned code={payload.get('code')}: {payload.get('message')}")
        return payload.get("data")
    return _unwrap_success(payload)


def _query_range_payload(run: RunData, signal: str, fields: list[str]) -> dict[str, Any]:
    return {
        "schemaVersion": "v1",
        "start": run.start_ms,
        "end": run.end_ms,
        "requestType": "raw",
        "compositeQuery": {
            "queries": [
                {
                    "type": "builder_query",
                    "spec": {
                        "name": f"smoke-{signal}",
                        "signal": signal,
                        "filter": {"expression": f"run_id = '{run.run_id}'"},
                        "selectFields": [{"name": field} for field in fields],
                        "order": [{"key": {"name": "timestamp"}, "direction": "asc"}],
                        "limit": 20,
                    },
                }
            ]
        },
    }


def _query_range_rows(client: JSONClient, run: RunData, signal: str, fields: list[str]) -> list[dict[str, Any]]:
    payload = client.post("/api/v5/query_range", _query_range_payload(run, signal, fields))
    response = _unwrap_success(payload)
    _require(isinstance(response, dict), f"{signal} query_range response is not an object")
    data = response.get("data")
    _require(isinstance(data, dict), f"{signal} query_range response has no data")
    results = data.get("results")
    _require(isinstance(results, list) and len(results) == 1, f"{signal} query_range expected one result")
    rows = results[0].get("rows") if isinstance(results[0], dict) else None
    _require(isinstance(rows, list), f"{signal} query_range result has no rows")
    normalized: list[dict[str, Any]] = []
    for item in rows:
        _require(isinstance(item, dict), f"{signal} query_range row is not an object")
        row = item.get("data", item)
        _require(isinstance(row, dict), f"{signal} query_range row data is not an object")
        normalized.append(row)
    return normalized


def _dashboard(
    client: JSONClient,
    run: RunData,
    query_key: str,
    *,
    params: dict[str, Any] | None = None,
    scope: str = "personal",
) -> dict[str, Any]:
    payload = client.post(
        "/api/v1/ai-vision/dashboard/query",
        {
            "queryKey": query_key,
            "scope": scope,
            "from": run.start_ms,
            "to": run.end_ms,
            "space_id": run.space_id,
            "user": run.user_id if scope == "personal" else "",
            "agent_product": run.agent_product,
            "params": params or {},
        },
    )
    response = _unwrap_success(payload)
    _require(isinstance(response, dict), f"dashboard {query_key} response is not an object")
    _require(isinstance(response.get("rows"), list), f"dashboard {query_key} response has no rows")
    return response


def _verify_main_metric(client: JSONClient, run: RunData) -> None:
    """Count samples and sum values through the original metric querier.

    SigNoz metric queries are aggregated series, not an invented raw metric API.
    The two independent assertions still prove duplicate ingestion is idempotent.
    """
    queries = []
    for name, aggregation in (("SampleCount", "count"), ("SampleSum", "sum")):
        queries.append({
            "type": "builder_query", "spec": {
                "name": name, "signal": "metrics", "stepInterval": "60s",
                "aggregations": [{"metricName": run.metric_name, "timeAggregation": aggregation,
                                  "spaceAggregation": "sum", "reduceTo": "sum"}],
                "filter": {"expression": f"run_id = '{run.run_id}' AND space_id = '{run.space_id}'"},
            },
        })
    result = _unwrap_success(client.post("/api/v5/query_range", {
        "schemaVersion": "v1", "start": run.start_ms, "end": run.end_ms,
        "requestType": "scalar", "compositeQuery": {"queries": queries},
    }))
    results = result.get("data", {}).get("results", [])
    _require(len(results) == 2, "main metric querier must return count and sum")
    for item in results:
        _require(len(item.get("data", [])) == 1, "main metric scalar result is empty")
        _require(_number(item["data"][0][-1], item["queryName"]) == 1.0,
                 f"main metric {item['queryName']} must equal one after duplicate ingestion")


def verify_query_service(client: JSONClient, run: RunData) -> None:
    common_query = {
        "from": run.start_ms,
        "to": run.end_ms,
        "space_id": run.space_id,
        "user": run.user_id,
        "agent_product": run.agent_product,
        "trace_id": run.trace_id,
        "page": 1,
        "limit": 20,
    }
    trace_list = client.get("/api/v1/ai-vision/traces", query=common_query)
    _require(isinstance(trace_list, dict), "trace list response is not an object")
    traces = trace_list.get("data")
    _require(isinstance(traces, list), "trace list response has no data list")
    matching_traces = [row for row in traces if row.get("trace_id", row.get("traceId")) == run.trace_id]
    _require(len(matching_traces) == 1, f"expected exactly one native trace, got {len(matching_traces)}")

    searched_traces = client.get(
        "/api/v1/ai-vision/traces",
        query={
            **common_query,
            "trace_id": "",
            "search_type": "input",
            "input_keyword": run.run_id,
        },
    )
    _require(
        any(
            isinstance(row, dict)
            and row.get("trace_id", row.get("traceId")) == run.trace_id
            for row in searched_traces.get("data", [])
        ),
        "trace input search cannot find the smoke trace",
    )

    trace_facets = client.get(
        "/api/v1/ai-vision/traces/facets",
        query={
            "from": run.start_ms,
            "to": run.end_ms,
            "space_id": run.space_id,
            "user": run.user_id,
            "agent_product": run.agent_product,
        },
    )
    facet_data = trace_facets.get("data") if isinstance(trace_facets, dict) else None
    _require(isinstance(facet_data, dict), "trace facets response has no data object")
    _require(
        any(item.get("value") == "smoke" for item in facet_data.get("env", [])),
        "trace facets cannot see the smoke environment",
    )

    batch_identity = {
        "from": run.start_ms,
        "to": run.end_ms,
        "space_id": run.space_id,
        "user": run.user_id,
        "agent_product": run.agent_product,
    }
    trace_io = client.post(
        "/api/v1/ai-vision/traces/io",
        {**batch_identity, "trace_ids": [run.trace_id]},
    )
    trace_io_rows = trace_io.get("data") if isinstance(trace_io, dict) else None
    _require(
        isinstance(trace_io_rows, list)
        and len(trace_io_rows) == 1
        and run.run_id in str(trace_io_rows[0].get("input"))
        and run.run_id in str(trace_io_rows[0].get("output")),
        "trace batch IO did not return the correlated input/output",
    )

    trace_usage = client.post(
        "/api/v1/ai-vision/traces/usage",
        {**batch_identity, "trace_ids": [run.trace_id]},
    )
    trace_usage_rows = trace_usage.get("data") if isinstance(trace_usage, dict) else None
    _require(
        isinstance(trace_usage_rows, list)
        and len(trace_usage_rows) == 1
        and _number(trace_usage_rows[0].get("totalTokens"), "trace totalTokens") >= 18,
        "trace batch usage did not return OTLP token usage",
    )

    span_batch = client.post(
        "/api/v1/ai-vision/spans/batch",
        {
            **batch_identity,
            "trace_id": run.trace_id,
            "span_ids": [run.root_span_id, run.child_span_id],
        },
    )
    _require(
        isinstance(span_batch.get("spans"), list) and len(span_batch["spans"]) == 2,
        "span batch did not return both smoke spans",
    )

    # Prove the promoted isolation dimensions and time range are actually
    # enforced, rather than merely returned in the response.
    for label, overrides in (
        ("user", {"user": f"not-{run.user_id}"}),
        ("agent", {"agent_product": f"not-{run.agent_product}"}),
        ("space", {"space_id": f"not-{run.space_id}"}),
        (
            "time range",
            {"from": run.start_ms - 120_000, "to": run.start_ms - 1},
        ),
    ):
        isolated = client.get(
            "/api/v1/ai-vision/traces",
            query={**common_query, **overrides},
        )
        isolated_rows = isolated.get("data") if isinstance(isolated, dict) else None
        _require(
            isinstance(isolated_rows, list) and not isolated_rows,
            f"trace {label} isolation did not exclude the smoke trace",
        )

    detail = _unwrap_success(client.get(f"/api/v1/ai-vision/traces/{quote(run.trace_id)}", query=common_query))
    _require(isinstance(detail, dict), "trace detail response is not an object")
    _require(detail.get("traceId", detail.get("trace_id")) == run.trace_id, "trace detail has the wrong trace ID")
    spans = detail.get("spans")
    _require(isinstance(spans, list), "trace detail has no spans list")
    span_ids = {row.get("span_id", row.get("spanId")) for row in spans if isinstance(row, dict)}
    _require(
        span_ids == {run.root_span_id, run.child_span_id},
        f"trace detail span IDs differ: {sorted(str(item) for item in span_ids)}",
    )
    _require(detail.get("sessionId", detail.get("session_id")) == run.session_id, "trace detail lost session correlation")

    sessions = client.get(
        "/api/v1/ai-vision/sessions",
        query={
            "from": run.start_ms,
            "to": run.end_ms,
            "space_id": run.space_id,
            "user": run.user_id,
            "agent_product": run.agent_product,
            "session_id": run.session_id,
            "page": 1,
            "limit": 20,
        },
    )
    session_rows = sessions.get("data") if isinstance(sessions, dict) else None
    _require(isinstance(session_rows, list), "session list response has no data list")
    matching_sessions = [
        row for row in session_rows
        if isinstance(row, dict) and row.get("session_id", row.get("sessionId")) == run.session_id
    ]
    _require(len(matching_sessions) == 1, f"expected exactly one session, got {len(matching_sessions)}")

    session_io = client.post(
        "/api/v1/ai-vision/sessions/io",
        {**batch_identity, "session_ids": [run.session_id]},
    )
    session_io_rows = session_io.get("data") if isinstance(session_io, dict) else None
    _require(
        isinstance(session_io_rows, list)
        and len(session_io_rows) == 1
        and run.run_id in str(session_io_rows[0].get("input"))
        and run.run_id in str(session_io_rows[0].get("output")),
        "session batch IO did not return the correlated input/output",
    )

    session_usage = client.post(
        "/api/v1/ai-vision/sessions/usage",
        {**batch_identity, "session_ids": [run.session_id]},
    )
    session_usage_rows = session_usage.get("data") if isinstance(session_usage, dict) else None
    _require(
        isinstance(session_usage_rows, list)
        and len(session_usage_rows) == 1
        and _number(session_usage_rows[0].get("totalTokens"), "session totalTokens") >= 18,
        "session batch usage did not return OTLP token usage",
    )

    session_detail = _unwrap_success(
        client.get(
            f"/api/v1/ai-vision/sessions/{quote(run.session_id)}",
            query={
                "from": run.start_ms,
                "to": run.end_ms,
                "space_id": run.space_id,
                "user": run.user_id,
                "agent_product": run.agent_product,
            },
        )
    )
    _require(isinstance(session_detail, dict), "session detail response is not an object")
    trace_ids = session_detail.get("traceIds", session_detail.get("trace_ids"))
    _require(isinstance(trace_ids, list) and trace_ids == [run.trace_id], "session detail does not contain exactly the smoke trace")

    trace_rows = _query_range_rows(
        client,
        run,
        "traces",
        ["trace_id", "span_id", "space_id", "run_id", "session_id", "user_id", "agent_product"],
    )
    _require(len(trace_rows) == 2, f"trace idempotency failed: expected 2 spans, got {len(trace_rows)}")
    _require(
        {row.get("span_id") for row in trace_rows} == {run.root_span_id, run.child_span_id},
        "trace query_range returned unexpected span IDs",
    )
    _require(
        {row.get("space_id") for row in trace_rows} == {run.space_id},
        "trace query_range lost the space boundary",
    )

    log_rows = _query_range_rows(
        client,
        run,
        "logs",
        ["log_id", "trace_id", "span_id", "space_id", "event_name", "body", "run_id", "session_id"],
    )
    _require(len(log_rows) == 5, f"log idempotency failed: expected 5 logs, got {len(log_rows)}")
    _require(log_rows[0].get("trace_id") == run.trace_id, "log lost trace correlation")
    _require(log_rows[0].get("event_name") == "codex.api_request", "log event name differs")
    _require(
        {row.get("space_id") for row in log_rows} == {run.space_id},
        "logs query_range lost the space boundary",
    )

    _verify_main_metric(client, run)

    event_identity = {
        "space_id": run.space_id,
        "agent_product": run.agent_product,
        "user": run.user_id,
    }
    event_metadata = client.get(
        "/api/v1/ai-vision/events/metadata",
        query=event_identity,
    )
    canonical_fields = event_metadata.get("canonicalFields")
    physical_fields = event_metadata.get("fields")
    _require(
        isinstance(canonical_fields, list)
        and any(field.get("key") == "event_name" for field in canonical_fields),
        "event metadata omitted the typed event_name field",
    )
    _require(
        isinstance(physical_fields, list)
        and any(field.get("name") == "space_id" for field in physical_fields),
        "event metadata omitted the physical space_id field",
    )

    event_query = {
        **event_identity,
        "from": run.start_ms,
        "to": run.end_ms,
        "page": 1,
        "limit": 20,
        "fields": ["time", "event_name", "trace_id", "session_id", "model", "username"],
        "filters": [{"field": "trace_id", "op": "=", "value": run.trace_id}],
        "orderBy": "time",
        "keyword": "",
    }
    event_list = client.post("/api/v1/ai-vision/events/list", event_query)
    event_rows = event_list.get("data") if isinstance(event_list, dict) else None
    _require(
        isinstance(event_rows, list) and len(event_rows) == 5,
        "typed event list did not return all five OTLP logs",
    )
    _require(
        any(row.get("event_name") == "codex.api_request" for row in event_rows),
        "typed event list cannot see codex.api_request",
    )

    event_facets = client.post(
        "/api/v1/ai-vision/events/facets",
        {
            **event_identity,
            "from": run.start_ms,
            "to": run.end_ms,
            "dimensions": ["event_name", "model", "env"],
            "filters": [{"field": "trace_id", "op": "=", "value": run.trace_id}],
            "limit": 20,
        },
    )
    event_facet_data = event_facets.get("data") if isinstance(event_facets, dict) else None
    _require(
        isinstance(event_facet_data, dict)
        and any(
            item.get("value") == "codex.api_request"
            for item in event_facet_data.get("event_name", [])
        ),
        "event facets cannot see codex.api_request",
    )

    isolated_events = client.post(
        "/api/v1/ai-vision/events/list",
        {**event_query, "space_id": f"not-{run.space_id}"},
    )
    _require(
        isinstance(isolated_events.get("data"), list) and not isolated_events["data"],
        "event space isolation did not exclude the smoke logs",
    )

    try:
        client.post(
            "/api/v1/ai-vision/events/list",
            {key: value for key, value in event_query.items() if key != "space_id"},
        )
    except SmokeFailure as exc:
        _require("HTTP 400" in str(exc), "missing event space_id did not fail closed")
    else:
        raise SmokeFailure("event list accepted a request without space_id")

    trace_summary = _dashboard(client, run, "telemetry.traces.summary")
    trace_summary_rows = trace_summary["rows"]
    _require(len(trace_summary_rows) == 1, "trace dashboard summary has no row")
    _require(_number(trace_summary_rows[0].get("trace_count"), "trace_count") >= 1, "trace dashboard is empty")
    _require(_number(trace_summary_rows[0].get("span_count"), "span_count") >= 2, "trace dashboard has fewer than two spans")

    log_series = _dashboard(client, run, "telemetry.logs.timeseries", params={"step_ms": 1000})
    _require(sum(_number(row.get("value"), "log series value") for row in log_series["rows"]) >= 1, "logs dashboard is empty")

    metric_series = _dashboard(
        client,
        run,
        "codex.telemetry.metrics",
        params={"metric_name": run.metric_name, "aggregation": "sum", "step_ms": 1000},
    )
    _require(
        sum(_number(row.get("value"), "metric series value") for row in metric_series["rows"]) >= 1.0,
        "metrics dashboard is empty",
    )

    overview = _dashboard(client, run, "codex.dashboard.summary")
    _require(len(overview["rows"]) == 1, "Codex overview summary has no row")
    overview_row = overview["rows"][0]
    for field, expected in (
        ("input_tokens", 11),
        ("output_tokens", 7),
        ("cache_read_tokens", 3),
        ("total_sessions", 1),
        ("request_count", 1),
    ):
        _require(
            _number(overview_row.get(field), f"Codex overview {field}") >= expected,
            f"Codex overview {field} is empty",
        )

    events = _dashboard(client, run, "codex.overview.event_stream")
    _require(
        any(row.get("event") == "codex.api_request" for row in events["rows"]),
        "Codex event stream cannot see the OTLP log",
    )
    token_series = _dashboard(
        client, run, "codex.tokens.timeseries", params={"step_ms": 1000}
    )
    _require(
        sum(_number(row.get("input_tokens"), "Codex input token series") for row in token_series["rows"]) >= 11,
        "Codex token trend is empty",
    )
    token_by_model = _dashboard(
        client, run, "codex.overview.token_by_model", params={"step_ms": 1000}
    )
    _require(
        any(row.get("model") == "smoke-model" for row in token_by_model["rows"]),
        "Codex token-by-model chart is empty",
    )

    for query_key, required_field in CODEX_PERSONAL_DASHBOARD_CONTRACTS.items():
        result = _dashboard(client, run, query_key, params={"step_ms": 1000})
        _require(result["rows"], f"{query_key} returned no rows")
        _require(
            required_field in result["rows"][0],
            f"{query_key} omitted required field {required_field}",
        )

    for query_key, required_field in CODEX_SPACE_DASHBOARD_CONTRACTS.items():
        result = _dashboard(
            client,
            run,
            query_key,
            params={"step_ms": 1000},
            scope="space",
        )
        _require(result["rows"], f"{query_key} returned no rows")
        _require(
            required_field in result["rows"][0],
            f"{query_key} omitted required field {required_field}",
        )


def verify_ai_vision(client: JSONClient, run: RunData, args: argparse.Namespace) -> None:
    space = quote(args.ai_vision_space_id, safe="")
    product = quote(run.agent_product, safe="")
    trace = quote(run.trace_id, safe="")
    trace_list = _unwrap_ai_vision(
        client.post(
            f"/api/v1/spaces/{space}/signoz/traces/list",
            {
                "from": run.start_ms,
                "to": run.end_ms,
                "trace_id": run.trace_id,
                "agent_product": run.agent_product,
                "page": 1,
                "limit": 20,
            },
        )
    )
    _require(isinstance(trace_list, dict), "AI Vision trace-list data is not an object")
    rows = trace_list.get("data")
    _require(isinstance(rows, list), "AI Vision trace-list data has no rows")
    _require(
        any(isinstance(row, dict) and row.get("trace_id", row.get("traceId")) == run.trace_id for row in rows),
        "AI Vision trace list cannot see the smoke trace",
    )

    detail = _unwrap_ai_vision(
        client.get(
            f"/api/v1/spaces/{space}/signoz/trace/{trace}/detail",
            query={"from": run.start_ms, "to": run.end_ms, "agent_product": run.agent_product},
        )
    )
    _require(isinstance(detail, dict), "AI Vision trace detail is not an object")
    spans = detail.get("spans")
    _require(isinstance(spans, list) and len(spans) == 2, "AI Vision trace detail does not contain both spans")

    sessions = _unwrap_ai_vision(
        client.post(
            f"/api/v1/spaces/{space}/signoz/sessions/list",
            {
                "from": run.start_ms,
                "to": run.end_ms,
                "session_id": run.session_id,
                "agent_product": run.agent_product,
                "page": 1,
                "limit": 20,
            },
        )
    )
    _require(isinstance(sessions, dict), "AI Vision session-list data is not an object")
    session_rows = sessions.get("data")
    _require(isinstance(session_rows, list), "AI Vision session-list data has no rows")
    _require(
        any(isinstance(row, dict) and row.get("session_id", row.get("sessionId")) == run.session_id for row in session_rows),
        "AI Vision session list cannot see the smoke session",
    )

    event_payload = {
        "from": run.start_ms,
        "to": run.end_ms,
        "page": 1,
        "limit": 20,
        "fields": ["time", "event_name", "trace_id", "session_id", "model", "username"],
        "filters": [{"field": "trace_id", "op": "=", "value": run.trace_id}],
        "orderBy": "time",
    }
    ai_event_metadata = _unwrap_ai_vision(
        client.get(
            f"/openapi/v1/spaces/{space}/agents/{product}/metadata",
        )
    )
    _require(
        isinstance(ai_event_metadata, dict)
        and ai_event_metadata.get("capabilities", {}).get("events", {}).get("modes", {}).get("fieldsJson") is True
        and ai_event_metadata.get("capabilities", {}).get("events", {}).get("modes", {}).get("rawSql") is False,
        "AI Vision event metadata did not advertise typed-only SigNoz queries",
    )
    ai_events = _unwrap_ai_vision(
        client.post(
            f"/openapi/v1/spaces/{space}/agents/{product}/events/list",
            event_payload,
        )
    )
    ai_event_rows = ai_events.get("data") if isinstance(ai_events, dict) else None
    _require(
        isinstance(ai_event_rows, list)
        and len(ai_event_rows) == 5
        and any(row.get("event_name") == "codex.api_request" for row in ai_event_rows),
        "AI Vision typed Events API cannot see all OTLP logs",
    )
    ai_event_facets = _unwrap_ai_vision(
        client.post(
            f"/openapi/v1/spaces/{space}/agents/{product}/events/facets",
            {
                "from": run.start_ms,
                "to": run.end_ms,
                "dimensions": ["event_name", "model", "env"],
                "filters": [
                    {"field": "trace_id", "op": "=", "value": run.trace_id}
                ],
                "limit": 20,
            },
        )
    )
    _require(
        isinstance(ai_event_facets, dict)
        and any(
            item.get("value") == "codex.api_request"
            for item in ai_event_facets.get("data", {}).get("event_name", [])
        ),
        "AI Vision event facets cannot see codex.api_request",
    )
    ai_fields_query = _unwrap_ai_vision(
        client.post(
            f"/openapi/v1/spaces/{space}/agents/{product}/events/query",
            {**event_payload, "mode": "fieldsJson"},
        )
    )
    _require(
        isinstance(ai_fields_query, dict)
        and len(ai_fields_query.get("data", [])) == 5,
        "AI Vision fieldsJson Events query cannot see all OTLP logs",
    )

    if args.ai_vision_skip_dashboard:
        return

    for query_key, params, minimum in (
        ("codex.dashboard.summary", {}, {"request_count": 1, "input_tokens": 11}),
        ("codex.tokens.timeseries", {"step_ms": 1000}, {"input_tokens": 11}),
        (
            "codex.telemetry.metrics",
            {"metric_name": run.metric_name, "aggregation": "sum", "step_ms": 1000},
            {"value": 1},
        ),
    ):
        response = _unwrap_ai_vision(
            client.post(
                f"/api/v2/spaces/{space}/agent-products/{product}/signoz/query?encrypted=0",
                {
                    "scope": args.ai_vision_scope,
                    "queryKey": query_key,
                    "template": "",
                    "timeRange": {"type": "absolute", "from": run.start_ms, "to": run.end_ms},
                    "params": params,
                },
            )
        )
        _require(isinstance(response, dict), f"AI Vision dashboard {query_key} data is not an object")
        dashboard_rows = response.get("rows")
        _require(isinstance(dashboard_rows, list) and dashboard_rows, f"AI Vision dashboard {query_key} is empty")
        for field, expected in minimum.items():
            total = sum(
                _number(row.get(field), f"AI Vision {query_key} {field}")
                for row in dashboard_rows
                if isinstance(row, dict)
            )
            _require(total >= expected, f"AI Vision dashboard {query_key} has {field}={total}, expected >= {expected}")

    for scope, contracts in (
        ("personal", CODEX_PERSONAL_DASHBOARD_CONTRACTS),
        ("space", CODEX_SPACE_DASHBOARD_CONTRACTS),
    ):
        for query_key, required_field in contracts.items():
            response = _unwrap_ai_vision(
                client.post(
                    f"/api/v2/spaces/{space}/agent-products/{product}/signoz/query?encrypted=0",
                    {
                        "scope": scope,
                        "queryKey": query_key,
                        "template": "",
                        "timeRange": {
                            "type": "absolute",
                            "from": run.start_ms,
                            "to": run.end_ms,
                        },
                        "params": {"step_ms": 1000},
                    },
                )
            )
            _require(
                isinstance(response, dict),
                f"AI Vision dashboard {query_key} data is not an object",
            )
            rows = response.get("rows")
            _require(
                isinstance(rows, list) and rows,
                f"AI Vision dashboard {query_key} is empty",
            )
            _require(
                required_field in rows[0],
                f"AI Vision dashboard {query_key} omitted {required_field}",
            )


def eventually(label: str, timeout: float, interval: float, check: Callable[[], None]) -> None:
    deadline = time.monotonic() + timeout
    last_error: Exception | None = None
    while True:
        try:
            check()
            print(f"[PASS] {label}")
            return
        except (SmokeFailure, KeyError, TypeError) as exc:
            last_error = exc
        if time.monotonic() >= deadline:
            raise SmokeFailure(f"{label} did not pass within {timeout:g}s: {last_error}") from last_error
        time.sleep(interval)


def _headers_from_env(specs: list[str], label: str) -> dict[str, str]:
    headers: dict[str, str] = {}
    for spec in specs:
        if "=" not in spec:
            raise SmokeFailure(f"{label} header mapping must be HEADER=ENV_VAR, got {spec!r}")
        header, env_name = (part.strip() for part in spec.split("=", 1))
        if not header or not env_name:
            raise SmokeFailure(f"{label} header mapping must be HEADER=ENV_VAR, got {spec!r}")
        value = os.environ.get(env_name)
        if value is None:
            raise SmokeFailure(f"environment variable {env_name!r} is not set for {label} header {header!r}")
        headers[header] = value
    return headers


def _auth_from_netscape(filename: str) -> tuple[str, str | None]:
    cookies: list[str] = []
    access_token: str | None = None
    try:
        with open(filename, encoding="utf-8") as cookie_file:
            for raw_line in cookie_file:
                line = raw_line.strip()
                if line.startswith("#HttpOnly_"):
                    line = line.removeprefix("#HttpOnly_")
                elif not line or line.startswith("#"):
                    continue
                fields = line.split("\t")
                if len(fields) != 7 or not fields[5]:
                    continue
                cookies.append(f"{fields[5]}={fields[6]}")
                if fields[5] == "access_token":
                    access_token = fields[6]
    except OSError as exc:
        raise SmokeFailure(f"cannot read AI Vision cookie file: {exc}") from exc
    if not cookies:
        raise SmokeFailure("AI Vision cookie file contains no usable cookies")
    return "; ".join(cookies), access_token


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Send correlated traces/logs/metrics twice and verify the SigNoz OceanBase and optional AI Vision read paths."
    )
    parser.add_argument("--collector-url", default="http://127.0.0.1:4318")
    parser.add_argument("--query-url", default="http://127.0.0.1:18091")
    parser.add_argument("--org-id", default="default")
    parser.add_argument(
        "--space-id",
        help="OTLP space identifier; defaults to --ai-vision-space-id or smoke-space",
    )
    parser.add_argument("--user-id", help="Use the authenticated AI Vision work_id when --ai-vision-url is set")
    parser.add_argument("--agent-product", default="Codex")
    parser.add_argument("--service-name", default="codex-smoke-agent")
    parser.add_argument("--metric-name", default="codex.tool.call")
    parser.add_argument("--eventual-timeout", type=float, default=45.0)
    parser.add_argument("--poll-interval", type=float, default=1.0)
    parser.add_argument("--request-timeout", type=float, default=10.0)
    parser.add_argument(
        "--collector-header-env",
        action="append",
        default=[],
        metavar="HEADER=ENV_VAR",
        help="Read an OTLP HTTP header value from an environment variable (repeatable)",
    )
    parser.add_argument(
        "--query-header-env",
        action="append",
        default=[],
        metavar="HEADER=ENV_VAR",
        help="Read a query-service header value from an environment variable (repeatable)",
    )
    parser.add_argument("--query-api-key-env", help="Environment variable containing the SigNoz API key (main header: SIGNOZ-API-KEY)")
    parser.add_argument("--ai-vision-url", help="Also validate AI Vision's trace, session, and dashboard APIs")
    parser.add_argument("--ai-vision-space-id")
    parser.add_argument("--ai-vision-token-env", help="Environment variable containing an AI Vision Bearer token")
    parser.add_argument(
        "--ai-vision-cookie-file",
        help="Netscape-format cookie file for local browser-equivalent validation",
    )
    parser.add_argument(
        "--ai-vision-header-env",
        action="append",
        default=[],
        metavar="HEADER=ENV_VAR",
        help="Read an AI Vision header value from an environment variable (repeatable)",
    )
    parser.add_argument("--ai-vision-scope", choices=("personal", "space"), default="personal")
    parser.add_argument(
        "--ai-vision-skip-dashboard",
        action="store_true",
        help="Only verify AI Vision trace/session APIs; useful when plaintext dashboard queries are disabled",
    )
    args = parser.parse_args(argv)
    if args.ai_vision_url and not args.ai_vision_space_id:
        parser.error("--ai-vision-space-id is required with --ai-vision-url")
    if args.space_id and args.ai_vision_space_id and args.space_id != args.ai_vision_space_id:
        parser.error("--space-id must match --ai-vision-space-id")
    args.space_id = (args.space_id or args.ai_vision_space_id or "smoke-space").strip()
    if not args.space_id:
        parser.error("--space-id must not be empty")
    if args.ai_vision_url and args.ai_vision_scope == "personal" and not args.user_id:
        parser.error("--user-id must equal the authenticated work_id for personal-scope AI Vision validation")
    for name in ("eventual_timeout", "poll_interval", "request_timeout"):
        if getattr(args, name) <= 0:
            parser.error(f"--{name.replace('_', '-')} must be positive")
    return args


def run(args: argparse.Namespace) -> RunData:
    collector_headers = _headers_from_env(args.collector_header_env, "collector")
    query_headers = _headers_from_env(args.query_header_env, "query")
    if args.query_api_key_env:
        api_key = os.environ.get(args.query_api_key_env)
        if api_key is None:
            raise SmokeFailure(f"environment variable {args.query_api_key_env!r} is not set")
        query_headers["SIGNOZ-API-KEY"] = api_key

    collector = JSONClient(args.collector_url, collector_headers, args.request_timeout)
    query = JSONClient(args.query_url, query_headers, args.request_timeout)
    run_data = build_run(args)

    def query_is_ready() -> None:
        response = _unwrap_success(query.get("/api/v2/readyz"))
        _require(isinstance(response, dict) and response.get("healthy") is True, "main SigNoz is not ready")

    eventually(
        "main SigNoz with OceanBase is ready",
        args.eventual_timeout,
        args.poll_interval,
        query_is_ready,
    )

    signals = (
        ("traces", "/v1/traces", run_data.trace_payload),
        ("logs/events", "/v1/logs", run_data.log_payload),
        ("metrics", "/v1/metrics", run_data.metric_payload),
    )
    for round_number in (1, 2):
        for label, path, payload in signals:
            eventually(
                f"OTLP {label} accepted (round {round_number})",
                args.eventual_timeout,
                args.poll_interval,
                lambda path=path, payload=payload: collector.post(path, payload),
            )

    eventually(
        "query APIs return correlated, idempotent traces/logs/metrics",
        args.eventual_timeout,
        args.poll_interval,
        lambda: verify_query_service(query, run_data),
    )

    if args.ai_vision_url:
        ai_headers = _headers_from_env(args.ai_vision_header_env, "AI Vision")
        if args.ai_vision_cookie_file:
            cookie_header, cookie_access_token = _auth_from_netscape(
                args.ai_vision_cookie_file
            )
            ai_headers["Cookie"] = cookie_header
            # AI Vision's browser client promotes this cookie value to a Bearer
            # header for external OpenAPI routes.  Mirror that behaviour here so
            # one browser cookie jar is sufficient for the complete smoke test.
            if cookie_access_token:
                ai_headers["Authorization"] = f"Bearer {cookie_access_token}"
        if args.ai_vision_token_env:
            token = os.environ.get(args.ai_vision_token_env)
            if token is None:
                raise SmokeFailure(f"environment variable {args.ai_vision_token_env!r} is not set")
            ai_headers["Authorization"] = f"Bearer {token}"
        ai_vision = JSONClient(args.ai_vision_url, ai_headers, args.request_timeout)
        eventually(
            "AI Vision returns the trace, session, and dashboard data",
            args.eventual_timeout,
            args.poll_interval,
            lambda: verify_ai_vision(ai_vision, run_data, args),
        )

    return run_data


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        run_data = run(args)
    except SmokeFailure as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 1

    print("\nSMOKE PASSED")
    print(f"run_id={run_data.run_id}")
    print(f"session_id={run_data.session_id}")
    print(f"space_id={run_data.space_id}")
    print(f"trace_id={run_data.trace_id}")
    print(f"user_id={run_data.user_id}")
    print("The same OTLP payload was accepted twice; query_range still returned 2 spans, 5 logs, and 1 metric sample.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
