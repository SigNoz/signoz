"""
Integration tests for query_type="builder_ai_query" over the traces signal.

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
    in_tokens: int | None,
    out_tokens: int,
    cost: float,
    model: str = "gpt-4o-mini",
    llm_duration_s: float = 1.0,
    error: bool = False,
    environment: str = "production",
) -> list[Traces]:
    """A minimal AI trace: root span + one LLM span with gen_ai attributes.
    in_tokens=None omits the input-tokens attribute entirely (not zero)."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    llm_id = TraceIdGenerator.span_id()
    resources = {"service.name": service, "deployment.environment": environment}

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
    attributes = {
        "gen_ai.request.model": model,
        "gen_ai.system": "openai",
        "gen_ai.user.id": user,
        # numeric values land in attributes_number
        "gen_ai.usage.output_tokens": out_tokens,
        "_signoz.gen_ai.total_cost": cost,
    }
    if in_tokens is not None:
        attributes["gen_ai.usage.input_tokens"] = in_tokens
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
        attributes=attributes,
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
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}'",
        limit=10,
    )

    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
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
    llm = _span(
        "chat gpt-4o-mini",
        TracesKind.SPAN_KIND_CLIENT,
        {
            "gen_ai.request.model": "gpt-4o-mini",
            "gen_ai.system": "openai",
            "gen_ai.user.id": user,
            "gen_ai.usage.input_tokens": 100,
            "gen_ai.usage.output_tokens": 20,
        },
        4,
    )
    tool = _span(
        "execute_tool",
        TracesKind.SPAN_KIND_INTERNAL,
        {
            "gen_ai.tool.name": "get_weather",
            "gen_ai.tool.type": "function",
        },
        3,
    )
    agent = _span(
        "agent.step",
        TracesKind.SPAN_KIND_INTERNAL,
        {
            "gen_ai.agent.name": "chat-agent",
        },
        2,
    )
    return [root, llm, tool, agent]


def test_ai_list_having_aggregate_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Aggregate filter written in the SAME filter box: the span-level predicate narrows
    to the service, the trace-level `output_tokens > 100` keeps the large-token
    trace and drops the small one (split internally into WHERE + HAVING). Both
    spellings of a trace-level aggregate — bare and `trace.` — behave identically
    (unit tests pin them to byte-identical SQL; this covers the wiring once
    end-to-end). An output-only aggregate is rejected under either spelling.
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

    for spelling in ("output_tokens", "trace.output_tokens"):
        query = BuilderQuery(
            signal="traces",
            query_type="builder_ai_query",
            name="A",
            filter_expression=f"service.name = '{service}' AND {spelling} > 100",
            limit=10,
        )
        response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
        assert response.status_code == HTTPStatus.OK, f"{spelling}: {response.text}"

        body = json.dumps(response.json())
        assert large_id in body, f"{spelling}: trace with 500 out-tokens should pass > 100"
        assert small_id not in body, f"{spelling}: trace with 20 out-tokens should be filtered out by HAVING"

    # output-only aggregate gets the targeted rejection.
    bad = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression="trace.span_count > 3",
        limit=10,
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [bad.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot be used" in response.text


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
            query_type="builder_ai_query",
            name="A",
            filter_expression=f"service.name = '{service}'",
            order=[OrderBy(key=TelemetryFieldKey(name="output_tokens"), direction="desc")],
            limit=2,
            offset=offset,
        )
        resp = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
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
    insert_traces(_ai_trace_mixed_spans(now=now, service=service, user="a") + _ai_trace_mixed_spans(now=now, service=service, user="b"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}'",
        limit=4,
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.RAW)
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
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}'",
        select_fields=[TelemetryFieldKey(name="name", field_context="span")],
        limit=50,
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.RAW)
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
    Two trace-level aggregates OR-ed within the filter box (regression guard for OR-group
    whitespace handling): output_tokens > 100 OR input_tokens > 1000 keeps only the
    large-output trace (input_tokens is 10 for both, so that branch never matches).
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
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}' AND (output_tokens > 100 OR input_tokens > 1000)",
        limit=10,
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert large_id in body
    assert small_id not in body


def test_ai_list_resource_filter_isolates_by_fingerprint(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A resource attribute in the filter is pulled into the __resource_filter fingerprint
    CTE (see maybeAttachResourceFilter). Two traces on the same service but different
    deployment.environment: `resource.deployment.environment = 'production'` must keep
    the production trace and drop the staging one — the fingerprint prune isolates by
    the resource, not by any span attribute.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-resfilter"

    prod = _ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1, environment="production")
    stag = _ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=20, cost=0.1, environment="staging")
    prod_id, stag_id = prod[0].trace_id, stag[0].trace_id
    insert_traces(prod + stag)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=(f"resource.service.name = '{service}' AND resource.deployment.environment = 'production'"),
        limit=10,
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert prod_id in body, "production trace should match the resource filter"
    assert stag_id not in body, "staging trace should be excluded by the resource fingerprint prune"


def test_ai_list_rejects_aggregate_or_span_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Aggregate (HAVING) columns may not be OR-ed with span-level keys in the trace
    list; a span-OR-span filter is fine.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-orfilter"
    # seed a trace so service.name resolves as a known key in this window (resource
    # keys are discovered from ingested data).
    insert_traces(_ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    # aggregate OR span -> rejected
    bad = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        limit=10,
        filter_expression=f"output_tokens > 1000 OR service.name = '{service}'",
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [bad.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot be combined" in response.text

    # span OR span -> accepted (result content doesn't matter; just not an error)
    ok = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        limit=10,
        filter_expression=f"service.name = '{service}' OR has_error = true",
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [ok.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text


def test_ai_list_nested_group_span_or_and_aggregate(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A complex filter that mixes all three routing paths in one expression:
        service.name = X AND (has_error = true OR gen_ai.request.model = 'gpt-4o') AND total_tokens > 100
    The nested (span OR span) group must not flatten (precedence), the span predicates
    go to WHERE as a trace-existence check, and the new `total_tokens` aggregate goes to
    HAVING. Three traces isolate each discriminator:
      - t_ok:      gpt-4o, out=500 -> OR matches (model) AND total_tokens>100  -> IN
      - t_or_miss: gpt-4o-mini, out=500 -> OR fails (no error, wrong model)    -> OUT
      - t_agg_miss: gpt-4o, out=20  -> OR matches but total_tokens<=100         -> OUT
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-nested"

    t_ok = _ai_trace(now=now, service=service, user="a", model="gpt-4o", in_tokens=10, out_tokens=500, cost=0.1)
    t_or_miss = _ai_trace(now=now, service=service, user="b", model="gpt-4o-mini", in_tokens=10, out_tokens=500, cost=0.1)
    t_agg_miss = _ai_trace(now=now, service=service, user="c", model="gpt-4o", in_tokens=10, out_tokens=20, cost=0.1)
    insert_traces(t_ok + t_or_miss + t_agg_miss)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=(f"service.name = '{service}' AND (has_error = true OR gen_ai.request.model = 'gpt-4o') AND total_tokens > 100"),
        limit=10,
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert t_ok[0].trace_id in body
    assert t_or_miss[0].trace_id not in body, "nested (span OR span) group must exclude the wrong-model, no-error trace"
    assert t_agg_miss[0].trace_id not in body, "HAVING total_tokens > 100 must exclude the low-token trace"


def test_ai_list_rejects_unknown_aggregate_key(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """A trace-level filter on an unknown aggregate name is rejected, not silently run."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        limit=10,
        filter_expression="trace.bogus_tokens > 1",
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


def test_ai_list_rejects_order_by_span_attribute(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    """Only gen_ai-scoped aggregates are orderable; ordering by a span/resource key errors."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        limit=5,
        order=[OrderBy(key=TelemetryFieldKey(name="service.name"), direction="asc")],
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "order key" in response.text


def test_ai_list_total_tokens_output_only(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A trace whose LLM span carries only output tokens (no input-tokens attribute at
    all) must still total: total_tokens is coalesce(sum(in),0)+coalesce(sum(out),0),
    since sum over an absent attribute is NULL and NULL + n = NULL in ClickHouse.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-total-coalesce"
    insert_traces(_ai_trace(now=now, service=service, user="a", in_tokens=None, out_tokens=300, cost=0.1))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}'",
        limit=10,
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 1, f"expected one trace, got: {rows}"
    data = rows[0]["data"]
    assert data["input_tokens"] is None, data  # attribute absent -> NULL, not 0
    assert data["output_tokens"] == 300, data
    assert data["total_tokens"] == 300, f"total must coalesce the missing input side: {data}"


def test_ai_list_variable_in_aggregate_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A query variable in a trace-level condition is substituted into the HAVING."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-having-var"

    small = _ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1)
    large = _ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=500, cost=0.2)
    small_id, large_id = small[0].trace_id, large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}' AND trace.output_tokens > $threshold",
        limit=10,
    )
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [query.to_dict()],
        request_type="trace",
        variables={"threshold": {"type": "custom", "value": 100}},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    body = json.dumps(response.json())
    assert large_id in body
    assert small_id not in body


def _ai_trace_two_llm(*, now: datetime, service: str) -> list[Traces]:
    """Root + two LLM spans at different times, each with distinct input/output messages."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    def _llm(offset_s: float, prompt: str, answer: str) -> Traces:
        return Traces(
            timestamp=now - timedelta(seconds=offset_s),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id=root_id,
            name="chat",
            kind=TracesKind.SPAN_KIND_CLIENT,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes={
                "gen_ai.request.model": "gpt-4o-mini",
                "gen_ai.input.messages": prompt,
                "gen_ai.output.messages": answer,
            },
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
    # earlier call is the "first" (its input is the prompt), later call is the "last"
    # (its output is the final answer).
    first = _llm(4, "first prompt", "first answer")
    last = _llm(2, "second prompt", "second answer")
    return [root, first, last]


def test_ai_list_messages_first_input_last_output(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    `input` is the FIRST LLM span's prompt (argMin over timestamp) and `output` is the
    LAST LLM span's answer (argMax) — the question -> final-answer preview.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-messages"
    insert_traces(_ai_trace_two_llm(now=now, service=service))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        limit=10,
        filter_expression=f"service.name = '{service}'",
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 1, f"expected one trace, got: {rows}"
    data = rows[0]["data"]
    assert data["input"] == "first prompt", f"input should be the earliest call's prompt: {data}"
    assert data["output"] == "second answer", f"output should be the latest call's answer: {data}"


def _ai_trace_for_metrics(*, now: datetime, service: str) -> list[Traces]:
    """
    Root + one errored LLM span (tokens/cost) + three tool spans (two 'get_weather',
    one 'get_time') + one agent span, so the derived per-trace metrics have distinct
    expected values. The agent span is in the gen_ai gate but carries no request.model,
    so it must NOT count toward llm_call_count (only span_count / last_activity_time).
    """
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    def _tool(name: str, offset_s: float) -> Traces:
        return Traces(
            timestamp=now - timedelta(seconds=offset_s),
            duration=timedelta(seconds=0.2),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id=root_id,
            name="execute_tool",
            kind=TracesKind.SPAN_KIND_INTERNAL,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes={"gen_ai.tool.name": name, "gen_ai.tool.type": "function"},
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
    llm = Traces(
        timestamp=now - timedelta(seconds=4),
        duration=timedelta(seconds=2),
        trace_id=trace_id,
        span_id=TraceIdGenerator.span_id(),
        parent_span_id=root_id,
        name="chat gpt-4o-mini",
        kind=TracesKind.SPAN_KIND_CLIENT,
        status_code=TracesStatusCode.STATUS_CODE_ERROR,  # -> has_error, drives error_count
        resources=resources,
        attributes={
            "gen_ai.request.model": "gpt-4o-mini",
            "gen_ai.usage.input_tokens": 100,
            "gen_ai.usage.output_tokens": 20,
            "_signoz.gen_ai.total_cost": 0.5,
        },
    )
    agent = Traces(
        timestamp=now - timedelta(seconds=1),
        duration=timedelta(seconds=0.5),
        trace_id=trace_id,
        span_id=TraceIdGenerator.span_id(),
        parent_span_id=root_id,
        name="agent.step",
        kind=TracesKind.SPAN_KIND_INTERNAL,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={"gen_ai.agent.name": "chat-agent"},
    )
    return [root, llm, _tool("get_weather", 3), _tool("get_weather", 2.5), _tool("get_time", 2), agent]


def test_ai_list_enrichment_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    End-to-end values of the derived per-trace columns (only integration can check that
    ClickHouse computes uniqIf / sum+sum / countIf(predicate) correctly, not just that
    the SQL is shaped right). One trace: root + 1 errored LLM + 3 tool spans
    (get_weather x2, get_time x1) + 1 agent span. The tool and agent spans are in the
    gen_ai gate but carry no request.model, so llm_call_count stays 1 while span_count
    counts them all.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-metrics"
    insert_traces(_ai_trace_for_metrics(now=now, service=service))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        limit=10,
        filter_expression=f"service.name = '{service}'",
    )
    response = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type="trace")
    assert response.status_code == HTTPStatus.OK, response.text

    rows = response.json()["data"]["data"]["results"][0]["rows"]
    assert len(rows) == 1, f"expected one trace, got: {rows}"
    data = rows[0]["data"]

    assert data["span_count"] == 6, data  # root + llm + 3 tools + agent
    assert data["llm_call_count"] == 1, data  # only the request.model span, not tool/agent
    assert data["tool_call_count"] == 3, data  # all three tool spans
    assert data["distinct_tool_count"] == 2, data  # get_weather, get_time
    assert data["input_tokens"] == 100, data
    assert data["output_tokens"] == 20, data
    assert data["total_tokens"] == 120, data  # input + output
    assert data["estimated_total_cost"] == pytest.approx(0.5), data
    assert data["error_count"] == 1, data  # the errored LLM span
    assert data["max_llm_duration_nano"] > 0, data  # scoped max over LLM spans
