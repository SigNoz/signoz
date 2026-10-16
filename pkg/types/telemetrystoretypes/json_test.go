package telemetrystoretypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
)

func jsonColumn(paths map[string]any) chcol.JSON {
	j := chcol.NewJSON()
	for path, value := range paths {
		j.SetValueAtPath(path, value)
	}
	return *j
}

func TestFlattenJSON(t *testing.T) {
	testCases := []struct {
		name   string
		column chcol.JSON
		want   map[string]any
	}{
		{
			name:   "ScalarAndObjectKeyBothSurvive",
			column: jsonColumn(map[string]any{"db.function": "refresh", "db.function.arg": int64(2)}),
			want:   map[string]any{"db.function": "refresh", "db.function.arg": float64(2)},
		},
		{
			name:   "DropsNullPaths",
			column: jsonColumn(map[string]any{"gen_ai.request.model": "gpt-4o", "gen_ai.output.messages": chcol.Variant{}}),
			want:   map[string]any{"gen_ai.request.model": "gpt-4o"},
		},
		{
			name:   "Empty",
			column: jsonColumn(map[string]any{}),
			want:   map[string]any{},
		},
	}
	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, FlattenJSON(testCase.column))
		})
	}
}

func TestNestJSON(t *testing.T) {
	column := jsonColumn(map[string]any{
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
	assert.Equal(t, want, NestJSON(column))
}
