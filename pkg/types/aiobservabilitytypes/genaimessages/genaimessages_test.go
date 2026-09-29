package genaimessages

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/aiobservabilitytypes"
	"github.com/stretchr/testify/assert"
)

func TestNormalize(t *testing.T) {
	assertNormalize(t, []normalizeCase{
		{
			name: "ListNestedInAnotherList_Unwrapped",
			raw:  `[[{"role":"user","content":"Hi"}]]`,
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
			},
		},
		{
			name: "ListOfToolDefinitions_FallsBackToGeneric",
			raw:  `[{"type":"function","function":{"name":"get_weather","description":"Weather","parameters":{"type":"object"}}}]`,
			want: []aiobservabilitytypes.Message{
				{
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeGeneric, Content: `[{"type":"function","function":{"name":"get_weather","description":"Weather","parameters":{"type":"object"}}}]`},
					},
				},
			},
		},
		{
			name: "ListOfMessagesAsJSONStrings_EachDecoded",
			raw:  []any{`{"role":"user","content":"Hi"}`, `{"role":"assistant","content":"Hello"}`},
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hi"},
					},
				},
				{
					Role: aiobservabilitytypes.MessageRoleAssistant,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Hello"},
					},
				},
			},
		},
		{
			name: "TextThatIsNotJSON_ReturnedAsOneTextPart",
			raw:  "Let the cost of the ball be x dollars.",
			want: []aiobservabilitytypes.Message{
				{
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "Let the cost of the ball be x dollars."},
					},
				},
			},
		},
		{
			name: "JSONInNoKnownFormat_ReturnedVerbatimAsGeneric",
			raw:  `{"output": "{\"query\": \"SigNoz\"}", "kwargs": {"name": "search_web"}}`,
			want: []aiobservabilitytypes.Message{
				{
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeGeneric, Content: `{"output": "{\"query\": \"SigNoz\"}", "kwargs": {"name": "search_web"}}`},
					},
				},
			},
		},
		{
			name: "AlreadyDecodedValue_ConvertedLikeJSON",
			raw:  []any{map[string]any{"role": "user", "content": "hi"}},
			want: []aiobservabilitytypes.Message{
				{
					Role: aiobservabilitytypes.MessageRoleUser,
					Content: []aiobservabilitytypes.Part{
						{Type: aiobservabilitytypes.PartTypeText, Content: "hi"},
					},
				},
			},
		},
		{
			name: "BlankString_ReturnsNoMessages",
			raw:  " \n\t ",
			want: []aiobservabilitytypes.Message{},
		},
		{
			name: "JSONNull_ReturnsNoMessages",
			raw:  `null`,
			want: []aiobservabilitytypes.Message{},
		},
	})
}

func FuzzNormalize(f *testing.F) {
	for _, seed := range []string{
		`[{"role": "user", "parts": [{"type": "text", "content": "Hi"}]}]`,
		`[{"role": "assistant", "content": [{"type": "tool_use", "id": "toolu_1", "name": "f", "input": {}}]}]`,
		`[{"role": "tool", "tool_call_id": "call_1", "content": [{"type": "text", "text": "ok"}]}]`,
		`{"messages": [{"role": "user", "content": "Hi"}], "system": [{"type": "text", "text": "Be brief."}]}`,
		`{"choices": [{"message": {"role": "assistant", "content": "Hi"}, "finish_reason": "stop"}]}`,
		`{"output": [{"type": "function_call", "call_id": "c", "name": "f", "arguments": "{}"}, {"type": "reasoning"}]}`,
		`{"candidates": [{"content": {"parts": [{"functionCall": {"name": "f", "args": {}}}], "role": "model"}}]}`,
		`{"generations": [[{"text": "Hi", "message": {"lc": 1, "type": "constructor", "id": ["AIMessage"], "kwargs": {}}}]]}`,
		`[[{"role": "user", "content": "Hi"}]]`,
		`["{\"role\": \"user\", \"content\": \"Hi\"}"]`,
		``, `null`, `{}`, `[]`, `[{}]`, `"text"`, `42`,
	} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, raw string) {
		inputs := []any{raw}
		var decoded any
		if json.Unmarshal([]byte(raw), &decoded) == nil {
			inputs = append(inputs, decoded)
		}
		for _, input := range inputs {
			for i, message := range Normalize(input) {
				if message.Content == nil {
					t.Fatalf("message %d has nil content for %#v", i, input)
				}
			}
		}
	})
}

type normalizeCase struct {
	name string
	raw  any
	want []aiobservabilitytypes.Message
}

func assertNormalize(t *testing.T, testCases []normalizeCase) {
	t.Helper()
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, Normalize(testCase.raw))
		})
	}
}
