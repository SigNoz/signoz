package telemetrystoretypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
)

func TestFlattenJSON(t *testing.T) {
	testCases := []struct {
		name  string
		paths map[string]any
		want  map[string]any
	}{
		{
			name:  "Empty",
			paths: nil,
			want:  map[string]any{},
		},
		{
			name:  "FlatScalars",
			paths: map[string]any{"level": "error", "status": float64(500)},
			want:  map[string]any{"level": "error", "status": float64(500)},
		},
		{
			name:  "ScalarAndObjectKey_StaysDistinctPaths",
			paths: map[string]any{"db.function": "node_refresh", "db.function.arg_count": float64(2)},
			want:  map[string]any{"db.function": "node_refresh", "db.function.arg_count": float64(2)},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			j := chcol.NewJSON()
			for path, value := range testCase.paths {
				j.SetValueAtPath(path, value)
			}
			assert.Equal(t, testCase.want, FlattenJSON(*j))
		})
	}
}
