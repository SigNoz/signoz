package implrawdataexport

import (
	"net/url"
	"testing"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
)

func TestExportRawDataQueryParams_BindingDefaults(t *testing.T) {
	var params types.ExportRawDataQueryParams
	err := binding.Query.BindQuery(url.Values{}, &params)
	assert.NoError(t, err)
	assert.Equal(t, "logs", params.Source)
	assert.Equal(t, "csv", params.Format)
	assert.Equal(t, DefaultExportRowCountLimit, params.Limit)
}


func logQuery(limit int) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{Limit: limit},
	}
}

func traceQuery(limit int) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{Limit: limit},
	}
}

func traceOperatorQuery(limit int) qbtypes.QueryEnvelope {
	return qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeTraceOperator,
		Spec: qbtypes.QueryBuilderTraceOperator{Limit: limit},
	}
}

func makeRequest(queries ...qbtypes.QueryEnvelope) qbtypes.QueryRangeRequest {
	return qbtypes.QueryRangeRequest{
		CompositeQuery: qbtypes.CompositeQuery{Queries: queries},
	}
}

func TestValidateAndApplyExportLimits(t *testing.T) {
	tests := []struct {
		name          string
		req           qbtypes.QueryRangeRequest
		expectedError bool
		// assertions on each query after the call (indexed)
		checkQueries func(t *testing.T, queries []qbtypes.QueryEnvelope)
	}{
		{
			name: "single log query, zero limit gets default",
			req:  makeRequest(logQuery(0)),
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, DefaultExportRowCountLimit, q[0].GetLimit())
			},
		},
		{
			name: "single log query, valid limit kept",
			req:  makeRequest(logQuery(1000)),
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, 1000, q[0].GetLimit())
			},
		},
		{
			name: "single log query, max limit kept",
			req:  makeRequest(logQuery(MaxExportRowCountLimit)),
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, MaxExportRowCountLimit, q[0].GetLimit())
			},
		},
		{
			name:          "single log query, limit exceeds max",
			req:           makeRequest(logQuery(MaxExportRowCountLimit + 1)),
			expectedError: true,
		},
		{
			name:          "single log query, negative limit",
			req:           makeRequest(logQuery(-1)),
			expectedError: true,
		},
		{
			name: "single trace query, zero limit gets default",
			req:  makeRequest(traceQuery(0)),
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, DefaultExportRowCountLimit, q[0].GetLimit())
			},
		},
		{
			name:          "multiple queries without trace operator",
			req:           makeRequest(logQuery(0), traceQuery(0)),
			expectedError: true,
		},
		{
			name: "trace operator with other queries — non-operator disabled",
			req:  makeRequest(logQuery(500), traceOperatorQuery(1000)),
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.True(t, q[0].IsDisabled(), "log query should be disabled")
				assert.False(t, q[1].IsDisabled(), "trace operator should stay enabled")
				assert.Equal(t, 1000, q[1].GetLimit())
			},
		},
		{
			name: "trace operator alone, zero limit gets default",
			req:  makeRequest(traceOperatorQuery(0)),
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, DefaultExportRowCountLimit, q[0].GetLimit())
			},
		},
		{
			name:          "unsupported query type",
			req:           makeRequest(qbtypes.QueryEnvelope{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{}}),
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAndApplyExportLimits(&tt.req)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.checkQueries != nil {
					tt.checkQueries(t, tt.req.CompositeQuery.Queries)
				}
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
		expectedError bool
	}{
		{
			name:          "empty string returns empty slice",
			input:         "",
			expectedOrder: []qbtypes.OrderBy{},
			expectedError: false,
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
			expectedError: false,
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
			expectedError: false,
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
			expectedError: false,
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
			expectedError: false,
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
			expectedError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			order, err := parseExportQueryOrderBy(tt.input)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, len(tt.expectedOrder), len(order))
				for i, expected := range tt.expectedOrder {
					assert.Equal(t, expected, order[i])
				}
			}
		})
	}
}

func TestConstructCSVHeaderFromQueryResponse(t *testing.T) {
	data := map[string]any{
		"timestamp": 1640995200,
		"message":   "test message",
		"level":     "INFO",
		"id":        "test-id",
	}

	header := constructCSVHeaderFromQueryResponse(data)

	expectedKeys := []string{"timestamp", "message", "level", "id"}
	assert.Equal(t, len(expectedKeys), len(header))
	for _, key := range expectedKeys {
		assert.Contains(t, header, key)
	}
}

func TestConstructCSVRecordFromQueryResponse(t *testing.T) {
	data := map[string]any{
		"timestamp": 1640995200,
		"message":   "test message",
		"level":     "INFO",
		"id":        "test-id",
	}

	headerToIndexMapping := map[string]int{
		"timestamp": 0,
		"message":   1,
		"level":     2,
		"id":        3,
	}

	record := constructCSVRecordFromQueryResponse(data, headerToIndexMapping)

	assert.Equal(t, 4, len(record))
	assert.Equal(t, "1640995200", record[0])
	assert.Equal(t, "test message", record[1])
	assert.Equal(t, "INFO", record[2])
	assert.Equal(t, "test-id", record[3])
}
