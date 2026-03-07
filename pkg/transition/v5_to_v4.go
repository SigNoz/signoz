package transition

import (
	"fmt"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// ConvertV5TimeSeriesDataToV4Result converts v5 TimeSeriesData to v4 Result
func ConvertV5TimeSeriesDataToV4Result(v5Data *qbtypes.TimeSeriesData) *v3.Result {
	if v5Data == nil {
		return nil
	}

	result := &v3.Result{
		QueryName: v5Data.QueryName,
		Series:    make([]*v3.Series, 0),
	}

	toV4Series := func(ts *qbtypes.TimeSeries) *v3.Series {
		series := &v3.Series{
			Labels:      make(map[string]string),
			LabelsArray: make([]map[string]string, 0),
			Points:      make([]v3.Point, 0, len(ts.Values)),
		}

		for _, label := range ts.Labels {
			valueStr := fmt.Sprintf("%v", label.Value)
			series.Labels[label.Key.Name] = valueStr
		}

		if len(series.Labels) > 0 {
			series.LabelsArray = append(series.LabelsArray, series.Labels)
		}

		for _, tsValue := range ts.Values {
			if tsValue.Partial {
				continue
			}

			point := v3.Point{
				Timestamp: tsValue.Timestamp,
				Value:     tsValue.Value,
			}
			series.Points = append(series.Points, point)
		}
		return series
	}

	for _, aggBucket := range v5Data.Aggregations {
		for _, ts := range aggBucket.Series {
			result.Series = append(result.Series, toV4Series(ts))
		}

		if len(aggBucket.AnomalyScores) != 0 {
			result.AnomalyScores = make([]*v3.Series, 0)
			for _, ts := range aggBucket.AnomalyScores {
				result.AnomalyScores = append(result.AnomalyScores, toV4Series(ts))
			}
		}

		if len(aggBucket.PredictedSeries) != 0 {
			result.PredictedSeries = make([]*v3.Series, 0)
			for _, ts := range aggBucket.PredictedSeries {
				result.PredictedSeries = append(result.PredictedSeries, toV4Series(ts))
			}
		}

		if len(aggBucket.LowerBoundSeries) != 0 {
			result.LowerBoundSeries = make([]*v3.Series, 0)
			for _, ts := range aggBucket.LowerBoundSeries {
				result.LowerBoundSeries = append(result.LowerBoundSeries, toV4Series(ts))
			}
		}

		if len(aggBucket.UpperBoundSeries) != 0 {
			result.UpperBoundSeries = make([]*v3.Series, 0)
			for _, ts := range aggBucket.UpperBoundSeries {
				result.UpperBoundSeries = append(result.UpperBoundSeries, toV4Series(ts))
			}
		}
	}

	return result
}

// ConvertV5TimeSeriesDataSliceToV4Results converts a slice of v5 TimeSeriesData to v4 QueryRangeResponse
func ConvertV5TimeSeriesDataSliceToV4Results(v5DataSlice []*qbtypes.TimeSeriesData) *v3.QueryRangeResponse {
	response := &v3.QueryRangeResponse{
		ResultType: "matrix", // Time series data is typically "matrix" type
		Result:     make([]*v3.Result, 0, len(v5DataSlice)),
	}

	for _, v5Data := range v5DataSlice {
		if result := ConvertV5TimeSeriesDataToV4Result(v5Data); result != nil {
			response.Result = append(response.Result, result)
		}
	}

	return response
}
