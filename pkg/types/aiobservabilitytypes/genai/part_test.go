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
			name: "EveryNamedType_DecodesToItsStruct",
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
				{Value: ServerToolCallPart{Type: PartTypeServerToolCall, Name: "code_interpreter", ID: &id, ServerToolCall: GenericServerToolCall{"type": "code_interpreter", "code": "1+1"}}},
				{Value: ServerToolCallResponsePart{Type: PartTypeServerToolCallResponse, ID: &id, ServerToolCallResponse: GenericServerToolCallResponse{"type": "code_interpreter", "outputs": []any{}}}},
				{Value: BlobPart{Type: PartTypeBlob, Modality: ModalityImage, Content: "aGk=", MimeType: &mime}},
				{Value: FilePart{Type: PartTypeFile, Modality: ModalityImage, FileID: "file_1"}},
				{Value: UriPart{Type: PartTypeURI, Modality: ModalityImage, URI: "gs://b/x.png", MimeType: &mime}},
				{Value: ReasoningPart{Type: PartTypeReasoning, Content: "thinking"}},
				{Value: CompactionPart{Type: PartTypeCompaction, ID: &id, Content: &summary}},
			},
		},
		{
			name: "UnknownKeys_Dropped",
			json: `[{"type":"reasoning","content":"","signature":"sig"}]`,
			want: Parts{{Value: ReasoningPart{Type: PartTypeReasoning}}},
		},
		{
			name: "UnknownType_DecodesToGenericMap",
			json: `[{"type":"refusal","refusal":"no"}]`,
			want: Parts{{Value: GenericPart{"type": "refusal", "refusal": "no"}}},
		},
		{
			name: "MissingType_DecodesToGenericMap",
			json: `[{"text":"bare"}]`,
			want: Parts{{Value: GenericPart{"text": "bare"}}},
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
