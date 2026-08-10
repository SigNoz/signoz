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
from fixtures.querierai import (
    ai_trace,
    ai_trace_mixed_spans,
    query_window,
    root_span,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


# Each test tags its spans with a unique service.name and filters on it, so tests
# do not interfere with each other's data.
def test_ai_list_excludes_non_ai(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Trace list returns AI traces and excludes the non-AI trace."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-list"

    ai = ai_trace(now=now, service=service, user="alice", in_tokens=100, out_tokens=20, cost=0.5)
    # a lone root span, i.e. a trace with no gen_ai spans at all
    non_ai = root_span(
        now=now,
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        resources={"service.name": service},
        duration_s=1,
    )
    ai_trace_id = ai[0].trace_id
    insert_traces([*ai, non_ai])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    assert non_ai.trace_id not in body, f"non-AI trace {non_ai.trace_id} should be excluded by the gate"


def test_ai_list_having_aggregate_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Span + aggregate condition in one filter box splits into WHERE + HAVING; bare
    and `trace.` spellings behave identically; an output-only aggregate is rejected."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-having"

    small = ai_trace(now=now, service=service, user="alice", in_tokens=10, out_tokens=20, cost=0.1)
    large = ai_trace(now=now, service=service, user="bob", in_tokens=10, out_tokens=500, cost=0.2)
    small_id = small[0].trace_id
    large_id = large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
        traces += ai_trace(now=now, service=service, user="u", in_tokens=10, out_tokens=out, cost=0.1)
    insert_traces(traces)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    insert_traces(ai_trace_mixed_spans(now=now, service=service, user="a") + ai_trace_mixed_spans(now=now, service=service, user="b"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    """Span list (raw) returns only gen_ai spans; the root span is excluded by the gate."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-spanlist"
    insert_traces(ai_trace_mixed_spans(now=now, service=service, user="alice"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    """Two trace-level aggregates OR-ed in the filter box (regression guard for
    OR-group whitespace handling)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-having-or"

    small = ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1)
    large = ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=500, cost=0.2)
    small_id, large_id = small[0].trace_id, large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    """A resource attribute in the filter routes into the fingerprint CTE: the
    production trace is kept, the staging one dropped."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-resfilter"

    prod = ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1, environment="production")
    stag = ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=20, cost=0.1, environment="staging")
    prod_id, stag_id = prod[0].trace_id, stag[0].trace_id
    insert_traces(prod + stag)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    """Aggregate columns may not be OR-ed with span-level keys; span OR span is fine."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-orfilter"
    # seed a trace so service.name resolves as a known key in this window (resource
    # keys are discovered from ingested data).
    insert_traces(ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    """service.name = X AND (has_error = true OR gen_ai.request.model = 'gpt-4o') AND
    total_tokens > 100: the nested OR group must not flatten, span predicates go to
    WHERE, the aggregate to HAVING."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-nested"

    t_ok = ai_trace(now=now, service=service, user="a", model="gpt-4o", in_tokens=10, out_tokens=500, cost=0.1)
    t_or_miss = ai_trace(now=now, service=service, user="b", model="gpt-4o-mini", in_tokens=10, out_tokens=500, cost=0.1)
    t_agg_miss = ai_trace(now=now, service=service, user="c", model="gpt-4o", in_tokens=10, out_tokens=20, cost=0.1)
    insert_traces(t_ok + t_or_miss + t_agg_miss)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
    start_ms, end_ms = query_window(now)

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
    start_ms, end_ms = query_window(now)

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
    """A trace with only output tokens must still total: sum over an absent attribute
    is NULL and NULL + n = NULL, hence the coalesce."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-total-coalesce"
    insert_traces(ai_trace(now=now, service=service, user="a", in_tokens=None, out_tokens=300, cost=0.1))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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

    small = ai_trace(now=now, service=service, user="a", in_tokens=10, out_tokens=20, cost=0.1)
    large = ai_trace(now=now, service=service, user="b", in_tokens=10, out_tokens=500, cost=0.2)
    small_id, large_id = small[0].trace_id, large[0].trace_id
    insert_traces(small + large)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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


def test_ai_list_messages_first_input_last_output(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """`input` is the first LLM span's prompt, `output` the last LLM span's answer."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-messages"
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    def llm(offset_s: float, prompt: str, answer: str) -> Traces:
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

    # earlier call is the "first" (its input is the prompt), later call is the "last"
    # (its output is the final answer).
    insert_traces(
        [
            root_span(now=now, trace_id=trace_id, span_id=root_id, resources=resources, duration_s=4),
            llm(4, "first prompt", "first answer"),
            llm(2, "second prompt", "second answer"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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


def test_ai_list_enrichment_values(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """End-to-end values of the derived per-trace columns. One trace: root + 1 errored
    LLM + 3 tool spans (get_weather x2, get_time x1) + 1 agent span."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-metrics"
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    def tool(name: str, offset_s: float) -> Traces:
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
    insert_traces(
        [
            root_span(now=now, trace_id=trace_id, span_id=root_id, resources=resources, duration_s=4),
            llm,
            tool("get_weather", 3),
            tool("get_weather", 2.5),
            tool("get_time", 2),
            agent,
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

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
