package exporttypes

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestParseExportQueryColumns(t *testing.T) {
	tests := []struct {
		name            string
		input           []string
		expectedColumns []telemetrytypes.TelemetryFieldKey
	}{
		{
			name:            "empty input",
			input:           []string{},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{},
		},
		{
			name:  "single column",
			input: []string{"timestamp"},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
			},
		},
		{
			name:  "multiple columns",
			input: []string{"timestamp", "message", "level"},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "message"},
				{Name: "level"},
			},
		},
		{
			name:  "empty entry is skipped",
			input: []string{"timestamp", "", "level"},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "level"},
			},
		},
		{
			name:  "whitespace-only entry is skipped",
			input: []string{"timestamp", "   ", "level"},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "timestamp"},
				{Name: "level"},
			},
		},
		{
			name:  "column with context and type",
			input: []string{"attribute.user:string"},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "user", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
			},
		},
		{
			name:  "column with context, dot-notation name",
			input: []string{"attribute.user.string"},
			expectedColumns: []telemetrytypes.TelemetryFieldKey{
				{Name: "user.string", FieldContext: telemetrytypes.FieldContextAttribute},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			columns := parseExportQueryColumns(tt.input)
			assert.Equal(t, len(tt.expectedColumns), len(columns))
			for i, expected := range tt.expectedColumns {
				assert.Equal(t, expected, columns[i])
			}
		})
	}
}

func TestParseExportQueryOrderBy(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedOrder []qbtypes.OrderBy
	}{
		{
			name:          "empty string returns empty slice",
			input:         "",
			expectedOrder: []qbtypes.OrderBy{},
		},
		{
			name:  "simple column asc",
			input: "timestamp:asc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp"},
					},
				},
			},
		},
		{
			name:  "simple column desc",
			input: "timestamp:desc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp"},
					},
				},
			},
		},
		{
			name:  "column with context and type qualifier",
			input: "attribute.user:string:desc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "user",
							FieldContext:  telemetrytypes.FieldContextAttribute,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
				},
			},
		},
		{
			name:  "column with context, dot-notation name",
			input: "attribute.user.string:desc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionDesc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "user.string",
							FieldContext: telemetrytypes.FieldContextAttribute,
						},
					},
				},
			},
		},
		{
			name:  "resource with context and type",
			input: "resource.service.name:string:asc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "service.name",
							FieldContext:  telemetrytypes.FieldContextResource,
							FieldDataType: telemetrytypes.FieldDataTypeString,
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order := parseExportQueryOrderBy(tt.input)
			assert.Equal(t, len(tt.expectedOrder), len(order))
			for i, expected := range tt.expectedOrder {
				assert.Equal(t, expected, order[i])
			}
		})
	}
}
