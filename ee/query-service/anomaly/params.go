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
// prediction = avg(past_period_query) + avg(current_season_query) - avg(past_season_query)
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
	// PastPeriodQuery is the query range params for past seasonal period
	// Example: For weekly seasonality, (now-1w-4h-5m, now-1w)
	//        : For daily seasonality, (now-1d-2h-5m, now-1d)
	//        : For hourly seasonality, (now-1h-30m-5m, now-1h)
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
}

func copyCompositeQuery(req *v3.QueryRangeParamsV3) *v3.CompositeQuery {
	deepCopyCompositeQuery := *req.CompositeQuery
	deepCopyCompositeQuery.BuilderQueries = make(map[string]*v3.BuilderQuery)
	for k, v := range req.CompositeQuery.BuilderQueries {
		query := *v
		deepCopyCompositeQuery.BuilderQueries[k] = &query
	}
	return &deepCopyCompositeQuery
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
		CompositeQuery: req.CompositeQuery,
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(currentPeriodQuery)

	var pastPeriodStart, pastPeriodEnd int64

	switch seasonality {
	// for one week period, we fetch the data from the past week with 4 hours offset
	case SeasonalityWeekly:
		pastPeriodStart = start - 166*time.Hour.Milliseconds() - 4*time.Hour.Milliseconds()
		pastPeriodEnd = end - 166*time.Hour.Milliseconds()
	// for one day period, we fetch the data from the past day with 2 hours offset
	case SeasonalityDaily:
		pastPeriodStart = start - 23*time.Hour.Milliseconds() - 2*time.Hour.Milliseconds()
		pastPeriodEnd = end - 23*time.Hour.Milliseconds()
	// for one hour period, we fetch the data from the past hour with 30 minutes offset
	case SeasonalityHourly:
		pastPeriodStart = start - 1*time.Hour.Milliseconds() - 30*time.Minute.Milliseconds()
		pastPeriodEnd = end - 1*time.Hour.Milliseconds()
	}

	pastPeriodQuery := &v3.QueryRangeParamsV3{
		Start:          pastPeriodStart,
		End:            pastPeriodEnd,
		CompositeQuery: copyCompositeQuery(req),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(pastPeriodQuery)

	// seasonality growth trend
	var currentGrowthPeriodStart, currentGrowthPeriodEnd int64
	switch seasonality {
	case SeasonalityWeekly:
		currentGrowthPeriodStart = start - 7*24*time.Hour.Milliseconds()
		currentGrowthPeriodEnd = end
	case SeasonalityDaily:
		currentGrowthPeriodStart = start - 23*time.Hour.Milliseconds()
		currentGrowthPeriodEnd = end
	case SeasonalityHourly:
		currentGrowthPeriodStart = start - 1*time.Hour.Milliseconds()
		currentGrowthPeriodEnd = end
	}

	currentGrowthQuery := &v3.QueryRangeParamsV3{
		Start:          currentGrowthPeriodStart,
		End:            currentGrowthPeriodEnd,
		CompositeQuery: copyCompositeQuery(req),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(currentGrowthQuery)

	var pastGrowthPeriodStart, pastGrowthPeriodEnd int64
	switch seasonality {
	case SeasonalityWeekly:
		pastGrowthPeriodStart = start - 14*24*time.Hour.Milliseconds()
		pastGrowthPeriodEnd = start - 7*24*time.Hour.Milliseconds()
	case SeasonalityDaily:
		pastGrowthPeriodStart = start - 2*time.Hour.Milliseconds()
		pastGrowthPeriodEnd = start - 1*time.Hour.Milliseconds()
	case SeasonalityHourly:
		pastGrowthPeriodStart = start - 2*time.Hour.Milliseconds()
		pastGrowthPeriodEnd = start - 1*time.Hour.Milliseconds()
	}

	pastGrowthQuery := &v3.QueryRangeParamsV3{
		Start:          pastGrowthPeriodStart,
		End:            pastGrowthPeriodEnd,
		CompositeQuery: copyCompositeQuery(req),
		Variables:      make(map[string]interface{}, 0),
		NoCache:        false,
	}
	updateStepInterval(pastGrowthQuery)

	return &anomalyQueryParams{
		CurrentPeriodQuery: currentPeriodQuery,
		PastPeriodQuery:    pastPeriodQuery,
		CurrentSeasonQuery: currentGrowthQuery,
		PastSeasonQuery:    pastGrowthQuery,
	}
}

type anomalyQueryResults struct {
	CurrentPeriodResults []*v3.Result
	PastPeriodResults    []*v3.Result
	CurrentSeasonResults []*v3.Result
	PastSeasonResults    []*v3.Result
}
