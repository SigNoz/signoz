package contextlinks

import (
	"testing"
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuilderQueriesForSignal(t *testing.T) {
	logQueryA := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:    "A",
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "severity_text = 'ERROR'"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}},
		},
	}
	logQueryB := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:    "B",
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "service.name = 'payments'"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "deployment.environment"}}},
		},
	}
	traceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:   "C",
			Signal: telemetrytypes.SignalTraces,
		},
	}
	promQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec:   qbtypes.PromQuery{Name: "D"},
	}

	t.Run("single log query among mixed queries", func(t *testing.T) {
		pairs, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{promQuery, logQueryA, traceQuery}, telemetrytypes.SignalLogs)
		require.True(t, found)
		require.Len(t, pairs, 1)
		assert.Equal(t, "severity_text = 'ERROR'", pairs[0].Filter)
		require.Len(t, pairs[0].GroupBy, 1)
		assert.Equal(t, "service.name", pairs[0].GroupBy[0].Name)
	})

	t.Run("multiple log queries all returned in input order", func(t *testing.T) {
		pairs, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{logQueryA, logQueryB, traceQuery}, telemetrytypes.SignalLogs)
		require.True(t, found)
		require.Len(t, pairs, 2)
		assert.Equal(t, "severity_text = 'ERROR'", pairs[0].Filter)
		assert.Equal(t, "service.name", pairs[0].GroupBy[0].Name)
		assert.Equal(t, "service.name = 'payments'", pairs[1].Filter)
		assert.Equal(t, "deployment.environment", pairs[1].GroupBy[0].Name)
	})

	t.Run("traces query without filter", func(t *testing.T) {
		pairs, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{logQueryA, traceQuery}, telemetrytypes.SignalTraces)
		require.True(t, found)
		require.Len(t, pairs, 1)
		assert.Empty(t, pairs[0].Filter)
		assert.Empty(t, pairs[0].GroupBy)
	})

	t.Run("no builder query for signal", func(t *testing.T) {
		pairs, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{traceQuery}, telemetrytypes.SignalLogs)
		assert.False(t, found)
		assert.Empty(t, pairs)
	})

	t.Run("no builder queries at all", func(t *testing.T) {
		pairs, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{promQuery}, telemetrytypes.SignalLogs)
		assert.False(t, found)
		assert.Empty(t, pairs)
	})

	t.Run("unsupported signal", func(t *testing.T) {
		pairs, found := BuilderQueriesForSignal([]qbtypes.QueryEnvelope{logQueryA}, telemetrytypes.SignalMetrics)
		assert.False(t, found)
		assert.Empty(t, pairs)
	})
}

func TestPrepareParamsForLogsV5MultipleQueries(t *testing.T) {
	start := time.UnixMilli(1_700_000_000_000)
	end := time.UnixMilli(1_700_000_060_000)
	labels := map[string]string{"service.name": "payments"}

	pairs := []BuilderQueryPair{
		{Filter: "severity_text = 'ERROR'"},
		{Filter: "deployment.environment = 'prod'"},
	}

	got := PrepareParamsForLogsV5(start, end, pairs, labels)
	require.NotEmpty(t, got.Get("compositeQuery"))
	require.Equal(t, "1700000000000", got.Get("startTime"))
	require.Equal(t, "1700000060000", got.Get("endTime"))
}

func TestPrepareParamsForTracesV5MultipleQueries(t *testing.T) {
	start := time.UnixMilli(1_700_000_000_000)
	end := time.UnixMilli(1_700_000_060_000)
	labels := map[string]string{}

	pairs := []BuilderQueryPair{
		{Filter: "duration_nano > 1e9"},
		{Filter: "http.status_code >= 500"},
	}

	got := PrepareParamsForTracesV5(start, end, pairs, labels)
	require.NotEmpty(t, got.Get("compositeQuery"))
	require.Equal(t, "1700000000000000000", got.Get("startTime"))
	require.Equal(t, "1700000060000000000", got.Get("endTime"))
}
