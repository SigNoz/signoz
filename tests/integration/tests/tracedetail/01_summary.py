from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import pytest
import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.querierai import root_span
from fixtures.traces import TraceIdGenerator, Traces, TracesKind, TracesStatusCode

WATERFALL_FIELDS = (
    "startTimestampMillis",
    "endTimestampMillis",
    "rootServiceName",
    "rootServiceEntryPoint",
    "totalSpansCount",
    "totalErrorSpansCount",
    "hasMissingSpans",
)


@pytest.mark.parametrize("attribute_backend", ["map", "json"])
def test_summary_ai_trace(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    use_attribute_backend: Callable[[str], None],
    attribute_backend: str,
) -> None:
    """The summary carries the waterfall's trace-level fields and, for a trace with gen_ai
    spans, token totals over every LLM span and the cost summed over the spans that carry it.
    Spans are written to one layout only, so a read from the wrong column sums to zero."""
    use_attribute_backend(attribute_backend)
    write_mode = "json_only" if attribute_backend == "json" else "legacy_only"
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    service = f"td-summary-{attribute_backend}"
    resources = {"service.name": service}
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()

    insert_traces(
        [
            root_span(now=now, trace_id=trace_id, span_id=root_id, resources=resources, duration_s=4),
            Traces(
                timestamp=now - timedelta(seconds=4),
                duration=timedelta(seconds=1),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=root_id,
                name="chat gpt-4o-mini",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gpt-4o-mini",
                    "gen_ai.usage.input_tokens": 100,
                    "gen_ai.usage.output_tokens": 20,
                    "gen_ai.usage.cache_read.input_tokens": 7,
                    "_signoz.gen_ai.total_cost": 0.01,
                },
                attribute_write_mode=write_mode,
            ),
            # a failed LLM call: counted in tokens and errors, but priced by nobody
            Traces(
                timestamp=now - timedelta(seconds=3),
                duration=timedelta(seconds=0.5),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=root_id,
                name="chat gpt-4o-mini",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_ERROR,
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gpt-4o-mini",
                    "gen_ai.usage.input_tokens": 50,
                    "gen_ai.usage.output_tokens": 5,
                },
                attribute_write_mode=write_mode,
            ),
            Traces(
                timestamp=now - timedelta(seconds=2),
                duration=timedelta(seconds=0.5),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=root_id,
                name="execute_tool",
                kind=TracesKind.SPAN_KIND_INTERNAL,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
                attributes={"gen_ai.tool.name": "get_weather"},
                attribute_write_mode=write_mode,
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}", "content-type": "application/json"}

    summary = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/summary"), timeout=10, headers=headers)
    assert summary.status_code == HTTPStatus.OK, summary.text
    summary = summary.json()["data"]

    waterfall = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v4/traces/{trace_id}/waterfall"),
        timeout=10,
        headers=headers,
        json={"selectedSpanId": "", "uncollapsedSpans": []},
    )
    assert waterfall.status_code == HTTPStatus.OK, waterfall.text
    waterfall = waterfall.json()["data"]

    assert {k: summary[k] for k in WATERFALL_FIELDS} == {k: waterfall[k] for k in WATERFALL_FIELDS}
    assert summary["rootServiceName"] == service
    assert summary["rootServiceEntryPoint"] == "POST /api/chat"
    assert summary["totalSpansCount"] == 4
    assert summary["totalErrorSpansCount"] == 1
    assert summary["hasMissingSpans"] is False

    assert summary["ai"]["tokens"] == {"input": 150, "output": 25, "cacheRead": 7, "cacheWrite": 0, "reasoning": 0}
    assert summary["ai"]["totalCost"] == pytest.approx(0.01)


def test_summary_ai_trace_across_json_rollout(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    """A trace that straddles the attribute JSON rollout has LLM spans written only to the legacy
    maps before it and to the JSON column after it. The summary window covers both, so the gen_ai
    reads must fall back across columns and sum every span."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    rollout = now - timedelta(minutes=30)
    seed_attribute_evolution("traces", rollout)

    service = "td-summary-rollout"
    resources = {"service.name": service}
    trace_id = TraceIdGenerator.trace_id()
    root_id = TraceIdGenerator.span_id()

    insert_traces(
        [
            Traces(
                timestamp=rollout - timedelta(minutes=10),
                duration=timedelta(minutes=15),
                trace_id=trace_id,
                span_id=root_id,
                parent_span_id="",
                name="long agent run",
                kind=TracesKind.SPAN_KIND_SERVER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
                attribute_write_mode="legacy_only",
            ),
            Traces(
                timestamp=rollout - timedelta(minutes=5),
                duration=timedelta(seconds=1),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=root_id,
                name="chat gpt-4o-mini",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
                attributes={"gen_ai.request.model": "gpt-4o-mini", "gen_ai.usage.input_tokens": 100, "gen_ai.usage.output_tokens": 20, "_signoz.gen_ai.total_cost": 0.01},
                attribute_write_mode="legacy_only",
            ),
            Traces(
                timestamp=rollout + timedelta(minutes=4),
                duration=timedelta(seconds=1),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=root_id,
                name="chat gpt-4o-mini",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
                attributes={"gen_ai.request.model": "gpt-4o-mini", "gen_ai.usage.input_tokens": 50, "gen_ai.usage.output_tokens": 5, "_signoz.gen_ai.total_cost": 0.02},
                attribute_write_mode="json_only",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    summary = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/summary"),
        timeout=10,
        headers={"authorization": f"Bearer {token}"},
    )
    assert summary.status_code == HTTPStatus.OK, summary.text
    summary = summary.json()["data"]

    assert summary["totalSpansCount"] == 3
    assert summary["rootServiceEntryPoint"] == "long agent run"
    assert summary["ai"]["tokens"] == {"input": 150, "output": 25, "cacheRead": 0, "cacheWrite": 0, "reasoning": 0}
    assert summary["ai"]["totalCost"] == pytest.approx(0.03)


def test_summary_non_ai_trace_with_missing_root(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    """A trace whose recorded spans all hang off an unrecorded parent reports the synthetic
    "Missing Span" root exactly as the waterfall does, and a trace without gen_ai spans has
    no `ai` block."""
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    resources = {"service.name": "td-summary-orphan"}
    trace_id = TraceIdGenerator.trace_id()
    missing_parent_id = TraceIdGenerator.span_id()

    insert_traces(
        [
            Traces(
                timestamp=now - timedelta(seconds=5),
                duration=timedelta(seconds=2),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=missing_parent_id,
                name="SELECT users",
                kind=TracesKind.SPAN_KIND_CLIENT,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
            ),
            Traces(
                timestamp=now - timedelta(seconds=4),
                duration=timedelta(seconds=1),
                trace_id=trace_id,
                span_id=TraceIdGenerator.span_id(),
                parent_span_id=missing_parent_id,
                name="publish event",
                kind=TracesKind.SPAN_KIND_PRODUCER,
                status_code=TracesStatusCode.STATUS_CODE_OK,
                resources=resources,
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"authorization": f"Bearer {token}", "content-type": "application/json"}

    summary = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/summary"), timeout=10, headers=headers)
    assert summary.status_code == HTTPStatus.OK, summary.text
    summary = summary.json()["data"]

    waterfall = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v4/traces/{trace_id}/waterfall"),
        timeout=10,
        headers=headers,
        json={"selectedSpanId": "", "uncollapsedSpans": []},
    )
    assert waterfall.status_code == HTTPStatus.OK, waterfall.text
    waterfall = waterfall.json()["data"]

    assert {k: summary[k] for k in WATERFALL_FIELDS} == {k: waterfall[k] for k in WATERFALL_FIELDS}
    assert summary["hasMissingSpans"] is True
    assert summary["rootServiceName"] == ""
    assert summary["rootServiceEntryPoint"] == "Missing Span"
    assert summary["totalSpansCount"] == 2
    assert "ai" not in summary


def test_summary_unknown_trace(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(
        signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/summary"),
        timeout=10,
        headers={"authorization": f"Bearer {token}"},
    )
    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
