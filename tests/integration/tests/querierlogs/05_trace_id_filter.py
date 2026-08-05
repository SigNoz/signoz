from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.logs import Logs
from fixtures.querier import (
    make_query_request,
)
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode


def test_logs_list_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests that filtering logs by trace_id uses the trace_summary lookup to
    narrow the query window before scanning the logs table:
    1. Returns the matching logs (narrow window, single bucket), including a log
       flushed shortly after the span ends — kept by the configured padding.
    2. Does not return duplicate logs when the query window should span multiple
       exponential buckets (>1 h). The window is clamped to the trace's recorded
       range widened by the padding, so the post-span log survives the clamp.
    3. Returns no results when the query window does not contain the trace.
    4. Logs carrying a trace_id whose trace is NOT in trace_summary (e.g.
       traces disabled) are still returned — the lookup miss must not
       short-circuit logs queries.
    """
    target_trace_id = TraceIdGenerator.trace_id()
    orphan_trace_id = TraceIdGenerator.trace_id()
    target_root_span_id = TraceIdGenerator.span_id()
    target_child_span_id = TraceIdGenerator.span_id()
    orphan_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    common_resources = {
        "deployment.environment": "production",
        "service.name": "logs-trace-filter-service",
        "cloud.provider": "integration",
    }

    # Populate signoz_traces.distributed_trace_summary by inserting spans for
    # the target trace_id. trace_summary records min/max of span timestamps
    # (it ignores span duration), so two spans are inserted to give the trace
    # a non-trivial recorded window of [now-10s, now-5s].
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_root_span_id,
                parent_span_id="",
                name="root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
            Traces(
                timestamp=now - timedelta(seconds=5),
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

    # Insert logs:
    # - one with the target trace_id, at a timestamp within the trace's
    #   recorded window (now-10s..now-5s, padded ±1s).
    # - one with the target trace_id flushed ~3s AFTER the span's recorded end
    #   (now-2s). This is outside the ±1s base pad but inside the multi-minute
    #   log_trace_id_window_padding, so it must still be returned.
    # - one with an orphan trace_id whose trace was never ingested — used to
    #   verify the lookup miss does NOT short-circuit logs queries.
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=7),
                resources=common_resources,
                attributes={"http.method": "GET"},
                body="log inside the target trace window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources=common_resources,
                attributes={"http.method": "POST"},
                body="log flushed after the span ends, within padding window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources=common_resources,
                attributes={"http.method": "PUT"},
                body="log with a trace_id absent from trace_summary",
                severity_text="INFO",
                trace_id=orphan_trace_id,
                span_id=orphan_span_id,
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)

    def _query(start_ms: int, end_ms: int, trace_id: str) -> tuple[list, list[str]]:
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
                        "signal": "logs",
                        "disabled": False,
                        "limit": 100,
                        "offset": 0,
                        "filter": {"expression": f"trace_id = '{trace_id}'"},
                        "order": [
                            {"key": {"name": "timestamp"}, "direction": "desc"},
                            {"key": {"name": "id"}, "direction": "desc"},
                        ],
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

    inside_window_body = "log inside the target trace window"
    post_span_body = "log flushed after the span ends, within padding window"

    # --- Test 1: narrow window (single bucket, <1 h) ---
    narrow_start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)
    narrow_rows, narrow_warnings = _query(narrow_start_ms, now_ms, target_trace_id)

    assert len(narrow_rows) == 2, f"Expected 2 logs for trace_id filter (narrow window), got {len(narrow_rows)}"
    assert {r["data"]["trace_id"] for r in narrow_rows} == {target_trace_id}
    narrow_bodies = {r["data"]["body"] for r in narrow_rows}
    assert inside_window_body in narrow_bodies
    assert post_span_body in narrow_bodies, "post-span log should be returned within the padding window"
    assert not any(outside_range_msg in m for m in narrow_warnings), f"Did not expect outside-range warning, got {narrow_warnings}"

    # --- Test 2: wide window (>1 h, clamp to the padded timerange from trace_summary) ---
    # Should return exactly the two target logs — no duplicates from multi-bucket
    # scan, and the post-span log survives the clamp only because of the padding.
    wide_start_ms = int((now - timedelta(hours=12)).timestamp() * 1000)
    wide_rows, wide_warnings = _query(wide_start_ms, now_ms, target_trace_id)

    assert len(wide_rows) == 2, f"Expected 2 logs for trace_id filter (wide window, multi-bucket), got {len(wide_rows)} — possible duplicate-log regression or padding not applied"
    assert {r["data"]["trace_id"] for r in wide_rows} == {target_trace_id}
    wide_bodies = {r["data"]["body"] for r in wide_rows}
    assert inside_window_body in wide_bodies
    assert post_span_body in wide_bodies, "post-span log should survive the clamp because of the padding"
    assert not any(outside_range_msg in m for m in wide_warnings), f"Did not expect outside-range warning, got {wide_warnings}"

    # --- Test 3: window that does not contain the trace returns no results + warning ---
    past_start_ms = int((now - timedelta(hours=6)).timestamp() * 1000)
    past_end_ms = int((now - timedelta(hours=2)).timestamp() * 1000)
    past_rows, past_warnings = _query(past_start_ms, past_end_ms, target_trace_id)

    assert len(past_rows) == 0, f"Expected 0 logs for trace_id filter outside time window, got {len(past_rows)}"
    assert any(outside_range_msg in m for m in past_warnings), f"Expected outside-range warning, got warnings={past_warnings}"

    # --- Test 4: trace_id not present in trace_summary still returns logs (no warning) ---
    orphan_rows, orphan_warnings = _query(narrow_start_ms, now_ms, orphan_trace_id)

    assert len(orphan_rows) == 1, f"Expected 1 log for orphan trace_id (no trace_summary entry), got {len(orphan_rows)} — logs query may have been incorrectly short-circuited"
    assert orphan_rows[0]["data"]["trace_id"] == orphan_trace_id
    assert not any(outside_range_msg in m for m in orphan_warnings), f"Did not expect outside-range warning for orphan trace_id, got {orphan_warnings}"


def test_logs_aggregation_filter_by_trace_id(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_logs: Callable[[list[Logs]], None],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """
    Tests that the trace_id time-range optimization also applies to
    non-window-list (time_series / aggregation) logs queries:
    1. Wide query window containing the trace returns the correct count.
    2. Query window outside the trace's time range short-circuits to an
       empty result.
    3. A trace_id with no row in trace_summary (e.g. traces disabled) still
       returns the matching logs — the lookup miss must not short-circuit
       logs aggregation queries.
    """
    target_trace_id = TraceIdGenerator.trace_id()
    orphan_trace_id = TraceIdGenerator.trace_id()
    target_root_span_id = TraceIdGenerator.span_id()
    target_child_span_id = TraceIdGenerator.span_id()
    orphan_span_id = TraceIdGenerator.span_id()

    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)

    common_resources = {
        "deployment.environment": "production",
        "service.name": "logs-trace-agg-service",
        "cloud.provider": "integration",
    }

    # trace_summary records min/max of span timestamps (it ignores duration),
    # so insert two spans to give the trace a recorded window wide enough to
    # comfortably contain the log timestamps below.
    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=10),
                duration=timedelta(seconds=1),
                trace_id=target_trace_id,
                span_id=target_root_span_id,
                parent_span_id="",
                name="root-span",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                status_message="",
                resources=common_resources,
                attributes={},
            ),
            Traces(
                timestamp=now - timedelta(seconds=5),
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

    # Two logs for the target trace_id, both inside the recorded trace window.
    # One additional log carries an orphan trace_id with no row in
    # trace_summary — used to verify that the lookup miss does not
    # short-circuit logs aggregations.
    insert_logs(
        [
            Logs(
                timestamp=now - timedelta(seconds=7),
                resources=common_resources,
                attributes={},
                body="log A inside trace window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=6),
                resources=common_resources,
                attributes={},
                body="log B inside trace window",
                severity_text="INFO",
                trace_id=target_trace_id,
                span_id=target_root_span_id,
            ),
            Logs(
                timestamp=now - timedelta(seconds=2),
                resources=common_resources,
                attributes={},
                body="log with a trace_id absent from trace_summary",
                severity_text="INFO",
                trace_id=orphan_trace_id,
                span_id=orphan_span_id,
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
                        "signal": "logs",
                        "stepInterval": 60,
                        "disabled": False,
                        "filter": {"expression": f"trace_id = '{trace_id}'"},
                        "having": {"expression": ""},
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
    narrow_start_ms = int((now - timedelta(minutes=5)).timestamp() * 1000)

    # --- Test 1: wide window (>1 h) containing the trace returns 2 logs ---
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

    # --- Test 3: trace_id not present in trace_summary still returns logs (no warning) ---
    orphan_count, orphan_warnings = _count(narrow_start_ms, now_ms, orphan_trace_id)
    assert orphan_count == 1, f"Expected count=1 for orphan trace_id aggregation, got {orphan_count} — query may have been incorrectly short-circuited"
    assert not any(outside_range_msg in m for m in orphan_warnings), f"Did not expect outside-range warning for orphan trace_id, got {orphan_warnings}"
