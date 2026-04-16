package querier

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
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
						Name:          name,
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

		// Without the fix, rows came out in alphabetical label order (a, b, c)
		// regardless of direction. After the fix we expect descending values:
		// a=101, b=11, c=2.
		require.Len(t, scalar.Data, 2)
		require.Equal(t, "c", scalar.Data[0][0])
		require.InDelta(t, 1.0, scalar.Data[0][1].(float64), 1e-9)
		require.Equal(t, "a", scalar.Data[1][0])
		require.InDelta(t, 100.0, scalar.Data[1][1].(float64), 1e-9)
	})
}
