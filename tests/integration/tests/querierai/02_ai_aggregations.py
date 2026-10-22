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
    get_all_series,
    get_scalar_columns,
    get_scalar_table_data,
    get_series_values,
    make_query_request,
)
from fixtures.querierai import ai_aggregation_query, ai_trace, query_window, scalar_value, tool_only_trace
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def test_ai_scalar_trace_level_aggregations(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Scalars over per-trace values, and the bare-key span domain through the same request type."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-scalar"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    def value(expression: str) -> float:
        return scalar_value(signoz, token, start_ms, end_ms, service, expression)

    assert value("avg(trace.output_tokens)") == pytest.approx(200)
    assert value("count(trace.trace_id)") == 2
    assert value("max(trace.total_tokens)") == pytest.approx(330)
    assert value("p50(trace.output_tokens)") == pytest.approx(200)  # AggreFuncMap -> quantile(0.50)
    # arithmetic inside one function and between functions
    assert value("avg(trace.output_tokens + trace.input_tokens)") == pytest.approx(220)
    assert value("sum(trace.output_tokens)/count(trace.trace_id)") == pytest.approx(200)
    assert value("count()") == 2  # the two LLM spans; roots are not gen_ai
    assert value("sum(gen_ai.usage.output_tokens)") == pytest.approx(400)

    # multiple trace-level aggregations in one query -> one column per aggregation
    multi = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
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
    """A trace-level condition qualifies whole traces before aggregation, on both domains."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-qualify"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    for expression in (
        "sum(trace.output_tokens)",  # native trace-domain path
        "sum(gen_ai.usage.output_tokens)",  # delegated span-domain path (__trace_scope)
    ):
        got = scalar_value(signoz, token, start_ms, end_ms, service, expression, filter_extra="trace.output_tokens > 100")
        assert got == pytest.approx(300), expression

    # the qualification also constrains delegated (span-domain) time series
    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            ai_aggregation_query(
                service,
                "sum(gen_ai.usage.output_tokens)",
                filter_extra="trace.output_tokens > 100",
                step_interval=60,
            )
        ],
        request_type=RequestType.TIME_SERIES,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    assert [v["value"] for v in get_series_values(resp.json(), "A")] == [pytest.approx(300)]


def test_ai_scalar_group_by_model(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Trace-level aggregation grouped by a span attribute."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-groupby"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100, model="gpt-4o") + ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o") + ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [ai_aggregation_query(service, "avg(trace.output_tokens)", group_by=[TelemetryFieldKey(name="gen_ai.request.model")])],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    by_model = {row[0]: float(row[-1]) for row in data}
    assert by_model == {"gpt-4o": pytest.approx(200), "gpt-4o-mini": pytest.approx(50)}, data


def test_ai_scalar_group_by_intrinsic_span_column(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Grouping by an intrinsic must not alias the group column to the span column it reads
    (`toString(name) AS name` is a cyclic alias ClickHouse rejects)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-groupby-intrinsic"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + ai_trace(now=now, service=service, in_tokens=10, out_tokens=300) + tool_only_trace(now=now, service=service))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            ai_aggregation_query(
                service,
                "count(trace.trace_id)",
                group_by=[TelemetryFieldKey(name="name")],
                order=[OrderBy(key=TelemetryFieldKey(name="name"), direction="asc")],
            )
        ],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    columns = get_scalar_columns(resp.json())
    assert columns[0]["name"] == "name", columns
    data = get_scalar_table_data(resp.json())
    # the root spans are gated out, so each trace groups under its gen_ai span name
    assert [(row[0], int(row[-1])) for row in data] == [("chat gpt-4o-mini", 2), ("execute_tool", 1)], data


def test_ai_timeseries_trace_level_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-ts"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    # all spans fall in one step bucket
    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [ai_aggregation_query(service, "avg(trace.output_tokens)", step_interval=60)],
        request_type=RequestType.TIME_SERIES,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    assert [v["value"] for v in get_series_values(resp.json(), "A")] == [pytest.approx(200)]


def test_ai_timeseries_top_n_groups(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A grouped, limited time series ranks groups on whole-window per-trace values in
    the requested order."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-topn"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o") + ai_trace(now=now, service=service, in_tokens=10, out_tokens=100, model="gpt-4o") + ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    def top_series(order: list[OrderBy] | None) -> dict:
        resp = make_query_request(
            signoz,
            token,
            start_ms,
            end_ms,
            [
                ai_aggregation_query(
                    service,
                    "sum(trace.output_tokens)",
                    group_by=[TelemetryFieldKey(name="gen_ai.request.model")],
                    alias="total_out",
                    order=order,
                    limit=1,
                    step_interval=60,
                )
            ],
            request_type=RequestType.TIME_SERIES,
        )
        assert resp.status_code == HTTPStatus.OK, resp.text
        series = get_all_series(resp.json(), "A")
        assert len(series) == 1, f"limit=1 must keep exactly one group, got {len(series)} series"
        return series[0]

    top = top_series(None)  # default ranking: first aggregation desc
    assert top["labels"][0]["value"] == "gpt-4o", top["labels"]
    assert [v["value"] for v in top["values"]] == [pytest.approx(400)]

    bottom = top_series([OrderBy(key=TelemetryFieldKey(name="total_out"), direction="asc")])
    assert bottom["labels"][0]["value"] == "gpt-4o-mini", bottom["labels"]
    assert [v["value"] for v in bottom["values"]] == [pytest.approx(50)]


def test_ai_scalar_group_order_limit(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Scalar limit is a plain top-N over the grouped rows."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-scalar-limit"
    insert_traces(
        ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o")
        + ai_trace(now=now, service=service, in_tokens=10, out_tokens=100, model="gpt-4o")
        + ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini")
        + ai_trace(now=now, service=service, in_tokens=10, out_tokens=10, model="gpt-4")
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            ai_aggregation_query(
                service,
                "sum(trace.output_tokens)",
                group_by=[TelemetryFieldKey(name="gen_ai.request.model")],
                alias="total_out",
                order=[OrderBy(key=TelemetryFieldKey(name="total_out"), direction="desc")],
                limit=2,
            )
        ],
        request_type=RequestType.SCALAR,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text
    data = get_scalar_table_data(resp.json())
    assert [(row[0], float(row[-1])) for row in data] == [("gpt-4o", pytest.approx(400)), ("gpt-4o-mini", pytest.approx(50))], data


def test_ai_timeseries_span_time_bucketing(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Per-trace values are clipped per (bucket, trace), so a trace spanning two buckets
    contributes each call's tokens to its own bucket, not the total to both."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-buckets"

    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()
    resources = {"service.name": service}

    def llm(offset_s: float, out_tokens: int) -> Traces:
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
    # two LLM calls two minutes apart
    insert_traces([root, llm(124, 100), llm(4, 300)])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [ai_aggregation_query(service, "avg(trace.output_tokens)", step_interval=60)],
        request_type=RequestType.TIME_SERIES,
    )
    assert resp.status_code == HTTPStatus.OK, resp.text

    series = get_all_series(resp.json(), "A")
    assert len(series) == 1, series
    assert sorted(v["value"] for v in series[0]["values"]) == [pytest.approx(100), pytest.approx(300)], series


def test_ai_scalar_variables_in_trace_level_filter(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """Variables resolve inside trace-level conditions with span-filter semantics."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-vars"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + ai_trace(now=now, service=service, in_tokens=30, out_tokens=300))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)
    query = ai_aggregation_query(service, "sum(trace.output_tokens)", filter_extra="trace.output_tokens > $threshold")

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

    # an unresolvable $var is a 400 today via aggregate validation
    resp = make_query_request(signoz, token, start_ms, end_ms, [query], request_type=RequestType.SCALAR)
    assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
    # quotes in the message are JSON-escaped, so match the halves separately
    assert "$threshold" in resp.text and "cannot be used in a trace-level filter" in resp.text, resp.text

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


def test_ai_scalar_tool_only_trace_null_semantics(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A tool-only trace (in the gate, no LLM span) follows plain SQL NULL semantics."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-toolonly"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100) + tool_only_trace(now=now, service=service))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    def value(expression: str, filter_extra: str = "") -> float:
        return scalar_value(signoz, token, start_ms, end_ms, service, expression, filter_extra)

    assert value("count(trace.trace_id)") == 2, "tool-only trace is an AI trace and must be counted"
    assert value("avg(trace.output_tokens)") == pytest.approx(100), "NULL tokens are skipped by avg"
    assert value("avg(trace.tool_call_count)") == pytest.approx(0.5), "tool-only trace feeds tool aggregates (1 and 0 calls)"
    assert value("count()") == 2, "span-level count sees the LLM and the tool span"

    # filtering on LLM activity is explicit, not implicit
    assert value("count(trace.trace_id)", filter_extra="trace.llm_call_count > 0") == 1


def test_ai_scalar_having_on_aggregation(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """The outer having filters aggregation results per group (by alias)."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-having"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=300, model="gpt-4o") + ai_trace(now=now, service=service, in_tokens=10, out_tokens=50, model="gpt-4o-mini"))

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    resp = make_query_request(
        signoz,
        token,
        start_ms,
        end_ms,
        [
            ai_aggregation_query(
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
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = "ai-it-agg-reject"
    insert_traces(ai_trace(now=now, service=service, in_tokens=10, out_tokens=100))
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    start_ms, end_ms = query_window(now)

    def expect_bad_request(query: dict, message: str) -> None:
        resp = make_query_request(signoz, token, start_ms, end_ms, [query], request_type=RequestType.SCALAR)
        assert resp.status_code == HTTPStatus.BAD_REQUEST, resp.text
        assert message in resp.text, resp.text

    # span-level and trace-level aggregations cannot be mixed in one query
    mixed = BuilderQuery(
        signal="traces",
        query_type="builder_ai_query",
        name="A",
        filter_expression=f"service.name = '{service}'",
        aggregations=[Aggregation(expression="avg(trace.output_tokens)"), Aggregation(expression="count()")],
    )
    expect_bad_request(mixed.to_dict(), "cannot be mixed")

    expect_bad_request(
        ai_aggregation_query(service, "avg(trace.output_tokens)", group_by=[TelemetryFieldKey(name="trace.llm_call_count")]),
        "grouping by trace-level aggregate",
    )

    # a bare per-trace column would emit one row per trace instead of one aggregated row
    expect_bad_request(ai_aggregation_query(service, "trace.output_tokens"), "must be inside an aggregation function")

    # the rate interval divides the whole expression, so it may not carry a second aggregation
    expect_bad_request(ai_aggregation_query(service, "rate(trace.trace_id) + avg(trace.output_tokens)"), "combines a rate with another aggregation")

    # order-by is stopped earlier, by request validation
    expect_bad_request(
        ai_aggregation_query(service, "avg(trace.output_tokens)", order=[OrderBy(key=TelemetryFieldKey(name="trace.total_tokens"), direction="desc")]),
        "invalid order by key",
    )
