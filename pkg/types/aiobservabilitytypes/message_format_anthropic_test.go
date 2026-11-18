package aiobservabilitytypes

import "testing"

// Cases follow the Anthropic Messages API shapes; no capture in SigNoz/scripts records raw Anthropic
// bodies.
// https://platform.claude.com/docs/en/api/messages
// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/message_param.py#L28
func TestFormat_Anthropic(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			// system as a string; end_turn is stop
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/message_create_params.py#L181
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/stop_reason.py#L5
			name:   "SystemStringAndText_EndTurn",
			input:  `{"model":"claude-sonnet-4-5","max_tokens":1024,"system":"You are terse.","messages":[{"role":"user","content":"Hi"}]}`,
			output: `{"id":"msg_1","type":"message","role":"assistant","model":"claude-sonnet-4-5","content":[{"type":"text","text":"Hello."}],"stop_reason":"end_turn","stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":3}}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "You are terse."}]},
			  {"role": "user", "parts": [{"type": "text", "content": "Hi"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello."}], "finish_reason": "stop"}]`,
		},
		{
			// tool_result sits inside the next user turn, with text beside it
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/tool_result_block_param.py#L29
			name:   "ToolRound_ToolResultSplitFromUserTurn",
			input:  `{"messages":[{"role":"user","content":"Weather in Oslo?"},{"role":"assistant","content":[{"type":"text","text":"Checking."},{"type":"tool_use","id":"toolu_1","name":"get_weather","input":{"city":"Oslo"}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_1","content":"{\"temp_c\":4}"},{"type":"text","text":"And Bergen?"}]}]}`,
			output: `{"type":"message","role":"assistant","content":[{"type":"tool_use","id":"toolu_2","name":"get_weather","input":{"city":"Bergen"}}],"stop_reason":"tool_use"}`,
			wantInput: `[
			  {"role": "user", "parts": [{"type": "text", "content": "Weather in Oslo?"}]},
			  {"role": "assistant", "parts": [{"type": "text", "content": "Checking."}, {"type": "tool_call", "id": "toolu_1", "name": "get_weather", "arguments": {"city": "Oslo"}}]},
			  {"role": "tool", "parts": [{"type": "tool_call_response", "id": "toolu_1", "response": {"temp_c": 4}}]},
			  {"role": "user", "parts": [{"type": "text", "content": "And Bergen?"}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "tool_call", "id": "toolu_2", "name": "get_weather", "arguments": {"city": "Bergen"}}], "finish_reason": "tool_call"}]`,
		},
		{
			// system as text blocks; every image and document source type; thinking blocks in the history and
			// the answer
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/image_block_param.py#L14
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/document_block_param.py#L16
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/thinking_block_param.py#L21
			name:   "MediaSourcesAndThinking_MaxTokens",
			input:  `{"system":[{"type":"text","text":"Describe inputs.","cache_control":{"type":"ephemeral"}}],"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}},{"type":"image","source":{"type":"url","url":"https://example.com/a.jpg"}},{"type":"document","source":{"type":"file","file_id":"file_1"}},{"type":"document","source":{"type":"text","media_type":"text/plain","data":"plain notes"},"title":"notes"},{"type":"text","text":"What are these?"}]},{"role":"assistant","content":[{"type":"thinking","thinking":"Two images and two documents.","signature":"sig"},{"type":"redacted_thinking","data":"xx"},{"type":"text","text":"Images and documents."}]}]}`,
			output: `{"type":"message","role":"assistant","content":[{"type":"thinking","thinking":"Listing them.","signature":"sig"},{"type":"text","text":"A PNG, a JPEG"}],"stop_reason":"max_tokens"}`,
			wantInput: `[
			  {"role": "system", "parts": [{"type": "text", "content": "Describe inputs."}]},
			  {"role": "user", "parts": [
			    {"type": "blob", "modality": "image", "mime_type": "image/png", "content": "iVBORw0KGgo="},
			    {"type": "uri", "modality": "image", "uri": "https://example.com/a.jpg"},
			    {"type": "file", "modality": "document", "file_id": "file_1"},
			    {"type": "text", "content": "plain notes"},
			    {"type": "text", "content": "What are these?"}
			  ]},
			  {"role": "assistant", "parts": [{"type": "reasoning", "content": "Two images and two documents."}, {"type": "reasoning", "content": ""}, {"type": "text", "content": "Images and documents."}]}
			]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "reasoning", "content": "Listing them."}, {"type": "text", "content": "A PNG, a JPEG"}], "finish_reason": "length"}]`,
		},
		{
			// server_tool_use with its web_search_tool_result in the same message; refusal is a content filter
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/server_tool_use_block_param.py#L33
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/web_search_tool_result_block_param.py#L22
			// https://github.com/anthropics/anthropic-sdk-python/blob/2a53eaa6966b04560b6a72c28d3ace4389a9ac58/src/anthropic/types/stop_reason.py#L5
			name:      "ServerToolUseAndResult_Refusal",
			output:    `{"type":"message","role":"assistant","content":[{"type":"server_tool_use","id":"srvtoolu_1","name":"web_search","input":{"query":"otel genai"}},{"type":"web_search_tool_result","tool_use_id":"srvtoolu_1","content":[{"type":"web_search_result","url":"https://opentelemetry.io","title":"OTel"}]},{"type":"text","text":"Found it."}],"stop_reason":"refusal"}`,
			wantInput: `[]`,
			wantOutput: `[{"role": "assistant", "parts": [
			  {"type": "server_tool_call", "id": "srvtoolu_1", "name": "web_search", "server_tool_call": {"type": "server_tool_use", "id": "srvtoolu_1", "name": "web_search", "input": {"query": "otel genai"}}},
			  {"type": "server_tool_call_response", "id": "srvtoolu_1", "server_tool_call_response": {"type": "web_search_tool_result", "tool_use_id": "srvtoolu_1", "content": [{"type": "web_search_result", "url": "https://opentelemetry.io", "title": "OTel"}]}},
			  {"type": "text", "content": "Found it."}
			], "finish_reason": "content_filter"}]`,
		},
		{
			// a request with neither system nor Anthropic-only blocks is an OpenAI chat request; the
			// response names the format
			name:       "PlainRequest_ResponseNamesFormat",
			input:      `{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"Hi"}]}`,
			output:     `{"type":"message","role":"assistant","content":[{"type":"text","text":"Hello."}],"stop_reason":"end_turn"}`,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "Hi"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "Hello."}], "finish_reason": "stop"}]`,
		},
		{
			name:       "BareMessageList_ToolBlocksNameFormat",
			input:      `[{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_1","content":[{"type":"text","text":"sunny"}]}]}]`,
			wantInput:  `[{"role": "tool", "parts": [{"type": "tool_call_response", "id": "toolu_1", "response": "sunny"}]}]`,
			wantOutput: `[]`,
		},
	})
}
