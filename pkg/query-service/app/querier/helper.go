package querier

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/cache/status"
	"go.signoz.io/signoz/pkg/query-service/constants"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/zap"
)

func prepareLogsQuery(ctx context.Context,
	start,
	end int64,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	preferRPM bool,
) (string, error) {
	query := ""

	if params == nil || builderQuery == nil {
		return query, fmt.Errorf("params and builderQuery cannot be nil")
	}

	// for ts query with limit replace it as it is already formed
	if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
		limitQuery, err := logsV3.PrepareLogsQuery(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			logsV3.Options{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: preferRPM},
		)
		if err != nil {
			return query, err
		}
		placeholderQuery, err := logsV3.PrepareLogsQuery(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			logsV3.Options{GraphLimitQtype: constants.SecondQueryGraphLimit, PreferRPM: preferRPM},
		)
		if err != nil {
			return query, err
		}
		query = strings.Replace(placeholderQuery, "#LIMIT_PLACEHOLDER", limitQuery, 1)
		return query, err
	}

	query, err := logsV3.PrepareLogsQuery(
		start,
		end,
		params.CompositeQuery.QueryType,
		params.CompositeQuery.PanelType,
		builderQuery,
		logsV3.Options{PreferRPM: preferRPM},
	)
	if err != nil {
		return query, err
	}
	return query, err
}

func (q *querier) runBuilderQuery(
	ctx context.Context,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	keys map[string]v3.AttributeKey,
	cacheKeys map[string]string,
	ch chan channelResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()
	queryName := builderQuery.QueryName

	var preferRPM bool

	if q.featureLookUp != nil {
		preferRPM = q.featureLookUp.CheckFeature(constants.PreferRPM) == nil
	}

	start := params.Start
	end := params.End
	if builderQuery.ShiftBy != 0 {
		start = start - builderQuery.ShiftBy*1000
		end = end - builderQuery.ShiftBy*1000
	}

	if builderQuery.DataSource == v3.DataSourceLogs {
		var query string
		var err error
		if _, ok := cacheKeys[queryName]; !ok {
			query, err = prepareLogsQuery(ctx, start, end, builderQuery, params, preferRPM)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query)
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
			return
		}

		cacheKey := cacheKeys[queryName]
		var cachedData []byte
		if !params.NoCache && q.cache != nil {
			var retrieveStatus status.RetrieveStatus
			data, retrieveStatus, err := q.cache.Retrieve(cacheKey, true)
			zap.L().Info("cache retrieve status", zap.String("status", retrieveStatus.String()))
			if err == nil {
				cachedData = data
			}
		}
		misses := q.findMissingTimeRanges(start, end, params.Step, cachedData)
		missedSeries := make([]*v3.Series, 0)
		cachedSeries := make([]*v3.Series, 0)
		for _, miss := range misses {
			query, err = prepareLogsQuery(ctx, miss.start, miss.end, builderQuery, params, preferRPM)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query)
			if err != nil {
				ch <- channelResult{
					Err:    err,
					Name:   queryName,
					Query:  query,
					Series: nil,
				}
				return
			}
			missedSeries = append(missedSeries, series...)
		}
		if err := json.Unmarshal(cachedData, &cachedSeries); err != nil && cachedData != nil {
			zap.L().Error("error unmarshalling cached data", zap.Error(err))
		}
		mergedSeries := mergeSerieses(cachedSeries, missedSeries)

		var mergedSeriesData []byte
		var marshallingErr error
		missedSeriesLen := len(missedSeries)
		if missedSeriesLen > 0 && !params.NoCache && q.cache != nil {
			// caching the data
			mergedSeriesData, marshallingErr = json.Marshal(mergedSeries)
			if marshallingErr != nil {
				zap.L().Error("error marshalling merged series", zap.Error(marshallingErr))
			}
		}

		// response doesn't need everything
		filterCachedPoints(mergedSeries, start, end)

		ch <- channelResult{
			Err:    nil,
			Name:   queryName,
			Series: mergedSeries,
		}

		// Cache the seriesList for future queries
		if missedSeriesLen > 0 && !params.NoCache && q.cache != nil && marshallingErr == nil {
			// caching the data
			err = q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
			if err != nil {
				zap.L().Error("error storing merged series", zap.Error(err))
				return
			}
		}

		return

	}

	if builderQuery.DataSource == v3.DataSourceTraces {

		var query string
		var err error
		// for ts query with group by and limit form two queries
		if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
			limitQuery, err := tracesV3.PrepareTracesQuery(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				keys,
				tracesV3.Options{GraphLimitQtype: constants.FirstQueryGraphLimit, PreferRPM: preferRPM},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: limitQuery, Series: nil}
				return
			}
			placeholderQuery, err := tracesV3.PrepareTracesQuery(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				keys,
				tracesV3.Options{GraphLimitQtype: constants.SecondQueryGraphLimit, PreferRPM: preferRPM},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: limitQuery, Series: nil}
				return
			}
			query = fmt.Sprintf(placeholderQuery, limitQuery)
		} else {
			query, err = tracesV3.PrepareTracesQuery(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				keys,
				tracesV3.Options{PreferRPM: preferRPM},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
		}

		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	// What is happening here?
	// We are only caching the graph panel queries. A non-existant cache key means that the query is not cached.
	// If the query is not cached, we execute the query and return the result without caching it.
	if _, ok := cacheKeys[queryName]; !ok {
		query, err := metricsV3.PrepareMetricQuery(start, end, params.CompositeQuery.QueryType, params.CompositeQuery.PanelType, builderQuery, metricsV3.Options{PreferRPM: preferRPM})
		if err != nil {
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
			return
		}
		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	cacheKey := cacheKeys[queryName]
	var cachedData []byte
	if !params.NoCache && q.cache != nil {
		var retrieveStatus status.RetrieveStatus
		data, retrieveStatus, err := q.cache.Retrieve(cacheKey, true)
		zap.L().Info("cache retrieve status", zap.String("status", retrieveStatus.String()))
		if err == nil {
			cachedData = data
		}
	}
	misses := q.findMissingTimeRanges(start, end, params.Step, cachedData)
	missedSeries := make([]*v3.Series, 0)
	cachedSeries := make([]*v3.Series, 0)
	for _, miss := range misses {
		query, err := metricsV3.PrepareMetricQuery(
			miss.start,
			miss.end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			metricsV3.Options{},
		)
		if err != nil {
			ch <- channelResult{
				Err:    err,
				Name:   queryName,
				Query:  query,
				Series: nil,
			}
			return
		}
		series, err := q.execClickHouseQuery(ctx, query)
		if err != nil {
			ch <- channelResult{
				Err:    err,
				Name:   queryName,
				Query:  query,
				Series: nil,
			}
			return
		}
		missedSeries = append(missedSeries, series...)
	}
	if err := json.Unmarshal(cachedData, &cachedSeries); err != nil && cachedData != nil {
		zap.L().Error("error unmarshalling cached data", zap.Error(err))
	}
	mergedSeries := mergeSerieses(cachedSeries, missedSeries)
	var mergedSeriesData []byte
	var marshallingErr error
	missedSeriesLen := len(missedSeries)
	if missedSeriesLen > 0 && !params.NoCache && q.cache != nil {
		// caching the data
		mergedSeriesData, marshallingErr = json.Marshal(mergedSeries)
		if marshallingErr != nil {
			zap.L().Error("error marshalling merged series", zap.Error(marshallingErr))
		}
	}

	// response doesn't need everything
	filterCachedPoints(mergedSeries, start, end)
	ch <- channelResult{
		Err:    nil,
		Name:   queryName,
		Series: mergedSeries,
	}

	// Cache the seriesList for future queries
	if missedSeriesLen > 0 && !params.NoCache && q.cache != nil && marshallingErr == nil {
		err := q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
		if err != nil {
			zap.L().Error("error storing merged series", zap.Error(err))
			return
		}
	}
}

func (q *querier) runBuilderExpression(
	ctx context.Context,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	keys map[string]v3.AttributeKey,
	cacheKeys map[string]string,
	ch chan channelResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	queryName := builderQuery.QueryName

	queries, err := q.builder.PrepareQueries(params, keys)
	if err != nil {
		ch <- channelResult{Err: err, Name: queryName, Query: "", Series: nil}
		return
	}

	if _, ok := cacheKeys[queryName]; !ok {
		query := queries[queryName]
		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	cacheKey := cacheKeys[queryName]
	var cachedData []byte
	if !params.NoCache && q.cache != nil {
		var retrieveStatus status.RetrieveStatus
		data, retrieveStatus, err := q.cache.Retrieve(cacheKey, true)
		zap.L().Info("cache retrieve status", zap.String("status", retrieveStatus.String()))
		if err == nil {
			cachedData = data
		}
	}
	misses := q.findMissingTimeRanges(params.Start, params.End, params.Step, cachedData)
	missedSeries := make([]*v3.Series, 0)
	cachedSeries := make([]*v3.Series, 0)
	for _, miss := range misses {
		missQueries, _ := q.builder.PrepareQueries(&v3.QueryRangeParamsV3{
			Start:          miss.start,
			End:            miss.end,
			Step:           params.Step,
			NoCache:        params.NoCache,
			CompositeQuery: params.CompositeQuery,
			Variables:      params.Variables,
		}, keys)
		query := missQueries[queryName]
		series, err := q.execClickHouseQuery(ctx, query)
		if err != nil {
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
			return
		}
		missedSeries = append(missedSeries, series...)
	}
	if err := json.Unmarshal(cachedData, &cachedSeries); err != nil && cachedData != nil {
		zap.L().Error("error unmarshalling cached data", zap.Error(err))
	}
	mergedSeries := mergeSerieses(cachedSeries, missedSeries)

	var mergedSeriesData []byte
	missedSeriesLen := len(missedSeries)
	var marshallingErr error
	if missedSeriesLen > 0 && !params.NoCache && q.cache != nil {
		// caching the data
		mergedSeriesData, marshallingErr = json.Marshal(mergedSeries)
		if marshallingErr != nil {
			zap.L().Error("error marshalling merged series", zap.Error(marshallingErr))
		}
	}

	// response doesn't need everything
	filterCachedPoints(mergedSeries, params.Start, params.End)
	ch <- channelResult{
		Err:    nil,
		Name:   queryName,
		Series: mergedSeries,
	}

	// Cache the seriesList for future queries
	if len(missedSeries) > 0 && !params.NoCache && q.cache != nil && marshallingErr == nil {
		err = q.cache.Store(cacheKey, mergedSeriesData, time.Hour)
		if err != nil {
			zap.L().Error("error storing merged series", zap.Error(err))
			return
		}
	}
}
