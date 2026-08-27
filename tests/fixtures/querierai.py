from datetime import datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.querier import (
    Aggregation,
    BuilderQuery,
    OrderBy,
    RequestType,
    TelemetryFieldKey,
    get_scalar_table_data,
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def query_window(now: datetime) -> tuple[int, int]:
    """[now-10min, now+1min) in epoch millis — wide enough for every builder here."""
    return (
        int((now - timedelta(minutes=10)).timestamp() * 1000),
        int((now + timedelta(minutes=1)).timestamp() * 1000),
    )


def root_span(*, now: datetime, trace_id: str, span_id: str, resources: dict[str, str], duration_s: float) -> Traces:
    """The non-gen_ai entry span every AI trace hangs off; alone, it is a trace the
    AI gate must exclude."""
    return Traces(
        timestamp=now - timedelta(seconds=5),
        duration=timedelta(seconds=duration_s),
        trace_id=trace_id,
        span_id=span_id,
        parent_span_id="",
        name="POST /api/chat",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={"http.request.method": "POST"},
    )


def ai_trace(
    *,
    now: datetime,
    service: str,
    in_tokens: int | None,
    out_tokens: int,
    user: str = "user",
    cost: float = 0.1,
    model: str = "gpt-4o-mini",
    environment: str = "production",
) -> list[Traces]:
    """A minimal AI trace: root span + one LLM span with gen_ai attributes.
    in_tokens=None omits the input-tokens attribute entirely (not zero)."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service, "deployment.environment": environment}

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
        duration=timedelta(seconds=1),
        trace_id=trace_id,
        span_id=TraceIdGenerator.span_id(),
        parent_span_id=root_id,
        name="chat gpt-4o-mini",
        kind=TracesKind.SPAN_KIND_CLIENT,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes=attributes,
    )
    return [
        root_span(now=now, trace_id=trace_id, span_id=root_id, resources=resources, duration_s=1.1),
        llm,
    ]


def tool_only_trace(*, now: datetime, service: str) -> list[Traces]:
    """Root + one tool span: passes the gen_ai gate but has NO LLM span."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}
    return [
        root_span(now=now, trace_id=trace_id, span_id=root_id, resources=resources, duration_s=2),
        Traces(
            timestamp=now - timedelta(seconds=4),
            duration=timedelta(seconds=0.5),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id=root_id,
            name="execute_tool",
            kind=TracesKind.SPAN_KIND_INTERNAL,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes={"gen_ai.tool.name": "get_weather", "gen_ai.tool.type": "function"},
        ),
    ]


def ai_trace_mixed_spans(*, now: datetime, service: str, user: str) -> list[Traces]:
    """Root + LLM + tool + agent spans; only the LLM span carries gen_ai.request.model."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service, "deployment.environment": "production"}

    def child(name: str, kind: TracesKind, attributes: dict, offset_s: float) -> Traces:
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

    return [
        root_span(now=now, trace_id=trace_id, span_id=root_id, resources=resources, duration_s=4),
        child(
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
        ),
        child(
            "execute_tool",
            TracesKind.SPAN_KIND_INTERNAL,
            {"gen_ai.tool.name": "get_weather", "gen_ai.tool.type": "function"},
            3,
        ),
        child("agent.step", TracesKind.SPAN_KIND_INTERNAL, {"gen_ai.agent.name": "chat-agent"}, 2),
    ]


def ai_aggregation_query(
    service: str,
    expression: str,
    *,
    filter_extra: str = "",
    group_by: list[TelemetryFieldKey] | None = None,
    alias: str | None = None,
    having: str | None = None,
    order: list[OrderBy] | None = None,
    limit: int | None = None,
    step_interval: int | None = None,
) -> dict:
    filter_expression = f"service.name = '{service}'"
    if filter_extra:
        filter_expression += f" AND {filter_extra}"
    return BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=filter_expression,
        aggregations=[Aggregation(expression=expression, alias=alias)],
        group_by=group_by,
        having_expression=having,
        order=order,
        limit=limit,
        step_interval=step_interval,
    ).to_dict()


def scalar_value(signoz: types.SigNoz, token: str, start_ms: int, end_ms: int, service: str, expression: str, filter_extra: str = "") -> float:
    """The single cell of a one-aggregation, ungrouped scalar query."""
    response = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [ai_aggregation_query(service, expression, filter_extra=filter_extra)],
        request_type=RequestType.SCALAR,
    )
    assert response.status_code == HTTPStatus.OK, f"{expression}: {response.text}"
    data = get_scalar_table_data(response.json())
    assert len(data) == 1, f"{expression}: expected one row, got {data}"
    return float(data[0][-1])
