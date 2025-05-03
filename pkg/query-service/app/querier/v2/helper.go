package v2

import (
	"context"
	"fmt"
	"strings"
	"sync"

	logsV4 "github.com/SigNoz/signoz/pkg/query-service/app/logs/v4"
	metricsV3 "github.com/SigNoz/signoz/pkg/query-service/app/metrics/v3"
	metricsV4 "github.com/SigNoz/signoz/pkg/query-service/app/metrics/v4"
	tracesV4 "github.com/SigNoz/signoz/pkg/query-service/app/traces/v4"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/querycache"
	"github.com/SigNoz/signoz/pkg/valuer"
	"go.uber.org/zap"
)

func prepareLogsQuery(
	_ context.Context,
	start,
	end int64,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
) (string, error) {
	logsQueryBuilder := logsV4.PrepareLogsQuery
	query := ""

	if params == nil || builderQuery == nil {
		return query, fmt.Errorf("params and builderQuery cannot be nil")
	}

	// for ts query with limit replace it as it is already formed
	if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
		limitQuery, err := logsQueryBuilder(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			v3.QBOptions{GraphLimitQtype: constants.FirstQueryGraphLimit},
		)
		if err != nil {
			return query, err
		}
		placeholderQuery, err := logsQueryBuilder(
			start,
			end,
			params.CompositeQuery.QueryType,
			params.CompositeQuery.PanelType,
			builderQuery,
			v3.QBOptions{GraphLimitQtype: constants.SecondQueryGraphLimit},
		)
		if err != nil {
			return query, err
		}
		query = strings.Replace(placeholderQuery, "#LIMIT_PLACEHOLDER", limitQuery, 1)
		return query, err
	}

	query, err := logsQueryBuilder(
		start,
		end,
		params.CompositeQuery.QueryType,
		params.CompositeQuery.PanelType,
		builderQuery,
		v3.QBOptions{},
	)
	if err != nil {
		return query, err
	}
	return query, err
}

func (q *querier) runBuilderQuery(
	ctx context.Context,
	orgID valuer.UUID,
	builderQuery *v3.BuilderQuery,
	params *v3.QueryRangeParamsV3,
	cacheKeys map[string]string,
	ch chan channelResult,
	wg *sync.WaitGroup,
) {
	defer wg.Done()
	queryName := builderQuery.QueryName
	// making a local clone since we should not update the global params if there is sift by
	start := params.Start
	end := params.End
	if builderQuery.ShiftBy != 0 {
		start = start - builderQuery.ShiftBy*1000
		end = end - builderQuery.ShiftBy*1000
	}

	// TODO: handle other data sources
	if builderQuery.DataSource == v3.DataSourceLogs {
		var query string
		var err error
		if _, ok := cacheKeys[queryName]; !ok || params.NoCache {
			zap.L().Info("skipping cache for logs query", zap.String("queryName", queryName), zap.Int64("start", params.Start), zap.Int64("end", params.End), zap.Int64("step", params.Step), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
			query, err = prepareLogsQuery(ctx, start, end, builderQuery, params)
			if err != nil {
				ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
				return
			}
			series, err := q.execClickHouseQuery(ctx, query)
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
			return
		}
		misses := q.queryCache.FindMissingTimeRangesV2(orgID, start, end, builderQuery.StepInterval, cacheKeys[queryName])
		zap.L().Info("cache misses for logs query", zap.Any("misses", misses))
		missedSeries := make([]querycache.CachedSeriesData, 0)
		filteredMissedSeries := make([]querycache.CachedSeriesData, 0)
		for _, miss := range misses {
			query, err = prepareLogsQuery(ctx, miss.Start, miss.End, builderQuery, params)
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

		filteredMergedSeries := q.queryCache.MergeWithCachedSeriesDataV2(orgID, cacheKeys[queryName], filteredMissedSeries)
		q.queryCache.StoreSeriesInCache(orgID, cacheKeys[queryName], filteredMergedSeries)

		mergedSeries := q.queryCache.MergeWithCachedSeriesDataV2(orgID, cacheKeys[queryName], missedSeries)

		resultSeries := common.GetSeriesFromCachedDataV2(mergedSeries, start, end, builderQuery.StepInterval)

		ch <- channelResult{
			Err:    nil,
			Name:   queryName,
			Series: resultSeries,
		}

		return
	}

	if builderQuery.DataSource == v3.DataSourceTraces {
		tracesQueryBuilder := tracesV4.PrepareTracesQuery

		var query string
		var err error
		// for ts query with group by and limit form two queries
		if params.CompositeQuery.PanelType == v3.PanelTypeGraph && builderQuery.Limit > 0 && len(builderQuery.GroupBy) > 0 {
			limitQuery, err := tracesQueryBuilder(
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
			placeholderQuery, err := tracesQueryBuilder(
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
			query, err = tracesQueryBuilder(
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

		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	if builderQuery.DataSource == v3.DataSourceMetrics && !q.testingMode {
		metadata, apiError := q.reader.GetUpdatedMetricsMetadata(ctx, orgID, builderQuery.AggregateAttribute.Key)
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
		zap.L().Info("skipping cache for metrics query", zap.String("queryName", queryName), zap.Int64("start", params.Start), zap.Int64("end", params.End), zap.Int64("step", params.Step), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
		query, err := metricsV4.PrepareMetricQuery(start, end, params.CompositeQuery.QueryType, params.CompositeQuery.PanelType, builderQuery, metricsV3.Options{})
		if err != nil {
			ch <- channelResult{Err: err, Name: queryName, Query: query, Series: nil}
			return
		}
		series, err := q.execClickHouseQuery(ctx, query)
		ch <- channelResult{Err: err, Name: queryName, Query: query, Series: series}
		return
	}

	misses := q.queryCache.FindMissingTimeRanges(orgID, start, end, builderQuery.StepInterval, cacheKeys[queryName])
	zap.L().Info("cache misses for metrics query", zap.Any("misses", misses))
	missedSeries := make([]querycache.CachedSeriesData, 0)
	for _, miss := range misses {
		query, err := metricsV4.PrepareMetricQuery(
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
		missedSeries = append(missedSeries, querycache.CachedSeriesData{
			Data:  series,
			Start: miss.Start,
			End:   miss.End,
		})
	}
	mergedSeries := q.queryCache.MergeWithCachedSeriesData(orgID, cacheKeys[queryName], missedSeries)

	resultSeries := common.GetSeriesFromCachedData(mergedSeries, start, end)

	ch <- channelResult{
		Err:    nil,
		Name:   queryName,
		Series: resultSeries,
	}
}
