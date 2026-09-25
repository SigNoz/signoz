package contextlinks

import (
	"encoding/json"
	"net/url"
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuilderQueriesForSignal(t *testing.T) {
	logQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:    "A",
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "severity_text = 'ERROR'"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}},
		},
	}
	secondLogQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:    "B",
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "severity_text = 'WARN'"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "host.name"}}},
		},
	}
	traceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:   "B",
			Signal: telemetrytypes.SignalTraces,
		},
	}
	secondTraceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:   "C",
			Signal: telemetrytypes.SignalTraces,
			Filter: &qbtypes.Filter{Expression: "http.status_code >= 500"},
		},
	}
	promQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypePromQL,
		Spec: qbtypes.PromQuery{Name: "C"},
	}
	aiTraceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilderAI,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:    "D",
			Signal:  telemetrytypes.SignalTraces,
			Filter:  &qbtypes.Filter{Expression: "trace.input_tokens > 1000"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "session.id"}}},
		},
	}

	t.Run("logs query among mixed queries", func(t *testing.T) {
		builderQueries, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{promQuery, logQuery, traceQuery}, telemetrytypes.SignalLogs)
		require.True(t, found)
		require.Len(t, builderQueries, 1)
		assert.Equal(t, "severity_text = 'ERROR'", builderQueries[0].Filter)
		require.Len(t, builderQueries[0].GroupBy, 1)
		assert.Equal(t, "service.name", builderQueries[0].GroupBy[0].Name)
	})

	t.Run("every logs query is returned in composite query order", func(t *testing.T) {
		builderQueries, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{promQuery, logQuery, secondLogQuery, traceQuery}, telemetrytypes.SignalLogs)
		require.True(t, found)
		require.Len(t, builderQueries, 2)
		assert.Equal(t, "severity_text = 'ERROR'", builderQueries[0].Filter)
		assert.Equal(t, "severity_text = 'WARN'", builderQueries[1].Filter)
		require.Len(t, builderQueries[1].GroupBy, 1)
		assert.Equal(t, "host.name", builderQueries[1].GroupBy[0].Name)
	})

	t.Run("every traces query is returned in composite query order", func(t *testing.T) {
		builderQueries, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{traceQuery, secondTraceQuery}, telemetrytypes.SignalTraces)
		require.True(t, found)
		require.Len(t, builderQueries, 2)
		assert.Empty(t, builderQueries[0].Filter)
		assert.Equal(t, "http.status_code >= 500", builderQueries[1].Filter)
	})

	t.Run("traces query without filter", func(t *testing.T) {
		builderQueries, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{logQuery, traceQuery}, telemetrytypes.SignalTraces)
		require.True(t, found)
		require.Len(t, builderQueries, 1)
		assert.Empty(t, builderQueries[0].Filter)
		assert.Empty(t, builderQueries[0].GroupBy)
	})

	t.Run("ai trace query counts as traces", func(t *testing.T) {
		builderQueries, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{logQuery, aiTraceQuery}, telemetrytypes.SignalTraces)
		require.True(t, found)
		require.Len(t, builderQueries, 1)
		assert.Equal(t, "trace.input_tokens > 1000", builderQueries[0].Filter)
		require.Len(t, builderQueries[0].GroupBy, 1)
		assert.Equal(t, "session.id", builderQueries[0].GroupBy[0].Name)
	})

	t.Run("no builder query for signal", func(t *testing.T) {
		_, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{traceQuery}, telemetrytypes.SignalLogs)
		assert.False(t, found)
	})

	t.Run("no builder queries at all", func(t *testing.T) {
		_, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{promQuery}, telemetrytypes.SignalLogs)
		assert.False(t, found)
	})

	t.Run("unsupported signal", func(t *testing.T) {
		_, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{logQuery}, telemetrytypes.SignalMetrics)
		assert.False(t, found)
	})
}

func TestPrepareFilterExpressions(t *testing.T) {
	labels := map[string]string{"service.name": "checkout"}

	t.Run("one expression per builder query", func(t *testing.T) {
		expressions := PrepareFilterExpressions(labels, []BuilderQuery{
			{Filter: "severity_text = 'ERROR'"},
			{Filter: "severity_text = 'WARN'"},
		})
		require.Len(t, expressions, 2)
		assert.Contains(t, expressions[0], "severity_text='ERROR'")
		assert.Contains(t, expressions[1], "severity_text='WARN'")
	})

	t.Run("no builder query still yields a labels only expression", func(t *testing.T) {
		expressions := PrepareFilterExpressions(map[string]string{"host.name": "web-1"}, nil)
		require.Len(t, expressions, 1)
		assert.Equal(t, "host.name='web-1'", expressions[0])
	})
}

func TestPrepareParamsQueryData(t *testing.T) {
	start := time.UnixMilli(1700000000000)
	end := time.UnixMilli(1700000600000)

	t.Run("one logs explorer query per filter", func(t *testing.T) {
		params := PrepareParamsForLogsV5(start, end, []string{"severity_text='ERROR'", "severity_text='WARN'"})
		queryData := decodeQueryData(t, params)

		require.Len(t, queryData, 2)
		assert.Equal(t, "logs", queryData[0].DataSource)
		assert.Equal(t, "severity_text='ERROR'", queryData[0].Filter.Expression)
		assert.Equal(t, "severity_text='WARN'", queryData[1].Filter.Expression)
	})

	t.Run("one traces explorer query per filter", func(t *testing.T) {
		params := PrepareParamsForTracesV5(start, end, []string{"name='GET /a'", "name='GET /b'"}, qbtypes.QueryTypeBuilder)
		queryData := decodeQueryData(t, params)

		require.Len(t, queryData, 2)
		assert.Equal(t, "traces", queryData[0].DataSource)
		assert.Equal(t, "name='GET /a'", queryData[0].Filter.Expression)
		assert.Equal(t, "name='GET /b'", queryData[1].Filter.Expression)
	})

	t.Run("ai trace query type is carried on every query", func(t *testing.T) {
		params := PrepareParamsForTracesV5(start, end, []string{"a='1'", "b='2'"}, qbtypes.QueryTypeBuilderAI)
		queryData := decodeQueryData(t, params)

		require.Len(t, queryData, 2)
		for _, query := range queryData {
			assert.Equal(t, qbtypes.QueryTypeBuilderAI.StringValue(), query.BuilderQueryType)
		}
	})

	t.Run("no filter still yields one explorer query", func(t *testing.T) {
		params := PrepareParamsForLogsV5(start, end, nil)
		queryData := decodeQueryData(t, params)

		require.Len(t, queryData, 1)
		assert.Empty(t, queryData[0].Filter.Expression)
	})
}

func decodeQueryData(t *testing.T, params url.Values) []LinkQuery {
	t.Helper()

	raw, err := url.QueryUnescape(params.Get("compositeQuery"))
	require.NoError(t, err)

	var composite URLShareableCompositeQuery
	require.NoError(t, json.Unmarshal([]byte(raw), &composite))
	return composite.Builder.QueryData
}
