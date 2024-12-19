package postprocess

import (
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

// applyReduceTo applies the reduceTo operator to each series
// and returns a new series with the reduced value
// reduceTo can be one of the following:
// - last
// - sum
// - avg
// - min
// - max
func applyReduceTo(result []*v3.Result, queryRangeParams *v3.QueryRangeParamsV3) {
	for _, result := range result {
		builderQueries := queryRangeParams.CompositeQuery.BuilderQueries

		// reduceTo is only applicable for metrics data source
		// and for table and value panels
		if builderQueries[result.QueryName] != nil && (builderQueries[result.QueryName].DataSource == v3.DataSourceMetrics &&
			(queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeTable || queryRangeParams.CompositeQuery.PanelType == v3.PanelTypeValue)) {
			reduceTo := builderQueries[result.QueryName].ReduceTo

			switch reduceTo {
			case v3.ReduceToOperatorLast:
				for i := 0; i < len(result.Series); i++ {
					if len(result.Series[i].Points) > 0 {
						result.Series[i].Points = []v3.Point{result.Series[i].Points[len(result.Series[i].Points)-1]}
					}
				}
			case v3.ReduceToOperatorSum:
				for i := 0; i < len(result.Series); i++ {
					var sum float64
					for j := 0; j < len(result.Series[i].Points); j++ {
						sum += result.Series[i].Points[j].Value
					}
					result.Series[i].Points = []v3.Point{{Value: sum}}
				}
			case v3.ReduceToOperatorAvg:
				for i := 0; i < len(result.Series); i++ {
					var sum float64
					for j := 0; j < len(result.Series[i].Points); j++ {
						sum += result.Series[i].Points[j].Value
					}
					result.Series[i].Points = []v3.Point{{Value: sum / float64(len(result.Series[i].Points))}}
				}
			case v3.ReduceToOperatorMin:
				for i := 0; i < len(result.Series); i++ {
					var min float64
					for j := 0; j < len(result.Series[i].Points); j++ {
						if j == 0 || result.Series[i].Points[j].Value < min {
							min = result.Series[i].Points[j].Value
						}
					}
					result.Series[i].Points = []v3.Point{{Value: min}}
				}
			case v3.ReduceToOperatorMax:
				for i := 0; i < len(result.Series); i++ {
					var max float64
					for j := 0; j < len(result.Series[i].Points); j++ {
						if j == 0 || result.Series[i].Points[j].Value > max {
							max = result.Series[i].Points[j].Value
						}
					}
					result.Series[i].Points = []v3.Point{{Value: max}}
				}
			}
		}
	}
}
