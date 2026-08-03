package contextlinks

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuilderQueryForSignal(t *testing.T) {
	logQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
			Name:    "A",
			Signal:  telemetrytypes.SignalLogs,
			Filter:  &qbtypes.Filter{Expression: "severity_text = 'ERROR'"},
			GroupBy: []qbtypes.GroupByKey{{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: "service.name"}}},
		},
	}
	traceQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
			Name:   "B",
			Signal: telemetrytypes.SignalTraces,
		},
	}
	promQuery := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypePromQL,
		Spec: qbtypes.PromQuery{Name: "C"},
	}

	t.Run("logs query among mixed queries", func(t *testing.T) {
		filterExpr, groupBy, found := BuilderQueryForSignal([]qbtypes.QueryEnvelope{promQuery, logQuery, traceQuery}, telemetrytypes.SignalLogs)
		require.True(t, found)
		assert.Equal(t, "severity_text = 'ERROR'", filterExpr)
		require.Len(t, groupBy, 1)
		assert.Equal(t, "service.name", groupBy[0].Name)
	})

	t.Run("traces query without filter", func(t *testing.T) {
		filterExpr, groupBy, found := BuilderQueryForSignal([]qbtypes.QueryEnvelope{logQuery, traceQuery}, telemetrytypes.SignalTraces)
		require.True(t, found)
		assert.Empty(t, filterExpr)
		assert.Empty(t, groupBy)
	})

	t.Run("no builder query for signal", func(t *testing.T) {
		_, _, found := BuilderQueryForSignal([]qbtypes.QueryEnvelope{traceQuery}, telemetrytypes.SignalLogs)
		assert.False(t, found)
	})

	t.Run("no builder queries at all", func(t *testing.T) {
		_, _, found := BuilderQueryForSignal([]qbtypes.QueryEnvelope{promQuery}, telemetrytypes.SignalLogs)
		assert.False(t, found)
	})

	t.Run("unsupported signal", func(t *testing.T) {
		_, _, found := BuilderQueryForSignal([]qbtypes.QueryEnvelope{logQuery}, telemetrytypes.SignalMetrics)
		assert.False(t, found)
	})
}
