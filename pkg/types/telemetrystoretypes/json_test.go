package telemetrystoretypes

import (
	"testing"

	"github.com/ClickHouse/clickhouse-go/v2/lib/chcol"
	"github.com/stretchr/testify/assert"
)

func TestNestedJSON(t *testing.T) {
	testCases := []struct {
		name  string
		paths map[string]any
		want  JSONValue
	}{
		{
			name:  "Empty",
			paths: nil,
			want:  JSONValue{},
		},
		{
			name:  "FlatScalars",
			paths: map[string]any{"level": "error", "status": int64(500)},
			want:  JSONValue{"level": "error", "status": int64(500)},
		},
		{
			name:  "DottedPathsBecomeNested",
			paths: map[string]any{"attrs.code": int64(500), "attrs.path": "/checkout"},
			want:  JSONValue{"attrs": JSONValue{"code": int64(500), "path": "/checkout"}},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			j := chcol.NewJSON()
			for path, value := range testCase.paths {
				j.SetValueAtPath(path, value)
			}
			assert.Equal(t, testCase.want, NestedJSON(*j))
		})
	}
}
