from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querier import (
    make_query_request,
)
from fixtures.traces import (
    TraceIdGenerator,
    Traces,
    TracesKind,
    TracesStatusCode,
)


def test_traces_list_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests that filtering by trace_id:
    1. Returns the matching span (narrow window, single bucket).
    2. Does not return duplicate spans when the query window spans multiple
       exponential buckets (>1 h)
    3. Returns no results when the query window does not contain the trace.
    """
    target_trace_id = TraceIdGenerator.trace_id()
    other_trace_id = TraceIdGenerator.trace_id()
    span_id_root = TraceIdGenerator.span_id()
    other_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    common_resources = {
        "deployment.environment": "production",
        "service.name": "trace-filter-service",
        "cloud.provider": "integration",
    }

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=target_trace_id,
                span_id=span_id_root,
                parent_span_id="",
                name="root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={"http.request.method": "GET"},
            ),
            # span from a different trace — must not appear in results
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=1),
                trace_id=other_trace_id,
                span_id=other_span_id,
                parent_span_id="",
                name="other-root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    trace_filter = f"trace_id = '{target_trace_id}'"

    def _query(start_ms: int, end_ms: int) -> tuple[list, list[str]]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="raw",
            queries=[
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "disabled": False,
                        "limit": 100,
                        "offset": 0,
                        "filter": {"expression": trace_filter},
                        "order": [{"key": {"name": "timestamp"}, "direction": "desc"}],
                        "selectFields": [
                            {
                                "name": "name",
                                "fieldDataType": "string",
                                "fieldContext": "span",
                                "signal": "traces",
                            }
                        ],
                        "having": {"expression": ""},
                        "aggregations": [{"expression": "count()"}],
                    },
                }
            ],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["status"] == "success"
        rows = response.json()["data"]["data"]["results"][0]["rows"] or []
        warning = (response.json().get("data") or {}).get("warning") or {}
        messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
        return rows, messages

    outside_range_msg = "lies outside the selected time range"

    now_ms = int(now.timestamp() * 1000)

    # --- Test 1: narrow window (single bucket, <1 h) ---
    narrow_start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    narrow_rows, narrow_warnings = _query(narrow_start_ms, now_ms)

    assert len(narrow_rows) == 1, f"Expected 1 span for trace_id filter (narrow window), got {len(narrow_rows)}"
    assert narrow_rows[0]["data"]["span_id"] == span_id_root
    assert narrow_rows[0]["data"]["trace_id"] == target_trace_id
    assert not any(outside_range_msg in m for m in narrow_warnings), f"Did not expect outside-range warning, got {narrow_warnings}"

    # --- Test 2: wide window (>1 h, triggers multiple exponential buckets) ---
    # should just return 1 span, not duplicate
    wide_start_ms = int((now - timedelta(hours=12)).timestamp() * 1000)
    wide_rows, wide_warnings = _query(wide_start_ms, now_ms)

    assert len(wide_rows) == 1, f"Expected 1 span for trace_id filter (wide window, multi-bucket), got {len(wide_rows)} — possible duplicate-span regression"
    assert wide_rows[0]["data"]["span_id"] == span_id_root
    assert wide_rows[0]["data"]["trace_id"] == target_trace_id
    assert not any(outside_range_msg in m for m in wide_warnings), f"Did not expect outside-range warning, got {wide_warnings}"

    # --- Test 3: window that does not contain the trace returns no results + warning ---
    past_start_ms = int((now - timedelta(hours=6)).timestamp() * 1000)
    past_end_ms = int((now - timedelta(hours=2)).timestamp() * 1000)
    past_rows, past_warnings = _query(past_start_ms, past_end_ms)

    assert len(past_rows) == 0, f"Expected 0 spans for trace_id filter outside time window, got {len(past_rows)}"
    assert any(outside_range_msg in m for m in past_warnings), f"Expected outside-range warning, got warnings={past_warnings}"


def test_traces_aggregation_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests that the trace_id time-range optimization also applies to
    non-window-list (time_series / aggregation) traces queries:
    1. Wide query window containing the trace returns the correct count.
    2. Query window outside the trace's time range short-circuits to empty.
    3. Filter referencing a trace_id with no row in trace_summary
       short-circuits to empty (trace_summary is authoritative for traces).
    """
    target_trace_id = TraceIdGenerator.trace_id()
    target_root_span_id = TraceIdGenerator.span_id()
    target_child_span_id = TraceIdGenerator.span_id()
    missing_trace_id = TraceIdGenerator.trace_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    common_resources = {
        "deployment.environment": "production",
        "service.name": "traces-agg-filter-service",
        "cloud.provider": "integration",
    }

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=5),
                trace_id=target_trace_id,
                span_id=target_root_span_id,
                parent_span_id="",
                name="root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={"http.request.method": "GET"},
            ),
            Traces(
                timestamp=now - timedelta(seconds=9),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_child_span_id,
                parent_span_id=target_root_span_id,
                name="child-span",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def _count(start_ms: int, end_ms: int, trace_id: str) -> tuple[float, list[str]]:
        response = make_query_request(
            signoz,
            token,
            start_ms=start_ms,
            end_ms=end_ms,
            request_type="time_series",
            queries=[
                {
                    "type": "builder_query",
                    "spec": {
                        "name": "A",
                        "signal": "traces",
                        "stepInterval": 60,
                        "disabled": False,
                        "filter": {"expression": f"trace_id = '{trace_id}'"},
                        "aggregations": [{"expression": "count()"}],
                    },
                }
            ],
        )
        assert response.status_code == HTTPStatus.OK
        assert response.json()["status"] == "success"
        results = response.json()["data"]["data"]["results"]
        assert len(results) == 1
        warning = (response.json().get("data") or {}).get("warning") or {}
        messages = [w.get("message", "") for w in (warning.get("warnings") or [])]
        aggregations = results[0].get("aggregations") or []
        if not aggregations:
            return 0, messages
        series = aggregations[0].get("series") or []
        if not series:
            return 0, messages
        return sum(v["value"] for v in series[0]["values"]), messages

    outside_range_msg = "lies outside the selected time range"

    now_ms = int(now.timestamp() * 1000)

    # --- Test 1: wide window (>1 h) containing the trace returns both spans ---
    wide_start_ms = int((now - timedelta(hours=12)).timestamp() * 1000)
    wide_count, wide_warnings = _count(wide_start_ms, now_ms, target_trace_id)
    assert wide_count == 2, f"Expected count=2 for trace_id aggregation (wide window), got {wide_count}"
    assert not any(outside_range_msg in m for m in wide_warnings), f"Did not expect outside-range warning, got {wide_warnings}"

    # --- Test 2: window outside the trace short-circuits to empty + warning ---
    past_start_ms = int((now - timedelta(hours=6)).timestamp() * 1000)
    past_end_ms = int((now - timedelta(hours=2)).timestamp() * 1000)
    past_count, past_warnings = _count(past_start_ms, past_end_ms, target_trace_id)
    assert past_count == 0, f"Expected count=0 for trace_id aggregation outside time window, got {past_count}"
    assert any(outside_range_msg in m for m in past_warnings), f"Expected outside-range warning, got warnings={past_warnings}"

    # --- Test 3: trace_id with no entry in trace_summary short-circuits (no warning) ---
    missing_start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    missing_count, missing_warnings = _count(missing_start_ms, now_ms, missing_trace_id)
    assert missing_count == 0, f"Expected count=0 for trace_id absent from trace_summary, got {missing_count}"
    assert not any(outside_range_msg in m for m in missing_warnings), f"Did not expect outside-range warning for missing trace_id, got {missing_warnings}"
