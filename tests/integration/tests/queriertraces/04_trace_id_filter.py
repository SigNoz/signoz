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
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode, trace_noise

# The trace_id filter drives a trace_summary-backed time-range optimization
# (short-circuit outside the trace's window, no duplicate spans across the
# exponential buckets of a wide window). Under the shared clean/corrupt factor a
# colliding numeric `trace_id` attribute must not divert the equality filter off
# the intrinsic trace_id column.

OUTSIDE_RANGE_MSG = "lies outside the selected time range"


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_list_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    A target trace (one root span) and an unrelated trace.

    Tests filtering a raw list by trace_id:
    1. A narrow window (single bucket) returns just the target span.
    2. A wide window (>1 h, multiple exponential buckets) returns it exactly once
       (no duplicate-span regression).
    3. A window that does not contain the trace returns nothing and warns that it
       lies outside the selected time range.
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    resources = {"deployment.environment": "production", "service.name": "trace-filter-service", "cloud.provider": "integration", **extra_resources}

    target_span = Traces(
        timestamp=now - timedelta(seconds=10),
        duration=timedelta(seconds=5),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        parent_span_id="",
        name="root-span",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes={"http.request.method": "GET", **extra_attrs},
    )
    other_span = Traces(
        timestamp=now - timedelta(seconds=5),
        duration=timedelta(seconds=1),
        trace_id=TraceIdGenerator.trace_id(),
        span_id=TraceIdGenerator.span_id(),
        parent_span_id="",
        name="other-root-span",
        kind=TracesKind.SPAN_KIND_SERVER,
        status_code=TracesStatusCode.STATUS_CODE_OK,
        resources=resources,
        attributes=dict(extra_attrs),
    )
    insert_traces([target_span, other_span])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def query(start_ms: int, end_ms: int) -> tuple[list, list[str]]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.RAW,
            queries=[
                BuilderQuery(
                    signal="traces",
                    name="A",
                    limit=100,
                    filter_expression=f"trace_id = '{target_span.trace_id}'",
                    order=[OrderBy(TelemetryFieldKey("timestamp"), "desc")],
                    select_fields=[TelemetryFieldKey("span.name")],
                ).to_dict()
            ],
        )
        assert response.status_code == HTTPStatus.OK, response.text
        rows = response.json()["data"]["data"]["results"][0]["rows"] or []
        warning = (response.json().get("data") or {}).get("warning") or {}
        messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
        return rows, messages

    now_ms = int(now.timestamp() * 1000)

    # 1. Narrow window (single bucket).
    narrow_rows, narrow_warnings = query(int((now - timedelta(minutes=5)).timestamp() * 1000), now_ms)
    assert len(narrow_rows) == 1
    assert narrow_rows[0]["data"]["span_id"] == target_span.span_id
    assert narrow_rows[0]["data"]["trace_id"] == target_span.trace_id
    assert not any(OUTSIDE_RANGE_MSG in m for m in narrow_warnings)

    # 2. Wide window (>1 h, multi-bucket) — still exactly one span.
    wide_rows, wide_warnings = query(int((now - timedelta(hours=12)).timestamp() * 1000), now_ms)
    assert len(wide_rows) == 1, "possible duplicate-span regression across exponential buckets"
    assert wide_rows[0]["data"]["span_id"] == target_span.span_id
    assert not any(OUTSIDE_RANGE_MSG in m for m in wide_warnings)

    # 3. Window that does not contain the trace — empty + outside-range warning.
    past_rows, past_warnings = query(int((now - timedelta(hours=6)).timestamp() * 1000), int((now - timedelta(hours=2)).timestamp() * 1000))
    assert past_rows == []
    assert any(OUTSIDE_RANGE_MSG in m for m in past_warnings)


@pytest.mark.parametrize("noise", ["clean", "corrupt"])
def test_traces_aggregation_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    noise: str,
) -> None:
    """
    Setup:
    A target trace with two spans (root + child).

    Tests the trace_id time-range optimization for aggregation (time_series):
    1. A wide window containing the trace returns the correct count (both spans).
    2. A window outside the trace short-circuits to empty and warns.
    3. A trace_id with no row in trace_summary short-circuits to empty with no
       outside-range warning (trace_summary is authoritative).
    """
    extra_attrs, extra_resources = trace_noise(noise)
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    resources = {"deployment.environment": "production", "service.name": "traces-agg-filter-service", "cloud.provider": "integration", **extra_resources}

    trace_id = TraceIdGenerator.trace_id()
    root_span_id = TraceIdGenerator.span_id()
    target_spans = [
        Traces(
            timestamp=now - timedelta(seconds=10),
            duration=timedelta(seconds=5),
            trace_id=trace_id,
            span_id=root_span_id,
            parent_span_id="",
            name="root-span",
            kind=TracesKind.SPAN_KIND_SERVER,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes={"http.request.method": "GET", **extra_attrs},
        ),
        Traces(
            timestamp=now - timedelta(seconds=9),
            duration=timedelta(seconds=1),
            trace_id=trace_id,
            span_id=TraceIdGenerator.span_id(),
            parent_span_id=root_span_id,
            name="child-span",
            kind=TracesKind.SPAN_KIND_CLIENT,
            status_code=TracesStatusCode.STATUS_CODE_OK,
            resources=resources,
            attributes=dict(extra_attrs),
        ),
    ]
    missing_trace_id = TraceIdGenerator.trace_id()
    insert_traces(target_spans)

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def count(start_ms: int, end_ms: int, filter_trace_id: str) -> tuple[float, list[str]]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type=RequestType.TIME_SERIES,
            queries=[
                BuilderQuery(
                    signal="traces",
                    name="A",
                    step_interval=60,
                    filter_expression=f"trace_id = '{filter_trace_id}'",
                    aggregations=[Aggregation("count()")],
                ).to_dict()
            ],
        )
        assert response.status_code == HTTPStatus.OK, response.text
        results = response.json()["data"]["data"]["results"]
        assert len(results) == 1
        warning = (response.json().get("data") or {}).get("warning") or {}
        messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
        aggregations = results[0].get("aggregations") or []
        series = aggregations[0].get("series") if aggregations else None
        total = sum(v["value"] for v in series[0]["values"]) if series else 0
        return total, messages

    now_ms = int(now.timestamp() * 1000)

    # 1. Wide window containing the trace returns both spans.
    wide_count, wide_warnings = count(int((now - timedelta(hours=12)).timestamp() * 1000), now_ms, trace_id)
    assert wide_count == len(target_spans)
    assert not any(OUTSIDE_RANGE_MSG in m for m in wide_warnings)

    # 2. Window outside the trace short-circuits to empty + warning.
    past_count, past_warnings = count(int((now - timedelta(hours=6)).timestamp() * 1000), int((now - timedelta(hours=2)).timestamp() * 1000), trace_id)
    assert past_count == 0
    assert any(OUTSIDE_RANGE_MSG in m for m in past_warnings)

    # 3. trace_id absent from trace_summary short-circuits (no outside-range warning).
    missing_count, missing_warnings = count(int((now - timedelta(minutes=5)).timestamp() * 1000), now_ms, missing_trace_id)
    assert missing_count == 0
    assert not any(OUTSIDE_RANGE_MSG in m for m in missing_warnings)
