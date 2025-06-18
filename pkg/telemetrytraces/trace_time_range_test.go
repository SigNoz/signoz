package telemetrytraces

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestExtractTraceIDsFromFilter(t *testing.T) {
	tests := []struct {
		name        string
		filterExpr  string
		fieldKeys   map[string][]*telemetrytypes.TelemetryFieldKey
		expectIDs   []string
		expectFound bool
	}{
		{
			name:       "simple trace_id filter",
			filterExpr: "trace_id = '123abc'",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"123abc"},
			expectFound: true,
		},
		{
			name:       "trace_id IN with square brackets",
			filterExpr: "trace_id IN ['123abc', '456def', '789ghi']",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"123abc", "456def", "789ghi"},
			expectFound: true,
		},
		{
			name:       "trace_id IN with parentheses",
			filterExpr: "trace_id IN ('aaa', 'bbb', 'ccc')",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"aaa", "bbb", "ccc"},
			expectFound: true,
		},
		{
			name:       "trace_id IN with double quotes",
			filterExpr: `trace_id IN ["111", "222", "333"]`,
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"111", "222", "333"},
			expectFound: true,
		},
		{
			name:       "trace_id IN with mixed quotes",
			filterExpr: `trace_id IN ['abc', "def", 'ghi']`,
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"abc", "def", "ghi"},
			expectFound: true,
		},
		{
			name:       "trace_id IN with single value",
			filterExpr: "trace_id IN ['single']",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"single"},
			expectFound: true,
		},
		{
			name:       "trace_id IN in complex filter",
			filterExpr: "service.name = 'api' AND trace_id IN ['x1', 'x2'] AND duration > 100",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service.name": {{
					Name:         "service.name",
					FieldContext: telemetrytypes.FieldContextResource,
				}},
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
				"duration": {{
					Name:         "duration",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   []string{"x1", "x2"},
			expectFound: true,
		},
		{
			name:       "no trace_id in filter",
			filterExpr: "service.name = 'api' AND duration > 100",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service.name": {{
					Name:         "service.name",
					FieldContext: telemetrytypes.FieldContextResource,
				}},
				"duration": {{
					Name:         "duration",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectIDs:   nil,
			expectFound: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ids, found := ExtractTraceIDsFromFilter(tt.filterExpr, tt.fieldKeys)
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
		expectID    string
		expectFound bool
	}{
		{
			name:       "simple trace_id filter",
			filterExpr: "trace_id = '123abc'",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "123abc",
			expectFound: true,
		},
		{
			name:       "trace_id filter with double quotes",
			filterExpr: `trace_id = "456def"`,
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "456def",
			expectFound: true,
		},
		{
			name:       "traceId alternative name",
			filterExpr: "traceId = '789ghi'",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"traceId": {{
					Name:         "traceId",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "789ghi",
			expectFound: true,
		},
		{
			name:       "trace_id in complex filter",
			filterExpr: "service.name = 'api' AND trace_id = 'xyz123' AND duration > 100",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service.name": {{
					Name:         "service.name",
					FieldContext: telemetrytypes.FieldContextResource,
				}},
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
				"duration": {{
					Name:         "duration",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "xyz123",
			expectFound: true,
		},
		{
			name:       "no trace_id in filter",
			filterExpr: "service.name = 'api' AND duration > 100",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"service.name": {{
					Name:         "service.name",
					FieldContext: telemetrytypes.FieldContextResource,
				}},
				"duration": {{
					Name:         "duration",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "",
			expectFound: false,
		},
		{
			name:       "trace_id field not in span context",
			filterExpr: "trace_id = '123'",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextAttribute,
				}},
			},
			expectID:    "",
			expectFound: false,
		},
		{
			name:       "unquoted trace_id value",
			filterExpr: "trace_id = abc123def",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "abc123def",
			expectFound: true,
		},
		{
			name:       "trace_id with parentheses",
			filterExpr: "(trace_id = '123') AND (service = 'api')",
			fieldKeys: map[string][]*telemetrytypes.TelemetryFieldKey{
				"trace_id": {{
					Name:         "trace_id",
					FieldContext: telemetrytypes.FieldContextSpan,
				}},
			},
			expectID:    "123",
			expectFound: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id, found := ExtractTraceIDFromFilter(tt.filterExpr, tt.fieldKeys)
			assert.Equal(t, tt.expectFound, found)
			assert.Equal(t, tt.expectID, id)
		})
	}
}
