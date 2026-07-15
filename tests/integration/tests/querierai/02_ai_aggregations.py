"""
Integration tests for source="ai" scalar / time-series aggregations.

Aggregations come in two domains, chosen per expression by the `trace.` prefix:
  - span-level (bare keys): over individual gen_ai spans (count(), sum(gen_ai.*))
  - trace-level (trace.*): over window-clipped per-trace values (avg(trace.output_tokens))
A trace-level condition in the filter (trace.output_tokens > N) qualifies traces by
their window-clipped per-trace values in every request type — the span-list variant
of this is covered in 01_ai_traces.py (test_ai_span_list_trace_level_filter).

Each test tags its spans with a unique service.name and filters on it, so tests do
not interfere with each other's data.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
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


def _ai_trace(
    *,
    now: datetime,
    service: str,
    in_tokens: int,
    out_tokens: int,
    model: str = "gpt-4o-mini",
) -> list[Traces]:
    """A minimal AI trace: root span + one LLM span with gen_ai attributes."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    root = Traces(
        timestamp=now - timedelta(seconds=5),
        duration=timedelta(seconds=2),
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
        duration=timedelta(seconds=1),
        trace_id=trace_id,
        span_id=TraceIdGenerator.span_id(),
        parent_span_id=root_id,
        name="chat",
        kind=TracesKind.SPAN_KIND_CLIENT,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={
            "gen_ai.request.model": model,
            "gen_ai.usage.input_tokens": in_tokens,
            "gen_ai.usage.output_tokens": out_tokens,
        },
    )
    return [root, llm]


def _tool_only_trace(*, now: datetime, service: str) -> list[Traces]:
    """Root + one tool span: passes the gen_ai gate but has NO LLM span."""
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}
    return [
        Traces(
            timestamp=now - timedelta(seconds=5),
            duration=timedelta(seconds=2),
            trace_id=trace_id,
            span_id=root_id,
            parent_span_id="",
            name="POST /api/tool",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes={"http.request.method": "POST"},
        ),
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


def _window_ms(now: datetime) -> tuple[int, int]:
    start_ms = int((now - timedelta(minutes=10)).timestamp() * 1000)
    end_ms = int((now + timedelta(minutes=1)).timestamp() * 1000)
    return start_ms, end_ms


def _scalar_query(
    service: str,
    expression: str,
    *,
    filter_extra: str = "",
    group_by: list[TelemetryFieldKey] | None = None,
    alias: str | None = None,
    having: str | None = None,
    limit: int | None = None,
) -> dict:
    filter_expression = f"service.name = '{service}'"
    if filter_extra:
        filter_expression += f" AND {filter_extra}"
    return BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=filter_expression,
        aggregations=[Aggregation(expression=expression, alias=alias)],
        group_by=group_by,
        having_expression=having,
        limit=limit,
    ).to_dict()


def _scalar_value(signoz: types.SigNoz, token: str, start_ms: int, end_ms: int, service: str, expression: str) -> float:
    """Run one single-aggregation scalar query and return its value."""
    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [_scalar_query(service, expression)],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.OK, f"{expression}: {resp.text}"
    data = get_scalar_table_data(resp.json())
    assert len(data) == 1, f"{expression}: expected one row, got {data}"
    return float(data[0][-1])


def _series_values(response_json: dict) -> list[list[float]]:
    """Per-series lists of bucket values (bucket order as returned)."""
    series = response_json["data"]["data"]["results"][0]["aggregations"][0]["series"]
    return [[v["value"] for v in ser["values"]] for ser in series]


def test_ai_scalar_trace_level_aggregations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Trace-level (trace.) scalar aggregations over per-trace values: two traces with
    out-tokens 100 / 300 give avg(trace.output_tokens)=200 and count(trace.trace_id)=2,
    while the span-level count() sees the two LLM spans (root spans are gated out).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-scalar"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + _ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    def scalar_value(expression: str) -> float:
        return _scalar_value(signoz, token, start_ms, end_ms, service, expression)

    assert scalar_value("avg(trace.output_tokens)") == pytest.approx(200)
    assert scalar_value("count(trace.trace_id)") == 2
    assert scalar_value("max(trace.total_tokens)") == pytest.approx(330)
    assert scalar_value("p50(trace.output_tokens)") == pytest.approx(200)  # AggreFuncMap -> quantile(0.50)
    # arithmetic inside one function and between functions
    assert scalar_value("avg(trace.output_tokens + trace.input_tokens)") == pytest.approx(220)
    assert scalar_value("sum(trace.output_tokens)/count(trace.trace_id)") == pytest.approx(200)
    # span-level domain still works through the same request type
    assert scalar_value("count()") == 2  # the two LLM spans; roots are not gen_ai
    assert scalar_value("sum(gen_ai.usage.output_tokens)") == pytest.approx(400)

    # multiple trace-level aggregations in one query -> one column per aggregation
    multi = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="avg(trace.output_tokens)"), Aggregation(expression="count(trace.trace_id)")],
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [multi.to_dict()], request_type=RequestType.SCALAR)
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    assert len(data) == 1 and [float(v) for v in data[0]] == [pytest.approx(200), 2], data


def test_ai_scalar_trace_level_filter_qualifies_traces(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A trace-level condition in the filter qualifies whole traces before aggregation:
    with out-tokens 100 / 300, `trace.output_tokens > 100` keeps only the 300 trace
    for both trace-level and span-level aggregations.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-qualify"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + _ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    for expression, expected in (
        ("sum(trace.output_tokens)", 300),  # native trace-domain path
        ("sum(gen_ai.usage.output_tokens)", 300),  # delegated span-domain path (__trace_scope)
    ):
        resp = make_query_request(
            signoz,
            token,
            start_ms,
            end_ms,
            [_scalar_query(service, expression, filter_extra="trace.output_tokens > 100")],
            request_type=RequestType.SCALAR,
        )
        assert resp.status_code == HTTPStatus.OK, resp.text
        data = get_scalar_table_data(resp.json())
        assert len(data) == 1 and float(data[0][-1]) == pytest.approx(expected), f"{expression}: {data}"

    # the qualification also constrains delegated (span-domain) time series
    ts = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}' AND trace.output_tokens > 100",
        aggregations=[Aggregation(expression="sum(gen_ai.usage.output_tokens)")],
        step_interval=60,
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [ts.to_dict()], request_type=RequestType.TIME_SERIES)
    assert resp.status_code == HTTPStatus.OK, resp.text
    values = _series_values(resp.json())
    assert values == [[pytest.approx(300)]], values


def test_ai_scalar_group_by_model(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Trace-level aggregation grouped by a span attribute: per-model avg of per-trace tokens."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-groupby"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100, model="gpt-4o") + _ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o") + _ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [_scalar_query(service, "avg(trace.output_tokens)", group_by=[TelemetryFieldKey(name="gen_ai.request.model")])],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    by_model = {row[0]: float(row[-1]) for row in data}
    assert by_model == {"gpt-4o": pytest.approx(200), "gpt-4o-mini": pytest.approx(50)}, data


def test_ai_timeseries_trace_level_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Time-series over per-trace values: all spans fall in one step bucket, avg=200."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-ts"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + _ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="avg(trace.output_tokens)")],
        step_interval=60,
    )
    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [query.to_dict()],
        request_type=RequestType.TIME_SERIES,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text

    values = _series_values(resp.json())
    assert values == [[pytest.approx(200)]], values


def test_ai_timeseries_top_n_groups(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Grouped, limited time series ranks groups on whole-window per-trace values
    (__ai_traces_total -> __limit_cte) and returns only the top-N: gpt-4o sums to
    400 across two traces vs gpt-4o-mini's 50, so limit=1 keeps only gpt-4o.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-topn"
    insert_traces(
        _ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o")
        + _ai_trace(now=now, service=service, in_tokens=10, out_tokens=100, model="gpt-4o")
        + _ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini")
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="sum(trace.output_tokens)")],
        group_by=[TelemetryFieldKey(name="gen_ai.request.model")],
        step_interval=60,
        limit=1,
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.TIME_SERIES)
    assert resp.status_code == HTTPStatus.OK, resp.text

    series = resp.json()["data"]["data"]["results"][0]["aggregations"][0]["series"]
    assert len(series) == 1, f"limit=1 must keep only the top group, got {len(series)} series"
    assert series[0]["labels"][0]["value"] == "gpt-4o", series[0]["labels"]
    assert [v["value"] for v in series[0]["values"]] == [pytest.approx(400)]


def test_ai_timeseries_span_time_bucketing(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Per-trace values are clipped per (bucket, trace): one trace with two LLM calls
    two minutes apart contributes each call's tokens to its own bucket, not the
    whole-trace total to both.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-buckets"

    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    def _llm(offset_s: float, out_tokens: int) -> Traces:
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
            attributes={"gen_ai.request.model": "gpt-4o-mini", "gen_ai.usage.output_tokens": out_tokens},
        )

    root = Traces(
        timestamp=now - timedelta(seconds=130),
        duration=timedelta(seconds=130),
        trace_id=trace_id,
        span_id=root_id,
        parent_span_id="",
        name="POST /api/chat",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={"http.request.method": "POST"},
    )
    insert_traces([root, _llm(124, 100), _llm(4, 300)])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    query = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="avg(trace.output_tokens)")],
        step_interval=60,
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [query.to_dict()], request_type=RequestType.TIME_SERIES)
    assert resp.status_code == HTTPStatus.OK, resp.text

    values = _series_values(resp.json())
    assert len(values) == 1, values
    assert sorted(values[0]) == [pytest.approx(100), pytest.approx(300)], f"each call's tokens in its own bucket: {values}"


def test_ai_scalar_variables_in_trace_level_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Query variables resolve inside trace-level conditions with span-filter semantics;
    an unresolvable $var is a 400, not a silent literal comparison.
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-vars"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + _ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)
    query = _scalar_query(service, "sum(trace.output_tokens)", filter_extra="trace.output_tokens > $threshold")

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [query],
        request_type=RequestType.SCALAR,
        variables={"threshold": {"type": "text", "value": 100}},
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    assert len(data) == 1 and float(data[0][-1]) == pytest.approx(300), data

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [query],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
    assert "unknown variable" in resp.text

    # a dynamic variable resolved to __all__ drops the condition (both traces count)
    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [query],
        request_type=RequestType.SCALAR,
        variables={"threshold": {"type": "dynamic", "value": "__all__"}},
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    assert len(data) == 1 and float(data[0][-1]) == pytest.approx(400), data


def test_ai_scalar_activity_gate_excludes_tool_only_traces(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    A tool-only trace (in the gen_ai gate, no LLM span) must not feed trace-level
    aggregations: count(trace.trace_id) sees only the LLM trace, while the span-level
    count() still sees both gen_ai spans (LLM + tool).
    """
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-gate"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + _tool_only_trace(now=now, service=service))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    def scalar_value(expression: str) -> float:
        return _scalar_value(signoz, token, start_ms, end_ms, service, expression)

    # count and avg agree on the trace set — the gate's purpose
    assert scalar_value("count(trace.trace_id)") == 1, "tool-only trace must be dropped by the LLM-activity gate"
    assert scalar_value("avg(trace.output_tokens)") == pytest.approx(100), "avg over the same gated trace set"
    assert scalar_value("count()") == 2, "span-level count still sees the tool span"


def test_ai_scalar_having_on_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """The outer having filters aggregation results per group (by alias)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-having"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o") + _ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            _scalar_query(
                service,
                "avg(trace.output_tokens)",
                group_by=[TelemetryFieldKey(name="gen_ai.request.model")],
                alias="avg_out",
                having="avg_out > 100",
            )
        ],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    assert len(data) == 1 and data[0][0] == "gpt-4o", data


def test_ai_aggregation_rejections(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Targeted 400s: mixed domains, group-by on a trace column, raw order by a trace column."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-reject"
    insert_traces(_ai_trace(now=now, service=service, in_tokens=10, out_tokens=100))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = _window_ms(now)

    # span-level and trace-level aggregations cannot be mixed in one query
    mixed = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="avg(trace.output_tokens)"), Aggregation(expression="count()")],
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [mixed.to_dict()], request_type=RequestType.SCALAR)
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
    assert "cannot be mixed" in resp.text

    # grouping by a trace-level per-trace column is rejected with a targeted error
    bad_group = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="avg(trace.output_tokens)")],
        group_by=[TelemetryFieldKey(name="trace.llm_call_count")],
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [bad_group.to_dict()], request_type=RequestType.SCALAR)
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
    assert "grouping by trace-level aggregate" in resp.text

    # ordering the span list by a trace-level column is rejected with a targeted error
    bad_order = BuilderQuery(
        signal="traces",
        source="ai",
        name="A",
        filter_expression=f"service.name = '{service}'",
        order=[OrderBy(key=TelemetryFieldKey(name="trace.output_tokens"), direction="desc")],
        limit=10,
    )
    resp = make_query_request(signoz, token, start_ms, end_ms, [bad_order.to_dict()], request_type=RequestType.RAW)
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
    assert "ordering the span list by trace-level aggregate" in resp.text
