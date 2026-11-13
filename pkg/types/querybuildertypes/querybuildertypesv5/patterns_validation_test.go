package querybuildertypesv5

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQueryRangeRequest_ValidatePatterns(t *testing.T) {
	logsQuery := func(edit func(*QueryBuilderQuery[LogAggregation])) QueryEnvelope {
		spec := QueryBuilderQuery[LogAggregation]{
			Name:   "A",
			Signal: telemetrytypes.SignalLogs,
			Filter: &Filter{Expression: "service.name = 'api'"},
			Limit:  50,
		}
		if edit != nil {
			edit(&spec)
		}
		return QueryEnvelope{Type: QueryTypeBuilder, Spec: spec}
	}
	request := func(queries ...QueryEnvelope) QueryRangeRequest {
		return QueryRangeRequest{
			Start:          1640995200000,
			End:            1640998800000,
			RequestType:    RequestTypePattern,
			CompositeQuery: CompositeQuery{Queries: queries},
		}
	}

	testCases := []struct {
		name    string
		request QueryRangeRequest
		errMsg  string
	}{
		{
			name: "LogsQuery_WithGroupBy",
			request: request(logsQuery(func(q *QueryBuilderQuery[LogAggregation]) {
				q.GroupBy = []GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}}
			})),
		},
		{
			name: "TracesQuery",
			request: request(QueryEnvelope{Type: QueryTypeBuilder, Spec: QueryBuilderQuery[TraceAggregation]{
				Name: "A", Signal: telemetrytypes.SignalTraces,
			}}),
			errMsg: "pattern requests support only a logs builder query",
		},
		{
			name:    "TwoQueries",
			request: request(logsQuery(nil), logsQuery(func(q *QueryBuilderQuery[LogAggregation]) { q.Name = "B" })),
			errMsg:  "exactly one logs builder query, got 2 queries",
		},
		{
			name:    "Aggregations",
			request: request(logsQuery(func(q *QueryBuilderQuery[LogAggregation]) { q.Aggregations = []LogAggregation{{Expression: "count()"}} })),
			errMsg:  "takes no aggregations",
		},
		{
			name:    "Disabled",
			request: request(logsQuery(func(q *QueryBuilderQuery[LogAggregation]) { q.Disabled = true })),
			errMsg:  "can't be disabled",
		},
		{
			name:    "Having",
			request: request(logsQuery(func(q *QueryBuilderQuery[LogAggregation]) { q.Having = &Having{Expression: "count() > 1"} })),
			errMsg:  "don't support having",
		},
		{
			name:    "LimitOverMax",
			request: request(logsQuery(func(q *QueryBuilderQuery[LogAggregation]) { q.Limit = PatternsMaxLimit + 1 })),
			errMsg:  "at most 1000 patterns",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := testCase.request.Validate()
			if testCase.errMsg == "" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), testCase.errMsg)
		})
	}
}
