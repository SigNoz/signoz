"""
Integration tests for source="ai" over the traces signal.

These ingest OpenTelemetry gen_ai spans into real ClickHouse via the insert_traces
fixture and exercise the actual /api/v5/query_range API, so they validate the whole
path: payload -> AI statement builder -> ClickHouse -> response.

Data shape (generic OTel gen_ai semantic conventions):
  - a root span (no gen_ai attributes)
  - an LLM span carrying gen_ai.request.model (str) and numeric usage attributes
    (gen_ai.usage.input_tokens / output_tokens / cost) plus gen_ai.user.id
Each test tags its spans with a unique service.name and filters on it, so tests do
not interfere with each other's data.
"""

import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    BuilderQuery,
    MetricAggregation,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def _ai_trace(
    *,
    now: datetime,
    service: str,
    user: str,
    in_tokens: int,
    out_tokens: int,
    cost: float,
    llm_duration_s: float = 1.0,
    error: bool = False,
) -> list[Traces]:
    """A minimal AI trace: root span + one LLM span with gen_ai attributes."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    llm_id = TraceIdGenerator.span_id()
    resources = {"service.name": service, "deployment.environment": "production"}

    root = Traces(
        timestamp=now - timedelta(seconds=5),
        duration=timedelta(seconds=llm_duration_s + 0.1),
        trace_id=trace_id,
        span_id=root_id,
        parent_span_id="",
        name="POST /api/chat",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={"http.request.method": "POST"},
    )
    llm = Traces(
        timestamp=now - timedelta(seconds=4),
        duration=timedelta(seconds=llm_duration_s),
        trace_id=trace_id,
        span_id=llm_id,
        parent_span_id=root_id,
        name="chat gpt-4o-mini",
        kind=TracesKind.SPAN_KIND_CLIENT,
        status_code=(TracesStatusCode.STATUS_CODE_ERROR if error else TracesStatusCode.STATUS_CODE_OK),
        resources=resources,
        attributes={
            "gen_ai.request.model": "gpt-4o-mini",
            "gen_ai.system": "openai",
            "gen_ai.user.id": user,
            # numeric values land in attributes_number
            "gen_ai.usage.input_tokens": in_tokens,
            "gen_ai.usage.output_tokens": out_tokens,
            "gen_ai.usage.cost": cost,
        },
    )
    return [root, llm]


def _non_ai_trace(*, now: datetime, service: str) -> list[Traces]:
    """A plain HTTP trace with no gen_ai attributes; must be excluded by the AI gate."""
    trace_id = TraceIdGenerator.trace_id()
    span_id = TraceIdGenerator.span_id()
    return [
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=span_id,
            parent_span_id="",
            name="GET /health",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources={"service.name": service},
            attributes={"http.request.method": "GET"},
        )
    ]


def _window_ms(now: datetime) -> tuple[int, int]:
    start_ms = int((now - timedelta(minutes=10)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)
    return start_ms, end_ms


def test_ai_list_excludes_non_ai(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Trace-list panel (requestType="trace"): returns AI traces and excludes the
    non-AI trace. Asserts on the raw response payload to stay agnostic to the exact
    row schema.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-list"

    ai = _ai_trace(now=now, service=service, user="alice", in_tokens=100, out_tokens=20, cost=0.5)
    non_ai = _non_ai_trace(now=now, service=service)
    ai_trace_id = ai[0].trace_id
    non_ai_trace_id = non_ai[0].trace_id
    insert_traces(ai + non_ai)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        limit=10,
    )

    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert ai_trace_id in body, f"expected AI trace {ai_trace_id} in list response"
    assert non_ai_trace_id not in body, f"non-AI trace {non_ai_trace_id} should be excluded by the gate"


def _ai_trace_mixed_spans(*, now: datetime, service: str, user: str) -> list[Traces]:
    """
    Root + one LLM span + one tool span + one agent span. The gate matches all three
    child spans, but only the LLM span carries gen_ai.request.model.
    """
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service, "deployment.environment": "production"}

    def _span(name, kind, attributes, offset_s):
        return Traces(
            timestamp=now - timedelta(seconds=offset_s),
            duration=timedelta(seconds=0.5),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id=root_id,
            name=name,
            kind=kind,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes=attributes,
        )

    root = Traces(
        timestamp=now - timedelta(seconds=5),
        duration=timedelta(seconds=4),
        trace_id=trace_id,
        span_id=root_id,
        parent_span_id="",
        name="POST /api/chat",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={"http.request.method": "POST"},
    )
    llm = _span("chat gpt-4o-mini", TracesKind.SPAN_KIND_CLIENT, {
        "gen_ai.request.model": "gpt-4o-mini",
        "gen_ai.system": "openai",
        "gen_ai.user.id": user,
        "gen_ai.usage.input_tokens": 100,
        "gen_ai.usage.output_tokens": 20,
    }, 4)
    tool = _span("execute_tool", TracesKind.SPAN_KIND_INTERNAL, {
        "gen_ai.tool.name": "get_weather",
        "gen_ai.tool.type": "function",
    }, 3)
    agent = _span("agent.step", TracesKind.SPAN_KIND_INTERNAL, {
        "gen_ai.agent.name": "chat-agent",
    }, 2)
    return [root, llm, tool, agent]


def test_ai_list_llm_call_count_counts_llm_only(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    llm_call_count counts LLM spans only (gen_ai.request.model), not the full gate:
    a trace with 1 LLM + 1 tool + 1 agent span (4 spans incl. root) reports
    llm_call_count == 1 and span_count == 4.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-llmcount"
    insert_traces(_ai_trace_mixed_spans(now=now, service=service, user="alice"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        limit=10,
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 1, f"expected exactly one AI trace, got: {rows}"
    data = rows[0]["data"]
    assert data["llm_call_count"] == 1, f"llm_call_count should count LLM spans only: {data}"
    assert data["span_count"] == 4, f"span_count should include all spans: {data}"


def test_ai_list_having_aggregate_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Aggregate filter written in the SAME filter box: the span-level predicate narrows
    to the service, the trace-level `output_tokens > 100` keeps the large-token
    trace and drops the small one (split internally into WHERE + HAVING).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-having"

    small = _ai_trace(now=now, service=service, user="alice", in_tokens=10, out_tokens=20, cost=0.1)
    large = _ai_trace(now=now, service=service, user="bob", in_tokens=10, out_tokens=500, cost=0.2)
    small_id = small[0].trace_id
    large_id = large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}' AND output_tokens > 100",
        limit=10,
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert large_id in body, f"trace with 500 out-tokens should pass output_tokens > 100"
    assert small_id not in body, f"trace with 20 out-tokens should be filtered out by HAVING"


def test_ai_list_order_limit_offset(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Trace list honors order by (aggregate column) + limit + offset (pagination)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-order"

    traces: list[Traces] = []
    for out in (100, 200, 300, 400, 500):
        traces += _ai_trace(now=now, service=service, user="u", in_tokens=10, out_tokens=out, cost=0.1)
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    def page(offset: int) -> list[int]:
        query = BuilderQuery(
            signal="traces",
            source="ai",
            name="A",
            filter_expression=f"service.name = '{service}'",
            order=[OrderBy(key=TelemetryFieldKey(name="output_tokens"), direction="desc")],
            limit=2,
            offset=offset,
        )
        resp = make_query_request(
            signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace"
        )
        assert resp.status_code == HTTPStatus.OK, resp.text
        rows = resp.json()["data"]["data"]["results"][0]["rows"]
        return [int(r["data"]["output_tokens"]) for r in rows]

    assert page(0) == [500, 400], "first page: highest output_tokens, desc"
    assert page(2) == [300, 200], "second page (offset 2): next two, desc"


def test_ai_span_list_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Span list honors limit (delegated raw path): 6 gen_ai spans available, capped to 4."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-spanlimit"
    insert_traces(
        _ai_trace_mixed_spans(now=now, service=service, user="a")
        + _ai_trace_mixed_spans(now=now, service=service, user="b")
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        limit=4,
    )
    resp = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.RAW
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    rows = resp.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 4, f"limit should cap at 4 (6 gen_ai spans available), got {len(rows)}"


def test_ai_span_list_excludes_non_gen_ai_spans(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Span list (requestType=raw): returns only the gen_ai spans (LLM/tool/agent); the
    root span of the same trace (no gen_ai attributes) is excluded by the span-level gate.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-spanlist"
    insert_traces(_ai_trace_mixed_spans(now=now, service=service, user="alice"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        select_fields=[TelemetryFieldKey(name="name", field_context="span")],
        limit=50,
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.RAW
    )
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    names = sorted(r["data"]["name"] for r in rows)
    assert names == ["agent.step", "chat gpt-4o-mini", "execute_tool"], names
    assert "POST /api/chat" not in names  # root span excluded


def test_ai_list_having_or_aggregates(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Two aggregate conditions OR-ed within the filter box (regression guard for OR-group
    whitespace handling): output_tokens > 100 OR span_count > 100 keeps only the
    large-token trace (span_count is 2 for both, so that branch never matches).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-having-or"

    small = _ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1)
    large = _ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=500, cost=0.2)
    small_id, large_id = small[0].trace_id, large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}' AND (output_tokens > 100 OR span_count > 100)",
        limit=10,
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert large_id in body
    assert small_id not in body


def test_ai_list_having_trace_context_prefix(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """The `trace.` context prefix on an aggregate column works like the bare name."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-trace-ctx"

    small = _ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1)
    large = _ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=500, cost=0.2)
    small_id, large_id = small[0].trace_id, large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}' AND trace.output_tokens > 100",
        limit=10,
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert large_id in body
    assert small_id not in body


def test_ai_source_rejected_on_logs(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """source=ai is only valid for traces; on logs it must be a validation error."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(signal="logs", source="ai", name="A", limit=5)
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.RAW
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "traces signal" in response.text


def test_ai_source_rejected_on_metrics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """source=ai on metrics must be a validation error, not a silent normal query."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="metrics",
        source="ai",
        name="A",
        aggregations=[MetricAggregation(
            metric_name="system_memory_usage",
            time_aggregation="avg",
            space_aggregation="avg",
            temporality="unspecified",
        )],
        step_interval=60,
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.TIME_SERIES
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "traces signal" in response.text


def test_ai_list_rejects_aggregate_or_span_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """
    Aggregate (HAVING) columns may not be OR-ed with span-level keys in the trace
    list; a span-OR-span filter is fine.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    # aggregate OR span -> rejected
    bad = BuilderQuery(
        signal="traces", source="ai", name="A", limit=10,
        filter_expression="output_tokens > 1000 OR service.name = 'ai-it-orfilter'",
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [bad.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot be combined" in response.text

    # span OR span -> accepted (empty result is fine; just not an error)
    ok = BuilderQuery(
        signal="traces", source="ai", name="A", limit=10,
        filter_expression="service.name = 'ai-it-orfilter' OR has_error = true",
    )
    response = make_query_request(
        signoz, token, start_ms, end_ms, [ok.to_dict()], request_type="trace"
    )
    assert response.status_code == HTTPStatus.OK, response.text
