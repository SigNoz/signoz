package telemetrystoretypes

import (
	"encoding/json"
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func jsonValue(paths map[string]any) JSONValue {
	j := chcol.NewJSON()
	for path, value := range paths {
		j.SetValueAtPath(path, value)
	}
	return JSONValue{column: *j}
}

func TestFlatten(t *testing.T) {
	testCases := []struct {
		name  string
		value JSONValue
		want  map[string]any
	}{
		{
			name:  "ScalarAndObjectKeyBothSurvive",
			value: jsonValue(map[string]any{"db.function": "refresh", "db.function.arg": int64(2)}),
			want:  map[string]any{"db.function": "refresh", "db.function.arg": float64(2)},
		},
		{
			name:  "DropsNullPaths",
			value: jsonValue(map[string]any{"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": chcol.Variant{}}),
			want:  map[string]any{"gen_ai.request.model": "gpt-4o"},
		},
		{
			name:  "Empty",
			value: jsonValue(map[string]any{}),
			want:  map[string]any{},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.value.Flatten())
		})
	}
}

func TestNest(t *testing.T) {
	value := jsonValue(map[string]any{
		"gen_ai.request.model":    "gpt-4o",
		"gen_ai.prompt.0.content": "hi",
		"gen_ai.prompt.0.role":    "user",
		"gen_ai.output.messages":  chcol.Variant{},
	})
	want := map[string]any{
		"gen_ai": map[string]any{
			"request": map[string]any{"model": "gpt-4o"},
			"prompt":  map[string]any{"0": map[string]any{"content": "hi", "role": "user"}},
		},
	}
	assert.Equal(t, want, value.Nest())
}

func TestMarshalJSON(t *testing.T) {
	value := jsonValue(map[string]any{
		"gen_ai.request.model":   "gpt-4o",
		"gen_ai.output.messages": chcol.Variant{},
	})

	raw, err := json.Marshal(value)
	require.NoError(t, err)
	assert.JSONEq(t, `{"gen_ai.request.model":"gpt-4o"}`, string(raw))
}
