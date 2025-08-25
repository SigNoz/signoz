package querybuilder

import (
	"fmt"
	"math"
	"time"

	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

const (
	NsToSeconds      = 1000000000
	BucketAdjustment = 1800 // 30 minutes

	RecommendedNumberOfPoints = 300
	MaxAllowedNumberOfPoints  = 1500
	MaxAllowedSeries          = 3000
)

// ToNanoSecs takes epoch and returns it in ns
func ToNanoSecs(epoch uint64) uint64 {
	temp := epoch
	count := 0
	if epoch == 0 {
		count = 1
	} else {
		for epoch != 0 {
			epoch /= 10
			count++
		}
	}
	return temp * uint64(math.Pow(10, float64(19-count)))
}

// TODO(srikanthccv): should these be rounded to nearest multiple of 60 instead of 5 if step > 60?
// That would make graph look nice but "nice" but should be less important than the usefulness
func RecommendedStepInterval(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	if step < 5 {
		return 5
	}

	// return the nearest lower multiple of 5
	return step - step%5
}

func MinAllowedStepInterval(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / MaxAllowedNumberOfPoints / 1e9

	if step < 5 {
		return 5
	}

	// return the nearest lower multiple of 5
	return step - step%5
}

func RecommendedStepIntervalForMeter(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	// for meter queries the minimum step interval allowed is 1 hour as this is our granularity
	if step < 3600 {
		return 3600
	}

	// return the nearest lower multiple of 3600 ( 1 hour )
	recommended := step - step%3600

	// if the time range is greater than 1 month set the step interval to be multiple of 1 day
	if end-start >= uint64(30*24*time.Hour.Nanoseconds()) {
		if recommended < 86400 {
			recommended = 86400
		} else {
			recommended = uint64(math.Round(float64(recommended)/86400)) * 86400
		}
	}

	return recommended
}

func RecommendedStepIntervalForMetric(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	// TODO(srikanthccv): make this make use of the reporting frequency and remove the 60
	if step < 60 {
		return 60
	}

	// return the nearest lower multiple of 60
	recommended := step - step%60

	// if the time range is greater than 1 day, and less than 1 week set the step interval to be multiple of 5 minutes
	// if the time range is greater than 1 week, set the step interval to be multiple of 30 mins
	if end-start >= uint64(24*time.Hour.Nanoseconds()) && end-start < uint64(7*24*time.Hour.Nanoseconds()) {
		recommended = uint64(math.Round(float64(recommended)/300)) * 300
	} else if end-start >= uint64(7*24*time.Hour.Nanoseconds()) {
		recommended = uint64(math.Round(float64(recommended)/1800)) * 1800
	}
	return recommended
}

func MinAllowedStepIntervalForMetric(start, end uint64) uint64 {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	step := (end - start) / RecommendedNumberOfPoints / 1e9

	// TODO(srikanthccv): make this make use of the reporting frequency and remove the 60
	if step < 60 {
		return 60
	}

	// return the nearest lower multiple of 60
	minAllowed := step - step%60

	// if the time range is greater than 1 day, and less than 1 week set the step interval to be multiple of 5 minutes
	// if the time range is greater than 1 week, set the step interval to be multiple of 30 mins
	if end-start >= uint64(24*time.Hour.Nanoseconds()) && end-start < uint64(7*24*time.Hour.Nanoseconds()) {
		minAllowed = uint64(math.Round(float64(minAllowed)/300)) * 300
	} else if end-start >= uint64(7*24*time.Hour.Nanoseconds()) {
		minAllowed = uint64(math.Round(float64(minAllowed)/1800)) * 1800
	}
	return minAllowed
}

func AdjustedMetricTimeRange(start, end, step uint64, mq qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]) (uint64, uint64) {
	// align the start to the step interval
	start = start - (start % (step * 1000))
	// if the query is a rate query, we adjust the start time by one more step
	// so that we can calculate the rate for the first data point
	hasRunningDiff := false
	for _, fn := range mq.Functions {
		if fn.Name == qbtypes.FunctionNameRunningDiff {
			hasRunningDiff = true
			break
		}
	}
	if (mq.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationRate || mq.Aggregations[0].TimeAggregation == metrictypes.TimeAggregationIncrease) &&
		mq.Aggregations[0].Temporality != metrictypes.Delta {
		start -= step * 1000
	}
	if hasRunningDiff {
		start -= step * 1000
	}
	// align the end to the nearest minute
	adjustStep := uint64(math.Min(float64(step), 60))
	end = end - (end % (adjustStep * 1000))
	return start, end
}

func AssignReservedVars(vars map[string]any, start, end uint64) {
	start = ToNanoSecs(start)
	end = ToNanoSecs(end)

	vars["start_timestamp"] = start / 1_000_000_000
	vars["end_timestamp"] = end / 1_000_000_000
	vars["start_timestamp_ms"] = start / 1_000_000
	vars["end_timestamp_ms"] = end / 1_000_000
	vars["SIGNOZ_START_TIME"] = start / 1_000_000
	vars["SIGNOZ_END_TIME"] = end / 1_000_000
	vars["start_timestamp_nano"] = start
	vars["end_timestamp_nano"] = end
	vars["start_datetime"] = fmt.Sprintf("toDateTime(%d)", start/1_000_000_000)
	vars["end_datetime"] = fmt.Sprintf("toDateTime(%d)", end/1_000_000_000)
}
