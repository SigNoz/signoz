package genaiformatter

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// formatCase holds the two raw attribute values and the formatted view expected for them.
type formatCase struct {
	name       string
	input      any
	output     any
	formatter  string
	warnings   []string
	wantInput  string
	wantOutput string
}

func runFormatCases(t *testing.T, testCases []formatCase) {
	t.Helper()
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			formatted := Format(testCase.input, testCase.output)
			assert.Equal(t, testCase.formatter, formatted.Formatter)
			assert.Equal(t, append([]string{}, testCase.warnings...), formatted.Warnings)

			input, err := json.Marshal(formatted.Input)
			require.NoError(t, err)
			assert.JSONEq(t, testCase.wantInput, string(input))
			output, err := json.Marshal(formatted.Output)
			require.NoError(t, err)
			assert.JSONEq(t, testCase.wantOutput, string(output))
		})
	}
}

func TestFormat(t *testing.T) {
	runFormatCases(t, []formatCase{
		{
			name: "Semconv_PassThrough",
			input: `[
				{"role": "system", "parts": [{"type": "text", "content": "You are a weather assistant."}]},
				{"role": "user", "parts": [{"type": "text", "content": "Weather in Paris?"}]}
			]`,
			output: `[
				{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Paris"}}], "finish_reason": "tool_call"}
			]`,
			formatter: FormatterSemconv,
			wantInput: `[
				{"role": "system", "parts": [{"type": "text", "content": "You are a weather assistant."}]},
				{"role": "user", "parts": [{"type": "text", "content": "Weather in Paris?"}]}
			]`,
			wantOutput: `[
				{"role": "assistant", "parts": [{"type": "tool_call", "id": "call_1", "name": "get_weather", "arguments": {"city": "Paris"}}], "finish_reason": "tool_call"}
			]`,
		},
		{
			name: "Semconv_ProviderSpellings",
			input: `[{"role": "user", "parts": [
				{"type": "text", "text": "What animal is in this image?"},
				{"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,/9j/4AAQ"}}
			]}]`,
			formatter: FormatterSemconv,
			wantInput: `[{"role": "user", "parts": [
				{"type": "text", "content": "What animal is in this image?"},
				{"type": "blob", "modality": "image", "mime_type": "image/jpeg", "content": "/9j/4AAQ"}
			]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "Semconv_StructuredValue",
			input:      []any{map[string]any{"role": "user", "parts": []any{map[string]any{"type": "text", "content": "hi"}}}},
			formatter:  FormatterSemconv,
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "BareText_RoleAssumed",
			output:     "It is sunny in Paris.",
			formatter:  FormatterText,
			warnings:   []string{"bare assistant text, role assumed"},
			wantInput:  `[]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "It is sunny in Paris."}]}]`,
		},
		{
			name:       "UnknownObject_Generic",
			input:      `{"city": "Paris", "temp_c": 21}`,
			formatter:  FormatterGeneric,
			warnings:   []string{"message format not recognised, kept as generic"},
			wantInput:  `[{"role": "", "parts": [{"type": "generic", "content": "{\"city\":\"Paris\",\"temp_c\":21}"}]}]`,
			wantOutput: `[]`,
		},
		{
			name:       "MixedShapes_Warns",
			input:      `[{"role": "user", "content": "hi"}]`,
			output:     `[{"role": "assistant", "parts": [{"type": "text", "content": "hello"}]}]`,
			formatter:  FormatterOpenAIChat,
			warnings:   []string{"output formatted as semconv, input as openai.chat"},
			wantInput:  `[{"role": "user", "parts": [{"type": "text", "content": "hi"}]}]`,
			wantOutput: `[{"role": "assistant", "parts": [{"type": "text", "content": "hello"}]}]`,
		},
		{
			name:       "Absent_Empty",
			wantInput:  `[]`,
			wantOutput: `[]`,
		},
	})
}
