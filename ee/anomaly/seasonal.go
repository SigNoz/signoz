package anomaly

import (
	"context"
	"log/slog"
	"math"

	"github.com/SigNoz/signoz/pkg/querier"
	"github.com/SigNoz/signoz/pkg/valuer"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

var (
	// TODO(srikanthccv): make this configurable?
	movingAvgWindowSize = 7
)

// BaseProvider is an interface that includes common methods for all provider types
type BaseProvider interface {
	GetBaseSeasonalProvider() *BaseSeasonalProvider
}

// GenericProviderOption is a generic type for provider options
type GenericProviderOption[T BaseProvider] func(T)

func WithQuerier[T BaseProvider](querier querier.Querier) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().querier = querier
	}
}

func WithLogger[T BaseProvider](logger *slog.Logger) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().logger = logger
	}
}

type BaseSeasonalProvider struct {
	querier querier.Querier
	logger  *slog.Logger
}

func (p *BaseSeasonalProvider) getQueryParams(req *AnomaliesRequest) *anomalyQueryParams {
	if !req.Seasonality.IsValid() {
		req.Seasonality = SeasonalityDaily
	}
	return prepareAnomalyQueryParams(req.Params, req.Seasonality)
}

func (p *BaseSeasonalProvider) toTSResults(ctx context.Context, resp *qbtypes.QueryRangeResponse) []*qbtypes.TimeSeriesData {

	tsData := []*qbtypes.TimeSeriesData{}

	if resp == nil {
		p.logger.InfoContext(ctx, "nil response from query range")
		return tsData
	}

	for _, item := range resp.Data.Results {
		if resultData, ok := item.(*qbtypes.TimeSeriesData); ok {
			tsData = append(tsData, resultData)
		}
	}

	return tsData
}

func (p *BaseSeasonalProvider) getResults(ctx context.Context, orgID valuer.UUID, params *anomalyQueryParams) (*anomalyQueryResults, error) {
	// TODO(srikanthccv): parallelize this?
	p.logger.InfoContext(ctx, "fetching results for current period", "anomaly_current_period_query", params.CurrentPeriodQuery)
	currentPeriodResults, err := p.querier.QueryRange(ctx, orgID, &params.CurrentPeriodQuery)
	if err != nil {
		return nil, err
	}

	p.logger.InfoContext(ctx, "fetching results for past period", "anomaly_past_period_query", params.PastPeriodQuery)
	pastPeriodResults, err := p.querier.QueryRange(ctx, orgID, &params.PastPeriodQuery)
	if err != nil {
		return nil, err
	}

	p.logger.InfoContext(ctx, "fetching results for current season", "anomaly_current_season_query", params.CurrentSeasonQuery)
	currentSeasonResults, err := p.querier.QueryRange(ctx, orgID, &params.CurrentSeasonQuery)
	if err != nil {
		return nil, err
	}

	p.logger.InfoContext(ctx, "fetching results for past season", "anomaly_past_season_query", params.PastSeasonQuery)
	pastSeasonResults, err := p.querier.QueryRange(ctx, orgID, &params.PastSeasonQuery)
	if err != nil {
		return nil, err
	}

	p.logger.InfoContext(ctx, "fetching results for past 2 season", "anomaly_past_2season_query", params.Past2SeasonQuery)
	past2SeasonResults, err := p.querier.QueryRange(ctx, orgID, &params.Past2SeasonQuery)
	if err != nil {
		return nil, err
	}

	p.logger.InfoContext(ctx, "fetching results for past 3 season", "anomaly_past_3season_query", params.Past3SeasonQuery)
	past3SeasonResults, err := p.querier.QueryRange(ctx, orgID, &params.Past3SeasonQuery)
	if err != nil {
		return nil, err
	}

	return &anomalyQueryResults{
		CurrentPeriodResults: p.toTSResults(ctx, currentPeriodResults),
		PastPeriodResults:    p.toTSResults(ctx, pastPeriodResults),
		CurrentSeasonResults: p.toTSResults(ctx, currentSeasonResults),
		PastSeasonResults:    p.toTSResults(ctx, pastSeasonResults),
		Past2SeasonResults:   p.toTSResults(ctx, past2SeasonResults),
		Past3SeasonResults:   p.toTSResults(ctx, past3SeasonResults),
	}, nil
}

// getMatchingSeries gets the matching series from the query result
// for the given series
func (p *BaseSeasonalProvider) getMatchingSeries(_ context.Context, queryResult *qbtypes.TimeSeriesData, series *qbtypes.TimeSeries) *qbtypes.TimeSeries {
	if queryResult == nil || len(queryResult.Aggregations) == 0 || len(queryResult.Aggregations[0].Series) == 0 {
		return nil
	}

	for _, curr := range queryResult.Aggregations[0].Series {
		currLabelsKey := qbtypes.GetUniqueSeriesKey(curr.Labels)
		seriesLabelsKey := qbtypes.GetUniqueSeriesKey(series.Labels)
		if currLabelsKey == seriesLabelsKey {
			return curr
		}
	}
	return nil
}

func (p *BaseSeasonalProvider) getAvg(series *qbtypes.TimeSeries) float64 {
	if series == nil || len(series.Values) == 0 {
		return 0
	}
	var sum float64
	for _, smpl := range series.Values {
		sum += smpl.Value
	}
	return sum / float64(len(series.Values))
}

func (p *BaseSeasonalProvider) getStdDev(series *qbtypes.TimeSeries) float64 {
	if series == nil || len(series.Values) == 0 {
		return 0
	}
	avg := p.getAvg(series)
	var sum float64
	for _, smpl := range series.Values {
		sum += math.Pow(smpl.Value-avg, 2)
	}
	return math.Sqrt(sum / float64(len(series.Values)))
}

// getMovingAvg gets the moving average for the given series
// for the given window size and start index
func (p *BaseSeasonalProvider) getMovingAvg(series *qbtypes.TimeSeries, movingAvgWindowSize, startIdx int) float64 {
	if series == nil || len(series.Values) == 0 {
		return 0
	}
	if startIdx >= len(series.Values)-movingAvgWindowSize {
		startIdx = int(math.Max(0, float64(len(series.Values)-movingAvgWindowSize)))
	}
	var sum float64
	points := series.Values[startIdx:]
	windowSize := int(math.Min(float64(movingAvgWindowSize), float64(len(points))))
	for i := 0; i < windowSize; i++ {
		sum += points[i].Value
	}
	avg := sum / float64(windowSize)
	return avg
}

func (p *BaseSeasonalProvider) getMean(floats ...float64) float64 {
	if len(floats) == 0 {
		return 0
	}
	var sum float64
	for _, f := range floats {
		sum += f
	}
	return sum / float64(len(floats))
}

func (p *BaseSeasonalProvider) getPredictedSeries(
	ctx context.Context,
	series, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries *qbtypes.TimeSeries,
) *qbtypes.TimeSeries {
	predictedSeries := &qbtypes.TimeSeries{
		Labels: series.Labels,
		Values: make([]*qbtypes.TimeSeriesValue, 0),
	}

	// for each point in the series, get the predicted value
	// the predicted value is the moving average (with window size = 7) of the previous period series
	// plus the average of the current season series
	// minus the mean of the past season series, past2 season series and past3 season series
	for idx, curr := range series.Values {
		movingAvg := p.getMovingAvg(prevSeries, movingAvgWindowSize, idx)
		avg := p.getAvg(currentSeasonSeries)
		mean := p.getMean(p.getAvg(pastSeasonSeries), p.getAvg(past2SeasonSeries), p.getAvg(past3SeasonSeries))
		predictedValue := movingAvg + avg - mean

		if predictedValue < 0 {
			// this should not happen (except when the data has extreme outliers)
			// we will use the moving avg of the previous period series in this case
			p.logger.WarnContext(ctx, "predicted value is less than 0 for series", "anomaly_predicted_value", predictedValue, "anomaly_labels", series.Labels)
			predictedValue = p.getMovingAvg(prevSeries, movingAvgWindowSize, idx)
		}

		p.logger.DebugContext(ctx, "predicted value for series",
			"anomaly_moving_avg", movingAvg,
			"anomaly_avg", avg,
			"anomaly_mean", mean,
			"anomaly_labels", series.Labels,
			"anomaly_predicted_value", predictedValue,
			"anomaly_curr", curr.Value,
		)
		predictedSeries.Values = append(predictedSeries.Values, &qbtypes.TimeSeriesValue{
			Timestamp: curr.Timestamp,
			Value:     predictedValue,
		})
	}

	return predictedSeries
}

// getBounds gets the upper and lower bounds for the given series
// for the given z score threshold
// moving avg of the previous period series + z score threshold * std dev of the series
// moving avg of the previous period series - z score threshold * std dev of the series
func (p *BaseSeasonalProvider) getBounds(
	series, predictedSeries, weekSeries *qbtypes.TimeSeries,
	zScoreThreshold float64,
) (*qbtypes.TimeSeries, *qbtypes.TimeSeries) {
	upperBoundSeries := &qbtypes.TimeSeries{
		Labels: series.Labels,
		Values: make([]*qbtypes.TimeSeriesValue, 0),
	}

	lowerBoundSeries := &qbtypes.TimeSeries{
		Labels: series.Labels,
		Values: make([]*qbtypes.TimeSeriesValue, 0),
	}

	for idx, curr := range series.Values {
		upperBound := p.getMovingAvg(predictedSeries, movingAvgWindowSize, idx) + zScoreThreshold*p.getStdDev(weekSeries)
		lowerBound := p.getMovingAvg(predictedSeries, movingAvgWindowSize, idx) - zScoreThreshold*p.getStdDev(weekSeries)
		upperBoundSeries.Values = append(upperBoundSeries.Values, &qbtypes.TimeSeriesValue{
			Timestamp: curr.Timestamp,
			Value:     upperBound,
		})
		lowerBoundSeries.Values = append(lowerBoundSeries.Values, &qbtypes.TimeSeriesValue{
			Timestamp: curr.Timestamp,
			Value:     math.Max(lowerBound, 0),
		})
	}

	return upperBoundSeries, lowerBoundSeries
}

// getExpectedValue gets the expected value for the given series
// for the given index
// prevSeriesAvg + currentSeasonSeriesAvg - mean of past season series, past2 season series and past3 season series
func (p *BaseSeasonalProvider) getExpectedValue(
	_, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries *qbtypes.TimeSeries, idx int,
) float64 {
	prevSeriesAvg := p.getMovingAvg(prevSeries, movingAvgWindowSize, idx)
	currentSeasonSeriesAvg := p.getAvg(currentSeasonSeries)
	pastSeasonSeriesAvg := p.getAvg(pastSeasonSeries)
	past2SeasonSeriesAvg := p.getAvg(past2SeasonSeries)
	past3SeasonSeriesAvg := p.getAvg(past3SeasonSeries)
	return prevSeriesAvg + currentSeasonSeriesAvg - p.getMean(pastSeasonSeriesAvg, past2SeasonSeriesAvg, past3SeasonSeriesAvg)
}

// getScore gets the anomaly score for the given series
// for the given index
// (value - expectedValue) / std dev of the series
func (p *BaseSeasonalProvider) getScore(
	series, prevSeries, weekSeries, weekPrevSeries, past2SeasonSeries, past3SeasonSeries *qbtypes.TimeSeries, value float64, idx int,
) float64 {
	expectedValue := p.getExpectedValue(series, prevSeries, weekSeries, weekPrevSeries, past2SeasonSeries, past3SeasonSeries, idx)
	if expectedValue < 0 {
		expectedValue = p.getMovingAvg(prevSeries, movingAvgWindowSize, idx)
	}
	return (value - expectedValue) / p.getStdDev(weekSeries)
}

// getAnomalyScores gets the anomaly scores for the given series
// for the given index
// (value - expectedValue) / std dev of the series
func (p *BaseSeasonalProvider) getAnomalyScores(
	series, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries *qbtypes.TimeSeries,
) *qbtypes.TimeSeries {
	anomalyScoreSeries := &qbtypes.TimeSeries{
		Labels: series.Labels,
		Values: make([]*qbtypes.TimeSeriesValue, 0),
	}

	for idx, curr := range series.Values {
		anomalyScore := p.getScore(series, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries, curr.Value, idx)
		anomalyScoreSeries.Values = append(anomalyScoreSeries.Values, &qbtypes.TimeSeriesValue{
			Timestamp: curr.Timestamp,
			Value:     anomalyScore,
		})
	}

	return anomalyScoreSeries
}

func (p *BaseSeasonalProvider) getAnomalies(ctx context.Context, orgID valuer.UUID, req *AnomaliesRequest) (*AnomaliesResponse, error) {
	anomalyParams := p.getQueryParams(req)
	anomalyQueryResults, err := p.getResults(ctx, orgID, anomalyParams)
	if err != nil {
		return nil, err
	}

	currentPeriodResults := make(map[string]*qbtypes.TimeSeriesData)
	for _, result := range anomalyQueryResults.CurrentPeriodResults {
		currentPeriodResults[result.QueryName] = result
	}

	pastPeriodResults := make(map[string]*qbtypes.TimeSeriesData)
	for _, result := range anomalyQueryResults.PastPeriodResults {
		pastPeriodResults[result.QueryName] = result
	}

	currentSeasonResults := make(map[string]*qbtypes.TimeSeriesData)
	for _, result := range anomalyQueryResults.CurrentSeasonResults {
		currentSeasonResults[result.QueryName] = result
	}

	pastSeasonResults := make(map[string]*qbtypes.TimeSeriesData)
	for _, result := range anomalyQueryResults.PastSeasonResults {
		pastSeasonResults[result.QueryName] = result
	}

	past2SeasonResults := make(map[string]*qbtypes.TimeSeriesData)
	for _, result := range anomalyQueryResults.Past2SeasonResults {
		past2SeasonResults[result.QueryName] = result
	}

	past3SeasonResults := make(map[string]*qbtypes.TimeSeriesData)
	for _, result := range anomalyQueryResults.Past3SeasonResults {
		past3SeasonResults[result.QueryName] = result
	}

	for _, result := range currentPeriodResults {
		funcs := req.Params.FuncsForQuery(result.QueryName)

		var zScoreThreshold float64
		for _, f := range funcs {
			if f.Name == qbtypes.FunctionNameAnomaly {
				for _, arg := range f.Args {
					if arg.Name != "z_score_threshold" {
						continue
					}
					value, ok := arg.Value.(float64)
					if ok {
						zScoreThreshold = value
					} else {
						p.logger.InfoContext(ctx, "z_score_threshold not provided, defaulting")
						zScoreThreshold = 3
					}
					break
				}
			}
		}

		pastPeriodResult, ok := pastPeriodResults[result.QueryName]
		if !ok {
			continue
		}
		currentSeasonResult, ok := currentSeasonResults[result.QueryName]
		if !ok {
			continue
		}
		pastSeasonResult, ok := pastSeasonResults[result.QueryName]
		if !ok {
			continue
		}
		past2SeasonResult, ok := past2SeasonResults[result.QueryName]
		if !ok {
			continue
		}
		past3SeasonResult, ok := past3SeasonResults[result.QueryName]
		if !ok {
			continue
		}

		// no data;
		if len(result.Aggregations) == 0 {
			continue
		}

		aggOfInterest := result.Aggregations[0]

		for _, series := range aggOfInterest.Series {

			pastPeriodSeries := p.getMatchingSeries(ctx, pastPeriodResult, series)
			currentSeasonSeries := p.getMatchingSeries(ctx, currentSeasonResult, series)
			pastSeasonSeries := p.getMatchingSeries(ctx, pastSeasonResult, series)
			past2SeasonSeries := p.getMatchingSeries(ctx, past2SeasonResult, series)
			past3SeasonSeries := p.getMatchingSeries(ctx, past3SeasonResult, series)

			stdDev := p.getStdDev(currentSeasonSeries)
			p.logger.InfoContext(ctx, "calculated standard deviation for series", "anomaly_std_dev", stdDev, "anomaly_labels", series.Labels)

			prevSeriesAvg := p.getAvg(pastPeriodSeries)
			currentSeasonSeriesAvg := p.getAvg(currentSeasonSeries)
			pastSeasonSeriesAvg := p.getAvg(pastSeasonSeries)
			past2SeasonSeriesAvg := p.getAvg(past2SeasonSeries)
			past3SeasonSeriesAvg := p.getAvg(past3SeasonSeries)
			p.logger.InfoContext(ctx, "calculated mean for series",
				"anomaly_prev_series_avg", prevSeriesAvg,
				"anomaly_current_season_series_avg", currentSeasonSeriesAvg,
				"anomaly_past_season_series_avg", pastSeasonSeriesAvg,
				"anomaly_past_2season_series_avg", past2SeasonSeriesAvg,
				"anomaly_past_3season_series_avg", past3SeasonSeriesAvg,
				"anomaly_labels", series.Labels,
			)

			predictedSeries := p.getPredictedSeries(
				ctx,
				series,
				pastPeriodSeries,
				currentSeasonSeries,
				pastSeasonSeries,
				past2SeasonSeries,
				past3SeasonSeries,
			)
			aggOfInterest.PredictedSeries = append(aggOfInterest.PredictedSeries, predictedSeries)

			upperBoundSeries, lowerBoundSeries := p.getBounds(
				series,
				predictedSeries,
				currentSeasonSeries,
				zScoreThreshold,
			)
			aggOfInterest.UpperBoundSeries = append(aggOfInterest.UpperBoundSeries, upperBoundSeries)
			aggOfInterest.LowerBoundSeries = append(aggOfInterest.LowerBoundSeries, lowerBoundSeries)

			anomalyScoreSeries := p.getAnomalyScores(
				series,
				pastPeriodSeries,
				currentSeasonSeries,
				pastSeasonSeries,
				past2SeasonSeries,
				past3SeasonSeries,
			)
			aggOfInterest.AnomalyScores = append(aggOfInterest.AnomalyScores, anomalyScoreSeries)
		}
	}

	results := make([]*qbtypes.TimeSeriesData, 0, len(currentPeriodResults))
	for _, result := range currentPeriodResults {
		results = append(results, result)
	}

	return &AnomaliesResponse{
		Results: results,
	}, nil
}
