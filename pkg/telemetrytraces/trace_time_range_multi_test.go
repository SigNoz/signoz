package telemetrytraces

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestGetTraceTimeRangeMulti(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name     string
		traceIDs []string
		expectOK bool
	}{
		{
			name:     "single trace ID",
			traceIDs: []string{"trace1"},
			expectOK: true,
		},
		{
			name:     "multiple trace IDs",
			traceIDs: []string{"trace1", "trace2", "trace3"},
			expectOK: true,
		},
		{
			name:     "empty trace IDs",
			traceIDs: []string{},
			expectOK: false,
		},
		{
			name:     "trace IDs with quotes",
			traceIDs: []string{"'trace1'", `"trace2"`, "trace3"},
			expectOK: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			finder := &TraceTimeRangeFinder{telemetryStore: nil}

			if !tt.expectOK {
				_, _, ok := finder.GetTraceTimeRangeMulti(ctx, tt.traceIDs)
				assert.False(t, ok)
			}
		})
	}
}

func TestTraceIDExtractionWithComplexFilters(t *testing.T) {
	tests := []struct {
		name       string
		filterExpr string
		expectIDs  []string
	}{
		{
			name:       "nested parentheses with trace_id",
			filterExpr: "((trace_id = 'abc') AND (service = 'api'))",
			expectIDs:  []string{"abc"},
		},
		{
			name:       "OR condition with multiple trace_ids",
			filterExpr: "trace_id = 'abc' OR trace_id = 'def'",
			expectIDs:  []string{"abc", "def"},
		},
		{
			name:       "IN clause with OR condition",
			filterExpr: "trace_id IN ['a', 'b'] OR trace_id = 'c'",
			expectIDs:  []string{"a", "b", "c"},
		},
		{
			name:       "complex nested conditions",
			filterExpr: "(service = 'api' AND (trace_id IN ['x', 'y'] OR duration > 100)) AND status = 200",
			expectIDs:  []string{"x", "y"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ids, found := ExtractTraceIDsFromFilter(tt.filterExpr)
			assert.True(t, found)
			assert.Equal(t, tt.expectIDs, ids)
		})
	}
}

func TestExtractTraceIDsFromFilter(t *testing.T) {
	tests := []struct {
		name        string
		filterExpr  string
		fieldKeys   map[string][]*telemetrytypes.TelemetryFieldKey
		expectIDs   []string
		expectFound bool
	}{
		{
			name:        "simple trace_id filter",
			filterExpr:  "trace_id = '123abc'",
			expectIDs:   []string{"123abc"},
			expectFound: true,
		},
		{
			name:        "trace_id IN with square brackets",
			filterExpr:  "trace_id IN ['123abc', '456def', '789ghi']",
			expectIDs:   []string{"123abc", "456def", "789ghi"},
			expectFound: true,
		},
		{
			name:        "trace_id IN with parentheses",
			filterExpr:  "trace_id IN ('aaa', 'bbb', 'ccc')",
			expectIDs:   []string{"aaa", "bbb", "ccc"},
			expectFound: true,
		},
		{
			name:        "trace_id IN with double quotes",
			filterExpr:  `trace_id IN ["111", "222", "333"]`,
			expectIDs:   []string{"111", "222", "333"},
			expectFound: true,
		},
		{
			name:        "trace_id IN with mixed quotes",
			filterExpr:  `trace_id IN ['abc', "def", 'ghi']`,
			expectIDs:   []string{"abc", "def", "ghi"},
			expectFound: true,
		},
		{
			name:        "trace_id IN with single value",
			filterExpr:  "trace_id IN ['single']",
			expectIDs:   []string{"single"},
			expectFound: true,
		},
		{
			name:        "trace_id IN in complex filter",
			filterExpr:  "service.name = 'api' AND trace_id IN ['x1', 'x2'] AND duration > 100",
			expectIDs:   []string{"x1", "x2"},
			expectFound: true,
		},
		{
			name:        "no trace_id in filter",
			filterExpr:  "service.name = 'api' AND duration > 100",
			expectIDs:   nil,
			expectFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ids, found := ExtractTraceIDsFromFilter(tt.filterExpr)
			assert.Equal(t, tt.expectFound, found)
			assert.Equal(t, tt.expectIDs, ids)
		})
	}
}

func TestExtractTraceIDFromFilter(t *testing.T) {
	tests := []struct {
		name        string
		filterExpr  string
		fieldKeys   map[string][]*telemetrytypes.TelemetryFieldKey
		expectID    []string
		expectFound bool
	}{
		{
			name:        "simple trace_id filter",
			filterExpr:  "trace_id = '123abc'",
			expectID:    []string{"123abc"},
			expectFound: true,
		},
		{
			name:        "trace_id filter with double quotes",
			filterExpr:  `trace_id = "456def"`,
			expectID:    []string{"456def"},
			expectFound: true,
		},
		{
			name:        "traceId alternative name",
			filterExpr:  "traceId = '789ghi'",
			expectID:    []string{"789ghi"},
			expectFound: true,
		},
		{
			name:        "trace_id in complex filter",
			filterExpr:  "service.name = 'api' AND trace_id = 'xyz123' AND duration > 100",
			expectID:    []string{"xyz123"},
			expectFound: true,
		},
		{
			name:        "no trace_id in filter",
			filterExpr:  "service.name = 'api' AND duration > 100",
			expectID:    nil,
			expectFound: false,
		},
		{
			name:        "trace_id field not in span context",
			filterExpr:  "trace_id = '123'",
			expectID:    []string{"123"},
			expectFound: true,
		},
		{
			name:        "unquoted trace_id value",
			filterExpr:  "trace_id = abc123def",
			expectID:    []string{"abc123def"},
			expectFound: true,
		},
		{
			name:        "trace_id with parentheses",
			filterExpr:  "(trace_id = '123') AND (service = 'api')",
			expectID:    []string{"123"},
			expectFound: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id, found := ExtractTraceIDsFromFilter(tt.filterExpr)
			assert.Equal(t, tt.expectFound, found)
			assert.Equal(t, tt.expectID, id)
		})
	}
}
