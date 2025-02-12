package anomaly

import (
	"context"
	"math"
	"time"

	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/postprocess"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
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

func WithCache[T BaseProvider](cache cache.Cache) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().cache = cache
	}
}

func WithKeyGenerator[T BaseProvider](keyGenerator cache.KeyGenerator) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().keyGenerator = keyGenerator
	}
}

func WithFeatureLookup[T BaseProvider](ff interfaces.FeatureLookup) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().ff = ff
	}
}

func WithReader[T BaseProvider](reader interfaces.Reader) GenericProviderOption[T] {
	return func(p T) {
		p.GetBaseSeasonalProvider().reader = reader
	}
}

type BaseSeasonalProvider struct {
	querierV2    interfaces.Querier
	reader       interfaces.Reader
	fluxInterval time.Duration
	cache        cache.Cache
	keyGenerator cache.KeyGenerator
	ff           interfaces.FeatureLookup
}

func (p *BaseSeasonalProvider) getQueryParams(req *GetAnomaliesRequest) *anomalyQueryParams {
	if !req.Seasonality.IsValid() {
		req.Seasonality = SeasonalityDaily
	}
	return prepareAnomalyQueryParams(req.Params, req.Seasonality)
}

func (p *BaseSeasonalProvider) getResults(ctx context.Context, params *anomalyQueryParams) (*anomalyQueryResults, error) {
	zap.L().Info("fetching results for current period", zap.Any("currentPeriodQuery", params.CurrentPeriodQuery))
	currentPeriodResults, _, err := p.querierV2.QueryRange(ctx, params.CurrentPeriodQuery)
	if err != nil {
		return nil, err
	}

	currentPeriodResults, err = postprocess.PostProcessResult(currentPeriodResults, params.CurrentPeriodQuery)
	if err != nil {
		return nil, err
	}

	zap.L().Info("fetching results for past period", zap.Any("pastPeriodQuery", params.PastPeriodQuery))
	pastPeriodResults, _, err := p.querierV2.QueryRange(ctx, params.PastPeriodQuery)
	if err != nil {
		return nil, err
	}

	pastPeriodResults, err = postprocess.PostProcessResult(pastPeriodResults, params.PastPeriodQuery)
	if err != nil {
		return nil, err
	}

	zap.L().Info("fetching results for current season", zap.Any("currentSeasonQuery", params.CurrentSeasonQuery))
	currentSeasonResults, _, err := p.querierV2.QueryRange(ctx, params.CurrentSeasonQuery)
	if err != nil {
		return nil, err
	}

	currentSeasonResults, err = postprocess.PostProcessResult(currentSeasonResults, params.CurrentSeasonQuery)
	if err != nil {
		return nil, err
	}

	zap.L().Info("fetching results for past season", zap.Any("pastSeasonQuery", params.PastSeasonQuery))
	pastSeasonResults, _, err := p.querierV2.QueryRange(ctx, params.PastSeasonQuery)
	if err != nil {
		return nil, err
	}

	pastSeasonResults, err = postprocess.PostProcessResult(pastSeasonResults, params.PastSeasonQuery)
	if err != nil {
		return nil, err
	}

	zap.L().Info("fetching results for past 2 season", zap.Any("past2SeasonQuery", params.Past2SeasonQuery))
	past2SeasonResults, _, err := p.querierV2.QueryRange(ctx, params.Past2SeasonQuery)
	if err != nil {
		return nil, err
	}

	past2SeasonResults, err = postprocess.PostProcessResult(past2SeasonResults, params.Past2SeasonQuery)
	if err != nil {
		return nil, err
	}

	zap.L().Info("fetching results for past 3 season", zap.Any("past3SeasonQuery", params.Past3SeasonQuery))
	past3SeasonResults, _, err := p.querierV2.QueryRange(ctx, params.Past3SeasonQuery)
	if err != nil {
		return nil, err
	}

	past3SeasonResults, err = postprocess.PostProcessResult(past3SeasonResults, params.Past3SeasonQuery)
	if err != nil {
		return nil, err
	}

	return &anomalyQueryResults{
		CurrentPeriodResults: currentPeriodResults,
		PastPeriodResults:    pastPeriodResults,
		CurrentSeasonResults: currentSeasonResults,
		PastSeasonResults:    pastSeasonResults,
		Past2SeasonResults:   past2SeasonResults,
		Past3SeasonResults:   past3SeasonResults,
	}, nil
}

// getMatchingSeries gets the matching series from the query result
// for the given series
func (p *BaseSeasonalProvider) getMatchingSeries(queryResult *v3.Result, series *v3.Series) *v3.Series {
	if queryResult == nil || len(queryResult.Series) == 0 {
		return nil
	}

	for _, curr := range queryResult.Series {
		currLabels := labels.FromMap(curr.Labels)
		seriesLabels := labels.FromMap(series.Labels)
		if currLabels.Hash() == seriesLabels.Hash() {
			return curr
		}
	}
	return nil
}

func (p *BaseSeasonalProvider) getAvg(series *v3.Series) float64 {
	if series == nil || len(series.Points) == 0 {
		return 0
	}
	var sum float64
	for _, smpl := range series.Points {
		sum += smpl.Value
	}
	return sum / float64(len(series.Points))
}

func (p *BaseSeasonalProvider) getStdDev(series *v3.Series) float64 {
	if series == nil || len(series.Points) == 0 {
		return 0
	}
	avg := p.getAvg(series)
	var sum float64
	for _, smpl := range series.Points {
		sum += math.Pow(smpl.Value-avg, 2)
	}
	return math.Sqrt(sum / float64(len(series.Points)))
}

// getMovingAvg gets the moving average for the given series
// for the given window size and start index
func (p *BaseSeasonalProvider) getMovingAvg(series *v3.Series, movingAvgWindowSize, startIdx int) float64 {
	if series == nil || len(series.Points) == 0 {
		return 0
	}
	if startIdx >= len(series.Points)-movingAvgWindowSize {
		startIdx = int(math.Max(0, float64(len(series.Points)-movingAvgWindowSize)))
	}
	var sum float64
	points := series.Points[startIdx:]
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
	series, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries *v3.Series,
) *v3.Series {
	predictedSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      []v3.Point{},
	}

	// for each point in the series, get the predicted value
	// the predicted value is the moving average (with window size = 7) of the previous period series
	// plus the average of the current season series
	// minus the mean of the past season series, past2 season series and past3 season series
	for idx, curr := range series.Points {
		movingAvg := p.getMovingAvg(prevSeries, movingAvgWindowSize, idx)
		avg := p.getAvg(currentSeasonSeries)
		mean := p.getMean(p.getAvg(pastSeasonSeries), p.getAvg(past2SeasonSeries), p.getAvg(past3SeasonSeries))
		predictedValue := movingAvg + avg - mean

		if predictedValue < 0 {
			// this should not happen (except when the data has extreme outliers)
			// we will use the moving avg of the previous period series in this case
			zap.L().Warn("predictedValue is less than 0", zap.Float64("predictedValue", predictedValue), zap.Any("labels", series.Labels))
			predictedValue = p.getMovingAvg(prevSeries, movingAvgWindowSize, idx)
		}

		zap.L().Debug("predictedSeries",
			zap.Float64("movingAvg", movingAvg),
			zap.Float64("avg", avg),
			zap.Float64("mean", mean),
			zap.Any("labels", series.Labels),
			zap.Float64("predictedValue", predictedValue),
			zap.Float64("curr", curr.Value),
		)
		predictedSeries.Points = append(predictedSeries.Points, v3.Point{
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
	series, predictedSeries *v3.Series,
	zScoreThreshold float64,
) (*v3.Series, *v3.Series) {
	upperBoundSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      []v3.Point{},
	}

	lowerBoundSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      []v3.Point{},
	}

	for idx, curr := range series.Points {
		upperBound := p.getMovingAvg(predictedSeries, movingAvgWindowSize, idx) + zScoreThreshold*p.getStdDev(series)
		lowerBound := p.getMovingAvg(predictedSeries, movingAvgWindowSize, idx) - zScoreThreshold*p.getStdDev(series)
		upperBoundSeries.Points = append(upperBoundSeries.Points, v3.Point{
			Timestamp: curr.Timestamp,
			Value:     upperBound,
		})
		lowerBoundSeries.Points = append(lowerBoundSeries.Points, v3.Point{
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
	_, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries *v3.Series, idx int,
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
	series, prevSeries, weekSeries, weekPrevSeries, past2SeasonSeries, past3SeasonSeries *v3.Series, value float64, idx int,
) float64 {
	expectedValue := p.getExpectedValue(series, prevSeries, weekSeries, weekPrevSeries, past2SeasonSeries, past3SeasonSeries, idx)
	return (value - expectedValue) / p.getStdDev(weekSeries)
}

// getAnomalyScores gets the anomaly scores for the given series
// for the given index
// (value - expectedValue) / std dev of the series
func (p *BaseSeasonalProvider) getAnomalyScores(
	series, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries *v3.Series,
) *v3.Series {
	anomalyScoreSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      []v3.Point{},
	}

	for idx, curr := range series.Points {
		anomalyScore := p.getScore(series, prevSeries, currentSeasonSeries, pastSeasonSeries, past2SeasonSeries, past3SeasonSeries, curr.Value, idx)
		anomalyScoreSeries.Points = append(anomalyScoreSeries.Points, v3.Point{
			Timestamp: curr.Timestamp,
			Value:     anomalyScore,
		})
	}

	return anomalyScoreSeries
}

func (p *BaseSeasonalProvider) getAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
	anomalyParams := p.getQueryParams(req)
	anomalyQueryResults, err := p.getResults(ctx, anomalyParams)
	if err != nil {
		return nil, err
	}

	currentPeriodResultsMap := make(map[string]*v3.Result)
	for _, result := range anomalyQueryResults.CurrentPeriodResults {
		currentPeriodResultsMap[result.QueryName] = result
	}

	pastPeriodResultsMap := make(map[string]*v3.Result)
	for _, result := range anomalyQueryResults.PastPeriodResults {
		pastPeriodResultsMap[result.QueryName] = result
	}

	currentSeasonResultsMap := make(map[string]*v3.Result)
	for _, result := range anomalyQueryResults.CurrentSeasonResults {
		currentSeasonResultsMap[result.QueryName] = result
	}

	pastSeasonResultsMap := make(map[string]*v3.Result)
	for _, result := range anomalyQueryResults.PastSeasonResults {
		pastSeasonResultsMap[result.QueryName] = result
	}

	past2SeasonResultsMap := make(map[string]*v3.Result)
	for _, result := range anomalyQueryResults.Past2SeasonResults {
		past2SeasonResultsMap[result.QueryName] = result
	}

	past3SeasonResultsMap := make(map[string]*v3.Result)
	for _, result := range anomalyQueryResults.Past3SeasonResults {
		past3SeasonResultsMap[result.QueryName] = result
	}

	for _, result := range currentPeriodResultsMap {
		funcs := req.Params.CompositeQuery.BuilderQueries[result.QueryName].Functions

		var zScoreThreshold float64
		for _, f := range funcs {
			if f.Name == v3.FunctionNameAnomaly {
				value, ok := f.NamedArgs["z_score_threshold"]
				if ok {
					zScoreThreshold = value.(float64)
				} else {
					zScoreThreshold = 3
				}
				break
			}
		}

		pastPeriodResult, ok := pastPeriodResultsMap[result.QueryName]
		if !ok {
			continue
		}
		currentSeasonResult, ok := currentSeasonResultsMap[result.QueryName]
		if !ok {
			continue
		}
		pastSeasonResult, ok := pastSeasonResultsMap[result.QueryName]
		if !ok {
			continue
		}
		past2SeasonResult, ok := past2SeasonResultsMap[result.QueryName]
		if !ok {
			continue
		}
		past3SeasonResult, ok := past3SeasonResultsMap[result.QueryName]
		if !ok {
			continue
		}

		for _, series := range result.Series {
			stdDev := p.getStdDev(series)
			zap.L().Info("stdDev", zap.Float64("stdDev", stdDev), zap.Any("labels", series.Labels))

			pastPeriodSeries := p.getMatchingSeries(pastPeriodResult, series)
			currentSeasonSeries := p.getMatchingSeries(currentSeasonResult, series)
			pastSeasonSeries := p.getMatchingSeries(pastSeasonResult, series)
			past2SeasonSeries := p.getMatchingSeries(past2SeasonResult, series)
			past3SeasonSeries := p.getMatchingSeries(past3SeasonResult, series)

			prevSeriesAvg := p.getAvg(pastPeriodSeries)
			currentSeasonSeriesAvg := p.getAvg(currentSeasonSeries)
			pastSeasonSeriesAvg := p.getAvg(pastSeasonSeries)
			past2SeasonSeriesAvg := p.getAvg(past2SeasonSeries)
			past3SeasonSeriesAvg := p.getAvg(past3SeasonSeries)
			zap.L().Info("getAvg", zap.Float64("prevSeriesAvg", prevSeriesAvg), zap.Float64("currentSeasonSeriesAvg", currentSeasonSeriesAvg), zap.Float64("pastSeasonSeriesAvg", pastSeasonSeriesAvg), zap.Float64("past2SeasonSeriesAvg", past2SeasonSeriesAvg), zap.Float64("past3SeasonSeriesAvg", past3SeasonSeriesAvg), zap.Any("labels", series.Labels))

			predictedSeries := p.getPredictedSeries(
				series,
				pastPeriodSeries,
				currentSeasonSeries,
				pastSeasonSeries,
				past2SeasonSeries,
				past3SeasonSeries,
			)
			result.PredictedSeries = append(result.PredictedSeries, predictedSeries)

			upperBoundSeries, lowerBoundSeries := p.getBounds(
				series,
				predictedSeries,
				zScoreThreshold,
			)
			result.UpperBoundSeries = append(result.UpperBoundSeries, upperBoundSeries)
			result.LowerBoundSeries = append(result.LowerBoundSeries, lowerBoundSeries)

			anomalyScoreSeries := p.getAnomalyScores(
				series,
				pastPeriodSeries,
				currentSeasonSeries,
				pastSeasonSeries,
				past2SeasonSeries,
				past3SeasonSeries,
			)
			result.AnomalyScores = append(result.AnomalyScores, anomalyScoreSeries)
		}
	}

	results := make([]*v3.Result, 0, len(currentPeriodResultsMap))
	for _, result := range currentPeriodResultsMap {
		results = append(results, result)
	}

	return &GetAnomaliesResponse{
		Results: results,
	}, nil
}
