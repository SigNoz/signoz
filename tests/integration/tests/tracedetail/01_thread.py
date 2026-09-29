import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import TraceIdGenerator, Traces, TracesKind


def test_thread_returns_message_spans_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id, first_llm_id, tool_id, second_llm_id, third_llm_id = (TraceIdGenerator.span_id() for _ in range(5))
    resources = {"service.name": "tracedetail-thread"}
    first_input = json.dumps([{"role": "user", "parts": [{"type": "text", "content": "weather in Bangalore?"}]}])
    first_output = json.dumps([{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Bangalore"}}], "finish_reason": "tool_call"}])
    second_input = json.dumps([{"role": "tool", "content": "sunny", "tool_call_id": "call_1"}])

    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), duration=timedelta(seconds=9), trace_id=trace_id, span_id=root_id, name="POST /chat", kind=TracesKind.SPAN_KIND_SERVER, resources=resources, attribute_write_mode="json_only"),
            Traces(
                timestamp=now - timedelta(seconds=8), trace_id=trace_id, span_id=first_llm_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": first_input, "gen_ai.output.messages": first_output}, attribute_write_mode="json_only"
            ),
            Traces(timestamp=now - timedelta(seconds=6), trace_id=trace_id, span_id=tool_id, parent_span_id=root_id, name="execute_tool get_weather", resources=resources, attributes={"gen_ai.tool.name": "get_weather"}, attribute_write_mode="json_only"),
            Traces(timestamp=now - timedelta(seconds=4), trace_id=trace_id, span_id=second_llm_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": second_input}, attribute_write_mode="json_only"),
            Traces(timestamp=now - timedelta(seconds=2), trace_id=trace_id, span_id=third_llm_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": "It is sunny in Bangalore."}, attribute_write_mode="json_only"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread"), headers={"Authorization": f"Bearer {token}"}, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text

    thread = response.json()["data"]
    assert [span["span_id"] for span in thread["spans"]] == [first_llm_id, second_llm_id, third_llm_id]
    assert "nextCursor" not in thread

    first, input_only, output_only = thread["spans"]
    assert first["time_unix"] == int((now - timedelta(seconds=8)).timestamp() * 1000)
    assert first["attributes"]["gen_ai.input.messages"] == first_input
    assert first["attributes"]["gen_ai.request.model"] == "gpt-4o"
    assert first["attributes"]["gen_ai.output.messages"] == first_output
    assert input_only["attributes"]["gen_ai.input.messages"] == second_input
    assert "gen_ai.output.messages" not in input_only["attributes"]
    assert "gen_ai.input.messages" not in output_only["attributes"]
    assert output_only["attributes"]["gen_ai.output.messages"] == "It is sunny in Bangalore."
    assert first["formatted_input"] == [{"role": "user", "content": [{"type": "text", "content": "weather in Bangalore?"}]}]
    assert first["formatted_output"] == [
        {
            "role": "assistant",
            "content": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Bangalore"}}],
            "finishReason": "tool_call",
        }
    ]
    assert input_only["formatted_input"] == [{"role": "tool", "content": [{"type": "tool_result", "toolCallId": "call_1", "content": "sunny"}]}]
    assert "formatted_output" not in input_only
    assert "formatted_input" not in output_only
    assert output_only["formatted_output"] == [{"content": [{"type": "generic", "content": "It is sunny in Bangalore."}]}]


def test_thread_paginates_with_cursor(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    span_ids = [TraceIdGenerator.span_id() for _ in range(3)]
    # identical timestamps on the last two exercise the span_id tie-break
    timestamps = [now - timedelta(seconds=6), now - timedelta(seconds=3), now - timedelta(seconds=3)]
    insert_traces(
        [
            Traces(timestamp=timestamp, trace_id=trace_id, span_id=span_id, name="chat gpt-4o", resources={"service.name": "tracedetail-thread-pages"}, attributes={"gen_ai.input.messages": json.dumps([{"role": "user", "content": span_id}])}, attribute_write_mode="json_only")
            for span_id, timestamp in zip(span_ids, timestamps, strict=True)
        ]
    )
    expected_order = [span_ids[0], *sorted(span_ids[1:])]

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread")
    headers = {"Authorization": f"Bearer {token}"}

    first_page = requests.get(url, params={"limit": 2}, headers=headers, timeout=10)
    assert first_page.status_code == HTTPStatus.OK, first_page.text
    first = first_page.json()["data"]
    assert [span["span_id"] for span in first["spans"]] == expected_order[:2]
    assert first["nextCursor"]

    second_page = requests.get(url, params={"limit": 2, "cursor": first["nextCursor"]}, headers=headers, timeout=10)
    assert second_page.status_code == HTTPStatus.OK, second_page.text
    second = second_page.json()["data"]
    assert [span["span_id"] for span in second["spans"]] == expected_order[2:]
    assert "nextCursor" not in second


def test_thread_without_messages_is_empty(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    trace_id = TraceIdGenerator.trace_id()
    insert_traces([Traces(timestamp=datetime.now(tz=UTC) - timedelta(seconds=5), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="GET /health", resources={"service.name": "tracedetail-thread-empty"}, attribute_write_mode="json_only")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread"), headers={"Authorization": f"Bearer {token}"}, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"] == {"spans": []}


def test_thread_rejects_invalid_requests(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
) -> None:
    trace_id = TraceIdGenerator.trace_id()
    insert_traces([Traces(timestamp=datetime.now(tz=UTC) - timedelta(seconds=5), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="chat gpt-4o", resources={"service.name": "tracedetail-thread-invalid"}, attributes={"gen_ai.input.messages": "hi"}, attribute_write_mode="json_only")])

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread")

    for params in ({"limit": -1}, {"limit": 1001}, {"cursor": "not-a-cursor"}):
        response = requests.get(url, params=params, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.BAD_REQUEST, f"{params}: {response.text}"

    missing = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/thread"), headers=headers, timeout=10)
    assert missing.status_code == HTTPStatus.NOT_FOUND, missing.text
