package anomaly

import (
	"time"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Seasonality struct{ valuer.String }

var (
	SeasonalityHourly = Seasonality{valuer.NewString("hourly")}
	SeasonalityDaily  = Seasonality{valuer.NewString("daily")}
	SeasonalityWeekly = Seasonality{valuer.NewString("weekly")}
)

var (
	oneWeekOffset = uint64(24 * 7 * time.Hour.Milliseconds())
	oneDayOffset  = uint64(24 * time.Hour.Milliseconds())
	oneHourOffset = uint64(time.Hour.Milliseconds())
	fiveMinOffset = uint64(5 * time.Minute.Milliseconds())
)

func (s Seasonality) IsValid() bool {
	switch s {
	case SeasonalityHourly, SeasonalityDaily, SeasonalityWeekly:
		return true
	default:
		return false
	}
}

type AnomaliesRequest struct {
	Params      qbtypes.QueryRangeRequest
	Seasonality Seasonality
}

type AnomaliesResponse struct {
	Results []*qbtypes.TimeSeriesData
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
	CurrentPeriodQuery qbtypes.QueryRangeRequest
	// PastPeriodQuery is the query range params for past period of seasonality
	// Example: For weekly seasonality, (now-1w-5m, now-1w)
	//        : For daily seasonality, (now-1d-5m, now-1d)
	//        : For hourly seasonality, (now-1h-5m, now-1h)
	PastPeriodQuery qbtypes.QueryRangeRequest
	// CurrentSeasonQuery is the query range params for current period (seasonal)
	// Example: For weekly seasonality, this is the query range params for the (now-1w-5m, now)
	//        : For daily seasonality, this is the query range params for the (now-1d-5m, now)
	//        : For hourly seasonality, this is the query range params for the (now-1h-5m, now)
	CurrentSeasonQuery qbtypes.QueryRangeRequest
	// PastSeasonQuery is the query range params for past seasonal period to the current season
	// Example: For weekly seasonality, this is the query range params for the (now-2w-5m, now-1w)
	//        : For daily seasonality, this is the query range params for the (now-2d-5m, now-1d)
	//        : For hourly seasonality, this is the query range params for the (now-2h-5m, now-1h)
	PastSeasonQuery qbtypes.QueryRangeRequest
	// Past2SeasonQuery is the query range params for past 2 seasonal period to the current season
	// Example: For weekly seasonality, this is the query range params for the (now-3w-5m, now-2w)
	//        : For daily seasonality, this is the query range params for the (now-3d-5m, now-2d)
	//        : For hourly seasonality, this is the query range params for the (now-3h-5m, now-2h)
	Past2SeasonQuery qbtypes.QueryRangeRequest
	// Past3SeasonQuery is the query range params for past 3 seasonal period to the current season
	// Example: For weekly seasonality, this is the query range params for the (now-4w-5m, now-3w)
	//        : For daily seasonality, this is the query range params for the (now-4d-5m, now-3d)
	//        : For hourly seasonality, this is the query range params for the (now-4h-5m, now-3h)
	Past3SeasonQuery qbtypes.QueryRangeRequest
}

func prepareAnomalyQueryParams(req qbtypes.QueryRangeRequest, seasonality Seasonality) *anomalyQueryParams {
	start := req.Start
	end := req.End

	currentPeriodQuery := qbtypes.QueryRangeRequest{
		Start:          start,
		End:            end,
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: req.CompositeQuery,
		NoCache:        false,
	}

	var pastPeriodStart, pastPeriodEnd uint64

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

	pastPeriodQuery := qbtypes.QueryRangeRequest{
		Start:          pastPeriodStart,
		End:            pastPeriodEnd,
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: req.CompositeQuery,
		NoCache:        false,
	}

	// seasonality growth trend
	var currentGrowthPeriodStart, currentGrowthPeriodEnd uint64
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

	currentGrowthQuery := qbtypes.QueryRangeRequest{
		Start:          currentGrowthPeriodStart,
		End:            currentGrowthPeriodEnd,
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: req.CompositeQuery,
		NoCache:        false,
	}

	var pastGrowthPeriodStart, pastGrowthPeriodEnd uint64
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

	pastGrowthQuery := qbtypes.QueryRangeRequest{
		Start:          pastGrowthPeriodStart,
		End:            pastGrowthPeriodEnd,
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: req.CompositeQuery,
		NoCache:        false,
	}

	var past2GrowthPeriodStart, past2GrowthPeriodEnd uint64
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

	past2GrowthQuery := qbtypes.QueryRangeRequest{
		Start:          past2GrowthPeriodStart,
		End:            past2GrowthPeriodEnd,
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: req.CompositeQuery,
		NoCache:        false,
	}

	var past3GrowthPeriodStart, past3GrowthPeriodEnd uint64
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

	past3GrowthQuery := qbtypes.QueryRangeRequest{
		Start:          past3GrowthPeriodStart,
		End:            past3GrowthPeriodEnd,
		RequestType:    qbtypes.RequestTypeTimeSeries,
		CompositeQuery: req.CompositeQuery,
		NoCache:        false,
	}

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
	CurrentPeriodResults []*qbtypes.TimeSeriesData
	PastPeriodResults    []*qbtypes.TimeSeriesData
	CurrentSeasonResults []*qbtypes.TimeSeriesData
	PastSeasonResults    []*qbtypes.TimeSeriesData
	Past2SeasonResults   []*qbtypes.TimeSeriesData
	Past3SeasonResults   []*qbtypes.TimeSeriesData
}
