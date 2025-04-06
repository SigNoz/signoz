package querier

import (
	"context"
	"fmt"
	"strings"
	"sync"

	logsV3 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v3"
	logsV4 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v4"
	metricsV3 "github.com/SigNoz/signoz/pkg/query-service/app/metrics/v3"
	tracesV3 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v3"
	tracesV4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/postprocess"
	"github.com/SigNoz/signoz/pkg/query-service/querycache"
	"go.uber.org/zap"
)

func prepareLogsQuery(_ context.Context,
	useLogsNewSchema bool,
	start,
	end int64,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
) (string, []any, error) {
	query := ""

	logsQueryBuilder := logsV3.PrepareLogsQuery
	if useLogsNewSchema {
		logsQueryBuilder = logsV4.PrepareLogsQuery
	}

	if params == nil || builderQuery == nil {
		return query, nil, fmt.Errorf("params and builderQuery cannot be nil")
	}

	// for ts query with limit replace it as it is already formed
	if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
		limitQuery, args, err := logsQueryBuilder(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit},
		)
		if err != nil {
			return query, args, err
		}
		placeholderQuery, args, err := logsQueryBuilder(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit},
		)
		if err != nil {
			return query, args, err
		}
		query = strings.Replace(placeholderQuery, "#LIMIT_PLACEHOLDER", limitQuery, 1)
		return query, args, err
	}

	query, args, err := logsQueryBuilder(
		start,
		end,
		params.CompositeQuery.QueryType,
		params.CompositeQuery.PanelType,
		builderQuery,
		v3.QBOptions{},
	)
	if err != nil {
		return query, args, err
	}
	return query, args, err
}

func (q *querier) runBuilderQuery(
	ctx context.Context,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	cacheKeys map[string]string,
	ch chan channelResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()
	var args []any
	queryName := builderQuery.QueryName

	start := params.Start
	end := params.End
	if builderQuery.ShiftBy != 0 {
		start = start - builderQuery.ShiftBy*1000
		end = end - builderQuery.ShiftBy*1000
	}

	if builderQuery.DataSource == v3.DataSourceLogs {
		var query string
		var err error
		if _, ok := cacheKeys[queryName]; !ok || params.NoCache {
			zap.L().Info("skipping cache for logs query", zap.String("queryName", queryName), zap.Int64("start", start), zap.Int64("end", end), zap.Int64("step", builderQuery.StepInterval), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
			query, args, err = prepareLogsQuery(ctx, q.UseLogsNewSchema, start, end, builderQuery, params)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query, args...)
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
			return
		}

		misses := q.queryCache.FindMissingTimeRanges(start, end, builderQuery.StepInterval, cacheKeys[queryName])
		zap.L().Info("cache misses for logs query", zap.Any("misses", misses))
		missedSeries := make([]querycache.CachedSeriesData, 0)
		filteredMissedSeries := make([]querycache.CachedSeriesData, 0)
		for _, miss := range misses {
			query, args, err = prepareLogsQuery(ctx, q.UseLogsNewSchema, miss.Start, miss.End, builderQuery, params)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query, args...)
			if err != nil {
				ch <- channelResult{
					Err:    err,
					Name:   queryName,
					Query:  query,
					Series: nil,
				}
				return
			}
			filteredSeries, startTime, endTime := common.FilterSeriesPoints(series, miss.Start, miss.End, builderQuery.StepInterval)

			// making sure that empty range doesn't doesn't enter the cache
			// empty results from filteredSeries means data was filtered out, but empty series means actual empty data
			if len(filteredSeries) > 0 || len(series) == 0 {
				filteredMissedSeries = append(filteredMissedSeries, querycache.CachedSeriesData{
					Data:  filteredSeries,
					Start: startTime,
					End:   endTime,
				})
			}

			// for the actual response
			missedSeries = append(missedSeries, querycache.CachedSeriesData{
				Data:  series,
				Start: miss.Start,
				End:   miss.End,
			})
		}

		filteredMergedSeries := q.queryCache.MergeWithCachedSeriesDataV2(cacheKeys[queryName], filteredMissedSeries)
		q.queryCache.StoreSeriesInCache(cacheKeys[queryName], filteredMergedSeries)

		mergedSeries := q.queryCache.MergeWithCachedSeriesDataV2(cacheKeys[queryName], missedSeries)

		resultSeries := common.GetSeriesFromCachedDataV2(mergedSeries, start, end, builderQuery.StepInterval)

		ch <- channelResult{
			Err:    nil,
			Name:   queryName,
			Series: resultSeries,
		}

		return
	}

	if builderQuery.DataSource == v3.DataSourceTraces {

		tracesQueryBuilder := tracesV3.PrepareTracesQuery
		if q.UseTraceNewSchema {
			tracesQueryBuilder = tracesV4.PrepareTracesQuery
		}

		var query string
		var err error
		// for ts query with group by and limit form two queries
		if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
			limitQuery, _, err := tracesQueryBuilder(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: limitQuery, Series: nil}
				return
			}
			placeholderQuery, _, err := tracesQueryBuilder(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: limitQuery, Series: nil}
				return
			}
			query = strings.Replace(placeholderQuery, "#LIMIT_PLACEHOLDER", limitQuery, 1)
		} else {
			query, args, err = tracesQueryBuilder(
				start,
				end,
				params.CompositeQuery.PanelType,
				builderQuery,
				v3.QBOptions{},
			)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
		}

		series, err := q.execClickHouseQuery(ctx, query, args...)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	if builderQuery.DataSource == v3.DataSourceMetrics && !q.testingMode {
		metadata, apiError := q.reader.GetUpdatedMetricsMetadata(ctx, builderQuery.AggregateAttribute.Key)
		if apiError != nil {
			zap.L().Error("Error in getting metrics cached metadata", zap.Error(apiError))
		}
		if updatedMetadata, exist := metadata[builderQuery.AggregateAttribute.Key]; exist {
			builderQuery.AggregateAttribute.Type = v3.AttributeKeyType(updatedMetadata.MetricType)
			builderQuery.Temporality = updatedMetadata.Temporality
		}
	}

	// What is happening here?
	// We are only caching the graph panel queries. A non-existant cache key means that the query is not cached.
	// If the query is not cached, we execute the query and return the result without caching it.
	if _, ok := cacheKeys[queryName]; !ok || params.NoCache {
		zap.L().Info("skipping cache for metrics query", zap.String("queryName", queryName), zap.Int64("start", start), zap.Int64("end", end), zap.Int64("step", builderQuery.StepInterval), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
		query, args, err := metricsV3.PrepareMetricQuery(start, end, params.CompositeQuery.QueryType, params.CompositeQuery.PanelType, builderQuery, metricsV3.Options{})
		if err != nil {
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
			return
		}
		series, err := q.execClickHouseQuery(ctx, query, args...)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	cacheKey := cacheKeys[queryName]
	misses := q.queryCache.FindMissingTimeRanges(start, end, builderQuery.StepInterval, cacheKey)
	zap.L().Info("cache misses for metrics query", zap.Any("misses", misses))
	missedSeries := make([]querycache.CachedSeriesData, 0)
	for _, miss := range misses {
		query, args, err := metricsV3.PrepareMetricQuery(
			miss.Start,
			miss.End,
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
		series, err := q.execClickHouseQuery(ctx, query, args...)
		if err != nil {
			ch <- channelResult{
				Err:    err,
				Name:   queryName,
				Query:  query,
				Series: nil,
			}
			return
		}
		missedSeries = append(missedSeries, querycache.CachedSeriesData{
			Start: miss.Start,
			End:   miss.End,
			Data:  series,
		})
	}
	mergedSeries := q.queryCache.MergeWithCachedSeriesData(cacheKey, missedSeries)

	resultSeries := common.GetSeriesFromCachedData(mergedSeries, start, end)

	ch <- channelResult{
		Err:    nil,
		Name:   queryName,
		Series: resultSeries,
	}
}

func (q *querier) runBuilderExpression(
	ctx context.Context,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	cacheKeys map[string]string,
	ch chan channelResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()

	queryName := builderQuery.QueryName

	queries, args, err := q.builder.PrepareQueries(params)
	if err != nil {
		ch <- channelResult{Err: err, Name: queryName, Query: "", Series: nil}
		return
	}

	if _, ok := cacheKeys[queryName]; !ok || params.NoCache {
		zap.L().Info("skipping cache for expression query", zap.String("queryName", queryName), zap.Int64("start", params.Start), zap.Int64("end", params.End), zap.Int64("step", params.Step), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
		query := queries[queryName]
		series, err := q.execClickHouseQuery(ctx, query, args[queryName]...)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	cacheKey := cacheKeys[queryName]
	step := postprocess.StepIntervalForFunction(params, queryName)
	misses := q.queryCache.FindMissingTimeRanges(params.Start, params.End, step, cacheKey)
	zap.L().Info("cache misses for expression query", zap.Any("misses", misses))
	missedSeries := make([]querycache.CachedSeriesData, 0)
	for _, miss := range misses {
		missQueries, args, err := q.builder.PrepareQueries(&v3.QueryRangeParamsV3{
			Start:          miss.Start,
			End:            miss.End,
			Step:           params.Step,
			NoCache:        params.NoCache,
			CompositeQuery: params.CompositeQuery,
			Variables:      params.Variables,
		})
		query := missQueries[queryName]
		series, err := q.execClickHouseQuery(ctx, query, args[queryName]...)
		if err != nil {
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
			return
		}
		missedSeries = append(missedSeries, querycache.CachedSeriesData{
			Start: miss.Start,
			End:   miss.End,
			Data:  series,
		})
	}
	mergedSeries := q.queryCache.MergeWithCachedSeriesData(cacheKey, missedSeries)

	resultSeries := common.GetSeriesFromCachedData(mergedSeries, params.Start, params.End)

	ch <- channelResult{
		Err:    nil,
		Name:   queryName,
		Series: resultSeries,
	}
}
