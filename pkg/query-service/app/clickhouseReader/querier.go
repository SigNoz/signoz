package clickhouseReader

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"go.signoz.io/signoz/pkg/query-service/app/metrics"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
)

type querier struct {
	cache               cache.Cache
	reader              interfaces.Reader
	metricsKeyGenerator cache.KeyGenerator

	// TODO: implement cache key generators
	tracesKeyGenerator cache.KeyGenerator
	logsKeyGenerator   cache.KeyGenerator
}

func NewQuerier(cache cache.Cache, reader interfaces.Reader) *querier {
	return &querier{
		cache:               cache,
		reader:              reader,
		metricsKeyGenerator: metrics.NewMetricsKeyGenerator(),
	}
}

type miss struct {
	start int64
	end   int64
}

func (q *querier) execClickHouseQuery(ctx context.Context, query string) ([]*model.Series, error) {
	return q.reader.GetMetricResult(ctx, query)
}

func (q *querier) execPromQuery(ctx context.Context, params *model.QueryRangeParams) ([]*model.Series, error) {
	promResult, _, err := q.reader.GetQueryRangeResult(ctx, params)
	if err != nil {
		return nil, err
	}
	matrix, _ := promResult.Matrix()
	var seriesList []*model.Series
	for _, v := range matrix {
		var s model.Series
		s.Labels = v.Metric.Copy().Map()
		for _, p := range v.Points {
			s.Points = append(s.Points, model.MetricPoint{Timestamp: p.T, Value: p.V})
		}
		seriesList = append(seriesList, &s)
	}
	return seriesList, nil
}

// findMissingTimeRanges finds the missing time ranges in the cached data
// and returns them as a list of misses
func (q *querier) findMissingTimeRanges(start, end, step int64, cachedData []byte) (misses []miss) {
	var cachedSeriesList []*model.Series
	if err := json.Unmarshal(cachedData, &cachedSeriesList); err != nil {
		// In case of error, we return the entire range as a miss
		return []miss{{start: start, end: end}}
	}
	var cachedStart, cachedEnd int64
	for _, series := range cachedSeriesList {
		for _, point := range series.Points {
			if cachedStart == 0 || point.Timestamp < cachedStart {
				cachedStart = point.Timestamp
			}
			if cachedEnd == 0 || point.Timestamp > cachedEnd {
				cachedEnd = point.Timestamp
			}
		}
	}
	if cachedStart > start {
		misses = append(misses, miss{start: start, end: cachedStart})
	}
	if cachedEnd < end {
		misses = append(misses, miss{start: cachedEnd, end: end})
	}
	return misses
}

func labelsToString(labels map[string]string) string {
	var labelString string
	for k, v := range labels {
		labelString += fmt.Sprintf("%s=%s,", k, v)
	}
	return labelString
}

func mergeSerieses(cachedSeries, missedSeries []*model.Series) []*model.Series {
	// Merge the missed series with the cached series by timestamp
	// TODO: This is a naive implementation. We can improve this by using a map
	var mergedSeries []*model.Series
	var seriesesByLabels = make(map[string]*model.Series)
	for _, series := range cachedSeries {
		seriesesByLabels[labelsToString(series.Labels)] = series
	}

	for _, series := range missedSeries {
		seriesesByLabels[labelsToString(series.Labels)].Points = append(seriesesByLabels[labelsToString(series.Labels)].Points, series.Points...)
	}
	// Sort the points in each series by timestamp
	for _, series := range seriesesByLabels {
		series.SortPoints()
		mergedSeries = append(mergedSeries, series)
	}
	return mergedSeries
}

func (q *querier) runBuilderQueries(ctx context.Context, params *model.QueryRangeParamsV2) ([]*model.Series, error, map[string]string) {
	var seriesList []*model.Series
	var err error
	var errQuriesByName map[string]string
	for queryName, builderQuery := range params.CompositeMetricQuery.BuilderQueries {
		cacheKey := q.metricsKeyGenerator.GenerateKeys(params)[queryName]
		var cachedData []byte
		cachedData, _, err = q.cache.Retrieve(cacheKey, false)
		if err != nil {
			return nil, err, nil
		}
		misses := q.findMissingTimeRanges(params.Start, params.End, params.Step, cachedData)
		var missedSeries []*model.Series
		var cachedSeries []*model.Series
		for _, miss := range misses {
			query, err := metrics.BuildMetricQuery(
				builderQuery,
				params.Step,
				miss.start,
				miss.end,
				constants.SIGNOZ_TIMESERIES_TABLENAME,
			)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
			series, err := q.execClickHouseQuery(ctx, query)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
			missedSeries = append(missedSeries, series...)
		}
		if err := json.Unmarshal(cachedData, &cachedSeries); err != nil {
			errQuriesByName[queryName] = err.Error()
		}
		seriesList = append(seriesList, mergeSerieses(cachedSeries, missedSeries)...)
		// Cache the seriesList for future queries
		if len(missedSeries) > 0 {
			mergedSeries := mergeSerieses(cachedSeries, missedSeries)
			mergedSeriesData, err := json.Marshal(mergedSeries)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
			err = q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
		}

	}
	return seriesList, err, errQuriesByName
}

func (q *querier) runPromQueries(ctx context.Context, params *model.QueryRangeParamsV2) ([]*model.Series, error, map[string]string) {
	var seriesList []*model.Series
	var err error
	var errQuriesByName map[string]string
	for queryName, promQuery := range params.CompositeMetricQuery.PromQueries {
		cacheKey := q.metricsKeyGenerator.GenerateKeys(params)[queryName]
		var cachedData []byte
		cachedData, _, err = q.cache.Retrieve(cacheKey, false)
		if err != nil {
			errQuriesByName[queryName] = err.Error()
			continue
		}
		misses := q.findMissingTimeRanges(params.Start, params.End, params.Step, cachedData)
		var missedSeries []*model.Series
		var cachedSeries []*model.Series
		for _, miss := range misses {
			query := metrics.BuildPromQuery(
				promQuery,
				params.Step,
				miss.start,
				miss.end,
			)
			series, err := q.execPromQuery(ctx, query)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
			missedSeries = append(missedSeries, series...)
		}
		if err := json.Unmarshal(cachedData, &cachedSeries); err != nil {
			errQuriesByName[queryName] = err.Error()
		}
		seriesList = append(seriesList, mergeSerieses(cachedSeries, missedSeries)...)
		// Cache the seriesList for future queries
		if len(missedSeries) > 0 {
			mergedSeries := mergeSerieses(cachedSeries, missedSeries)
			mergedSeriesData, err := json.Marshal(mergedSeries)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
			err = q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
			if err != nil {
				errQuriesByName[queryName] = err.Error()
				continue
			}
		}
	}
	return seriesList, err, errQuriesByName
}

func (q *querier) runClickHouseQueries(ctx context.Context, params *model.QueryRangeParamsV2) ([]*model.Series, error, map[string]string) {
	var seriesList []*model.Series
	var err error
	var errQuriesByName map[string]string
	for queryName, clickHouseQuery := range params.CompositeMetricQuery.ClickHouseQueries {
		series, err := q.execClickHouseQuery(ctx, clickHouseQuery.Query)
		if err != nil {
			errQuriesByName[queryName] = err.Error()
			continue
		}
		seriesList = append(seriesList, series...)
	}
	return seriesList, err, errQuriesByName
}

func (q *querier) QueryRange(ctx context.Context, params *model.QueryRangeParamsV2) ([]*model.Series, error, map[string]string) {
	var seriesList []*model.Series
	var err error
	var errQuriesByName map[string]string
	if params.CompositeMetricQuery != nil {
		switch params.CompositeMetricQuery.QueryType {
		case model.QUERY_BUILDER:
			seriesList, err, errQuriesByName = q.runBuilderQueries(ctx, params)
		case model.PROM:
			seriesList, err, errQuriesByName = q.runPromQueries(ctx, params)
		case model.CLICKHOUSE:
			seriesList, err, errQuriesByName = q.runClickHouseQueries(ctx, params)
		default:
			err = fmt.Errorf("invalid query type")
		}
	}
	return seriesList, err, errQuriesByName
}
