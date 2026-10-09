package genai

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParts_RoundTrip(t *testing.T) {
	id := "call_1"
	mime := "image/png"
	summary := "earlier turns"
	testCases := []struct {
		name string
		json string
		want Parts
	}{
		{
			name: "EveryType_DecodesToItsStruct",
			json: `[{"type":"text","content":"hi"},` +
				`{"type":"tool_call","name":"get_weather","id":"call_1","arguments":{"city":"Paris"}},` +
				`{"type":"tool_call_response","id":"call_1","response":"rainy"},` +
				`{"type":"server_tool_call","name":"code_interpreter","id":"call_1","server_tool_call":{"type":"code_interpreter","code":"1+1"}},` +
				`{"type":"server_tool_call_response","id":"call_1","server_tool_call_response":{"type":"code_interpreter","outputs":[]}},` +
				`{"type":"blob","modality":"image","content":"aGk=","mime_type":"image/png"},` +
				`{"type":"file","modality":"image","file_id":"file_1"},` +
				`{"type":"uri","modality":"image","uri":"gs://b/x.png","mime_type":"image/png"},` +
				`{"type":"reasoning","content":"thinking"},` +
				`{"type":"compaction","id":"call_1","content":"earlier turns"}]`,
			want: Parts{
				{Value: TextPart{Type: PartTypeText, Content: "hi"}},
				{Value: ToolCallRequestPart{Type: PartTypeToolCall, Name: "get_weather", ID: &id, Arguments: map[string]any{"city": "Paris"}}},
				{Value: ToolCallResponsePart{Type: PartTypeToolCallResponse, ID: &id, Response: "rainy"}},
				{Value: ServerToolCallPart{Type: PartTypeServerToolCall, Name: "code_interpreter", ID: &id, ServerToolCall: GenericServerToolCall{Type: "code_interpreter", AdditionalProperties: map[string]any{"code": "1+1"}}}},
				{Value: ServerToolCallResponsePart{Type: PartTypeServerToolCallResponse, ID: &id, ServerToolCallResponse: GenericServerToolCallResponse{Type: "code_interpreter", AdditionalProperties: map[string]any{"outputs": []any{}}}}},
				{Value: BlobPart{Type: PartTypeBlob, Modality: ModalityImage, Content: "aGk=", MimeType: &mime}},
				{Value: FilePart{Type: PartTypeFile, Modality: ModalityImage, FileID: "file_1"}},
				{Value: UriPart{Type: PartTypeURI, Modality: ModalityImage, URI: "gs://b/x.png", MimeType: &mime}},
				{Value: ReasoningPart{Type: PartTypeReasoning, Content: "thinking"}},
				{Value: CompactionPart{Type: PartTypeCompaction, ID: &id, Content: &summary}},
			},
		},
		{
			name: "ExtraKeys_Kept",
			json: `[{"type":"reasoning","content":"","signature":"sig","redacted":true}]`,
			want: Parts{{Value: ReasoningPart{Type: PartTypeReasoning, AdditionalProperties: map[string]any{"signature": "sig", "redacted": true}}}},
		},
		{
			name: "UnknownType_Generic",
			json: `[{"type":"refusal","refusal":"no"}]`,
			want: Parts{{Value: GenericPart{Type: "refusal", AdditionalProperties: map[string]any{"refusal": "no"}}}},
		},
		{
			name: "MissingType_Generic",
			json: `[{"text":"bare"}]`,
			want: Parts{{Value: GenericPart{AdditionalProperties: map[string]any{"text": "bare"}}}},
		},
		{
			name: "Blob_DropsExtraKeys",
			json: `[{"type":"blob","modality":"audio","content":"aGk=","transcript":"hi"}]`,
			want: Parts{{Value: BlobPart{Type: PartTypeBlob, Modality: ModalityAudio, Content: "aGk="}}},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			var parts Parts
			require.NoError(t, json.Unmarshal([]byte(testCase.json), &parts))
			assert.Equal(t, testCase.want, parts)

			encoded, err := json.Marshal(parts)
			require.NoError(t, err)
			var again Parts
			require.NoError(t, json.Unmarshal(encoded, &again))
			assert.Equal(t, parts, again)
		})
	}
}

func TestParts_Marshal(t *testing.T) {
	id := "c1"
	testCases := []struct {
		name string
		part any
		want string
	}{
		{name: "TypeFilledFromKind", part: TextPart{Content: "hi"}, want: `{"type":"text","content":"hi"}`},
		{name: "ExtrasAfterFields_KnownKeysWin", part: TextPart{Content: "hi", AdditionalProperties: map[string]any{"content": "shadowed", "signature": "sig"}}, want: `{"type":"text","content":"hi","signature":"sig"}`},
		{name: "ResponseNull_StillEmitted", part: ToolCallResponsePart{ID: &id}, want: `{"type":"tool_call_response","response":null,"id":"c1"}`},
		{name: "NilArguments_Omitted", part: ToolCallRequestPart{Name: "f"}, want: `{"type":"tool_call","name":"f"}`},
		{name: "Generic_KeepsType", part: GenericPart{Type: "refusal", AdditionalProperties: map[string]any{"refusal": "no"}}, want: `{"type":"refusal","refusal":"no"}`},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			encoded, err := json.Marshal(testCase.part)
			require.NoError(t, err)
			assert.JSONEq(t, testCase.want, string(encoded))
		})
	}
}

func TestMessages_RoundTrip(t *testing.T) {
	stop := FinishReasonStop
	name := "planner"
	input := `[{"role":"system","parts":[{"type":"text","content":"be brief"}]},{"role":"user","parts":[],"name":"planner","x-trace":"abc"}]`
	output := `[{"role":"assistant","parts":[{"type":"text","content":"ok"}],"finish_reason":"stop"}]`

	var in InputMessages
	require.NoError(t, json.Unmarshal([]byte(input), &in))
	assert.Equal(t, InputMessages{
		{Role: RoleSystem, Parts: Parts{{Value: TextPart{Type: PartTypeText, Content: "be brief"}}}},
		{Role: RoleUser, Parts: Parts{}, Name: &name, AdditionalProperties: map[string]any{"x-trace": "abc"}},
	}, in)
	encoded, err := json.Marshal(in)
	require.NoError(t, err)
	assert.JSONEq(t, input, string(encoded))

	var out OutputMessages
	require.NoError(t, json.Unmarshal([]byte(output), &out))
	assert.Equal(t, OutputMessages{{Role: RoleAssistant, Parts: Parts{{Value: TextPart{Type: PartTypeText, Content: "ok"}}}, FinishReason: &stop}}, out)
	encoded, err = json.Marshal(out)
	require.NoError(t, err)
	assert.JSONEq(t, output, string(encoded))

	encoded, err = json.Marshal(ChatMessage{Role: RoleUser})
	require.NoError(t, err)
	assert.JSONEq(t, `{"role":"user","parts":[]}`, string(encoded))
}
