package exporttypes

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalize(t *testing.T) {
	tests := []struct {
		name     string
		input    ExportRawDataQueryParams
		expected ExportRawDataQueryParams
		wantErr  bool
	}{
		{
			name: "order_by migrated to order",
			input: ExportRawDataQueryParams{
				OrderBy: "timestamp:asc",
			},
			expected: ExportRawDataQueryParams{
				OrderBy: "timestamp:asc",
				Order: []qbtypes.OrderBy{
					{
						Direction: qbtypes.OrderDirectionAsc,
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "timestamp"},
						},
					},
				},
			},
		},
		{
			name: "order_by with attribute context and string type",
			input: ExportRawDataQueryParams{
				OrderBy: "attribute.user.id:string:desc",
			},
			expected: ExportRawDataQueryParams{
				OrderBy: "attribute.user.id:string:desc",
				Order: []qbtypes.OrderBy{
					{
						Direction: qbtypes.OrderDirectionDesc,
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
								Name:          "user.id",
								FieldContext:  telemetrytypes.FieldContextAttribute,
								FieldDataType: telemetrytypes.FieldDataTypeString,
							},
						},
					},
				},
			},
		},
		{
			name: "order_by with resource context and string type",
			input: ExportRawDataQueryParams{
				OrderBy: "resource.service.name:string:asc",
			},
			expected: ExportRawDataQueryParams{
				OrderBy: "resource.service.name:string:asc",
				Order: []qbtypes.OrderBy{
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
		},
		{
			name: "order_by with invalid direction returns error",
			input: ExportRawDataQueryParams{
				OrderBy: "attribute.user.id:string:sideways",
			},
			wantErr: true,
		},
		{
			name: "order_by is ignored when order is already set",
			input: ExportRawDataQueryParams{
				OrderBy: "timestamp:asc",
				Order: []qbtypes.OrderBy{
					{
						Direction: qbtypes.OrderDirectionDesc,
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "body"},
						},
					},
				},
			},
			expected: ExportRawDataQueryParams{
				OrderBy: "timestamp:asc",
				Order: []qbtypes.OrderBy{
					{
						Direction: qbtypes.OrderDirectionDesc,
						Key: qbtypes.OrderByKey{
							TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "body"},
						},
					},
				},
			},
		},
		{
			name: "invalid order_by returns error",
			input: ExportRawDataQueryParams{
				OrderBy: "timestamp",
			},
			wantErr: true,
		},
		{
			name: "columns migrated to select_fields",
			input: ExportRawDataQueryParams{
				Columns: []string{"timestamp", "body"},
			},
			expected: ExportRawDataQueryParams{
				Columns: []string{"timestamp", "body"},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "timestamp"},
					{Name: "body"},
				},
			},
		},
		{
			name: "columns with attribute context and type migrated to select_fields",
			input: ExportRawDataQueryParams{
				Columns: []string{"attribute.user.id:string", "resource.service.name:string", "attribute.http.status_code:int64"},
			},
			expected: ExportRawDataQueryParams{
				Columns: []string{"attribute.user.id:string", "resource.service.name:string", "attribute.http.status_code:int64"},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "user.id", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "service.name", FieldContext: telemetrytypes.FieldContextResource, FieldDataType: telemetrytypes.FieldDataTypeString},
					{Name: "http.status_code", FieldContext: telemetrytypes.FieldContextAttribute, FieldDataType: telemetrytypes.FieldDataTypeNumber},
				},
			},
		},
		{
			name: "columns with context but no type migrated to select_fields",
			input: ExportRawDataQueryParams{
				Columns: []string{"attribute.user.name", "resource.k8s.pod.name"},
			},
			expected: ExportRawDataQueryParams{
				Columns: []string{"attribute.user.name", "resource.k8s.pod.name"},
				SelectFields: []telemetrytypes.TelemetryFieldKey{
					{Name: "user.name", FieldContext: telemetrytypes.FieldContextAttribute},
					{Name: "k8s.pod.name", FieldContext: telemetrytypes.FieldContextResource},
				},
			},
		},
		{
			name: "columns is ignored when select_fields is already set",
			input: ExportRawDataQueryParams{
				Columns:      []string{"timestamp"},
				SelectFields: []telemetrytypes.TelemetryFieldKey{{Name: "body"}},
			},
			expected: ExportRawDataQueryParams{
				Columns:      []string{"timestamp"},
				SelectFields: []telemetrytypes.TelemetryFieldKey{{Name: "body"}},
			},
		},
		{
			name: "filter string migrated to filter",
			input: ExportRawDataQueryParams{
				FilterString: "severity = ERROR",
			},
			expected: ExportRawDataQueryParams{
				FilterString: "severity = ERROR",
				Filter:       qbtypes.Filter{Expression: "severity = ERROR"},
			},
		},
		{
			name: "filter string is ignored when filter expression is already set",
			input: ExportRawDataQueryParams{
				FilterString: "severity = ERROR",
				Filter:       qbtypes.Filter{Expression: "level = warn"},
			},
			expected: ExportRawDataQueryParams{
				FilterString: "severity = ERROR",
				Filter:       qbtypes.Filter{Expression: "level = warn"},
			},
		},
		{
			name: "source migrated to signal",
			input: ExportRawDataQueryParams{
				Source: "logs",
			},
			expected: ExportRawDataQueryParams{
				Source: "logs",
				Signal: telemetrytypes.Signal{String: valuer.NewString("logs")},
			},
		},
		{
			name: "source is ignored when signal is already set",
			input: ExportRawDataQueryParams{
				Source: "logs",
				Signal: telemetrytypes.SignalTraces,
			},
			expected: ExportRawDataQueryParams{
				Source: "logs",
				Signal: telemetrytypes.SignalTraces,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := tt.input
			err := p.Normalize()
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expected, p)
		})
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		input   ExportRawDataQueryParams
		wantErr bool
	}{
		{
			name:    "valid signal logs",
			input:   ExportRawDataQueryParams{Signal: telemetrytypes.SignalLogs},
			wantErr: false,
		},
		{
			name:    "valid signal traces",
			input:   ExportRawDataQueryParams{Signal: telemetrytypes.SignalTraces},
			wantErr: false,
		},
		{
			name:    "unspecified signal is invalid",
			input:   ExportRawDataQueryParams{Signal: telemetrytypes.SignalUnspecified},
			wantErr: true,
		},
		{
			name:    "unknown signal is invalid",
			input:   ExportRawDataQueryParams{Signal: telemetrytypes.Signal{String: valuer.NewString("metrics")}},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.input.Validate()
			if tt.wantErr {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

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
		wantErr       bool
	}{
		{
			name:          "empty string returns empty slice",
			input:         "",
			expectedOrder: []qbtypes.OrderBy{},
		},
		{
			name:          "whitespace-only string returns empty slice",
			input:         "   ",
			expectedOrder: []qbtypes.OrderBy{},
		},
		{
			name:    "missing direction returns error",
			input:   "timestamp",
			wantErr: true,
		},
		{
			name:    "invalid direction returns error",
			input:   "timestamp:sideways",
			wantErr: true,
		},
		{
			name:    "invalid direction with context and type returns error",
			input:   "attribute.user.id:string:sideways",
			wantErr: true,
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
		{
			name:  "attribute with number type asc",
			input: "attribute.http.status_code:int64:asc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:          "http.status_code",
							FieldContext:  telemetrytypes.FieldContextAttribute,
							FieldDataType: telemetrytypes.FieldDataTypeNumber,
						},
					},
				},
			},
		},
		{
			name:  "attribute with context but no type",
			input: "attribute.user.id:asc",
			expectedOrder: []qbtypes.OrderBy{
				{
					Direction: qbtypes.OrderDirectionAsc,
					Key: qbtypes.OrderByKey{
						TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
							Name:         "user.id",
							FieldContext: telemetrytypes.FieldContextAttribute,
						},
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order, err := parseExportQueryOrderBy(tt.input)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.expectedOrder, order)
		})
	}
}
