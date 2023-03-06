package clickhouseReader

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	metricsv3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

type querier struct {
	cache               cache.Cache
	reader              interfaces.Reader
	metricsKeyGenerator cache.KeyGenerator

	// TODO: implement cache key generators
	tracesKeyGenerator cache.KeyGenerator
	logsKeyGenerator   cache.KeyGenerator

	fluxInterval time.Duration

	// used for testing
	// TODO(srikanthccv): remove this once we have a reader mock
	testingMode     bool
	queriesExecuted []string
	returnedSeries  []*v3.Series
	returnedErr     error
}

func NewQuerier(cache cache.Cache, reader interfaces.Reader, fluxInterval time.Duration) *querier {
	return &querier{
		cache:               cache,
		reader:              reader,
		metricsKeyGenerator: metricsv3.NewMetricsKeyGenerator(),
		fluxInterval:        fluxInterval,
	}
}

type miss struct {
	start int64 // in millis
	end   int64 // in millis
}

func (q *querier) execClickHouseQuery(ctx context.Context, query string) ([]*v3.Series, error) {
	q.queriesExecuted = append(q.queriesExecuted, query)
	if q.testingMode && q.reader == nil {
		return q.returnedSeries, q.returnedErr
	}
	return q.reader.GetMetricResultV3(ctx, query)
}

func (q *querier) execPromQuery(ctx context.Context, params *model.QueryRangeParams) ([]*v3.Series, error) {
	q.queriesExecuted = append(q.queriesExecuted, params.Query)
	if q.testingMode && q.reader == nil {
		return q.returnedSeries, q.returnedErr
	}
	promResult, _, err := q.reader.GetQueryRangeResult(ctx, params)
	if err != nil {
		return nil, err
	}
	matrix, promErr := promResult.Matrix()
	if promErr != nil {
		return nil, promErr
	}
	var seriesList []*v3.Series
	for _, v := range matrix {
		var s v3.Series
		s.Labels = v.Metric.Copy().Map()
		for idx := range v.Points {
			p := v.Points[idx]
			s.Points = append(s.Points, v3.Point{Timestamp: p.T, Value: p.V})
		}
		seriesList = append(seriesList, &s)
	}
	return seriesList, nil
}

// findMissingTimeRanges finds the missing time ranges in the seriesList
// and returns a list of miss structs, It takes the fluxInterval into
// account to find the missing time ranges.
//
// The [End - fluxInterval, End] is always added to the list of misses, because
// the data might still be in flux and not yet available in the database.
func findMissingTimeRanges(start, end int64, seriesList []*v3.Series, fluxInterval time.Duration) (misses []miss) {
	var cachedStart, cachedEnd int64
	for idx := range seriesList {
		series := seriesList[idx]
		for pointIdx := range series.Points {
			point := series.Points[pointIdx]
			if cachedStart == 0 || point.Timestamp < cachedStart {
				cachedStart = point.Timestamp
			}
			if cachedEnd == 0 || point.Timestamp > cachedEnd {
				cachedEnd = point.Timestamp
			}
		}
	}

	// Exclude the flux interval from the cached end time
	cachedEnd = int64(
		math.Min(
			float64(cachedEnd),
			float64(time.Now().UnixMilli()-fluxInterval.Milliseconds()),
		),
	)

	// There are five cases to consider
	// 1. Cached time range is a subset of the requested time range
	// 2. Cached time range is a superset of the requested time range
	// 3. Cached time range is a left overlap of the requested time range
	// 4. Cached time range is a right overlap of the requested time range
	// 5. Cached time range is a disjoint of the requested time range
	if cachedStart >= start && cachedEnd <= end {
		// Case 1: Cached time range is a subset of the requested time range
		// Add misses for the left and right sides of the cached time range
		misses = append(misses, miss{start: start, end: cachedStart - 1})
		misses = append(misses, miss{start: cachedEnd + 1, end: end})
	} else if cachedStart <= start && cachedEnd >= end {
		// Case 2: Cached time range is a superset of the requested time range
		// No misses
	} else if cachedStart <= start && cachedEnd >= start {
		// Case 3: Cached time range is a left overlap of the requested time range
		// Add a miss for the left side of the cached time range
		misses = append(misses, miss{start: cachedEnd + 1, end: end})
	} else if cachedStart <= end && cachedEnd >= end {
		// Case 4: Cached time range is a right overlap of the requested time range
		// Add a miss for the right side of the cached time range
		misses = append(misses, miss{start: start, end: cachedStart - 1})
	} else {
		// Case 5: Cached time range is a disjoint of the requested time range
		// Add a miss for the entire requested time range
		misses = append(misses, miss{start: start, end: end})
	}

	// remove the struts with start > end
	var validMisses []miss
	for idx := range misses {
		miss := misses[idx]
		if miss.start <= miss.end {
			validMisses = append(validMisses, miss)
		}
	}
	return validMisses
}

// findMissingTimeRanges finds the missing time ranges in the cached data
// and returns them as a list of misses
func (q *querier) findMissingTimeRanges(start, end, step int64, cachedData []byte) (misses []miss) {
	var cachedSeriesList []*v3.Series
	if err := json.Unmarshal(cachedData, &cachedSeriesList); err != nil {
		// In case of error, we return the entire range as a miss
		return []miss{{start: start, end: end}}
	}
	return findMissingTimeRanges(start, end, cachedSeriesList, q.fluxInterval)
}

func labelsToString(labels map[string]string) string {
	type label struct {
		Key   string
		Value string
	}
	var labelsList []label
	for k, v := range labels {
		labelsList = append(labelsList, label{Key: k, Value: v})
	}
	sort.Slice(labelsList, func(i, j int) bool {
		return labelsList[i].Key < labelsList[j].Key
	})
	labelKVs := make([]string, len(labelsList))
	for idx := range labelsList {
		labelKVs[idx] = labelsList[idx].Key + "=" + labelsList[idx].Value
	}
	return fmt.Sprintf("{%s}", strings.Join(labelKVs, ","))
}

func mergeSerieses(cachedSeries, missedSeries []*v3.Series) []*v3.Series {
	// Merge the missed series with the cached series by timestamp
	mergedSeries := make([]*v3.Series, 0)
	seriesesByLabels := make(map[string]*v3.Series)
	for idx := range cachedSeries {
		series := cachedSeries[idx]
		seriesesByLabels[labelsToString(series.Labels)] = series
	}

	for idx := range missedSeries {
		series := missedSeries[idx]
		if _, ok := seriesesByLabels[labelsToString(series.Labels)]; !ok {
			seriesesByLabels[labelsToString(series.Labels)] = series
			continue
		}
		seriesesByLabels[labelsToString(series.Labels)].Points = append(seriesesByLabels[labelsToString(series.Labels)].Points, series.Points...)
	}
	// Sort the points in each series by timestamp
	for idx := range seriesesByLabels {
		series := seriesesByLabels[idx]
		series.SortPoints()
		mergedSeries = append(mergedSeries, series)
	}
	return mergedSeries
}

func (q *querier) runBuilderQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Series, error, map[string]string) {

	seriesList := make([]*v3.Series, 0)
	errQueriesByName := make(map[string]string)
	var err error

	for queryName := range params.CompositeQuery.BuilderQueries {
		builderQuery := params.CompositeQuery.BuilderQueries[queryName]
		cacheKey := q.metricsKeyGenerator.GenerateKeys(params)[queryName]
		var cachedData []byte
		if !params.NoCache {
			var retrieveStatus status.RetrieveStatus
			cachedData, retrieveStatus, err = q.cache.Retrieve(cacheKey, true)
			zap.L().Debug("cache retrieve status", zap.String("status", retrieveStatus.String()))
			if err != nil {
				return nil, err, nil
			}
		}
		misses := q.findMissingTimeRanges(params.Start, params.End, params.Step, cachedData)
		missedSeries := make([]*v3.Series, 0)
		cachedSeries := make([]*v3.Series, 0)
		for _, miss := range misses {
			query, err := metricsv3.PrepareMetricQuery(
				params.Step,
				miss.start,
				miss.end,
				params.CompositeQuery.QueryType,
				params.CompositeQuery.PanelType,
				builderQuery,
			)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
			series, err := q.execClickHouseQuery(ctx, query)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
			missedSeries = append(missedSeries, series...)
		}
		if err := json.Unmarshal(cachedData, &cachedSeries); err != nil && cachedData != nil {
			errQueriesByName[queryName] = err.Error()
			continue
		}
		mergedSeries := mergeSerieses(cachedSeries, missedSeries)

		seriesList = append(seriesList, mergedSeries...)
		// Cache the seriesList for future queries
		if len(missedSeries) > 0 {
			mergedSeriesData, err := json.Marshal(mergedSeries)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
			err = q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
		}
	}
	if len(errQueriesByName) > 0 {
		err = fmt.Errorf("error in builder queries")
	}
	return seriesList, err, errQueriesByName
}

func (q *querier) runPromQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Series, error, map[string]string) {
	seriesList := make([]*v3.Series, 0)
	errQueriesByName := make(map[string]string)
	var err error
	for queryName := range params.CompositeQuery.PromQueries {
		promQuery := params.CompositeQuery.PromQueries[queryName]
		cacheKey := q.metricsKeyGenerator.GenerateKeys(params)[queryName]
		var cachedData []byte
		var retrieveStatus status.RetrieveStatus
		if !params.NoCache {
			cachedData, retrieveStatus, err = q.cache.Retrieve(cacheKey, true)
			zap.L().Debug("cache retrieve status", zap.String("status", retrieveStatus.String()))
		}
		if err != nil {
			errQueriesByName[queryName] = err.Error()
			continue
		}
		misses := q.findMissingTimeRanges(params.Start, params.End, params.Step, cachedData)
		missedSeries := make([]*v3.Series, 0)
		cachedSeries := make([]*v3.Series, 0)
		for _, miss := range misses {
			query := metricsv3.BuildPromQuery(
				promQuery,
				params.Step,
				miss.start,
				miss.end,
			)
			series, err := q.execPromQuery(ctx, query)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
			missedSeries = append(missedSeries, series...)
		}
		if err := json.Unmarshal(cachedData, &cachedSeries); err != nil && cachedData != nil {
			errQueriesByName[queryName] = err.Error()
			continue
		}
		mergedSeries := mergeSerieses(cachedSeries, missedSeries)

		seriesList = append(seriesList, mergedSeries...)
		// Cache the seriesList for future queries
		if len(missedSeries) > 0 {
			mergedSeriesData, err := json.Marshal(mergedSeries)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
			err = q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
			if err != nil {
				errQueriesByName[queryName] = err.Error()
				continue
			}
		}
	}
	if len(errQueriesByName) > 0 {
		err = fmt.Errorf("error in prom queries")
	}
	return seriesList, err, errQueriesByName
}

func (q *querier) runClickHouseQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Series, error, map[string]string) {
	seriesList := make([]*v3.Series, 0)
	errQueriesByName := make(map[string]string)
	var err error
	for queryName := range params.CompositeQuery.ClickHouseQueries {
		clickHouseQuery := params.CompositeQuery.ClickHouseQueries[queryName]
		series, err := q.execClickHouseQuery(ctx, clickHouseQuery.Query)
		if err != nil {
			errQueriesByName[queryName] = err.Error()
			continue
		}
		seriesList = append(seriesList, series...)
	}
	if len(errQueriesByName) > 0 {
		err = fmt.Errorf("error in clickhouse queries")
	}
	return seriesList, err, errQueriesByName
}

func (q *querier) QueryRange(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Series, error, map[string]string) {
	var seriesList []*v3.Series
	var err error
	var errQueriesByName map[string]string
	if params.CompositeQuery != nil {
		switch params.CompositeQuery.QueryType {
		case v3.QueryTypeBuilder:
			seriesList, err, errQueriesByName = q.runBuilderQueries(ctx, params)
		case v3.QueryTypePromQL:
			seriesList, err, errQueriesByName = q.runPromQueries(ctx, params)
		case v3.QueryTypeClickHouseSQL:
			seriesList, err, errQueriesByName = q.runClickHouseQueries(ctx, params)
		default:
			err = fmt.Errorf("invalid query type")
		}
	}
	return seriesList, err, errQueriesByName
}
