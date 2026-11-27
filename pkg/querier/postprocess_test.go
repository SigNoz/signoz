package querier

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// scalarInputResult builds a ScalarData result with one group column ("service")
// and one aggregation column ("__result"), holding the provided (service, value) rows.
func scalarInputResult(queryName string, rows []struct {
	service string
	value   float64
}) *qbtypes.Result {
	serviceKey := telemetrytypes.TelemetryFieldKey{
		Name:          "service",
		FieldDataType: telemetrytypes.FieldDataTypeString,
	}
	resultKey := telemetrytypes.TelemetryFieldKey{
		Name:          "__result",
		FieldDataType: telemetrytypes.FieldDataTypeFloat64,
	}

	data := make([][]any, 0, len(rows))
	for _, r := range rows {
		data = append(data, []any{r.service, r.value})
	}

	return &qbtypes.Result{
		Value: &qbtypes.ScalarData{
			QueryName: queryName,
			Columns: []*qbtypes.ColumnDescriptor{
				{
					TelemetryFieldKey: serviceKey,
					QueryName:         queryName,
					Type:              qbtypes.ColumnTypeGroup,
				},
				{
					TelemetryFieldKey: resultKey,
					QueryName:         queryName,
					AggregationIndex:  0,
					Type:              qbtypes.ColumnTypeAggregation,
				},
			},
			Data: data,
		},
	}
}

func TestProcessScalarFormula_AppliesOrderAndLimit(t *testing.T) {
	q := &querier{
		logger: instrumentationtest.New().Logger(),
	}

	// Mimic what a dashboard emits: orderBy keyed by the formula name ("F1"),
	// which applyFormulas rewrites to __result before sorting.
	orderByFormula := func(name string, dir qbtypes.OrderDirection) []qbtypes.OrderBy {
		return []qbtypes.OrderBy{
			{
				Key: qbtypes.OrderByKey{
					TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
						Name: name,
					},
				},
				Direction: dir,
			},
		}
	}

	// A+B per service: a=101, b=11, c=2
	makeInputs := func() map[string]*qbtypes.Result {
		return map[string]*qbtypes.Result{
			"A": scalarInputResult("A", []struct {
				service string
				value   float64
			}{
				{"a", 100},
				{"b", 10},
				{"c", 1},
			}),
			"B": scalarInputResult("B", []struct {
				service string
				value   float64
			}{
				{"a", 1},
				{"b", 0},
				{"c", 1},
			}),
		}
	}

	makeReq := func(formula qbtypes.QueryBuilderFormula) *qbtypes.QueryRangeRequest {
		return &qbtypes.QueryRangeRequest{
			RequestType: qbtypes.RequestTypeScalar,
			CompositeQuery: qbtypes.CompositeQuery{
				Queries: []qbtypes.QueryEnvelope{
					{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "A"}},
					{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "B"}},
					{Type: qbtypes.QueryTypeFormula, Spec: formula},
				},
			},
		}
	}

	t.Run("F1 desc with limit truncates and sorts", func(t *testing.T) {
		formula := qbtypes.QueryBuilderFormula{
			Name:       "F1",
			Expression: "A + B",
			Order:      orderByFormula("F1", qbtypes.OrderDirectionDesc),
			Limit:      2,
		}

		out := q.applyFormulas(context.Background(), makeInputs(), makeReq(formula))
		got, ok := out["F1"]
		require.True(t, ok, "formula result missing")
		scalar, ok := got.Value.(*qbtypes.ScalarData)
		require.True(t, ok, "expected *ScalarData, got %T", got.Value)

		// Limit=2 + F1 desc: the two largest __result rows in descending order.
		require.Len(t, scalar.Data, 2, "limit=2 was ignored before the fix")
		require.Equal(t, "a", scalar.Data[0][0])
		require.InDelta(t, 101.0, scalar.Data[0][1].(float64), 1e-9)
		require.Equal(t, "b", scalar.Data[1][0])
		require.InDelta(t, 10.0, scalar.Data[1][1].(float64), 1e-9)
	})

	t.Run("F1 desc without limit sorts all rows", func(t *testing.T) {
		formula := qbtypes.QueryBuilderFormula{
			Name:       "F1",
			Expression: "A / B",
			Order:      orderByFormula("F1", qbtypes.OrderDirectionAsc),
		}

		out := q.applyFormulas(context.Background(), makeInputs(), makeReq(formula))
		got, ok := out["F1"]
		require.True(t, ok)
		scalar, ok := got.Value.(*qbtypes.ScalarData)
		require.True(t, ok)

		require.Len(t, scalar.Data, 2)
		require.Equal(t, "c", scalar.Data[0][0])
		require.InDelta(t, 1.0, scalar.Data[0][1].(float64), 1e-9)
		require.Equal(t, "a", scalar.Data[1][0])
		require.InDelta(t, 100.0, scalar.Data[1][1].(float64), 1e-9)
	})
}

func TestPostProcessMetricQuery_LimitRanksByReducedValue(t *testing.T) {
	q := &querier{
		logger: instrumentationtest.New().Logger(),
	}

	serviceKey := telemetrytypes.TelemetryFieldKey{Name: "service.name", FieldDataType: telemetrytypes.FieldDataTypeString}
	series := func(service string, points ...float64) *qbtypes.TimeSeries {
		values := make([]*qbtypes.TimeSeriesValue, 0, len(points))
		for i, point := range points {
			values = append(values, &qbtypes.TimeSeriesValue{Timestamp: int64(i) * 60000, Value: point})
		}
		return &qbtypes.TimeSeries{Labels: []*qbtypes.Label{{Key: serviceKey, Value: service}}, Values: values}
	}
	// avg: checkout 10, payment 8.8, auth 6, search 2
	makeResult := func() *qbtypes.Result {
		return &qbtypes.Result{Value: &qbtypes.TimeSeriesData{
			QueryName: "A",
			Aggregations: []*qbtypes.AggregationBucket{{Series: []*qbtypes.TimeSeries{
				series("checkout", 10, 10, 10, 10, 10),
				series("payment", 1, 1, 1, 1, 40),
				series("auth", 0, 0, 0, 0, 30),
				series("search", 2, 2, 2, 2, 2),
			}}},
		}}
	}
	orderByValue := func(direction qbtypes.OrderDirection) []qbtypes.OrderBy {
		return []qbtypes.OrderBy{{
			Key:       qbtypes.OrderByKey{TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{Name: qbtypes.DefaultOrderByKey}},
			Direction: direction,
		}}
	}

	testCases := []struct {
		name     string
		reduceTo qbtypes.ReduceTo
		order    []qbtypes.OrderBy
		offset   int
		expected [][]any
	}{
		{
			name:     "Max_Desc_KeepsHighestPeaks",
			reduceTo: qbtypes.ReduceToMax,
			order:    orderByValue(qbtypes.OrderDirectionDesc),
			expected: [][]any{{"payment", 40.0}, {"auth", 30.0}},
		},
		{
			name:     "Last_Desc_KeepsHighestLastPoints",
			reduceTo: qbtypes.ReduceToLast,
			order:    orderByValue(qbtypes.OrderDirectionDesc),
			expected: [][]any{{"payment", 40.0}, {"auth", 30.0}},
		},
		{
			name:     "Min_Asc_KeepsLowestMinimums",
			reduceTo: qbtypes.ReduceToMin,
			order:    orderByValue(qbtypes.OrderDirectionAsc),
			expected: [][]any{{"auth", 0.0}, {"payment", 1.0}},
		},
		{
			name:     "Max_NoOrder_DefaultsToDesc",
			reduceTo: qbtypes.ReduceToMax,
			expected: [][]any{{"payment", 40.0}, {"auth", 30.0}},
		},
		{
			name:     "Max_Desc_Offset1_SkipsHighestPeak",
			reduceTo: qbtypes.ReduceToMax,
			order:    orderByValue(qbtypes.OrderDirectionDesc),
			offset:   1,
			expected: [][]any{{"auth", 30.0}, {"checkout", 10.0}},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			query := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
				Name:         "A",
				Aggregations: []qbtypes.MetricAggregation{{MetricName: "http_requests_total", ReduceTo: testCase.reduceTo}},
				Order:        testCase.order,
				Limit:        2,
				Offset:       testCase.offset,
			}
			req := &qbtypes.QueryRangeRequest{RequestType: qbtypes.RequestTypeScalar}

			out := postProcessMetricQuery(q, makeResult(), query, req)
			scalar, ok := out.Value.(*qbtypes.ScalarData)
			require.True(t, ok, "expected *ScalarData, got %T", out.Value)

			assert.Equal(t, testCase.expected, scalar.Data)
		})
	}

	t.Run("TimeSeries_RanksByAverage", func(t *testing.T) {
		query := qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{
			Name:         "A",
			Aggregations: []qbtypes.MetricAggregation{{MetricName: "http_requests_total"}},
			Order:        orderByValue(qbtypes.OrderDirectionDesc),
			Limit:        2,
		}
		req := &qbtypes.QueryRangeRequest{RequestType: qbtypes.RequestTypeTimeSeries}

		out := postProcessMetricQuery(q, makeResult(), query, req)
		tsData, ok := out.Value.(*qbtypes.TimeSeriesData)
		require.True(t, ok, "expected *TimeSeriesData, got %T", out.Value)
		require.Len(t, tsData.Aggregations, 1)
		require.Len(t, tsData.Aggregations[0].Series, 2)

		assert.Equal(t, "checkout", tsData.Aggregations[0].Series[0].Labels[0].Value)
		assert.Equal(t, "payment", tsData.Aggregations[0].Series[1].Labels[0].Value)
	})
}

// Multiple series with different number of labels, shouldn't panic and should align labels correctly.
func TestConvertTimeSeriesDataToScalar_RaggedLabels(t *testing.T) {
	label := func(name string, value any) *qbtypes.Label {
		return &qbtypes.Label{
			Key:   telemetrytypes.TelemetryFieldKey{Name: name},
			Value: value,
		}
	}
	series := func(labels []*qbtypes.Label, value float64) *qbtypes.TimeSeries {
		return &qbtypes.TimeSeries{
			Labels: labels,
			Values: []*qbtypes.TimeSeriesValue{{Timestamp: 1, Value: value}},
		}
	}

	tsData := &qbtypes.TimeSeriesData{
		QueryName: "A",
		Aggregations: []*qbtypes.AggregationBucket{{
			Index: 0,
			Series: []*qbtypes.TimeSeries{
				series([]*qbtypes.Label{label("label_1", "orphan-0")}, 20),
				series([]*qbtypes.Label{label("label_1", "box-0"), label("label_2", "rpc-0")}, 10),
			},
		}},
	}

	var sd *qbtypes.ScalarData
	require.NotPanics(t, func() {
		sd = convertTimeSeriesDataToScalar(tsData, "A")
	})

	require.NotNil(t, sd)
	require.Len(t, sd.Columns, 3)
	assert.Equal(t, "label_1", sd.Columns[0].Name)
	assert.Equal(t, "label_2", sd.Columns[1].Name)
	assert.Equal(t, "__result_0", sd.Columns[2].Name)

	require.Len(t, sd.Data, 2)
	assert.Equal(t, []any{"orphan-0", nil, 20.0}, sd.Data[0])
	assert.Equal(t, []any{"box-0", "rpc-0", 10.0}, sd.Data[1])
}

func TestSortFormulasByDependency(t *testing.T) {
	t.Run("independent formulas preserve declaration order", func(t *testing.T) {
		formulas := map[string]qbtypes.QueryBuilderFormula{
			"F1": {Name: "F1", Expression: "A + 1"},
			"F2": {Name: "F2", Expression: "B + 2"},
			"F3": {Name: "F3", Expression: "C + 3"},
		}
		order := []string{"F1", "F2", "F3"}
		sorted := sortFormulasByDependency(formulas, order)
		require.Len(t, sorted, 3)
		assert.Equal(t, "F1", sorted[0].Name)
		assert.Equal(t, "F2", sorted[1].Name)
		assert.Equal(t, "F3", sorted[2].Name)
	})

	t.Run("dependent formula declared first is evaluated after its dependency", func(t *testing.T) {
		// F2 is declared before F1, but F2 references F1
		formulas := map[string]qbtypes.QueryBuilderFormula{
			"F2": {Name: "F2", Expression: "F1 * 2"},
			"F1": {Name: "F1", Expression: "A + B"},
		}
		order := []string{"F2", "F1"}
		sorted := sortFormulasByDependency(formulas, order)
		require.Len(t, sorted, 2)
		assert.Equal(t, "F1", sorted[0].Name, "F1 must be evaluated first because F2 depends on it")
		assert.Equal(t, "F2", sorted[1].Name, "F2 must be evaluated second")
	})

	t.Run("handles dotted variable expressions", func(t *testing.T) {
		// F2 references F1.0 (dotted aggregation index)
		formulas := map[string]qbtypes.QueryBuilderFormula{
			"F2": {Name: "F2", Expression: "F1.0 / 100"},
			"F1": {Name: "F1", Expression: "A + B"},
		}
		order := []string{"F2", "F1"}
		sorted := sortFormulasByDependency(formulas, order)
		require.Len(t, sorted, 2)
		assert.Equal(t, "F1", sorted[0].Name)
		assert.Equal(t, "F2", sorted[1].Name)
	})

	t.Run("chained formula dependencies", func(t *testing.T) {
		// F3 depends on F2, F2 depends on F1, declared in reverse order: [F3, F2, F1]
		formulas := map[string]qbtypes.QueryBuilderFormula{
			"F3": {Name: "F3", Expression: "F2 + 10"},
			"F2": {Name: "F2", Expression: "F1 * 2"},
			"F1": {Name: "F1", Expression: "A + 1"},
		}
		order := []string{"F3", "F2", "F1"}
		sorted := sortFormulasByDependency(formulas, order)
		require.Len(t, sorted, 3)
		assert.Equal(t, "F1", sorted[0].Name)
		assert.Equal(t, "F2", sorted[1].Name)
		assert.Equal(t, "F3", sorted[2].Name)
	})

	t.Run("cycles degrade gracefully to declaration order", func(t *testing.T) {
		// F1 depends on F2, F2 depends on F1
		formulas := map[string]qbtypes.QueryBuilderFormula{
			"F1": {Name: "F1", Expression: "F2 + 1"},
			"F2": {Name: "F2", Expression: "F1 + 2"},
		}
		order := []string{"F1", "F2"}
		sorted := sortFormulasByDependency(formulas, order)
		require.Len(t, sorted, 2)
		assert.Equal(t, "F1", sorted[0].Name)
		assert.Equal(t, "F2", sorted[1].Name)
	})
}

func TestApplyFormulas_FormulaDependencyOrder(t *testing.T) {
	q := &querier{
		logger: instrumentationtest.New().Logger(),
	}

	// Inputs for query A: service "a" = 10, service "b" = 20
	inputs := map[string]*qbtypes.Result{
		"A": scalarInputResult("A", []struct {
			service string
			value   float64
		}{
			{"a", 10},
			{"b", 20},
		}),
	}

	// F2 depends on F1 (F2 = F1 * 2), but F2 is declared BEFORE F1 in CompositeQuery.
	// Without topological sort, map iteration order is random and F2 would fail ~50% of the time.
	req := &qbtypes.QueryRangeRequest{
		RequestType: qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{
				{Type: qbtypes.QueryTypeBuilder, Spec: qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]{Name: "A"}},
				{Type: qbtypes.QueryTypeFormula, Spec: qbtypes.QueryBuilderFormula{
					Name:       "F2",
					Expression: "F1 * 2",
				}},
				{Type: qbtypes.QueryTypeFormula, Spec: qbtypes.QueryBuilderFormula{
					Name:       "F1",
					Expression: "A + 5",
				}},
			},
		},
	}

	out := q.applyFormulas(context.Background(), inputs, req)

	// Verify F1 result: a = 10+5 = 15, b = 20+5 = 25
	gotF1, ok := out["F1"]
	require.True(t, ok, "F1 result must be present")
	scalarF1, ok := gotF1.Value.(*qbtypes.ScalarData)
	require.True(t, ok, "expected *ScalarData for F1")
	require.Len(t, scalarF1.Data, 2)

	// Verify F2 result: a = 15*2 = 30, b = 25*2 = 50
	gotF2, ok := out["F2"]
	require.True(t, ok, "F2 result must be present despite being declared before F1")
	scalarF2, ok := gotF2.Value.(*qbtypes.ScalarData)
	require.True(t, ok, "expected *ScalarData for F2")
	require.Len(t, scalarF2.Data, 2)

	// Check values
	for _, row := range scalarF2.Data {
		svc := row[0].(string)
		val := row[1].(float64)
		if svc == "a" {
			assert.InDelta(t, 30.0, val, 1e-9)
		} else if svc == "b" {
			assert.InDelta(t, 50.0, val, 1e-9)
		}
	}
}
