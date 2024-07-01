package postprocess

import (
	"github.com/SigNoz/govaluate"
	"go.signoz.io/signoz/pkg/query-service/common"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func StepIntervalForFunction(params *v3.QueryRangeParamsV3, query string) int64 {
	q := params.CompositeQuery.BuilderQueries[query]
	if q.QueryName != q.Expression {
		expression, _ := govaluate.NewEvaluableExpressionWithFunctions(q.Expression, EvalFuncs())
		steps := []int64{}
		for _, v := range expression.Vars() {
			steps = append(steps, params.CompositeQuery.BuilderQueries[v].StepInterval)
		}
		return common.LCMList(steps)
	}
	return q.StepInterval
}

func fillGap(series *v3.Series, start, end, step int64) *v3.Series {
	v := make(map[int64]float64)
	for _, point := range series.Points {
		v[point.Timestamp] = point.Value
	}

	// For all the values from start to end, find the timestamps
	// that don't have value and add zero point
	start = start - (start % (step * 1000))
	for i := start; i <= end; i += step * 1000 {
		if _, ok := v[i]; !ok {
			v[i] = 0
		}
	}
	newSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      make([]v3.Point, 0),
	}
	for i := start; i <= end; i += step * 1000 {
		newSeries.Points = append(newSeries.Points, v3.Point{Timestamp: i, Value: v[i]})
	}
	return newSeries
}

// TODO(srikanthccv): can WITH FILL be perfect substitute for all cases https://clickhouse.com/docs/en/sql-reference/statements/select/order-by#order-by-expr-with-fill-modifier
func FillGaps(results []*v3.Result, params *v3.QueryRangeParamsV3) {
	if params.CompositeQuery.PanelType != v3.PanelTypeGraph {
		return
	}
	for _, result := range results {
		// A `result` item in `results` contains the query result for individual query.
		// If there are no series in the result, we add empty series and `fillGap` adds all zeros
		if len(result.Series) == 0 {
			result.Series = []*v3.Series{
				{
					Labels:      make(map[string]string),
					LabelsArray: make([]map[string]string, 0),
				},
			}
		}

		builderQueries := params.CompositeQuery.BuilderQueries
		if builderQueries != nil {
			// The values should be added at the intervals of `step`
			step := StepIntervalForFunction(params, result.QueryName)
			for idx := range result.Series {
				result.Series[idx] = fillGap(result.Series[idx], params.Start, params.End, step)
			}
		}
	}
}
