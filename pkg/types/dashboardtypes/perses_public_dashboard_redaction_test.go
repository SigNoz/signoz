package dashboardtypes

import (
	"testing"
	"time"

	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/perses/spec/go/dashboard/variable"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRedactLeafQuery(t *testing.T) {
	t.Run("builder query drops filter, having, limit and keeps display fields", func(t *testing.T) {
		input := qb.QueryBuilderQuery[qb.MetricAggregation]{
			Name:         "A",
			Signal:       telemetrytypes.SignalMetrics,
			Aggregations: []qb.MetricAggregation{{MetricName: "system_cpu_usage"}},
			GroupBy:      []qb.GroupByKey{{}},
			Legend:       "cpu",
			Disabled:     true,
			StepInterval: qb.Step{Duration: time.Minute},
			Filter:       &qb.Filter{Expression: "service.name = 'checkout'"},
			Having:       &qb.Having{},
			Limit:        100,
		}

		redacted, ok := redactLeafQuery(input).(qb.QueryBuilderQuery[qb.MetricAggregation])
		require.True(t, ok)

		// dropped (not in the v1 whitelist)
		assert.Nil(t, redacted.Filter)
		assert.Nil(t, redacted.Having)
		assert.Zero(t, redacted.Limit)
		assert.Zero(t, redacted.StepInterval)
		assert.False(t, redacted.Disabled)

		// kept (display)
		assert.Equal(t, "A", redacted.Name)
		assert.Equal(t, telemetrytypes.SignalMetrics, redacted.Signal)
		assert.Equal(t, "cpu", redacted.Legend)
		require.Len(t, redacted.Aggregations, 1)
		assert.Equal(t, "system_cpu_usage", redacted.Aggregations[0].MetricName)
		assert.Len(t, redacted.GroupBy, 1)
	})

	t.Run("promql query drops the raw query, step and disabled", func(t *testing.T) {
		redacted, ok := redactLeafQuery(qb.PromQuery{
			Name:     "A",
			Query:    "sum(rate(http_requests_total[5m]))",
			Step:     qb.Step{Duration: time.Minute},
			Disabled: true,
			Legend:   "rps",
		}).(qb.PromQuery)
		require.True(t, ok)

		assert.Empty(t, redacted.Query)
		assert.Zero(t, redacted.Step)
		assert.False(t, redacted.Disabled)
		assert.Equal(t, "A", redacted.Name)
		assert.Equal(t, "rps", redacted.Legend)
	})

	t.Run("clickhouse query drops the raw query string", func(t *testing.T) {
		redacted, ok := redactLeafQuery(qb.ClickHouseQuery{
			Name:   "A",
			Query:  "SELECT * FROM signoz_logs WHERE user = 'admin'",
			Legend: "logs",
		}).(qb.ClickHouseQuery)
		require.True(t, ok)

		assert.Empty(t, redacted.Query)
		assert.Equal(t, "A", redacted.Name)
		assert.Equal(t, "logs", redacted.Legend)
	})

	t.Run("formula keeps its expression but drops limit and having", func(t *testing.T) {
		redacted, ok := redactLeafQuery(qb.QueryBuilderFormula{
			Name:       "F1",
			Expression: "A / B",
			Legend:     "ratio",
			Limit:      50,
			Having:     &qb.Having{},
		}).(qb.QueryBuilderFormula)
		require.True(t, ok)

		assert.Equal(t, "A / B", redacted.Expression)
		assert.Equal(t, "F1", redacted.Name)
		assert.Equal(t, "ratio", redacted.Legend)
		assert.Zero(t, redacted.Limit)
		assert.Nil(t, redacted.Having)
	})

	t.Run("trace operator drops filter but keeps expression and aggregations", func(t *testing.T) {
		redacted, ok := redactLeafQuery(qb.QueryBuilderTraceOperator{
			Name:            "T1",
			Expression:      "A => B",
			Aggregations:    []qb.TraceAggregation{{}},
			Legend:          "spans",
			Filter:          &qb.Filter{Expression: "http.status_code = 500"},
			ReturnSpansFrom: "A",
			Limit:           10,
		}).(qb.QueryBuilderTraceOperator)
		require.True(t, ok)

		assert.Nil(t, redacted.Filter)
		assert.Empty(t, redacted.ReturnSpansFrom)
		assert.Zero(t, redacted.Limit)
		assert.Equal(t, "A => B", redacted.Expression)
		assert.Equal(t, "T1", redacted.Name)
		assert.Len(t, redacted.Aggregations, 1)
	})

	t.Run("unknown value is returned unchanged", func(t *testing.T) {
		assert.Equal(t, "passthrough", redactLeafQuery("passthrough"))
	})
}

func TestRedactQueryPluginWrappers(t *testing.T) {
	t.Run("builder plugin pointer is redacted and stays a pointer", func(t *testing.T) {
		plugin := &BuilderQuerySpec{Spec: qb.QueryBuilderQuery[qb.LogAggregation]{
			Name:   "A",
			Filter: &qb.Filter{Expression: "body contains 'secret'"},
		}}

		result, ok := redactQuery(plugin).(*BuilderQuerySpec)
		require.True(t, ok)

		builder, ok := result.Spec.(qb.QueryBuilderQuery[qb.LogAggregation])
		require.True(t, ok)
		assert.Nil(t, builder.Filter)
		assert.Equal(t, "A", builder.Name)
	})

	t.Run("composite plugin redacts every sub-query envelope", func(t *testing.T) {
		composite := &qb.CompositeQuery{Queries: []qb.QueryEnvelope{
			{Type: qb.QueryTypeBuilder, Spec: qb.QueryBuilderQuery[qb.MetricAggregation]{Name: "A", Filter: &qb.Filter{Expression: "x = 1"}}},
			{Type: qb.QueryTypePromQL, Spec: qb.PromQuery{Name: "B", Query: "up"}},
		}}

		result, ok := redactQuery(composite).(*qb.CompositeQuery)
		require.True(t, ok)
		require.Len(t, result.Queries, 2)

		builder, ok := result.Queries[0].Spec.(qb.QueryBuilderQuery[qb.MetricAggregation])
		require.True(t, ok)
		assert.Nil(t, builder.Filter)

		prom, ok := result.Queries[1].Spec.(qb.PromQuery)
		require.True(t, ok)
		assert.Empty(t, prom.Query)
	})

	t.Run("promql plugin pointer drops the raw query", func(t *testing.T) {
		result, ok := redactQuery(&qb.PromQuery{Name: "A", Query: "up"}).(*qb.PromQuery)
		require.True(t, ok)
		assert.Empty(t, result.Query)
		assert.Equal(t, "A", result.Name)
	})

	t.Run("nil composite pointer is returned unchanged without panicking", func(t *testing.T) {
		var nilComposite *qb.CompositeQuery
		assert.Equal(t, nilComposite, redactQuery(nilComposite))
	})

	t.Run("unknown plugin spec is returned unchanged", func(t *testing.T) {
		assert.Equal(t, 42, redactQuery(42))
	})
}

func TestRedactPanelQueries(t *testing.T) {
	t.Run("redacts panel queries without mutating the source spec", func(t *testing.T) {
		sourcePlugin := &BuilderQuerySpec{Spec: qb.QueryBuilderQuery[qb.MetricAggregation]{
			Name:   "A",
			Filter: &qb.Filter{Expression: "service.name = 'payments'"},
		}}
		sourcePanel := &Panel{Spec: PanelSpec{
			Queries: []Query{{Spec: QuerySpec{Plugin: QueryPlugin{Kind: QueryKindBuilder, Spec: sourcePlugin}}}},
		}}
		spec := DashboardSpec{Panels: map[string]*Panel{"panel-1": sourcePanel}}

		redactPanelQueries(&spec)

		// redacted output has no filter
		redactedPanel := spec.Panels["panel-1"]
		require.NotNil(t, redactedPanel)
		redactedBuilder := redactedPanel.Spec.Queries[0].Spec.Plugin.Spec.(*BuilderQuerySpec).Spec.(qb.QueryBuilderQuery[qb.MetricAggregation])
		assert.Nil(t, redactedBuilder.Filter)

		// source is untouched: original plugin still carries the filter
		sourceBuilder := sourcePlugin.Spec.(qb.QueryBuilderQuery[qb.MetricAggregation])
		require.NotNil(t, sourceBuilder.Filter)
		assert.Equal(t, "service.name = 'payments'", sourceBuilder.Filter.Expression)
		assert.NotSame(t, sourcePanel, redactedPanel)
	})

	t.Run("preserves nil panels without panicking", func(t *testing.T) {
		spec := DashboardSpec{Panels: map[string]*Panel{"panel-1": nil}}

		redactPanelQueries(&spec)

		panel, ok := spec.Panels["panel-1"]
		assert.True(t, ok)
		assert.Nil(t, panel)
	})
}

func TestRedactVariableQueries(t *testing.T) {
	// Spec fields are pointers (*ListVariableSpec, *QueryVariableSpec) to match what
	// the store produces after JSON decode; value types would slip past the type
	// assertions in redactVariableQueries.
	t.Run("drops the query-variable query without mutating the source", func(t *testing.T) {
		source := &ListVariableSpec{
			Name:   "namespace",
			Plugin: VariablePlugin{Kind: VariableKindQuery, Spec: &QueryVariableSpec{QueryValue: "SELECT DISTINCT namespace FROM secret_table"}},
		}
		spec := DashboardSpec{Variables: []Variable{{Kind: variable.KindList, Spec: source}}}

		redactVariableQueries(&spec)

		redacted := spec.Variables[0].Spec.(*ListVariableSpec)
		assert.Empty(t, redacted.Plugin.Spec.(*QueryVariableSpec).QueryValue)
		assert.Equal(t, "namespace", redacted.Name)
		// source pointee is untouched
		assert.Equal(t, "SELECT DISTINCT namespace FROM secret_table", source.Plugin.Spec.(*QueryVariableSpec).QueryValue)
	})

	t.Run("leaves non-query variables untouched", func(t *testing.T) {
		spec := DashboardSpec{Variables: []Variable{
			{Kind: variable.KindList, Spec: &ListVariableSpec{Name: "signal", Plugin: VariablePlugin{Kind: VariableKindDynamic, Spec: &DynamicVariableSpec{Name: "service.name", Signal: telemetrytypes.SignalTraces}}}},
			{Kind: variable.KindList, Spec: &ListVariableSpec{Name: "env", Plugin: VariablePlugin{Kind: VariableKindCustom, Spec: &CustomVariableSpec{CustomValue: "prod,staging"}}}},
		}}

		redactVariableQueries(&spec)

		assert.Equal(t, "service.name", spec.Variables[0].Spec.(*ListVariableSpec).Plugin.Spec.(*DynamicVariableSpec).Name)
		assert.Equal(t, "prod,staging", spec.Variables[1].Spec.(*ListVariableSpec).Plugin.Spec.(*CustomVariableSpec).CustomValue)
	})
}
