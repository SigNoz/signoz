package aiobservabilitytypes

import (
	"encoding/json"
	"strings"
)

// Ordered by specificity: earlier converters never match a later format.
var converters = []converter{
	convertSemconvMessages,
	convertChatMessageList,
	convertToolCallList,
	convertContentBlockList,
	convertChatRequest,
	convertChatResponse,
	convertResponsesAPIResponse,
	convertGeminiResponse,
	convertCompletionObject,
	convertLangChainGenerations,
	convertSingleMessage,
}

var finishReasonKeys = []string{"finish_reason", "finishReason", "stop_reason", "stopReason", "done_reason"}

// NormalizeMessages converts a gen_ai.*.messages value, a JSON string or a
// decoded value; unknown formats become one generic part holding the original.
func NormalizeMessages(raw any) []Message {
	var (
		value    any
		original string
	)
	switch v := raw.(type) {
	case nil:
		return []Message{}
	case string:
		original = v
		if err := json.Unmarshal([]byte(v), &value); err != nil {
			return genericMessages(original)
		}
	default:
		value = v
		original = stringOf(v)
	}

	if list, ok := value.([]any); ok {
		if len(list) == 0 {
			return []Message{}
		}
		// [[...]]: some SDKs wrap the conversation in one more list
		if _, nested := list[0].([]any); nested {
			value = flattenOnce(list)
		}
		// ["{...}", "{...}"]: an array attribute holding one JSON message per element
		if decoded, ok := decodeStringList(list); ok {
			value = decoded
		}
	}
	for _, convert := range converters {
		if messages, ok := convert(value); ok {
			return messages
		}
	}
	return genericMessages(original)
}

type converter func(value any) (messages []Message, ok bool)

func genericMessages(content string) []Message {
	return []Message{{Content: []Part{genericPart(content)}}}
}

// convertSemconvMessages handles [{role, parts, finish_reason}] and Gemini contents.
func convertSemconvMessages(value any) ([]Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	first, ok := list[0].(map[string]any)
	if !ok {
		return nil, false
	}
	if _, ok := first["parts"]; !ok {
		return nil, false
	}

	messages := make([]Message, 0, len(list))
	for _, item := range list {
		m, ok := item.(map[string]any)
		if !ok {
			messages = append(messages, genericMessages(stringOf(item))[0])
			continue
		}
		messages = append(messages, partsMessage(m, "")...)
	}
	return messages, true
}

// partsMessage falls back to chatMessage when m has no parts.
func partsMessage(m map[string]any, defaultRole MessageRole) []Message {
	parts, ok := m["parts"].([]any)
	if !ok {
		return chatMessage(m, defaultRole)
	}
	role := normalizeRole(stringOf(m["role"]))
	if role == "" {
		role = defaultRole
	}
	msg := Message{
		Role:         role,
		Content:      []Part{},
		FinishReason: normalizeFinishReason(finishReasonOf(m)),
	}
	for _, p := range parts {
		msg.Content = append(msg.Content, semconvPart(p))
	}
	return []Message{msg}
}

func semconvPart(value any) Part {
	p, ok := value.(map[string]any)
	if !ok {
		if s, ok := value.(string); ok {
			return textPart(s)
		}
		return genericPart(value)
	}
	switch stringOf(p["type"]) {
	case "text":
		if boolOf(p["thought"]) {
			return Part{Type: PartTypeThinking, Content: stringOf(firstOf(p, "content", "text"))}
		}
		return Part{Type: PartTypeText, Content: stringOf(firstOf(p, "content", "text"))}
	case "reasoning", "thinking":
		return Part{Type: PartTypeThinking, Content: stringOf(firstOf(p, "content", "thinking", "text"))}
	case "redacted_thinking", "redacted_reasoning":
		return Part{Type: PartTypeThinking, Redacted: true}
	case "tool_call":
		return Part{
			Type:      PartTypeToolCall,
			ID:        idOf(p["id"]),
			Name:      stringOf(p["name"]),
			Arguments: parseArguments(firstOf(p, "arguments", "args", "input")),
			Server:    boolOf(p["server"]),
		}
	case "tool_call_response":
		return Part{
			Type:       PartTypeToolResult,
			ToolCallID: idOf(p["id"]),
			Name:       stringOf(p["name"]),
			Content:    stringOf(firstOf(p, "response", "result", "content", "output")),
			IsError:    boolOf(firstOf(p, "is_error", "isError")),
			Server:     boolOf(p["server"]),
		}
	case "":
		// Gemini parts carry no type; the field name is the type.
		if text, ok := p["text"]; ok {
			if boolOf(p["thought"]) {
				return Part{Type: PartTypeThinking, Content: stringOf(text)}
			}
			return Part{Type: PartTypeText, Content: stringOf(text)}
		}
		if call, ok := firstOf(p, "functionCall", "function_call").(map[string]any); ok {
			return Part{Type: PartTypeToolCall, ID: stringOf(call["id"]), Name: stringOf(call["name"]), Arguments: parseArguments(call["args"])}
		}
		if resp, ok := firstOf(p, "functionResponse", "function_response").(map[string]any); ok {
			return Part{Type: PartTypeToolResult, ToolCallID: stringOf(resp["id"]), Name: stringOf(resp["name"]), Content: stringOf(resp["response"])}
		}
	}
	return genericPart(p)
}

// convertChatMessageList handles OpenAI, Anthropic, Bedrock, Vercel and LangChain message lists.
func convertChatMessageList(value any) ([]Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	if !isChatMessage(list[0]) {
		return nil, false
	}
	messages := make([]Message, 0, len(list))
	for _, item := range list {
		messages = append(messages, chatMessage(item, "")...)
	}
	return messages, true
}

func isChatMessage(value any) bool {
	m, ok := value.(map[string]any)
	if !ok {
		return false
	}
	if _, ok := m["role"]; ok {
		return true
	}
	if _, ok := m["gen_ai.event.content"]; ok {
		return true
	}
	switch typ := stringOf(m["type"]); typ {
	case "message", "reasoning", "human", "ai", "tool", "system":
		return true
	case "constructor":
		_, ok := m["kwargs"]
		return ok
	default:
		return isResponsesItemType(typ)
	}
}

// chatMessage returns nil for LangGraph tool definitions.
func chatMessage(value any, defaultRole MessageRole) []Message {
	m, ok := value.(map[string]any)
	if !ok {
		return genericMessages(stringOf(value))
	}
	if inner, role, ok := unwrapChatEnvelope(m, defaultRole); ok {
		return chatMessage(inner, role)
	}
	if isLangGraphToolDefinition(m) {
		return nil
	}

	typ := stringOf(m["type"])
	if isResponsesItemType(typ) {
		return responsesItem(m, typ)
	}
	if typ == "reasoning" {
		return []Message{{Role: MessageRoleAssistant, Content: reasoningParts(m)}}
	}

	role := normalizeRole(stringOf(m["role"]))
	if role == "" {
		role = knownRole(typ)
	}
	if role == "" {
		role = defaultRole
	}
	msg := Message{
		Role:         role,
		Content:      append(chatContentParts(m, role), chatToolCallParts(m)...),
		FinishReason: normalizeFinishReason(finishReasonOf(m)),
	}
	if refusal := stringOf(m["refusal"]); refusal != "" {
		msg.Content = append(msg.Content, textPart(refusal))
	}
	return []Message{msg}
}

// unwrapChatEnvelope unwraps LangChain serialised messages and Semantic Kernel events.
func unwrapChatEnvelope(m map[string]any, defaultRole MessageRole) (map[string]any, MessageRole, bool) {
	if kwargs, ok := m["kwargs"].(map[string]any); ok && stringOf(m["type"]) == "constructor" {
		role := langChainRole(m["id"])
		if role == "" {
			role = knownRole(stringOf(kwargs["type"]))
		}
		return kwargs, role, true
	}

	event, ok := m["gen_ai.event.content"].(string)
	if !ok {
		return nil, "", false
	}
	var inner map[string]any
	if err := json.Unmarshal([]byte(event), &inner); err != nil || inner == nil {
		return nil, "", false
	}
	if message, ok := inner["message"].(map[string]any); ok {
		if _, has := message["finish_reason"]; !has {
			message["finish_reason"] = inner["finish_reason"]
		}
		inner = message
	}
	return inner, defaultRole, true
}

// chatContentParts turns a tool message's text into its result.
func chatContentParts(m map[string]any, role MessageRole) []Part {
	parts := []Part{}
	switch content := m["content"].(type) {
	case nil:
	case string:
		if role == MessageRoleTool {
			parts = append(parts, toolResultOf(m, content))
		} else if content != "" {
			parts = append(parts, textPart(content))
		}
	case []any:
		for _, item := range content {
			part := chatContentPart(item)
			if role == MessageRoleTool && part.Type == PartTypeText {
				part = toolResultOf(m, part.Content)
			}
			parts = append(parts, part)
		}
	case map[string]any:
		if contentParts, ok := content["parts"].([]any); ok {
			for _, p := range contentParts {
				parts = append(parts, semconvPart(p))
			}
		} else if role == MessageRoleTool {
			parts = append(parts, toolResultOf(m, stringOf(content)))
		} else {
			parts = append(parts, genericPart(content))
		}
	default:
		parts = append(parts, genericPart(content))
	}
	return parts
}

func chatToolCallParts(m map[string]any) []Part {
	calls, _ := firstOf(m, "tool_calls", "toolCalls").([]any)
	if kwargs, ok := m["additional_kwargs"].(map[string]any); ok && len(calls) == 0 {
		calls, _ = kwargs["tool_calls"].([]any)
	}
	parts := make([]Part, 0, len(calls)+1)
	for _, call := range calls {
		parts = append(parts, toolCallPart(call))
	}
	if call, ok := m["function_call"].(map[string]any); ok {
		parts = append(parts, Part{Type: PartTypeToolCall, Name: stringOf(call["name"]), Arguments: parseArguments(call["arguments"])})
	}
	return parts
}

func toolResultOf(m map[string]any, content string) Part {
	return Part{Type: PartTypeToolResult, ToolCallID: stringOf(firstOf(m, "tool_call_id", "toolCallId")), Name: stringOf(m["name"]), Content: content}
}

// isLangGraphToolDefinition matches {role: "tool", content: {type: "function"}} without tool_call_id.
func isLangGraphToolDefinition(m map[string]any) bool {
	if normalizeRole(stringOf(m["role"])) != MessageRoleTool {
		return false
	}
	if _, has := m["tool_call_id"]; has {
		return false
	}
	content, ok := m["content"].(map[string]any)
	if !ok || stringOf(content["type"]) != "function" {
		return false
	}
	_, ok = content["function"]
	return ok
}

func chatContentPart(value any) Part {
	p, ok := value.(map[string]any)
	if !ok {
		if s, ok := value.(string); ok {
			return textPart(s)
		}
		return genericPart(value)
	}
	typ := stringOf(p["type"])
	switch typ {
	case "text", "input_text", "output_text", "refusal", "summary_text":
		return Part{Type: PartTypeText, Content: stringOf(firstOf(p, "text", "content", "refusal"))}
	case "thinking", "reasoning":
		return Part{Type: PartTypeThinking, Content: stringOf(firstOf(p, "thinking", "text", "content", "reasoning"))}
	case "redacted_thinking":
		return Part{Type: PartTypeThinking, Redacted: true}
	case "tool-call", "tool_use", "tool_call", "function_call":
		return toolCallPart(p)
	case "tool-result", "tool_result", "function_call_output":
		return toolResultPart(p, firstOf(p, "result", "output", "content"), false)
	case "server_tool_use", "mcp_tool_use":
		part := toolCallPart(p)
		part.Server = true
		return part
	case "":
		if text, ok := p["text"]; ok {
			return Part{Type: PartTypeText, Content: stringOf(text)}
		}
		// Bedrock Converse blocks are typed by field name.
		if use, ok := p["toolUse"].(map[string]any); ok {
			return Part{Type: PartTypeToolCall, ID: stringOf(use["toolUseId"]), Name: stringOf(use["name"]), Arguments: parseArguments(use["input"])}
		}
		if result, ok := p["toolResult"].(map[string]any); ok {
			part := toolResultPart(result, result["content"], false)
			part.ToolCallID = stringOf(result["toolUseId"])
			part.IsError = stringOf(result["status"]) == "error"
			return part
		}
	default:
		if strings.HasSuffix(typ, "_tool_result") {
			return toolResultPart(p, p["content"], true)
		}
	}
	return genericPart(p)
}

// toolCallPart reads the OpenAI, flat, Anthropic and Vercel tool call shapes.
func toolCallPart(value any) Part {
	call, ok := value.(map[string]any)
	if !ok {
		return genericPart(value)
	}
	part := Part{
		Type: PartTypeToolCall,
		ID:   idOf(firstOf(call, "toolCallId", "call_id", "id")),
		Name: stringOf(firstOf(call, "toolName", "name")),
	}
	if fn, ok := call["function"].(map[string]any); ok {
		part.Name = stringOf(fn["name"])
		part.Arguments = parseArguments(fn["arguments"])
		return part
	}
	part.Arguments = parseArguments(firstOf(call, "arguments", "args", "input"))
	return part
}

// toolResultPart unwraps the Vercel {type, value} result wrapper.
func toolResultPart(p map[string]any, result any, server bool) Part {
	if nested, ok := result.(map[string]any); ok && len(nested) <= 2 {
		if v, ok := nested["value"]; ok {
			result = v
		}
	}
	return Part{
		Type:       PartTypeToolResult,
		ToolCallID: idOf(firstOf(p, "toolCallId", "tool_use_id", "tool_call_id", "call_id", "id")),
		Name:       stringOf(firstOf(p, "toolName", "name")),
		Content:    textOf(result),
		IsError:    boolOf(firstOf(p, "isError", "is_error")),
		Server:     server,
	}
}

// textOf joins a list of text blocks; anything else goes through stringOf.
func textOf(result any) string {
	list, ok := result.([]any)
	if !ok || len(list) == 0 {
		return stringOf(result)
	}
	texts := make([]string, 0, len(list))
	for _, item := range list {
		block := asMap(item)
		text, ok := block["text"].(string)
		if !ok || (len(block) == 2 && stringOf(block["type"]) != "text") || len(block) > 2 {
			return stringOf(result)
		}
		texts = append(texts, text)
	}
	return strings.Join(texts, "\n")
}

// isResponsesItemType matches role-less Responses API tool and MCP items.
func isResponsesItemType(typ string) bool {
	switch typ {
	case "":
		return false
	case "function_call", "function_call_output", "tool_call", "custom_tool_call", "custom_tool_call_output",
		"mcp_call", "mcp_list_tools", "mcp_approval_request", "mcp_approval_response":
		return true
	}
	return strings.HasSuffix(typ, "_call") || strings.HasSuffix(typ, "_call_output")
}

// responsesItem maps built-in tools to server tool parts.
func responsesItem(m map[string]any, typ string) []Message {
	switch typ {
	case "function_call", "tool_call", "custom_tool_call":
		return []Message{{Role: MessageRoleAssistant, Content: []Part{{
			Type:      PartTypeToolCall,
			ID:        stringOf(firstOf(m, "call_id", "id")),
			Name:      stringOf(m["name"]),
			Arguments: parseArguments(firstOf(m, "arguments", "args", "input")),
		}}}}
	case "function_call_output", "custom_tool_call_output":
		return []Message{{Role: MessageRoleTool, Content: []Part{{
			Type:       PartTypeToolResult,
			ToolCallID: stringOf(firstOf(m, "call_id", "id")),
			Content:    stringOf(firstOf(m, "output", "result")),
		}}}}
	}

	id := stringOf(firstOf(m, "call_id", "id"))
	if strings.HasSuffix(typ, "_output") || typ == "mcp_approval_response" {
		return []Message{{Role: MessageRoleTool, Content: []Part{{
			Type:       PartTypeToolResult,
			ToolCallID: id,
			Name:       strings.TrimSuffix(typ, "_output"),
			Content:    stringOf(firstOf(m, "output", "result", "results")),
			Server:     true,
		}}}}
	}

	args := make(map[string]any, len(m))
	for k, v := range m {
		switch k {
		case "type", "id", "call_id", "status", "name", "server_label", "output", "result", "results":
		default:
			args[k] = v
		}
	}
	name := stringOf(firstOf(m, "name", "server_label"))
	if name == "" {
		name = typ
	}
	call := Part{Type: PartTypeToolCall, ID: id, Name: name, Server: true}
	if len(args) > 0 {
		call.Arguments = args
	}
	msg := Message{Role: MessageRoleAssistant, Content: []Part{call}}
	if result := firstOf(m, "output", "result", "results"); result != nil {
		msg.Content = append(msg.Content, Part{Type: PartTypeToolResult, ToolCallID: id, Name: name, Content: stringOf(result), Server: true})
	}
	return []Message{msg}
}

// reasoningParts marks encrypted reasoning without a summary as redacted.
func reasoningParts(m map[string]any) []Part {
	parts := []Part{}
	if summary, ok := m["summary"].([]any); ok {
		for _, s := range summary {
			parts = append(parts, Part{Type: PartTypeThinking, Content: stringOf(firstOf(asMap(s), "text", "content"))})
		}
	}
	if content, ok := m["content"].([]any); ok {
		for _, c := range content {
			parts = append(parts, Part{Type: PartTypeThinking, Content: stringOf(firstOf(asMap(c), "text", "content"))})
		}
	}
	if len(parts) == 0 {
		parts = append(parts, Part{Type: PartTypeThinking, Redacted: true})
	}
	return parts
}

// convertToolCallList handles a bare tool call list, e.g. Vercel ai.response.toolCalls.
func convertToolCallList(value any) ([]Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	msg := Message{Role: MessageRoleAssistant, Content: make([]Part, 0, len(list))}
	for _, item := range list {
		call, ok := item.(map[string]any)
		if !ok || !isToolCall(call) {
			return nil, false
		}
		msg.Content = append(msg.Content, toolCallPart(call))
	}
	return []Message{msg}, true
}

// isToolCall rejects tool definitions, which carry no arguments.
func isToolCall(call map[string]any) bool {
	if _, has := call["toolName"]; has {
		return true
	}
	if fn, ok := call["function"].(map[string]any); ok {
		_, has := fn["arguments"]
		return has
	}
	if _, has := call["name"]; !has {
		return false
	}
	_, has := lookup(call, "arguments", "args")
	return has
}

// convertContentBlockList handles a bare content block list; the role is unknown.
func convertContentBlockList(value any) ([]Message, bool) {
	list, ok := value.([]any)
	if !ok || len(list) == 0 {
		return nil, false
	}
	msg := Message{Content: make([]Part, 0, len(list))}
	for _, item := range list {
		block, ok := item.(map[string]any)
		if !ok {
			return nil, false
		}
		if _, has := block["type"].(string); !has {
			return nil, false
		}
		part := chatContentPart(block)
		if part.Type == PartTypeGeneric {
			return nil, false
		}
		msg.Content = append(msg.Content, part)
	}
	return []Message{msg}, true
}

// convertChatRequest handles OpenAI, Anthropic, Vercel, Gemini and LangChain request objects.
func convertChatRequest(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	conversation, ok := lookup(m, "messages", "input", "contents", "prompt")
	if !ok || !isConversation(m, conversation) {
		return nil, false
	}

	messages := []Message{}
	if system := systemMessage(firstOf(m, "system", "instructions", "system_instruction", "systemInstruction", "system_prompt")); system != nil {
		messages = append(messages, *system)
	} else if config, ok := m["config"].(map[string]any); ok {
		if system := systemMessage(firstOf(config, "system_instruction", "systemInstruction")); system != nil {
			messages = append(messages, *system)
		}
	}

	// {messages: "[...]"}: the list arrives JSON-encoded once more from some SDKs
	if s, isString := conversation.(string); isString {
		var decoded any
		if err := json.Unmarshal([]byte(s), &decoded); err == nil {
			if _, isList := decoded.([]any); isList {
				conversation = decoded
			}
		}
	}
	switch c := conversation.(type) {
	case string:
		messages = append(messages, textMessage(MessageRoleUser, c))
	case []any:
		for _, item := range flattenOnce(c) {
			if s, isString := item.(string); isString {
				messages = append(messages, textMessage(MessageRoleUser, s))
				continue
			}
			messages = append(messages, partsMessage(asMap(item), MessageRoleUser)...)
		}
	case map[string]any:
		messages = append(messages, partsMessage(c, MessageRoleUser)...)
	default:
		return nil, false
	}
	return messages, true
}

// isConversation rejects embeddings requests.
func isConversation(m map[string]any, conversation any) bool {
	if _, isRequestInput := m["input"]; !isRequestInput {
		return true
	}
	if _, hasChatKey := lookup(m, "instructions", "tools", "tool_choice", "parallel_tool_calls", "previous_response_id"); hasChatKey {
		return true
	}
	list, ok := conversation.([]any)
	if !ok {
		return false
	}
	for _, item := range list {
		if _, isMap := item.(map[string]any); !isMap {
			return false
		}
	}
	return true
}

// systemMessage returns nil when value is empty or unknown.
func systemMessage(value any) *Message {
	msg := Message{Role: MessageRoleSystem, Content: []Part{}}
	switch v := value.(type) {
	case string:
		if v == "" {
			return nil
		}
		msg.Content = append(msg.Content, textPart(v))
	case []any:
		for _, item := range v {
			msg.Content = append(msg.Content, chatContentPart(item))
		}
	case map[string]any:
		parts, ok := v["parts"].([]any)
		if !ok {
			return nil
		}
		for _, p := range parts {
			msg.Content = append(msg.Content, semconvPart(p))
		}
	default:
		return nil
	}
	if len(msg.Content) == 0 {
		return nil
	}
	return &msg
}

// convertChatResponse handles {choices}, {message} and {output: {message}} responses.
func convertChatResponse(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	wrapped, _ := m["message"].(map[string]any)
	if output, ok := m["output"].(map[string]any); ok && wrapped == nil {
		wrapped, _ = output["message"].(map[string]any)
	}
	if wrapped != nil {
		if !isChatMessage(wrapped) {
			return nil, false
		}
		return withFinishReason(chatMessage(wrapped, MessageRoleAssistant), finishReasonOf(m)), true
	}
	choices, ok := m["choices"].([]any)
	if !ok {
		return nil, false
	}
	messages := make([]Message, 0, len(choices))
	for _, c := range choices {
		choice := asMap(c)
		var converted []Message
		if message, ok := firstOf(choice, "message", "delta").(map[string]any); ok {
			converted = chatMessage(message, MessageRoleAssistant)
		} else if text, ok := choice["text"]; ok {
			converted = []Message{textMessage(MessageRoleAssistant, stringOf(text))}
		} else {
			converted = []Message{{Role: MessageRoleAssistant, Content: []Part{genericPart(choice)}}}
		}
		messages = append(messages, withFinishReason(converted, stringOf(choice["finish_reason"]))...)
	}
	return messages, true
}

func convertResponsesAPIResponse(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	output, ok := m["output"].([]any)
	if !ok {
		return nil, false
	}
	messages := make([]Message, 0, len(output))
	for _, item := range output {
		messages = append(messages, chatMessage(item, MessageRoleAssistant)...)
	}
	if len(messages) == 0 {
		return messages, true
	}
	last := &messages[len(messages)-1]
	if last.FinishReason == "" {
		if details, ok := m["incomplete_details"].(map[string]any); ok {
			last.FinishReason = normalizeFinishReason(stringOf(details["reason"]))
		} else if stringOf(m["status"]) == "completed" {
			last.FinishReason = FinishReasonStop
		}
	}
	return messages, true
}

// convertGeminiResponse handles Gemini {candidates} and Google ADK {content} responses.
func convertGeminiResponse(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	if content, ok := m["content"].(map[string]any); ok {
		if _, hasParts := content["parts"]; hasParts {
			return withFinishReason(partsMessage(content, MessageRoleAssistant), finishReasonOf(m)), true
		}
	}
	candidates, ok := m["candidates"].([]any)
	if !ok {
		return nil, false
	}
	messages := make([]Message, 0, len(candidates))
	for _, c := range candidates {
		candidate := asMap(c)
		content, ok := candidate["content"].(map[string]any)
		if !ok {
			messages = append(messages, Message{Role: MessageRoleAssistant, Content: []Part{genericPart(candidate)}})
			continue
		}
		messages = append(messages, withFinishReason(partsMessage(content, MessageRoleAssistant), finishReasonOf(candidate))...)
	}
	return messages, true
}

func convertCompletionObject(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	completion, ok := m["completion"].(string)
	if !ok {
		return nil, false
	}
	msg := Message{Role: MessageRoleAssistant, Content: []Part{}}
	if reasoning, ok := m["reasoning"].(string); ok && reasoning != "" {
		msg.Content = append(msg.Content, Part{Type: PartTypeThinking, Content: reasoning})
	}
	msg.Content = append(msg.Content, textPart(completion))
	return []Message{msg}, true
}

func convertLangChainGenerations(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	generations, ok := m["generations"].([]any)
	if !ok {
		return nil, false
	}
	messages := []Message{}
	for _, g := range flattenOnce(generations) {
		gen := asMap(g)
		var converted []Message
		if message, ok := gen["message"].(map[string]any); ok {
			converted = chatMessage(message, MessageRoleAssistant)
		} else {
			converted = []Message{textMessage(MessageRoleAssistant, stringOf(gen["text"]))}
		}
		messages = append(messages, withFinishReason(converted, stringOf(asMap(gen["generation_info"])["finish_reason"]))...)
	}
	return messages, true
}

func convertSingleMessage(value any) ([]Message, bool) {
	m, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	if _, ok := m["parts"]; ok {
		return partsMessage(m, ""), true
	}
	if isChatMessage(m) {
		return chatMessage(m, ""), true
	}
	return nil, false
}

// withFinishReason sets reason on the last message that has none.
func withFinishReason(messages []Message, reason string) []Message {
	if len(messages) == 0 {
		return messages
	}
	last := &messages[len(messages)-1]
	if last.FinishReason == "" {
		last.FinishReason = normalizeFinishReason(reason)
	}
	return messages
}

func langChainRole(id any) MessageRole {
	path, ok := id.([]any)
	if !ok || len(path) == 0 {
		return ""
	}
	switch class := stringOf(path[len(path)-1]); {
	case strings.HasPrefix(class, "System"):
		return MessageRoleSystem
	case strings.HasPrefix(class, "Human"):
		return MessageRoleUser
	case strings.HasPrefix(class, "AI"):
		return MessageRoleAssistant
	case strings.HasPrefix(class, "Tool"), strings.HasPrefix(class, "Function"):
		return MessageRoleTool
	}
	return ""
}

// parseArguments decodes JSON-encoded arguments; anything else is returned as is.
func parseArguments(value any) any {
	s, ok := value.(string)
	if !ok {
		return value
	}
	var decoded any
	if err := json.Unmarshal([]byte(s), &decoded); err != nil {
		return s
	}
	return decoded
}

// idOf picks the call_ entry, else the last, from list ids such as ["run_id", "call_id"].
func idOf(value any) string {
	list, ok := value.([]any)
	if !ok {
		return stringOf(value)
	}
	if len(list) == 0 {
		return ""
	}
	for _, item := range list {
		if s, ok := item.(string); ok && strings.HasPrefix(s, "call_") {
			return s
		}
	}
	return stringOf(list[len(list)-1])
}

func decodeStringList(list []any) ([]any, bool) {
	out := make([]any, 0, len(list))
	for _, item := range list {
		s, ok := item.(string)
		if !ok {
			return nil, false
		}
		var decoded map[string]any
		if err := json.Unmarshal([]byte(s), &decoded); err != nil || decoded == nil {
			return nil, false
		}
		out = append(out, decoded)
	}
	return out, true
}

func flattenOnce(list []any) []any {
	out := make([]any, 0, len(list))
	for _, item := range list {
		if inner, ok := item.([]any); ok {
			out = append(out, inner...)
			continue
		}
		out = append(out, item)
	}
	return out
}

func lookup(m map[string]any, keys ...string) (any, bool) {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			return v, true
		}
	}
	return nil, false
}

func firstOf(m map[string]any, keys ...string) any {
	v, _ := lookup(m, keys...)
	return v
}

func asMap(value any) map[string]any {
	m, _ := value.(map[string]any)
	return m
}

func boolOf(value any) bool {
	b, _ := value.(bool)
	return b
}

// stringOf renders nil as "" and non-strings as compact JSON.
func stringOf(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	}
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(data)
}

func finishReasonOf(m map[string]any) string {
	return stringOf(firstOf(m, finishReasonKeys...))
}

func textPart(content string) Part {
	return Part{Type: PartTypeText, Content: content}
}

func genericPart(value any) Part {
	return Part{Type: PartTypeGeneric, Content: stringOf(value)}
}

func textMessage(role MessageRole, content string) Message {
	return Message{Role: role, Content: []Part{textPart(content)}}
}
