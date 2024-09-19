package querier

import (
	"context"
	"fmt"
	"sync"
	"time"

	logsV3 "go.signoz.io/signoz/pkg/query-service/app/logs/v3"
	logsV4 "go.signoz.io/signoz/pkg/query-service/app/logs/v4"
	metricsV3 "go.signoz.io/signoz/pkg/query-service/app/metrics/v3"
	"go.signoz.io/signoz/pkg/query-service/app/queryBuilder"
	tracesV3 "go.signoz.io/signoz/pkg/query-service/app/traces/v3"
	"go.signoz.io/signoz/pkg/query-service/common"
	chErrors "go.signoz.io/signoz/pkg/query-service/errors"
	"go.signoz.io/signoz/pkg/query-service/querycache"
	"go.signoz.io/signoz/pkg/query-service/utils"

	"go.signoz.io/signoz/pkg/query-service/cache"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.uber.org/multierr"
	"go.uber.org/zap"
)

type channelResult struct {
	Series []*v3.Series
	List   []*v3.Row
	Err    error
	Name   string
	Query  string
}

type querier struct {
	cache        cache.Cache
	reader       interfaces.Reader
	keyGenerator cache.KeyGenerator
	queryCache   interfaces.QueryCache

	fluxInterval time.Duration

	builder       *queryBuilder.QueryBuilder
	featureLookUp interfaces.FeatureLookup

	// used for testing
	// TODO(srikanthccv): remove this once we have a proper mock
	testingMode     bool
	queriesExecuted []string
	// tuple of start and end time in milliseconds
	timeRanges     [][]int
	returnedSeries []*v3.Series
	returnedErr    error

	UseLogsNewSchema bool
}

type QuerierOptions struct {
	Reader        interfaces.Reader
	Cache         cache.Cache
	KeyGenerator  cache.KeyGenerator
	FluxInterval  time.Duration
	FeatureLookup interfaces.FeatureLookup

	// used for testing
	TestingMode      bool
	ReturnedSeries   []*v3.Series
	ReturnedErr      error
	UseLogsNewSchema bool
}

func NewQuerier(opts QuerierOptions) interfaces.Querier {
	logsQueryBuilder := logsV3.PrepareLogsQuery
	if opts.UseLogsNewSchema {
		logsQueryBuilder = logsV4.PrepareLogsQuery
	}

	qc := querycache.NewQueryCache(querycache.WithCache(opts.Cache), querycache.WithFluxInterval(opts.FluxInterval))

	return &querier{
		cache:        opts.Cache,
		queryCache:   qc,
		reader:       opts.Reader,
		keyGenerator: opts.KeyGenerator,
		fluxInterval: opts.FluxInterval,

		builder: queryBuilder.NewQueryBuilder(queryBuilder.QueryBuilderOptions{
			BuildTraceQuery:  tracesV3.PrepareTracesQuery,
			BuildLogQuery:    logsQueryBuilder,
			BuildMetricQuery: metricsV3.PrepareMetricQuery,
		}, opts.FeatureLookup),
		featureLookUp: opts.FeatureLookup,

		testingMode:      opts.TestingMode,
		returnedSeries:   opts.ReturnedSeries,
		returnedErr:      opts.ReturnedErr,
		UseLogsNewSchema: opts.UseLogsNewSchema,
	}
}

func (q *querier) execClickHouseQuery(ctx context.Context, query string) ([]*v3.Series, error) {
	q.queriesExecuted = append(q.queriesExecuted, query)
	if q.testingMode && q.reader == nil {
		return q.returnedSeries, q.returnedErr
	}
	result, err := q.reader.GetTimeSeriesResultV3(ctx, query)
	var pointsWithNegativeTimestamps int
	// Filter out the points with negative or zero timestamps
	for idx := range result {
		series := result[idx]
		points := make([]v3.Point, 0)
		for pointIdx := range series.Points {
			point := series.Points[pointIdx]
			if point.Timestamp >= 0 {
				points = append(points, point)
			} else {
				pointsWithNegativeTimestamps++
			}
		}
		series.Points = points
	}
	if pointsWithNegativeTimestamps > 0 {
		zap.L().Error("found points with negative timestamps for query", zap.String("query", query))
	}
	return result, err
}

func (q *querier) execPromQuery(ctx context.Context, params *model.QueryRangeParams) ([]*v3.Series, error) {
	q.queriesExecuted = append(q.queriesExecuted, params.Query)
	if q.testingMode && q.reader == nil {
		q.timeRanges = append(q.timeRanges, []int{int(params.Start.UnixMilli()), int(params.End.UnixMilli())})
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
		for idx := range v.Floats {
			p := v.Floats[idx]
			s.Points = append(s.Points, v3.Point{Timestamp: p.T, Value: p.F})
		}
		seriesList = append(seriesList, &s)
	}
	return seriesList, nil
}

func (q *querier) runBuilderQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Result, map[string]error, error) {

	cacheKeys := q.keyGenerator.GenerateKeys(params)

	ch := make(chan channelResult, len(params.CompositeQuery.BuilderQueries))
	var wg sync.WaitGroup

	for queryName, builderQuery := range params.CompositeQuery.BuilderQueries {
		if builderQuery.Disabled {
			continue
		}
		wg.Add(1)
		if queryName == builderQuery.Expression {
			go q.runBuilderQuery(ctx, builderQuery, params, cacheKeys, ch, &wg)
		} else {
			go q.runBuilderExpression(ctx, builderQuery, params, cacheKeys, ch, &wg)
		}
	}

	wg.Wait()
	close(ch)

	results := make([]*v3.Result, 0)
	errQueriesByName := make(map[string]error)
	var errs []error

	for result := range ch {
		if result.Err != nil {
			errs = append(errs, result.Err)
			errQueriesByName[result.Name] = result.Err
			continue
		}
		results = append(results, &v3.Result{
			QueryName: result.Name,
			Series:    result.Series,
		})
	}

	var err error
	if len(errs) > 0 {
		err = fmt.Errorf("error in builder queries")
	}

	return results, errQueriesByName, err
}

func (q *querier) runPromQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Result, map[string]error, error) {
	channelResults := make(chan channelResult, len(params.CompositeQuery.PromQueries))
	var wg sync.WaitGroup
	cacheKeys := q.keyGenerator.GenerateKeys(params)

	for queryName, promQuery := range params.CompositeQuery.PromQueries {
		if promQuery.Disabled {
			continue
		}
		wg.Add(1)
		go func(queryName string, promQuery *v3.PromQuery) {
			defer wg.Done()
			cacheKey, ok := cacheKeys[queryName]

			if !ok || params.NoCache {
				zap.L().Info("skipping cache for metrics prom query", zap.String("queryName", queryName), zap.Int64("start", params.Start), zap.Int64("end", params.End), zap.Int64("step", params.Step), zap.Bool("noCache", params.NoCache), zap.String("cacheKey", cacheKeys[queryName]))
				query := metricsV3.BuildPromQuery(promQuery, params.Step, params.Start, params.End)
				series, err := q.execPromQuery(ctx, query)
				channelResults <- channelResult{Err: err, Name: queryName, Query: query.Query, Series: series}
				return
			}
			misses := q.queryCache.FindMissingTimeRanges(params.Start, params.End, params.Step, cacheKey)
			zap.L().Info("cache misses for metrics prom query", zap.Any("misses", misses))
			missedSeries := make([]querycache.CachedSeriesData, 0)
			for _, miss := range misses {
				query := metricsV3.BuildPromQuery(promQuery, params.Step, miss.Start, miss.End)
				series, err := q.execPromQuery(ctx, query)
				if err != nil {
					channelResults <- channelResult{Err: err, Name: queryName, Query: query.Query, Series: nil}
					return
				}
				missedSeries = append(missedSeries, querycache.CachedSeriesData{
					Data:  series,
					Start: miss.Start,
					End:   miss.End,
				})
			}
			mergedSeries := q.queryCache.MergeWithCachedSeriesData(cacheKey, missedSeries)
			resultSeries := common.GetSeriesFromCachedData(mergedSeries, params.Start, params.End)
			channelResults <- channelResult{Err: nil, Name: queryName, Query: promQuery.Query, Series: resultSeries}

		}(queryName, promQuery)
	}
	wg.Wait()
	close(channelResults)

	results := make([]*v3.Result, 0)
	errQueriesByName := make(map[string]error)
	var errs []error

	for result := range channelResults {
		if result.Err != nil {
			errs = append(errs, result.Err)
			errQueriesByName[result.Name] = result.Err
			continue
		}
		results = append(results, &v3.Result{
			QueryName: result.Name,
			Series:    result.Series,
		})
	}

	var err error
	if len(errs) > 0 {
		err = fmt.Errorf("error in prom queries")
	}

	return results, errQueriesByName, err
}

func (q *querier) runClickHouseQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Result, map[string]error, error) {
	channelResults := make(chan channelResult, len(params.CompositeQuery.ClickHouseQueries))
	var wg sync.WaitGroup
	for queryName, clickHouseQuery := range params.CompositeQuery.ClickHouseQueries {
		if clickHouseQuery.Disabled {
			continue
		}
		wg.Add(1)
		go func(queryName string, clickHouseQuery *v3.ClickHouseQuery) {
			defer wg.Done()
			series, err := q.execClickHouseQuery(ctx, clickHouseQuery.Query)
			channelResults <- channelResult{Err: err, Name: queryName, Query: clickHouseQuery.Query, Series: series}
		}(queryName, clickHouseQuery)
	}
	wg.Wait()
	close(channelResults)

	results := make([]*v3.Result, 0)
	errQueriesByName := make(map[string]error)
	var errs []error

	for result := range channelResults {
		if result.Err != nil {
			errs = append(errs, result.Err)
			errQueriesByName[result.Name] = result.Err
			continue
		}
		results = append(results, &v3.Result{
			QueryName: result.Name,
			Series:    result.Series,
		})
	}

	var err error
	if len(errs) > 0 {
		err = fmt.Errorf("error in clickhouse queries")
	}
	return results, errQueriesByName, err
}

func (q *querier) runLogsListQuery(ctx context.Context, params *v3.QueryRangeParamsV3, tsRanges []utils.LogsListTsRange) ([]*v3.Result, map[string]error, error) {
	res := make([]*v3.Result, 0)
	qName := ""
	pageSize := uint64(0)

	// se we are considering only one query
	for name, v := range params.CompositeQuery.BuilderQueries {
		qName = name
		pageSize = v.PageSize
	}
	data := []*v3.Row{}

	for _, v := range tsRanges {
		params.Start = v.Start
		params.End = v.End

		params.CompositeQuery.BuilderQueries[qName].PageSize = pageSize - uint64(len(data))
		queries, err := q.builder.PrepareQueries(params)
		if err != nil {
			return nil, nil, err
		}

		// this will to run only once
		for name, query := range queries {
			rowList, err := q.reader.GetListResultV3(ctx, query)
			if err != nil {
				errs := []error{err}
				errQuriesByName := map[string]error{
					name: err,
				}
				return nil, errQuriesByName, fmt.Errorf("encountered multiple errors: %s", multierr.Combine(errs...))
			}
			data = append(data, rowList...)
		}

		// append a filter to the params
		if len(data) > 0 {
			params.CompositeQuery.BuilderQueries[qName].Filters.Items = append(params.CompositeQuery.BuilderQueries[qName].Filters.Items, v3.FilterItem{
				Key: v3.AttributeKey{
					Key:      "id",
					IsColumn: true,
					DataType: "string",
				},
				Operator: v3.FilterOperatorLessThan,
				Value:    data[len(data)-1].Data["id"],
			})
		}

		if uint64(len(data)) >= pageSize {
			break
		}
	}
	res = append(res, &v3.Result{
		QueryName: qName,
		List:      data,
	})
	return res, nil, nil
}

func (q *querier) runBuilderListQueries(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Result, map[string]error, error) {
	// List query has support for only one query.
	if q.UseLogsNewSchema && params.CompositeQuery != nil && len(params.CompositeQuery.BuilderQueries) == 1 {
		for _, v := range params.CompositeQuery.BuilderQueries {
			// only allow of logs queries with timestamp ordering desc
			if v.DataSource == v3.DataSourceLogs && len(v.OrderBy) == 1 && v.OrderBy[0].ColumnName == "timestamp" && v.OrderBy[0].Order == "desc" {
				startEndArr := utils.GetLogsListTsRanges(params.Start, params.End)
				if len(startEndArr) > 0 {
					return q.runLogsListQuery(ctx, params, startEndArr)
				}
			}
		}
	}

	queries, err := q.builder.PrepareQueries(params)

	if err != nil {
		return nil, nil, err
	}

	ch := make(chan channelResult, len(queries))
	var wg sync.WaitGroup

	for name, query := range queries {
		wg.Add(1)
		go func(name, query string) {
			defer wg.Done()
			rowList, err := q.reader.GetListResultV3(ctx, query)

			if err != nil {
				ch <- channelResult{Err: err, Name: name, Query: query}
				return
			}
			ch <- channelResult{List: rowList, Name: name, Query: query}
		}(name, query)
	}

	wg.Wait()
	close(ch)

	var errs []error
	errQuriesByName := make(map[string]error)
	res := make([]*v3.Result, 0)
	// read values from the channel
	for r := range ch {
		if r.Err != nil {
			errs = append(errs, r.Err)
			errQuriesByName[r.Name] = r.Err
			continue
		}
		res = append(res, &v3.Result{
			QueryName: r.Name,
			List:      r.List,
		})
	}
	if len(errs) != 0 {
		return nil, errQuriesByName, fmt.Errorf("encountered multiple errors: %s", multierr.Combine(errs...))
	}
	return res, nil, nil
}

func (q *querier) QueryRange(ctx context.Context, params *v3.QueryRangeParamsV3) ([]*v3.Result, map[string]error, error) {
	var results []*v3.Result
	var err error
	var errQueriesByName map[string]error
	if params.CompositeQuery != nil {
		switch params.CompositeQuery.QueryType {
		case v3.QueryTypeBuilder:
			if params.CompositeQuery.PanelType == v3.PanelTypeList || params.CompositeQuery.PanelType == v3.PanelTypeTrace {
				results, errQueriesByName, err = q.runBuilderListQueries(ctx, params)
			} else {
				results, errQueriesByName, err = q.runBuilderQueries(ctx, params)
			}
			// in builder query, the only errors we expose are the ones that exceed the resource limits
			// everything else is internal error as they are not actionable by the user
			for name, err := range errQueriesByName {
				if !chErrors.IsResourceLimitError(err) {
					delete(errQueriesByName, name)
				}
			}
		case v3.QueryTypePromQL:
			results, errQueriesByName, err = q.runPromQueries(ctx, params)
		case v3.QueryTypeClickHouseSQL:
			results, errQueriesByName, err = q.runClickHouseQueries(ctx, params)
		default:
			err = fmt.Errorf("invalid query type")
		}
	}

	// return error if the number of series is more than one for value type panel
	if params.CompositeQuery.PanelType == v3.PanelTypeValue {
		if len(results) > 1 && params.CompositeQuery.EnabledQueries() > 1 {
			err = fmt.Errorf("there can be only one active query for value type panel")
		} else if len(results) == 1 && len(results[0].Series) > 1 {
			err = fmt.Errorf("there can be only one result series for value type panel but got %d", len(results[0].Series))
		}
	}

	return results, errQueriesByName, err
}

func (q *querier) QueriesExecuted() []string {
	return q.queriesExecuted
}

func (q *querier) TimeRanges() [][]int {
	return q.timeRanges
}
