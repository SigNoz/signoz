package implrawdataexport

import (
	"net/url"
	"testing"

	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/types/exporttypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

func TestExportRawDataFormatQueryParam_BindingDefaults(t *testing.T) {
	var params exporttypes.ExportRawDataFormatQueryParam
	err := binding.Query.BindQuery(url.Values{}, &params)
	assert.NoError(t, err)
	assert.Equal(t, "csv", params.Format)
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
		Spec: qbtypes.QueryBuilderTraceOperator{Limit: limit, Expression: "A"},
	}
}

func makeRequest(queries ...qbtypes.QueryEnvelope) qbtypes.QueryRangeRequest {
	return qbtypes.QueryRangeRequest{
		Start:          1000000000000,
		End:            1000003600000,
		RequestType:    qbtypes.RequestTypeRaw,
		CompositeQuery: qbtypes.CompositeQuery{Queries: queries},
	}
}

func TestValidateSpecForExport(t *testing.T) {
	tests := []struct {
		name          string
		req           qbtypes.QueryRangeRequest
		expectedError bool
	}{
		{
			name: "single log query",
			req:  makeRequest(logQuery(0)),
		},
		{
			name: "single trace query",
			req:  makeRequest(traceQuery(0)),
		},
		{
			name: "trace operator alone",
			req:  makeRequest(traceOperatorQuery(0)),
		},
		{
			name:          "multiple queries without trace operator",
			req:           makeRequest(logQuery(0), traceQuery(0)),
			expectedError: true,
		},
		{
			name:          "unsupported query type",
			req:           makeRequest(qbtypes.QueryEnvelope{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{}}),
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateSpecForExport(&tt.req)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateAndApplyDefaultExportLimits(t *testing.T) {
	tests := []struct {
		name          string
		queries       []qbtypes.QueryEnvelope
		expectedError bool
		checkQueries  func(t *testing.T, queries []qbtypes.QueryEnvelope)
	}{
		{
			name:    "zero limit kept as-is (unlimited)",
			queries: makeRequest(logQuery(0)).CompositeQuery.Queries,
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, 0, q[0].GetLimit())
			},
		},
		{
			name:    "positive limit kept",
			queries: makeRequest(logQuery(1000)).CompositeQuery.Queries,
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, 1000, q[0].GetLimit())
			},
		},
		{
			name:          "negative limit rejected",
			queries:       makeRequest(logQuery(-1)).CompositeQuery.Queries,
			expectedError: true,
		},
		{
			name:    "large trace limit kept",
			queries: makeRequest(traceQuery(2_000_000)).CompositeQuery.Queries,
			checkQueries: func(t *testing.T, q []qbtypes.QueryEnvelope) {
				assert.Equal(t, 2_000_000, q[0].GetLimit())
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateAndApplyDefaultExportLimits(tt.queries)
			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.checkQueries != nil {
					tt.checkQueries(t, tt.queries)
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

	// Priority columns come first in order, then the rest alphabetically.
	assert.Equal(t, []string{"timestamp", "id", "level", "message"}, header)
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
