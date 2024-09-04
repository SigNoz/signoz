package anomaly

import (
	"context"
	"math"

	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/utils/labels"
	"go.uber.org/zap"
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
	cache        cache.Cache
	keyGenerator cache.KeyGenerator
	ff           interfaces.FeatureLookup
}

func (p *BaseSeasonalProvider) getQueryParams(req *GetAnomaliesRequest) *anomalyQueryParams {
	if !req.Seasonality.IsValid() {
		req.Seasonality = SeasonalityWeekly
	}
	return prepareAnomalyQueryParams(req.Params, req.Seasonality)
}

func (p *BaseSeasonalProvider) getResults(ctx context.Context, params *anomalyQueryParams) (*anomalyQueryResults, error) {
	currentPeriodResults, _, err := p.querierV2.QueryRange(ctx, params.CurrentPeriodQuery, nil)
	if err != nil {
		return nil, err
	}

	pastPeriodResults, _, err := p.querierV2.QueryRange(ctx, params.PastPeriodQuery, nil)
	if err != nil {
		return nil, err
	}

	currentSeasonResults, _, err := p.querierV2.QueryRange(ctx, params.CurrentSeasonQuery, nil)
	if err != nil {
		return nil, err
	}

	pastSeasonResults, _, err := p.querierV2.QueryRange(ctx, params.PastSeasonQuery, nil)
	if err != nil {
		return nil, err
	}

	return &anomalyQueryResults{
		CurrentPeriodResults: currentPeriodResults,
		PastPeriodResults:    pastPeriodResults,
		CurrentSeasonResults: currentSeasonResults,
		PastSeasonResults:    pastSeasonResults,
	}, nil
}

func (p *BaseSeasonalProvider) getMatchingSeries(queryResult *v3.Result, series *v3.Series) *v3.Series {
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
	var sum float64
	for _, smpl := range series.Points {
		sum += smpl.Value
	}
	return sum / float64(len(series.Points))
}

func (p *BaseSeasonalProvider) getStdDev(series *v3.Series) float64 {
	avg := p.getAvg(series)
	var sum float64
	for _, smpl := range series.Points {
		sum += math.Pow(smpl.Value-avg, 2)
	}
	return math.Sqrt(sum / float64(len(series.Points)))
}

func (p *BaseSeasonalProvider) getPredictedSeries(series, prevSeries, currentSeasonSeries, pastSeasonSeries *v3.Series) *v3.Series {
	predictedSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      []v3.Point{},
	}

	for _, curr := range series.Points {
		predictedValue := p.getAvg(prevSeries) + p.getAvg(currentSeasonSeries) - p.getAvg(pastSeasonSeries)
		predictedSeries.Points = append(predictedSeries.Points, v3.Point{
			Timestamp: curr.Timestamp,
			Value:     predictedValue,
		})
	}

	return predictedSeries
}

func (p *BaseSeasonalProvider) getExpectedValue(_, prevSeries, currentSeasonSeries, pastSeasonSeries *v3.Series) float64 {
	prevSeriesAvg := p.getAvg(prevSeries)
	currentSeasonSeriesAvg := p.getAvg(currentSeasonSeries)
	pastSeasonSeriesAvg := p.getAvg(pastSeasonSeries)
	zap.L().Debug("getExpectedValue",
		zap.Float64("prevSeriesAvg", prevSeriesAvg),
		zap.Float64("currentSeasonSeriesAvg", currentSeasonSeriesAvg),
		zap.Float64("pastSeasonSeriesAvg", pastSeasonSeriesAvg),
		zap.Float64("expectedValue", prevSeriesAvg+currentSeasonSeriesAvg-pastSeasonSeriesAvg),
	)
	return prevSeriesAvg + currentSeasonSeriesAvg - pastSeasonSeriesAvg
}

func (p *BaseSeasonalProvider) getScore(series, prevSeries, weekSeries, weekPrevSeries *v3.Series, value float64) float64 {
	expectedValue := p.getExpectedValue(series, prevSeries, weekSeries, weekPrevSeries)
	return (value - expectedValue) / p.getStdDev(weekSeries)
}

func (p *BaseSeasonalProvider) getAnomalyScores(series, prevSeries, currentSeasonSeries, pastSeasonSeries *v3.Series) *v3.Series {
	anomalyScoreSeries := &v3.Series{
		Labels:      series.Labels,
		LabelsArray: series.LabelsArray,
		Points:      []v3.Point{},
	}

	for _, curr := range series.Points {
		anomalyScore := p.getScore(series, prevSeries, currentSeasonSeries, pastSeasonSeries, curr.Value)
		anomalyScoreSeries.Points = append(anomalyScoreSeries.Points, v3.Point{
			Timestamp: curr.Timestamp,
			Value:     anomalyScore,
		})
	}

	return anomalyScoreSeries
}

func (p *BaseSeasonalProvider) GetAnomalies(ctx context.Context, req *GetAnomaliesRequest) (*GetAnomaliesResponse, error) {
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

	for _, result := range currentPeriodResultsMap {
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

		for _, series := range result.Series {
			pastPeriodSeries := p.getMatchingSeries(pastPeriodResult, series)
			currentSeasonSeries := p.getMatchingSeries(currentSeasonResult, series)
			pastSeasonSeries := p.getMatchingSeries(pastSeasonResult, series)

			predictedSeries := p.getPredictedSeries(series, pastPeriodSeries, currentSeasonSeries, pastSeasonSeries)
			result.PredictedSeries = append(result.PredictedSeries, predictedSeries)

			anomalyScoreSeries := p.getAnomalyScores(series, pastPeriodSeries, currentSeasonSeries, pastSeasonSeries)
			result.AnomalyScores = append(result.AnomalyScores, anomalyScoreSeries)
		}
	}

	return &GetAnomaliesResponse{
		Results: anomalyQueryResults.CurrentPeriodResults,
	}, nil
}
