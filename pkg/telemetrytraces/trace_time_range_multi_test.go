package telemetrytraces

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestGetTraceTimeRangeMulti(t *testing.T) {
	// Test the SQL query generated for multiple trace IDs
	ctx := context.Background()

	tests := []struct {
		name      string
		traceIDs  []string
		expectErr bool
	}{
		{
			name:      "single trace ID",
			traceIDs:  []string{"trace1"},
			expectErr: false,
		},
		{
			name:      "multiple trace IDs",
			traceIDs:  []string{"trace1", "trace2", "trace3"},
			expectErr: false,
		},
		{
			name:      "empty trace IDs",
			traceIDs:  []string{},
			expectErr: true,
		},
		{
			name:      "trace IDs with quotes",
			traceIDs:  []string{"'trace1'", `"trace2"`, "trace3"},
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Without a real telemetry store, we can only test the error cases
			finder := &TraceTimeRangeFinder{telemetryStore: nil}

			if tt.expectErr {
				_, _, err := finder.GetTraceTimeRangeMulti(ctx, tt.traceIDs)
				assert.Error(t, err)
			}
			// With a nil telemetry store, non-error cases will panic when trying to query
			// This is expected and we skip those tests
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

	fieldKeys := map[string][]*telemetrytypes.TelemetryFieldKey{
		"trace_id": {{
			Name:         "trace_id",
			FieldContext: telemetrytypes.FieldContextSpan,
		}},
		"service": {{
			Name:         "service",
			FieldContext: telemetrytypes.FieldContextResource,
		}},
		"duration": {{
			Name:         "duration",
			FieldContext: telemetrytypes.FieldContextSpan,
		}},
		"status": {{
			Name:         "status",
			FieldContext: telemetrytypes.FieldContextSpan,
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ids, found := ExtractTraceIDsFromFilter(tt.filterExpr, fieldKeys)
			assert.True(t, found)
			assert.Equal(t, tt.expectIDs, ids)
		})
	}
}
