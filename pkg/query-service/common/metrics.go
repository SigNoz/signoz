package common

import (
	"math"
	"time"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

func AdjustedMetricTimeRange(start, end, step int64, mq v3.BuilderQuery) (int64, int64) {
	// align the start to the step interval
	start = start - (start % (step * 1000))
	// if the query is a rate query, we adjust the start time by one more step
	// so that we can calculate the rate for the first data point
	if (mq.AggregateOperator.IsRateOperator() || mq.TimeAggregation.IsRateOperator()) &&
		mq.Temporality != v3.Delta {
		start -= step * 1000
	}
	// align the end to the nearest minute
	adjustStep := int64(math.Min(float64(step), 60))
	end = end - (end % (adjustStep * 1000))
	return start, end
}

func PastDayRoundOff() int64 {
	now := time.Now().UnixMilli()
	return int64(math.Floor(float64(now)/float64(time.Hour.Milliseconds()*24))) * time.Hour.Milliseconds() * 24
}

// start and end are in milliseconds
func MinAllowedStepInterval(start, end int64) int64 {
	step := (end - start) / constants.MaxAllowedPointsInTimeSeries / 1000
	if step < 60 {
		return step
	}
	// return the nearest lower multiple of 60
	return step - step%60
}
