import base64
import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import ATTRIBUTE_JSON_ROLLOUT_TIME, TraceIdGenerator, Traces, TracesKind


def test_thread_returns_gen_ai_spans_in_order(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id, first_llm_id, tool_id, agent_id, second_llm_id, legacy_llm_id, third_llm_id, flattened_llm_id, responses_llm_id, langchain_llm_id, openrouter_llm_id, vercel_llm_id, anthropic_llm_id, gemini_llm_id = (TraceIdGenerator.span_id() for _ in range(14))
    resources = {"service.name": "tracedetail-thread"}
    first_input = json.dumps([{"role": "user", "parts": [{"type": "text", "content": "weather in Bangalore?"}]}])
    first_output = json.dumps([{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Bangalore"}}]}])
    first_instructions = json.dumps([{"type": "text", "content": "Answer with the tool."}])
    second_input = json.dumps([{"role": "tool", "content": "sunny", "tool_call_id": "call_1"}])

    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), duration=timedelta(seconds=9), trace_id=trace_id, span_id=root_id, name="POST /chat", kind=TracesKind.SPAN_KIND_SERVER, resources=resources, attribute_write_mode="json_only"),
            Traces(
                timestamp=now - timedelta(seconds=8),
                trace_id=trace_id,
                span_id=first_llm_id,
                parent_span_id=root_id,
                name="chat gpt-4o",
                resources=resources,
                attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.system_instructions": first_instructions, "gen_ai.input.messages": first_input, "gen_ai.output.messages": first_output, "gen_ai.response.finish_reasons": json.dumps(["tool_calls"])},
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now - timedelta(seconds=6),
                trace_id=trace_id,
                span_id=tool_id,
                parent_span_id=root_id,
                name="execute_tool get_weather",
                resources=resources,
                attributes={"gen_ai.tool.name": "get_weather", "gen_ai.tool.call.id": "call_1", "gen_ai.tool.call.arguments": json.dumps({"city": "Bangalore"}), "gen_ai.tool.call.result": "sunny"},
                attribute_write_mode="json_only",
            ),
            Traces(timestamp=now - timedelta(seconds=5), trace_id=trace_id, span_id=agent_id, parent_span_id=root_id, name="invoke_agent planner", resources=resources, attributes={"gen_ai.agent.name": "planner"}, attribute_write_mode="json_only"),
            Traces(timestamp=now - timedelta(seconds=4), trace_id=trace_id, span_id=second_llm_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": second_input}, attribute_write_mode="json_only"),
            Traces(
                timestamp=now - timedelta(seconds=3),
                trace_id=trace_id,
                span_id=legacy_llm_id,
                parent_span_id=root_id,
                name="openai.chat",
                resources=resources,
                attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.prompt.0.role": "user", "gen_ai.prompt.0.content": "and tomorrow?", "gen_ai.completion.0.role": "assistant", "gen_ai.completion.0.content": "Also sunny.", "gen_ai.completion.0.finish_reason": "stop"},
                attribute_write_mode="json_only",
            ),
            Traces(timestamp=now - timedelta(seconds=2), trace_id=trace_id, span_id=third_llm_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": "It is sunny in Bangalore."}, attribute_write_mode="json_only"),
            Traces(
                timestamp=now - timedelta(seconds=1),
                trace_id=trace_id,
                span_id=flattened_llm_id,
                parent_span_id=root_id,
                name="ChatCompletion",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gpt-4o",
                    "llm.input_messages.0.message.role": "user",
                    "llm.input_messages.0.message.content": "thanks",
                    "llm.output_messages.0.message.role": "assistant",
                    "llm.output_messages.0.message.content": "You're welcome.",
                    "llm.finish_reason": "stop",
                },
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now,
                trace_id=trace_id,
                span_id=responses_llm_id,
                parent_span_id=root_id,
                name="responses gpt-4o",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gpt-4o",
                    "gen_ai.input.messages": json.dumps({"model": "gpt-4o", "instructions": "Be brief.", "input": [{"role": "user", "content": "bye"}]}),
                    "gen_ai.output.messages": json.dumps({"object": "response", "status": "completed", "output": [{"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "Bye!"}]}]}),
                },
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now + timedelta(seconds=1),
                trace_id=trace_id,
                span_id=langchain_llm_id,
                parent_span_id=root_id,
                name="ChatOpenAI",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gpt-4o",
                    "gen_ai.input.messages": json.dumps({"messages": [[{"lc": 1, "type": "constructor", "id": ["langchain", "schema", "messages", "HumanMessage"], "kwargs": {"content": "see you", "type": "human"}}]]}),
                    "gen_ai.output.messages": json.dumps(
                        {"generations": [[{"text": "See you!", "generation_info": {"finish_reason": "stop"}, "type": "ChatGeneration", "message": {"lc": 1, "type": "constructor", "id": ["langchain", "schema", "messages", "AIMessage"], "kwargs": {"content": "See you!", "type": "ai"}}}]]}
                    ),
                },
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now + timedelta(seconds=2),
                trace_id=trace_id,
                span_id=openrouter_llm_id,
                parent_span_id=root_id,
                name="LLM Generation",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "openai/gpt-4o-mini",
                    "gen_ai.input.messages": json.dumps({"messages": [{"role": "user", "content": "one word"}]}),
                    "gen_ai.output.messages": json.dumps({"completion": "Yes.", "reasoning": None, "rawRequest": {"model": "openai/gpt-4o-mini"}}),
                },
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now + timedelta(seconds=3),
                trace_id=trace_id,
                span_id=vercel_llm_id,
                parent_span_id=root_id,
                name="ai.generateText.doGenerate",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gpt-4o-mini",
                    "ai.operationId": "ai.generateText.doGenerate",
                    "ai.response.finishReason": "stop",
                    "gen_ai.input.messages": json.dumps([{"role": "user", "content": [{"type": "text", "text": "last one"}]}]),
                    "gen_ai.output.messages": "Done.",
                },
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now + timedelta(seconds=4),
                trace_id=trace_id,
                span_id=anthropic_llm_id,
                parent_span_id=root_id,
                name="messages claude-sonnet-4-5",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "claude-sonnet-4-5",
                    "gen_ai.input.messages": json.dumps({"system": "Be terse.", "messages": [{"role": "user", "content": "ping"}]}),
                    "gen_ai.output.messages": json.dumps({"type": "message", "role": "assistant", "content": [{"type": "text", "text": "pong"}], "stop_reason": "end_turn"}),
                },
                attribute_write_mode="json_only",
            ),
            Traces(
                timestamp=now + timedelta(seconds=5),
                trace_id=trace_id,
                span_id=gemini_llm_id,
                parent_span_id=root_id,
                name="generateContent gemini-2.5-flash",
                resources=resources,
                attributes={
                    "gen_ai.request.model": "gemini-2.5-flash",
                    "gen_ai.input.messages": json.dumps({"contents": [{"role": "user", "parts": [{"text": "ping"}]}]}),
                    "gen_ai.output.messages": json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": "pong"}]}, "finishReason": "STOP"}]}),
                },
                attribute_write_mode="json_only",
            ),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread"), headers={"Authorization": f"Bearer {token}"}, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text

    thread = response.json()["data"]
    assert [span["span_id"] for span in thread["spans"]] == [first_llm_id, tool_id, agent_id, second_llm_id, legacy_llm_id, third_llm_id, flattened_llm_id, responses_llm_id, langchain_llm_id, openrouter_llm_id, vercel_llm_id, anthropic_llm_id, gemini_llm_id]
    assert "nextCursor" not in thread

    first, tool, agent, input_only, legacy, output_only, flattened, responses, langchain, openrouter, vercel, anthropic, gemini = thread["spans"]
    assert agent["attributes"]["gen_ai.agent.name"] == "planner"
    assert agent["formattedInput"] == []
    assert agent["formattedOutput"] == []
    assert tool["attributes"]["gen_ai.tool.call.arguments"] == json.dumps({"city": "Bangalore"})
    assert tool["attributes"]["gen_ai.tool.call.result"] == "sunny"
    assert first["time_unix"] == int((now - timedelta(seconds=8)).timestamp() * 1000)
    assert first["attributes"]["gen_ai.input.messages"] == first_input
    assert first["attributes"]["gen_ai.request.model"] == "gpt-4o"
    assert first["attributes"]["gen_ai.output.messages"] == first_output
    assert input_only["attributes"]["gen_ai.input.messages"] == second_input
    assert "gen_ai.output.messages" not in input_only["attributes"]
    assert "gen_ai.input.messages" not in output_only["attributes"]
    assert output_only["attributes"]["gen_ai.output.messages"] == "It is sunny in Bangalore."

    tool_call = {"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Bangalore"}}
    assert first["formattedInput"] == [{"role": "system", "parts": [{"type": "text", "content": "Answer with the tool."}]}, {"role": "user", "parts": [{"type": "text", "content": "weather in Bangalore?"}]}]
    assert first["formattedOutput"] == [{"role": "assistant", "parts": [tool_call], "finish_reason": "tool_call"}]
    assert first["formatterWarnings"] == []
    assert tool["formattedInput"] == [{"role": "assistant", "parts": [tool_call]}]
    assert tool["formattedOutput"] == [{"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_1", "response": "sunny"}]}]
    assert input_only["formattedInput"] == [{"role": "tool", "parts": [{"type": "tool_call_response", "id": "call_1", "response": "sunny"}]}]
    assert input_only["formattedOutput"] == []
    assert output_only["formattedInput"] == []
    assert output_only["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "It is sunny in Bangalore."}]}]
    assert output_only["formatterWarnings"] == ["bare assistant text, role assumed"]
    assert legacy["attributes"]["gen_ai.prompt.0.content"] == "and tomorrow?"
    assert legacy["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "and tomorrow?"}]}]
    assert legacy["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "Also sunny."}], "finish_reason": "stop"}]
    assert flattened["attributes"]["llm.input_messages.0.message.content"] == "thanks"
    assert flattened["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "thanks"}]}]
    assert flattened["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "You're welcome."}], "finish_reason": "stop"}]
    assert responses["formattedInput"] == [{"role": "system", "parts": [{"type": "text", "content": "Be brief."}]}, {"role": "user", "parts": [{"type": "text", "content": "bye"}]}]
    assert responses["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "Bye!"}], "finish_reason": "stop"}]
    assert langchain["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "see you"}]}]
    assert langchain["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "See you!"}], "finish_reason": "stop"}]
    assert openrouter["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "one word"}]}]
    assert openrouter["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "Yes."}]}]
    assert vercel["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "last one"}]}]
    assert vercel["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "Done."}], "finish_reason": "stop"}]
    assert anthropic["formattedInput"] == [{"role": "system", "parts": [{"type": "text", "content": "Be terse."}]}, {"role": "user", "parts": [{"type": "text", "content": "ping"}]}]
    assert anthropic["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "pong"}], "finish_reason": "stop"}]
    assert gemini["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "ping"}]}]
    assert gemini["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "pong"}], "finish_reason": "stop"}]


def test_thread_paginates_with_cursors(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    span_ids = [TraceIdGenerator.span_id() for _ in range(3)]
    # identical timestamps on the last two exercise the span_id tie-break
    timestamps = [now - timedelta(seconds=6), now - timedelta(seconds=3), now - timedelta(seconds=3)]
    insert_traces(
        [
            Traces(timestamp=timestamp, trace_id=trace_id, span_id=span_id, name="chat gpt-4o", resources={"service.name": "tracedetail-thread-pages"}, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": json.dumps([{"role": "user", "content": span_id}])}, attribute_write_mode="json_only")
            for span_id, timestamp in zip(span_ids, timestamps, strict=True)
        ]
    )
    expected_order = [span_ids[0], *sorted(span_ids[1:])]

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread")
    headers = {"Authorization": f"Bearer {token}"}

    def get_page(params: dict) -> dict:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.OK, f"{params}: {response.text}"
        return response.json()["data"]

    first = get_page({"limit": 2})
    assert [span["span_id"] for span in first["spans"]] == expected_order[:2]
    assert "prevCursor" not in first
    assert first["nextCursor"]

    last = get_page({"limit": 2, "after": first["nextCursor"]})
    assert [span["span_id"] for span in last["spans"]] == expected_order[2:]
    assert last["prevCursor"]
    assert "nextCursor" not in last

    previous = get_page({"limit": 2, "before": last["prevCursor"]})
    assert [span["span_id"] for span in previous["spans"]] == expected_order[:2]
    assert "prevCursor" not in previous
    assert previous["nextCursor"] == first["nextCursor"]

    middle = get_page({"limit": 1, "before": last["prevCursor"]})
    assert [span["span_id"] for span in middle["spans"]] == expected_order[1:2]
    assert middle["prevCursor"]
    assert middle["nextCursor"]

    start = get_page({"limit": 2, "before": middle["prevCursor"]})
    assert [span["span_id"] for span in start["spans"]] == expected_order[:1]
    assert "prevCursor" not in start


def test_thread_paginates_across_buckets(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    bucket = now.replace(minute=0 if now.minute < 30 else 30, second=0)
    trace_id = TraceIdGenerator.trace_id()
    # neighbours within one 30-minute ts_bucket_start and across bucket boundaries
    timestamps = [
        bucket - timedelta(minutes=59, seconds=59),
        bucket - timedelta(minutes=30, seconds=1),
        bucket - timedelta(minutes=30),
        bucket - timedelta(seconds=1),
        bucket,
    ]
    span_ids = [TraceIdGenerator.span_id() for _ in timestamps]
    insert_traces(
        [
            Traces(timestamp=timestamp, trace_id=trace_id, span_id=span_id, name="chat gpt-4o", resources={"service.name": "tracedetail-thread-buckets"}, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": json.dumps([{"role": "user", "content": span_id}])}, attribute_write_mode="json_only")
            for span_id, timestamp in zip(span_ids, timestamps, strict=True)
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread")
    headers = {"Authorization": f"Bearer {token}"}

    def get_page(params: dict) -> dict:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.OK, f"{params}: {response.text}"
        return response.json()["data"]

    page = get_page({"limit": 1})
    forward = [span["span_id"] for span in page["spans"]]
    while "nextCursor" in page:
        page = get_page({"limit": 1, "after": page["nextCursor"]})
        forward += [span["span_id"] for span in page["spans"]]
    assert forward == span_ids

    backward = [span["span_id"] for span in page["spans"]]
    while "prevCursor" in page:
        page = get_page({"limit": 1, "before": page["prevCursor"]})
        backward = [span["span_id"] for span in page["spans"]] + backward
    assert backward == span_ids

    for index in range(1, len(span_ids)):
        around = get_page({"limit": 2, "spanId": span_ids[index]})
        assert [span["span_id"] for span in around["spans"]] == span_ids[index - 1 : index + 1], index


def test_thread_opens_around_span(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": "tracedetail-thread-anchor"}
    root_id = TraceIdGenerator.span_id()
    llm_ids = [TraceIdGenerator.span_id() for _ in range(5)]
    http_id = TraceIdGenerator.span_id()
    # http span, not a thread row, sits between the third and fourth llm spans
    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=20), duration=timedelta(seconds=19), trace_id=trace_id, span_id=root_id, name="POST /chat", kind=TracesKind.SPAN_KIND_SERVER, resources=resources, attribute_write_mode="json_only"),
            *(
                Traces(
                    timestamp=now - timedelta(seconds=18 - 3 * i),
                    trace_id=trace_id,
                    span_id=span_id,
                    parent_span_id=root_id,
                    name="chat gpt-4o",
                    resources=resources,
                    attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": json.dumps([{"role": "user", "content": span_id}])},
                    attribute_write_mode="json_only",
                )
                for i, span_id in enumerate(llm_ids)
            ),
            Traces(timestamp=now - timedelta(seconds=11), trace_id=trace_id, span_id=http_id, parent_span_id=root_id, name="GET /weather", resources=resources, attributes={"http.request.method": "GET"}, attribute_write_mode="json_only"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread")
    headers = {"Authorization": f"Bearer {token}"}

    def get_page(params: dict) -> dict:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.OK, f"{params}: {response.text}"
        return response.json()["data"]

    # thread span: included with its neighbours
    around = get_page({"limit": 3, "spanId": llm_ids[2]})
    assert [span["span_id"] for span in around["spans"]] == llm_ids[1:4]
    assert around["prevCursor"]
    assert around["nextCursor"]
    assert [span["span_id"] for span in get_page({"limit": 3, "before": around["prevCursor"]})["spans"]] == llm_ids[:1]
    assert [span["span_id"] for span in get_page({"limit": 3, "after": around["nextCursor"]})["spans"]] == llm_ids[4:]

    # span outside the thread: only its neighbours
    around_http = get_page({"limit": 2, "spanId": http_id})
    assert [span["span_id"] for span in around_http["spans"]] == llm_ids[2:4]
    assert around_http["prevCursor"]
    assert around_http["nextCursor"]

    # near the start, the short side gives its room to the other
    at_start = get_page({"limit": 3, "spanId": llm_ids[0]})
    assert [span["span_id"] for span in at_start["spans"]] == llm_ids[:3]
    assert "prevCursor" not in at_start
    assert at_start["nextCursor"]

    # near the end
    at_end = get_page({"limit": 3, "spanId": llm_ids[4]})
    assert [span["span_id"] for span in at_end["spans"]] == llm_ids[2:]
    assert at_end["prevCursor"]
    assert "nextCursor" not in at_end

    # page covers the whole thread
    whole = get_page({"limit": 10, "spanId": root_id})
    assert [span["span_id"] for span in whole["spans"]] == llm_ids
    assert "prevCursor" not in whole
    assert "nextCursor" not in whole

    missing = requests.get(url, params={"spanId": TraceIdGenerator.span_id()}, headers=headers, timeout=10)
    assert missing.status_code == HTTPStatus.NOT_FOUND, missing.text


def test_thread_reads_spans_across_json_rollout(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    now = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    rollout = now - timedelta(minutes=30)
    seed_attribute_evolution("traces", rollout)
    resources = {"service.name": "tracedetail-thread-rollout"}

    # trace entirely before the rollout: messages live only in the legacy maps
    before_trace_id = TraceIdGenerator.trace_id()
    before_ids = [TraceIdGenerator.span_id() for _ in range(2)]
    # trace straddling the rollout: one span in the maps, one in the JSON column
    straddle_trace_id = TraceIdGenerator.trace_id()
    legacy_id, json_id = TraceIdGenerator.span_id(), TraceIdGenerator.span_id()
    insert_traces(
        [
            Traces(timestamp=rollout - timedelta(minutes=10), trace_id=before_trace_id, span_id=before_ids[0], name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": json.dumps([{"role": "user", "content": "first"}])}, attribute_write_mode="legacy_only"),
            Traces(timestamp=rollout - timedelta(minutes=8), trace_id=before_trace_id, span_id=TraceIdGenerator.span_id(), name="GET /weather", resources=resources, attributes={"http.request.method": "GET"}, attribute_write_mode="legacy_only"),
            Traces(timestamp=rollout - timedelta(minutes=5), trace_id=before_trace_id, span_id=before_ids[1], name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": json.dumps([{"role": "assistant", "content": "second"}])}, attribute_write_mode="legacy_only"),
            Traces(timestamp=rollout - timedelta(minutes=5), trace_id=straddle_trace_id, span_id=legacy_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": json.dumps([{"role": "user", "content": "legacy"}])}, attribute_write_mode="legacy_only"),
            Traces(timestamp=rollout + timedelta(minutes=5), trace_id=straddle_trace_id, span_id=json_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": json.dumps([{"role": "user", "content": "json"}])}, attribute_write_mode="json_only"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}

    before = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{before_trace_id}/thread"), headers=headers, timeout=10)
    assert before.status_code == HTTPStatus.OK, before.text
    before_spans = before.json()["data"]["spans"]
    assert [span["span_id"] for span in before_spans] == before_ids
    assert before_spans[0]["attributes"]["gen_ai.input.messages"] == json.dumps([{"role": "user", "content": "first"}])
    assert before_spans[1]["attributes"]["gen_ai.output.messages"] == json.dumps([{"role": "assistant", "content": "second"}])
    # messages are decoded from the JSON column only, never from the legacy maps
    for span in before_spans:
        assert span["formattedInput"] == []
        assert span["formattedOutput"] == []

    straddle = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{straddle_trace_id}/thread"), headers=headers, timeout=10)
    assert straddle.status_code == HTTPStatus.OK, straddle.text
    straddle_spans = straddle.json()["data"]["spans"]
    assert [span["span_id"] for span in straddle_spans] == [legacy_id, json_id]
    assert straddle_spans[0]["attributes"]["gen_ai.input.messages"] == json.dumps([{"role": "user", "content": "legacy"}])
    assert straddle_spans[1]["attributes"]["gen_ai.input.messages"] == json.dumps([{"role": "user", "content": "json"}])
    assert straddle_spans[0]["formattedInput"] == []
    assert straddle_spans[1]["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "json"}]}]


def test_thread_without_gen_ai_spans_is_empty(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    trace_id = TraceIdGenerator.trace_id()
    resources = {"service.name": "tracedetail-thread-empty"}
    # messages without a gate key, as a failed call or an unmapped SDK writes them, are not a row either
    insert_traces(
        [
            Traces(timestamp=datetime.now(tz=UTC) - timedelta(seconds=5), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="GET /health", resources=resources, attribute_write_mode="json_only"),
            Traces(timestamp=datetime.now(tz=UTC) - timedelta(seconds=4), trace_id=trace_id, span_id=TraceIdGenerator.span_id(), name="chat", resources=resources, attributes={"gen_ai.input.messages": json.dumps([{"role": "user", "content": "hi"}])}, attribute_write_mode="json_only"),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.get(signoz.self.host_configs["8080"].get(f"/api/v1/traces/{trace_id}/thread"), headers={"Authorization": f"Bearer {token}"}, timeout=10)
    assert response.status_code == HTTPStatus.OK, response.text
    assert response.json()["data"] == {"spans": []}


def test_thread_rejects_invalid_requests(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
) -> None:
    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {token}"}
    url = signoz.self.host_configs["8080"].get(f"/api/v1/traces/{TraceIdGenerator.trace_id()}/thread")

    cursor = base64.urlsafe_b64encode(json.dumps({"timeUnixNano": 1, "spanId": "f1fa1bc863e94dd0"}).encode()).decode().rstrip("=")
    for params in (
        {"limit": -1},
        {"limit": 101},
        {"after": "not-a-cursor"},
        {"before": "not-a-cursor"},
        {"after": cursor, "before": cursor},
        {"after": cursor, "spanId": "f1fa1bc863e94dd0"},
        {"before": cursor, "spanId": "f1fa1bc863e94dd0"},
    ):
        response = requests.get(url, params=params, headers=headers, timeout=10)
        assert response.status_code == HTTPStatus.BAD_REQUEST, f"{params}: {response.text}"

    missing = requests.get(url, headers=headers, timeout=10)
    assert missing.status_code == HTTPStatus.NOT_FOUND, missing.text
