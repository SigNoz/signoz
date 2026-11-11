import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

import requests

from fixtures import types
from fixtures.auth import USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD
from fixtures.traces import ATTRIBUTE_JSON_ROLLOUT_TIME, TraceIdGenerator, Traces, TracesKind


def test_waterfall_formats_messages_on_gen_ai_spans(
    signoz: types.SigNoz,
    create_user_admin: None,  # pylint: disable=unused-argument
    get_token: Callable[[str, str], str],
    insert_traces: Callable[[list[Traces]], None],
    seed_attribute_evolution: Callable[[str, datetime], None],
) -> None:
    seed_attribute_evolution("traces", ATTRIBUTE_JSON_ROLLOUT_TIME)
    now = datetime.now(tz=UTC).replace(microsecond=0)
    trace_id = TraceIdGenerator.trace_id()
    root_id, llm_id, tool_id, output_only_id = (TraceIdGenerator.span_id() for _ in range(4))
    resources = {"service.name": "tracedetail-waterfall"}
    llm_input = json.dumps([{"role": "user", "parts": [{"type": "text", "content": "weather in Bangalore?"}]}])
    llm_output = json.dumps([{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Bangalore"}}], "finish_reason": "tool_call"}])

    insert_traces(
        [
            Traces(timestamp=now - timedelta(seconds=10), duration=timedelta(seconds=9), trace_id=trace_id, span_id=root_id, name="POST /chat", kind=TracesKind.SPAN_KIND_SERVER, resources=resources, attributes={"http.method": "POST"}),
            Traces(timestamp=now - timedelta(seconds=8), trace_id=trace_id, span_id=llm_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.input.messages": llm_input, "gen_ai.output.messages": llm_output}),
            Traces(timestamp=now - timedelta(seconds=6), trace_id=trace_id, span_id=tool_id, parent_span_id=root_id, name="execute_tool get_weather", resources=resources, attributes={"gen_ai.tool.name": "get_weather", "gen_ai.tool.call.result": "sunny"}),
            Traces(timestamp=now - timedelta(seconds=4), trace_id=trace_id, span_id=output_only_id, parent_span_id=root_id, name="chat gpt-4o", resources=resources, attributes={"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": "It is sunny in Bangalore."}),
        ]
    )

    token = get_token(USER_ADMIN_EMAIL, USER_ADMIN_PASSWORD)
    response = requests.post(
        signoz.self.host_configs["8080"].get(f"/api/v4/traces/{trace_id}/waterfall"),
        json={"selectedSpanId": "", "uncollapsedSpans": []},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    assert response.status_code == HTTPStatus.OK, response.text

    waterfall = response.json()["data"]
    assert [span["span_id"] for span in waterfall["spans"]] == [root_id, llm_id, tool_id, output_only_id]
    root, llm, tool, output_only = waterfall["spans"]

    # spans without messages carry no formatted keys
    assert not {"formattedInput", "formattedOutput", "formatterWarnings"} & root.keys(), root
    assert root["attributes"]["http.method"] == "POST"

    assert tool["attributes"]["gen_ai.tool.call.result"] == "sunny"
    assert "formattedInput" not in tool
    assert tool["formattedOutput"] == [{"role": "tool", "parts": [{"type": "tool_call_response", "response": "sunny"}]}]

    # the raw messages stay in attributes for the raw view
    assert llm["attributes"]["gen_ai.input.messages"] == llm_input
    assert llm["attributes"]["gen_ai.output.messages"] == llm_output
    assert llm["formattedInput"] == [{"role": "user", "parts": [{"type": "text", "content": "weather in Bangalore?"}]}]
    assert llm["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "tool_call", "name": "get_weather", "id": "call_1", "arguments": {"city": "Bangalore"}}], "finish_reason": "tool_call"}]
    assert "formatterWarnings" not in llm

    assert "formattedInput" not in output_only
    assert output_only["formattedOutput"] == [{"role": "assistant", "parts": [{"type": "text", "content": "It is sunny in Bangalore."}]}]
    assert output_only["formatterWarnings"] == ["bare assistant text, role assumed"]
