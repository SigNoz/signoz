package anomaly

import (
	"math"
	"time"

	"go.signoz.io/signoz/pkg/query-service/common"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

type Seasonality string

const (
	SeasonalityHourly Seasonality = "hourly"
	SeasonalityDaily  Seasonality = "daily"
	SeasonalityWeekly Seasonality = "weekly"
)

func (s Seasonality) String() string {
	return string(s)
}

var (
	oneWeekOffset = 24 * 7 * time.Hour.Milliseconds()
	oneDayOffset  = 24 * time.Hour.Milliseconds()
	oneHourOffset = time.Hour.Milliseconds()
	fiveMinOffset = 5 * time.Minute.Milliseconds()
)

func (s Seasonality) IsValid() bool {
	switch s {
	case SeasonalityHourly, SeasonalityDaily, SeasonalityWeekly:
		return true
	default:
		return false
	}
}

type GetAnomaliesRequest struct {
	Params      *v3.QueryRangeParamsV3
	Seasonality Seasonality
}

type GetAnomaliesResponse struct {
	Results []*v3.Result
}

// anomalyParams is the params for anomaly detection
// prediction = avg(past_period_query) + avg(current_season_query) - mean(past_season_query, past2_season_query, past3_season_query)
//
//	                  ^                                  ^
//		              |                                  |
//			(rounded value for past peiod)    +      (seasonal growth)
//
// score = abs(value - prediction) / stddev (current_season_query)
type anomalyQueryParams struct {
	// CurrentPeriodQuery is the query range params for period user is looking at or eval window
	// Example: (now-5m, now), (now-30m, now), (now-1h, now)
	// The results obtained from this query are used to compare with predicted values
	// and to detect anomalies
	CurrentPeriodQuery *v3.QueryRangeParamsV3
	// PastPeriodQuery is the query range params for past period of seasonality
	// Example: For weekly seasonality, (now-1w-5m, now-1w)
	//        : For daily seasonality, (now-1d-5m, now-1d)
	//        : For hourly seasonality, (now-1h-5m, now-1h)
	PastPeriodQuery *v3.QueryRangeParamsV3
	// CurrentSeasonQuery is the query range params for current period (seasonal)
	// Example: For weekly seasonality, this is the query range params for the (now-1w-5m, now)
	//        : For daily seasonality, this is the query range params for the (now-1d-5m, now)
	//        : For hourly seasonality, this is the query range params for the (now-1h-5m, now)
	CurrentSeasonQuery *v3.QueryRangeParamsV3
	// PastSeasonQuery is the query range params for past seasonal period to the current season
	// Example: For weekly seasonality, this is the query range params for the (now-2w-5m, now-1w)
	//        : For daily seasonality, this is the query range params for the (now-2d-5m, now-1d)
	//        : For hourly seasonality, this is the query range params for the (now-2h-5m, now-1h)
	PastSeasonQuery *v3.QueryRangeParamsV3
	// Past2SeasonQuery is the query range params for past 2 seasonal period to the current season
	// Example: For weekly seasonality, this is the query range params for the (now-3w-5m, now-2w)
	//        : For daily seasonality, this is the query range params for the (now-3d-5m, now-2d)
	//        : For hourly seasonality, this is the query range params for the (now-3h-5m, now-2h)
	Past2SeasonQuery *v3.QueryRangeParamsV3
	// Past3SeasonQuery is the query range params for past 3 seasonal period to the current season
	// Example: For weekly seasonality, this is the query range params for the (now-4w-5m, now-3w)
	//        : For daily seasonality, this is the query range params for the (now-4d-5m, now-3d)
	//        : For hourly seasonality, this is the query range params for the (now-4h-5m, now-3h)
	Past3SeasonQuery *v3.QueryRangeParamsV3
}

func updateStepInterval(req *v3.QueryRangeParamsV3) {
	start := req.Start
	end := req.End

	req.Step = int64(math.Max(float64(common.MinAllowedStepInterval(start, end)), 60))
	for _, q := range req.CompositeQuery.BuilderQueries {
		// If the step interval is less than the minimum allowed step interval, set it to the minimum allowed step interval
		if minStep := common.MinAllowedStepInterval(start, end); q.StepInterval < minStep {
			q.StepInterval = minStep
		}
	}
}

func prepareAnomalyQueryParams(req *v3.QueryRangeParamsV3, seasonality Seasonality) *anomalyQueryParams {
	start := req.Start
	end := req.End

	currentPeriodQuery := &v3.QueryRangeParamsV3{
		Start:          start,
		End:            end,
		CompositeQuery: req.CompositeQuery.Clone(),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(currentPeriodQuery)

	var pastPeriodStart, pastPeriodEnd int64

	switch seasonality {
	// for one week period, we fetch the data from the past week with 5 min offset
	case SeasonalityWeekly:
		pastPeriodStart = start - oneWeekOffset - fiveMinOffset
		pastPeriodEnd = end - oneWeekOffset
	// for one day period, we fetch the data from the past day with 5 min offset
	case SeasonalityDaily:
		pastPeriodStart = start - oneDayOffset - fiveMinOffset
		pastPeriodEnd = end - oneDayOffset
	// for one hour period, we fetch the data from the past hour with 5 min offset
	case SeasonalityHourly:
		pastPeriodStart = start - oneHourOffset - fiveMinOffset
		pastPeriodEnd = end - oneHourOffset
	}

	pastPeriodQuery := &v3.QueryRangeParamsV3{
		Start:          pastPeriodStart,
		End:            pastPeriodEnd,
		CompositeQuery: req.CompositeQuery.Clone(),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(pastPeriodQuery)

	// seasonality growth trend
	var currentGrowthPeriodStart, currentGrowthPeriodEnd int64
	switch seasonality {
	case SeasonalityWeekly:
		currentGrowthPeriodStart = start - oneWeekOffset
		currentGrowthPeriodEnd = start
	case SeasonalityDaily:
		currentGrowthPeriodStart = start - oneDayOffset
		currentGrowthPeriodEnd = start
	case SeasonalityHourly:
		currentGrowthPeriodStart = start - oneHourOffset
		currentGrowthPeriodEnd = start
	}

	currentGrowthQuery := &v3.QueryRangeParamsV3{
		Start:          currentGrowthPeriodStart,
		End:            currentGrowthPeriodEnd,
		CompositeQuery: req.CompositeQuery.Clone(),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(currentGrowthQuery)

	var pastGrowthPeriodStart, pastGrowthPeriodEnd int64
	switch seasonality {
	case SeasonalityWeekly:
		pastGrowthPeriodStart = start - 2*oneWeekOffset
		pastGrowthPeriodEnd = start - 1*oneWeekOffset
	case SeasonalityDaily:
		pastGrowthPeriodStart = start - 2*oneDayOffset
		pastGrowthPeriodEnd = start - 1*oneDayOffset
	case SeasonalityHourly:
		pastGrowthPeriodStart = start - 2*oneHourOffset
		pastGrowthPeriodEnd = start - 1*oneHourOffset
	}

	pastGrowthQuery := &v3.QueryRangeParamsV3{
		Start:          pastGrowthPeriodStart,
		End:            pastGrowthPeriodEnd,
		CompositeQuery: req.CompositeQuery.Clone(),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(pastGrowthQuery)

	var past2GrowthPeriodStart, past2GrowthPeriodEnd int64
	switch seasonality {
	case SeasonalityWeekly:
		past2GrowthPeriodStart = start - 3*oneWeekOffset
		past2GrowthPeriodEnd = start - 2*oneWeekOffset
	case SeasonalityDaily:
		past2GrowthPeriodStart = start - 3*oneDayOffset
		past2GrowthPeriodEnd = start - 2*oneDayOffset
	case SeasonalityHourly:
		past2GrowthPeriodStart = start - 3*oneHourOffset
		past2GrowthPeriodEnd = start - 2*oneHourOffset
	}

	past2GrowthQuery := &v3.QueryRangeParamsV3{
		Start:          past2GrowthPeriodStart,
		End:            past2GrowthPeriodEnd,
		CompositeQuery: req.CompositeQuery.Clone(),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(past2GrowthQuery)

	var past3GrowthPeriodStart, past3GrowthPeriodEnd int64
	switch seasonality {
	case SeasonalityWeekly:
		past3GrowthPeriodStart = start - 4*oneWeekOffset
		past3GrowthPeriodEnd = start - 3*oneWeekOffset
	case SeasonalityDaily:
		past3GrowthPeriodStart = start - 4*oneDayOffset
		past3GrowthPeriodEnd = start - 3*oneDayOffset
	case SeasonalityHourly:
		past3GrowthPeriodStart = start - 4*oneHourOffset
		past3GrowthPeriodEnd = start - 3*oneHourOffset
	}

	past3GrowthQuery := &v3.QueryRangeParamsV3{
		Start:          past3GrowthPeriodStart,
		End:            past3GrowthPeriodEnd,
		CompositeQuery: req.CompositeQuery.Clone(),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(past3GrowthQuery)

	return &anomalyQueryParams{
		CurrentPeriodQuery: currentPeriodQuery,
		PastPeriodQuery:    pastPeriodQuery,
		CurrentSeasonQuery: currentGrowthQuery,
		PastSeasonQuery:    pastGrowthQuery,
		Past2SeasonQuery:   past2GrowthQuery,
		Past3SeasonQuery:   past3GrowthQuery,
	}
}

type anomalyQueryResults struct {
	CurrentPeriodResults []*v3.Result
	PastPeriodResults    []*v3.Result
	CurrentSeasonResults []*v3.Result
	PastSeasonResults    []*v3.Result
	Past2SeasonResults   []*v3.Result
	Past3SeasonResults   []*v3.Result
}
