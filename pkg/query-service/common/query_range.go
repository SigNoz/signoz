package common

import (
	"math"
	"regexp"
	"time"
	"unicode"

	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/querycache"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
)

func AdjustedMetricTimeRange(start, end, step int64, mq v3.BuilderQuery) (int64, int64) {
	// align the start to the step interval
	start = start - (start % (step * 1000))
	// if the query is a rate query, we adjust the start time by one more step
	// so that we can calculate the rate for the first data point
	hasRunningDiff := false
	for _, fn := range mq.Functions {
		if fn.Name == v3.FunctionNameRunningDiff {
			hasRunningDiff = true
			break
		}
	}
	if (mq.AggregateOperator.IsRateOperator() || mq.TimeAggregation.IsRateOperator()) &&
		mq.Temporality != v3.Delta {
		start -= step * 1000
	}
	if hasRunningDiff {
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

func GCD(a, b int64) int64 {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

func LCM(a, b int64) int64 {
	return (a * b) / GCD(a, b)
}

// LCMList computes the LCM of a list of int64 numbers.
func LCMList(nums []int64) int64 {
	if len(nums) == 0 {
		return 1
	}
	result := nums[0]
	for _, num := range nums[1:] {
		result = LCM(result, num)
	}
	return result
}

func NormalizeLabelName(name string) string {
	// See https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels

	// Regular expression to match non-alphanumeric characters except underscores
	reg := regexp.MustCompile(`[^a-zA-Z0-9_]`)

	// Replace all non-alphanumeric characters except underscores with underscores
	normalized := reg.ReplaceAllString(name, "_")

	// If the first character is not a letter or an underscore, prepend an underscore
	if len(normalized) > 0 && !unicode.IsLetter(rune(normalized[0])) && normalized[0] != '_' {
		normalized = "_" + normalized
	}

	return normalized
}

func GetSeriesFromCachedData(data []querycache.CachedSeriesData, start, end int64) []*v3.Series {
	series := make(map[uint64]*v3.Series)

	for _, cachedData := range data {
		for _, data := range cachedData.Data {
			h := labels.FromMap(data.Labels).Hash()

			if _, ok := series[h]; !ok {
				series[h] = &v3.Series{
					Labels:      data.Labels,
					LabelsArray: data.LabelsArray,
					Points:      make([]v3.Point, 0),
				}
			}

			for _, point := range data.Points {
				if point.Timestamp >= start && point.Timestamp <= end {
					series[h].Points = append(series[h].Points, point)
				}
			}
		}
	}

	newSeries := make([]*v3.Series, 0, len(series))
	for _, s := range series {
		s.SortPoints()
		s.RemoveDuplicatePoints()
		newSeries = append(newSeries, s)
	}
	return newSeries
}
