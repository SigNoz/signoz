package postprocess

import (
	"github.com/SigNoz/govaluate"
	"go.signoz.io/signoz/pkg/query-service/common"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func stepIntervalForFunction(params *v3.QueryRangeParamsV3, query string) int64 {
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

func FillGaps(results []*v3.Result, params *v3.QueryRangeParamsV3) {
	for _, result := range results {
		builderQueries := params.CompositeQuery.BuilderQueries
		if builderQueries != nil {
			step := stepIntervalForFunction(params, result.QueryName)
			for idx := range result.Series {
				result.Series[idx] = fillGap(result.Series[idx], params.Start, params.End, step)
			}
		}
	}
}
