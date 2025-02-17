package clickhouseReader

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"os"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-kit/log"
	"github.com/go-kit/log/level"
	"github.com/google/uuid"
	"github.com/mailru/easyjson"
	"github.com/oklog/oklog/pkg/group"
	"github.com/pkg/errors"
	"github.com/prometheus/common/promlog"
	"github.com/prometheus/prometheus/config"
	"github.com/prometheus/prometheus/promql"

	"github.com/prometheus/prometheus/storage"
	"github.com/prometheus/prometheus/storage/remote"
	"github.com/prometheus/prometheus/util/stats"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/cache"
	"go.signoz.io/signoz/pkg/types/authtypes"

	promModel "github.com/prometheus/common/model"
	"go.uber.org/zap"

	queryprogress "go.signoz.io/signoz/pkg/query-service/app/clickhouseReader/query_progress"
	"go.signoz.io/signoz/pkg/query-service/app/logs"
	"go.signoz.io/signoz/pkg/query-service/app/resource"
	"go.signoz.io/signoz/pkg/query-service/app/services"
	"go.signoz.io/signoz/pkg/query-service/app/traces/tracedetail"
	"go.signoz.io/signoz/pkg/query-service/common"
	"go.signoz.io/signoz/pkg/query-service/constants"
	chErrors "go.signoz.io/signoz/pkg/query-service/errors"
	am "go.signoz.io/signoz/pkg/query-service/integrations/alertManager"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/metrics"
	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.signoz.io/signoz/pkg/query-service/utils"
)

const (
	primaryNamespace          = "clickhouse"
	archiveNamespace          = "clickhouse-archive"
	signozTraceDBName         = "signoz_traces"
	signozHistoryDBName       = "signoz_analytics"
	ruleStateHistoryTableName = "distributed_rule_state_history_v0"
	signozDurationMVTable     = "distributed_durationSort"
	signozUsageExplorerTable  = "distributed_usage_explorer"
	signozSpansTable          = "distributed_signoz_spans"
	signozErrorIndexTable     = "distributed_signoz_error_index_v2"
	signozTraceTableName      = "distributed_signoz_index_v2"
	signozTraceLocalTableName = "signoz_index_v2"
	signozMetricDBName        = "signoz_metrics"

	signozSampleLocalTableName = "samples_v4"
	signozSampleTableName      = "distributed_samples_v4"

	signozSamplesAgg5mLocalTableName = "samples_v4_agg_5m"
	signozSamplesAgg5mTableName      = "distributed_samples_v4_agg_5m"

	signozSamplesAgg30mLocalTableName = "samples_v4_agg_30m"
	signozSamplesAgg30mTableName      = "distributed_samples_v4_agg_30m"

	signozExpHistLocalTableName = "exp_hist"
	signozExpHistTableName      = "distributed_exp_hist"

	signozTSLocalTableNameV4 = "time_series_v4"
	signozTSTableNameV4      = "distributed_time_series_v4"

	signozTSLocalTableNameV46Hrs = "time_series_v4_6hrs"
	signozTSTableNameV46Hrs      = "distributed_time_series_v4_6hrs"

	signozTSLocalTableNameV41Day = "time_series_v4_1day"
	signozTSTableNameV41Day      = "distributed_time_series_v4_1day"

	signozTSLocalTableNameV41Week = "time_series_v4_1week"
	signozTSTableNameV41Week      = "distributed_time_series_v4_1week"

	minTimespanForProgressiveSearch       = time.Hour
	minTimespanForProgressiveSearchMargin = time.Minute
	maxProgressiveSteps                   = 4
	charset                               = "abcdefghijklmnopqrstuvwxyz" +
		"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	NANOSECOND = 1000000000
)

var (
	ErrNoOperationsTable            = errors.New("no operations table supplied")
	ErrNoIndexTable                 = errors.New("no index table supplied")
	ErrStartTimeRequired            = errors.New("start time is required for search queries")
	seededRand           *rand.Rand = rand.New(
		rand.NewSource(time.Now().UnixNano()))
)

// SpanWriter for reading spans from ClickHouse
type ClickHouseReader struct {
	db                      clickhouse.Conn
	localDB                 *sqlx.DB
	TraceDB                 string
	operationsTable         string
	durationTable           string
	indexTable              string
	errorTable              string
	usageExplorerTable      string
	SpansTable              string
	spanAttributeTableV2    string
	spanAttributesKeysTable string
	dependencyGraphTable    string
	topLevelOperationsTable string
	logsDB                  string
	logsTable               string
	logsLocalTable          string
	logsAttributeKeys       string
	logsResourceKeys        string
	logsTagAttributeTableV2 string
	queryEngine             *promql.Engine
	remoteStorage           *remote.Storage
	fanoutStorage           *storage.Storage
	queryProgressTracker    queryprogress.QueryProgressTracker

	logsTableV2              string
	logsLocalTableV2         string
	logsResourceTableV2      string
	logsResourceLocalTableV2 string

	promConfigFile string
	promConfig     *config.Config
	alertManager   am.Manager
	featureFlags   interfaces.FeatureLookup

	liveTailRefreshSeconds int
	cluster                string

	useLogsNewSchema  bool
	useTraceNewSchema bool

	logsTableName      string
	logsLocalTableName string

	traceTableName       string
	traceLocalTableName  string
	traceResourceTableV3 string
	traceSummaryTable    string

	fluxIntervalForTraceDetail time.Duration
	cache                      cache.Cache
}

// NewTraceReader returns a TraceReader for the database
func NewReader(
	localDB *sqlx.DB,
	db driver.Conn,
	configFile string,
	featureFlag interfaces.FeatureLookup,
	cluster string,
	useLogsNewSchema bool,
	useTraceNewSchema bool,
	fluxIntervalForTraceDetail time.Duration,
	cache cache.Cache,
) *ClickHouseReader {
	options := NewOptions(primaryNamespace, archiveNamespace)
	return NewReaderFromClickhouseConnection(db, options, localDB, configFile, featureFlag, cluster, useLogsNewSchema, useTraceNewSchema, fluxIntervalForTraceDetail, cache)
}

func NewReaderFromClickhouseConnection(
	db driver.Conn,
	options *Options,
	localDB *sqlx.DB,
	configFile string,
	featureFlag interfaces.FeatureLookup,
	cluster string,
	useLogsNewSchema bool,
	useTraceNewSchema bool,
	fluxIntervalForTraceDetail time.Duration,
	cache cache.Cache,
) *ClickHouseReader {
	alertManager, err := am.New()
	if err != nil {
		zap.L().Error("failed to initialize alert manager", zap.Error(err))
		zap.L().Error("check if the alert manager URL is correctly set and valid")
		os.Exit(1)
	}

	logsTableName := options.primary.LogsTable
	logsLocalTableName := options.primary.LogsLocalTable
	if useLogsNewSchema {
		logsTableName = options.primary.LogsTableV2
		logsLocalTableName = options.primary.LogsLocalTableV2
	}

	traceTableName := options.primary.IndexTable
	traceLocalTableName := options.primary.LocalIndexTable
	if useTraceNewSchema {
		traceTableName = options.primary.TraceIndexTableV3
		traceLocalTableName = options.primary.TraceLocalTableNameV3
	}

	return &ClickHouseReader{
		db:                      db,
		localDB:                 localDB,
		TraceDB:                 options.primary.TraceDB,
		alertManager:            alertManager,
		operationsTable:         options.primary.OperationsTable,
		indexTable:              options.primary.IndexTable,
		errorTable:              options.primary.ErrorTable,
		usageExplorerTable:      options.primary.UsageExplorerTable,
		durationTable:           options.primary.DurationTable,
		SpansTable:              options.primary.SpansTable,
		spanAttributeTableV2:    options.primary.SpanAttributeTableV2,
		spanAttributesKeysTable: options.primary.SpanAttributeKeysTable,
		dependencyGraphTable:    options.primary.DependencyGraphTable,
		topLevelOperationsTable: options.primary.TopLevelOperationsTable,
		logsDB:                  options.primary.LogsDB,
		logsTable:               options.primary.LogsTable,
		logsLocalTable:          options.primary.LogsLocalTable,
		logsAttributeKeys:       options.primary.LogsAttributeKeysTable,
		logsResourceKeys:        options.primary.LogsResourceKeysTable,
		logsTagAttributeTableV2: options.primary.LogsTagAttributeTableV2,
		liveTailRefreshSeconds:  options.primary.LiveTailRefreshSeconds,
		promConfigFile:          configFile,
		featureFlags:            featureFlag,
		cluster:                 cluster,
		queryProgressTracker:    queryprogress.NewQueryProgressTracker(),

		useLogsNewSchema:  useLogsNewSchema,
		useTraceNewSchema: useTraceNewSchema,

		logsTableV2:              options.primary.LogsTableV2,
		logsLocalTableV2:         options.primary.LogsLocalTableV2,
		logsResourceTableV2:      options.primary.LogsResourceTableV2,
		logsResourceLocalTableV2: options.primary.LogsResourceLocalTableV2,
		logsTableName:            logsTableName,
		logsLocalTableName:       logsLocalTableName,

		traceLocalTableName:  traceLocalTableName,
		traceTableName:       traceTableName,
		traceResourceTableV3: options.primary.TraceResourceTableV3,
		traceSummaryTable:    options.primary.TraceSummaryTable,

		fluxIntervalForTraceDetail: fluxIntervalForTraceDetail,
		cache:                      cache,
	}
}

func (r *ClickHouseReader) Start(readerReady chan bool) {
	logLevel := promlog.AllowedLevel{}
	logLevel.Set("debug")
	allowedFormat := promlog.AllowedFormat{}
	allowedFormat.Set("logfmt")

	promlogConfig := promlog.Config{
		Level:  &logLevel,
		Format: &allowedFormat,
	}

	logger := promlog.New(&promlogConfig)

	startTime := func() (int64, error) {
		return int64(promModel.Latest), nil
	}

	remoteStorage := remote.NewStorage(
		log.With(logger, "component", "remote"),
		nil,
		startTime,
		"",
		time.Duration(1*time.Minute),
		nil,
		false,
	)

	cfg := struct {
		configFile string

		localStoragePath    string
		lookbackDelta       promModel.Duration
		webTimeout          promModel.Duration
		queryTimeout        promModel.Duration
		queryConcurrency    int
		queryMaxSamples     int
		RemoteFlushDeadline promModel.Duration

		prometheusURL string

		logLevel promlog.AllowedLevel
	}{
		configFile: r.promConfigFile,
	}

	fanoutStorage := storage.NewFanout(logger, remoteStorage)

	opts := promql.EngineOpts{
		Logger:     log.With(logger, "component", "query engine"),
		Reg:        nil,
		MaxSamples: 50000000,
		Timeout:    time.Duration(2 * time.Minute),
		ActiveQueryTracker: promql.NewActiveQueryTracker(
			"",
			20,
			log.With(logger, "component", "activeQueryTracker"),
		),
	}

	queryEngine := promql.NewEngine(opts)

	reloaders := []func(cfg *config.Config) error{
		remoteStorage.ApplyConfig,
	}

	// sync.Once is used to make sure we can close the channel at different execution stages(SIGTERM or when the config is loaded).
	type closeOnce struct {
		C     chan struct{}
		once  sync.Once
		Close func()
	}
	// Wait until the server is ready to handle reloading.
	reloadReady := &closeOnce{
		C: make(chan struct{}),
	}
	reloadReady.Close = func() {
		reloadReady.once.Do(func() {
			close(reloadReady.C)
		})
	}

	var g group.Group
	{
		// Initial configuration loading.
		cancel := make(chan struct{})
		g.Add(
			func() error {
				var err error
				r.promConfig, err = reloadConfig(cfg.configFile, logger, reloaders...)
				if err != nil {
					return fmt.Errorf("error loading config from %q: %s", cfg.configFile, err)
				}

				reloadReady.Close()

				<-cancel

				return nil
			},
			func(err error) {
				close(cancel)
			},
		)
	}
	r.queryEngine = queryEngine
	r.remoteStorage = remoteStorage
	r.fanoutStorage = &fanoutStorage
	readerReady <- true

	if err := g.Run(); err != nil {
		level.Error(logger).Log("err", err)
		os.Exit(1)
	}

}

func (r *ClickHouseReader) GetQueryEngine() *promql.Engine {
	return r.queryEngine
}

func (r *ClickHouseReader) GetFanoutStorage() *storage.Storage {
	return r.fanoutStorage
}

func reloadConfig(filename string, logger log.Logger, rls ...func(*config.Config) error) (promConfig *config.Config, err error) {
	level.Info(logger).Log("msg", "Loading configuration file", "filename", filename)

	conf, err := config.LoadFile(filename, false, false, logger)
	if err != nil {
		return nil, fmt.Errorf("couldn't load configuration (--config.file=%q): %v", filename, err)
	}

	failed := false
	for _, rl := range rls {
		if err := rl(conf); err != nil {
			level.Error(logger).Log("msg", "Failed to apply configuration", "err", err)
			failed = true
		}
	}
	if failed {
		return nil, fmt.Errorf("one or more errors occurred while applying the new configuration (--config.file=%q)", filename)
	}
	level.Info(logger).Log("msg", "Completed loading of configuration file", "filename", filename)
	return conf, nil
}

func (r *ClickHouseReader) GetInstantQueryMetricsResult(ctx context.Context, queryParams *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.queryEngine.NewInstantQuery(ctx, r.remoteStorage, nil, queryParams.Query, queryParams.Time)
	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	res := qry.Exec(ctx)

	// Optional stats field in response if parameter "stats" is not empty.
	var qs stats.QueryStats
	if queryParams.Stats != "" {
		qs = stats.NewQueryStats(qry.Stats())
	}

	qry.Close()
	return res, &qs, nil

}

func (r *ClickHouseReader) GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.queryEngine.NewRangeQuery(ctx, r.remoteStorage, nil, query.Query, query.Start, query.End, query.Step)

	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	res := qry.Exec(ctx)

	// Optional stats field in response if parameter "stats" is not empty.
	var qs stats.QueryStats
	if query.Stats != "" {
		qs = stats.NewQueryStats(qry.Stats())
	}

	qry.Close()
	return res, &qs, nil
}

func (r *ClickHouseReader) GetServicesList(ctx context.Context) (*[]string, error) {

	services := []string{}
	query := fmt.Sprintf(`SELECT DISTINCT serviceName FROM %s.%s WHERE toDate(timestamp) > now() - INTERVAL 1 DAY`, r.TraceDB, r.traceTableName)

	if r.useTraceNewSchema {
		query = fmt.Sprintf(`SELECT DISTINCT serviceName FROM %s.%s WHERE ts_bucket_start > (toUnixTimestamp(now() - INTERVAL 1 DAY) - 1800) AND toDate(timestamp) > now() - INTERVAL 1 DAY`, r.TraceDB, r.traceTableName)
	}

	rows, err := r.db.Query(ctx, query)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	defer rows.Close()
	for rows.Next() {
		var serviceName string
		if err := rows.Scan(&serviceName); err != nil {
			return &services, err
		}
		services = append(services, serviceName)
	}
	return &services, nil
}

func (r *ClickHouseReader) GetTopLevelOperations(ctx context.Context, skipConfig *model.SkipConfig, start, end time.Time, services []string) (*map[string][]string, *model.ApiError) {

	start = start.In(time.UTC)

	// The `top_level_operations` that have `time` >= start
	operations := map[string][]string{}
	// We can't use the `end` because the `top_level_operations` table has the most recent instances of the operations
	// We can only use the `start` time to filter the operations
	query := fmt.Sprintf(`SELECT name, serviceName, max(time) as ts FROM %s.%s WHERE time >= @start`, r.TraceDB, r.topLevelOperationsTable)
	if len(services) > 0 {
		query += ` AND serviceName IN @services`
	}
	query += ` GROUP BY name, serviceName ORDER BY ts DESC LIMIT 5000`

	rows, err := r.db.Query(ctx, query, clickhouse.Named("start", start), clickhouse.Named("services", services))

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	defer rows.Close()
	for rows.Next() {
		var name, serviceName string
		var t time.Time
		if err := rows.Scan(&name, &serviceName, &t); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorInternal, Err: fmt.Errorf("error in reading data")}
		}
		if _, ok := operations[serviceName]; !ok {
			operations[serviceName] = []string{"overflow_operation"}
		}
		if skipConfig.ShouldSkip(serviceName, name) {
			continue
		}
		operations[serviceName] = append(operations[serviceName], name)
	}
	return &operations, nil
}

func (r *ClickHouseReader) buildResourceSubQuery(tags []model.TagQueryParam, svc string, start, end time.Time) (string, error) {
	// assuming all will be resource attributes.
	// and resource attributes are string for traces
	filterSet := v3.FilterSet{}
	for _, tag := range tags {
		// skip the collector id as we don't add it to traces
		if tag.Key == "signoz.collector.id" {
			continue
		}
		key := v3.AttributeKey{
			Key:      tag.Key,
			DataType: v3.AttributeKeyDataTypeString,
			Type:     v3.AttributeKeyTypeResource,
		}

		it := v3.FilterItem{
			Key: key,
		}

		// as of now only in and not in are supported
		switch tag.Operator {
		case model.NotInOperator:
			it.Operator = v3.FilterOperatorNotIn
			it.Value = tag.StringValues
		case model.InOperator:
			it.Operator = v3.FilterOperatorIn
			it.Value = tag.StringValues
		default:
			return "", fmt.Errorf("operator %s not supported", tag.Operator)
		}

		filterSet.Items = append(filterSet.Items, it)
	}
	filterSet.Items = append(filterSet.Items, v3.FilterItem{
		Key: v3.AttributeKey{
			Key:      "service.name",
			DataType: v3.AttributeKeyDataTypeString,
			Type:     v3.AttributeKeyTypeResource,
		},
		Operator: v3.FilterOperatorEqual,
		Value:    svc,
	})

	resourceSubQuery, err := resource.BuildResourceSubQuery(
		r.TraceDB,
		r.traceResourceTableV3,
		start.Unix()-1800,
		end.Unix(),
		&filterSet,
		[]v3.AttributeKey{},
		v3.AttributeKey{},
		false)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", err
	}
	return resourceSubQuery, nil
}

func (r *ClickHouseReader) GetServicesV2(ctx context.Context, queryParams *model.GetServicesParams, skipConfig *model.SkipConfig) (*[]model.ServiceItem, *model.ApiError) {

	if r.indexTable == "" {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: ErrNoIndexTable}
	}

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx, skipConfig, *queryParams.Start, *queryParams.End, nil)
	if apiErr != nil {
		return nil, apiErr
	}

	serviceItems := []model.ServiceItem{}
	var wg sync.WaitGroup
	// limit the number of concurrent queries to not overload the clickhouse server
	sem := make(chan struct{}, 10)
	var mtx sync.RWMutex

	for svc, ops := range *topLevelOps {
		sem <- struct{}{}
		wg.Add(1)
		go func(svc string, ops []string) {
			defer wg.Done()
			defer func() { <-sem }()
			var serviceItem model.ServiceItem
			var numErrors uint64

			// Even if the total number of operations within the time range is less and the all
			// the top level operations are high, we want to warn to let user know the issue
			// with the instrumentation
			serviceItem.DataWarning = model.DataWarning{
				TopLevelOps: (*topLevelOps)[svc],
			}

			// default max_query_size = 262144
			// Let's assume the average size of the item in `ops` is 50 bytes
			// We can have 262144/50 = 5242 items in the `ops` array
			// Although we have make it as big as 5k, We cap the number of items
			// in the `ops` array to 1500

			ops = ops[:int(math.Min(1500, float64(len(ops))))]

			query := fmt.Sprintf(
				`SELECT
					quantile(0.99)(durationNano) as p99,
					avg(durationNano) as avgDuration,
					count(*) as numCalls
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end`,
				r.TraceDB, r.traceTableName,
			)
			errorQuery := fmt.Sprintf(
				`SELECT
					count(*) as numErrors
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
				r.TraceDB, r.traceTableName,
			)

			args := []interface{}{}
			args = append(args,
				clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
				clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
				clickhouse.Named("serviceName", svc),
				clickhouse.Named("names", ops),
			)

			resourceSubQuery, err := r.buildResourceSubQuery(queryParams.Tags, svc, *queryParams.Start, *queryParams.End)
			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}
			query += `
					AND (
						resource_fingerprint GLOBAL IN ` +
				resourceSubQuery +
				`) AND ts_bucket_start >= @start_bucket AND ts_bucket_start <= @end_bucket`

			args = append(args,
				clickhouse.Named("start_bucket", strconv.FormatInt(queryParams.Start.Unix()-1800, 10)),
				clickhouse.Named("end_bucket", strconv.FormatInt(queryParams.End.Unix(), 10)),
			)

			err = r.db.QueryRow(
				ctx,
				query,
				args...,
			).ScanStruct(&serviceItem)

			if serviceItem.NumCalls == 0 {
				return
			}

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}

			errorQuery += `
					AND (
						resource_fingerprint GLOBAL IN ` +
				resourceSubQuery +
				`) AND ts_bucket_start >= @start_bucket AND ts_bucket_start <= @end_bucket`

			err = r.db.QueryRow(ctx, errorQuery, args...).Scan(&numErrors)
			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}

			serviceItem.ServiceName = svc
			serviceItem.NumErrors = numErrors
			mtx.Lock()
			serviceItems = append(serviceItems, serviceItem)
			mtx.Unlock()
		}(svc, ops)
	}
	wg.Wait()

	for idx := range serviceItems {
		serviceItems[idx].CallRate = float64(serviceItems[idx].NumCalls) / float64(queryParams.Period)
		serviceItems[idx].ErrorRate = float64(serviceItems[idx].NumErrors) * 100 / float64(serviceItems[idx].NumCalls)
	}
	return &serviceItems, nil
}

func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams, skipConfig *model.SkipConfig) (*[]model.ServiceItem, *model.ApiError) {
	if r.useTraceNewSchema {
		return r.GetServicesV2(ctx, queryParams, skipConfig)
	}

	if r.indexTable == "" {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: ErrNoIndexTable}
	}

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx, skipConfig, *queryParams.Start, *queryParams.End, nil)
	if apiErr != nil {
		return nil, apiErr
	}

	serviceItems := []model.ServiceItem{}
	var wg sync.WaitGroup
	// limit the number of concurrent queries to not overload the clickhouse server
	sem := make(chan struct{}, 10)
	var mtx sync.RWMutex

	for svc, ops := range *topLevelOps {
		sem <- struct{}{}
		wg.Add(1)
		go func(svc string, ops []string) {
			defer wg.Done()
			defer func() { <-sem }()
			var serviceItem model.ServiceItem
			var numErrors uint64

			// Even if the total number of operations within the time range is less and the all
			// the top level operations are high, we want to warn to let user know the issue
			// with the instrumentation
			serviceItem.DataWarning = model.DataWarning{
				TopLevelOps: (*topLevelOps)[svc],
			}

			// default max_query_size = 262144
			// Let's assume the average size of the item in `ops` is 50 bytes
			// We can have 262144/50 = 5242 items in the `ops` array
			// Although we have make it as big as 5k, We cap the number of items
			// in the `ops` array to 1500

			ops = ops[:int(math.Min(1500, float64(len(ops))))]

			query := fmt.Sprintf(
				`SELECT
					quantile(0.99)(durationNano) as p99,
					avg(durationNano) as avgDuration,
					count(*) as numCalls
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end`,
				r.TraceDB, r.indexTable,
			)
			errorQuery := fmt.Sprintf(
				`SELECT
					count(*) as numErrors
				FROM %s.%s
				WHERE serviceName = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
				r.TraceDB, r.indexTable,
			)

			args := []interface{}{}
			args = append(args,
				clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
				clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
				clickhouse.Named("serviceName", svc),
				clickhouse.Named("names", ops),
			)
			// create TagQuery from TagQueryParams
			tags := createTagQueryFromTagQueryParams(queryParams.Tags)
			subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
			query += subQuery
			args = append(args, argsSubQuery...)
			if errStatus != nil {
				zap.L().Error("Error in processing sql query", zap.Error(errStatus))
				return
			}
			err := r.db.QueryRow(
				ctx,
				query,
				args...,
			).ScanStruct(&serviceItem)

			if serviceItem.NumCalls == 0 {
				return
			}

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}
			subQuery, argsSubQuery, errStatus = buildQueryWithTagParams(ctx, tags)
			if errStatus != nil {
				zap.L().Error("Error building query with tag params", zap.Error(errStatus))
				return
			}
			errorQuery += subQuery
			args = append(args, argsSubQuery...)
			err = r.db.QueryRow(ctx, errorQuery, args...).Scan(&numErrors)
			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return
			}

			serviceItem.ServiceName = svc
			serviceItem.NumErrors = numErrors
			mtx.Lock()
			serviceItems = append(serviceItems, serviceItem)
			mtx.Unlock()
		}(svc, ops)
	}
	wg.Wait()

	for idx := range serviceItems {
		serviceItems[idx].CallRate = float64(serviceItems[idx].NumCalls) / float64(queryParams.Period)
		serviceItems[idx].ErrorRate = float64(serviceItems[idx].NumErrors) * 100 / float64(serviceItems[idx].NumCalls)
	}
	return &serviceItems, nil
}

func getStatusFilters(query string, statusParams []string, excludeMap map[string]struct{}) string {

	// status can only be two and if both are selected than they are equivalent to none selected
	if _, ok := excludeMap["status"]; ok {
		if len(statusParams) == 1 {
			if statusParams[0] == "error" {
				query += " AND hasError = false"
			} else if statusParams[0] == "ok" {
				query += " AND hasError = true"
			}
		}
	} else if len(statusParams) == 1 {
		if statusParams[0] == "error" {
			query += " AND hasError = true"
		} else if statusParams[0] == "ok" {
			query += " AND hasError = false"
		}
	}
	return query
}

func createTagQueryFromTagQueryParams(queryParams []model.TagQueryParam) []model.TagQuery {
	tags := []model.TagQuery{}
	for _, tag := range queryParams {
		if len(tag.StringValues) > 0 {
			tags = append(tags, model.NewTagQueryString(tag))
		}
		if len(tag.NumberValues) > 0 {
			tags = append(tags, model.NewTagQueryNumber(tag))
		}
		if len(tag.BoolValues) > 0 {
			tags = append(tags, model.NewTagQueryBool(tag))
		}
	}
	return tags
}

func StringWithCharset(length int, charset string) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func String(length int) string {
	return StringWithCharset(length, charset)
}

func buildQueryWithTagParams(_ context.Context, tags []model.TagQuery) (string, []interface{}, *model.ApiError) {
	query := ""
	var args []interface{}
	for _, item := range tags {
		var subQuery string
		var argsSubQuery []interface{}
		tagMapType := item.GetTagMapColumn()
		switch item.GetOperator() {
		case model.EqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "=")
		case model.NotEqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "!=")
		case model.LessThanOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "<")
		case model.GreaterThanOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, ">")
		case model.InOperator:
			subQuery, argsSubQuery = addInOperator(item, tagMapType, false)
		case model.NotInOperator:
			subQuery, argsSubQuery = addInOperator(item, tagMapType, true)
		case model.LessThanEqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, "<=")
		case model.GreaterThanEqualOperator:
			subQuery, argsSubQuery = addArithmeticOperator(item, tagMapType, ">=")
		case model.ContainsOperator:
			subQuery, argsSubQuery = addContainsOperator(item, tagMapType, false)
		case model.NotContainsOperator:
			subQuery, argsSubQuery = addContainsOperator(item, tagMapType, true)
		case model.StartsWithOperator:
			subQuery, argsSubQuery = addStartsWithOperator(item, tagMapType, false)
		case model.NotStartsWithOperator:
			subQuery, argsSubQuery = addStartsWithOperator(item, tagMapType, true)
		case model.ExistsOperator:
			subQuery, argsSubQuery = addExistsOperator(item, tagMapType, false)
		case model.NotExistsOperator:
			subQuery, argsSubQuery = addExistsOperator(item, tagMapType, true)
		default:
			return "", nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("filter operator %s not supported", item.GetOperator())}
		}
		query += subQuery
		args = append(args, argsSubQuery...)
	}
	return query, args, nil
}

func addInOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	notStr := ""
	if not {
		notStr = "NOT"
	}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "inTagKey" + String(5)
		tagValue := "inTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] = @%s", tagMapType, tagKey, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, value))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagValuePair, " OR ")), args
}

func addContainsOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	notStr := ""
	if not {
		notStr = "NOT"
	}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "containsTagKey" + String(5)
		tagValue := "containsTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] ILIKE @%s", tagMapType, tagKey, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, "%"+fmt.Sprintf("%v", value)+"%"))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagValuePair, " OR ")), args
}

func addStartsWithOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	notStr := ""
	if not {
		notStr = "NOT"
	}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "startsWithTagKey" + String(5)
		tagValue := "startsWithTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] ILIKE @%s", tagMapType, tagKey, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, "%"+fmt.Sprintf("%v", value)+"%"))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagValuePair, " OR ")), args
}

func addArithmeticOperator(item model.TagQuery, tagMapType string, operator string) (string, []interface{}) {
	values := item.GetValues()
	args := []interface{}{}
	tagValuePair := []string{}
	for _, value := range values {
		tagKey := "arithmeticTagKey" + String(5)
		tagValue := "arithmeticTagValue" + String(5)
		tagValuePair = append(tagValuePair, fmt.Sprintf("%s[@%s] %s @%s", tagMapType, tagKey, operator, tagValue))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
		args = append(args, clickhouse.Named(tagValue, value))
	}
	return fmt.Sprintf(" AND (%s)", strings.Join(tagValuePair, " OR ")), args
}

func addExistsOperator(item model.TagQuery, tagMapType string, not bool) (string, []interface{}) {
	values := item.GetValues()
	notStr := ""
	if not {
		notStr = "NOT"
	}
	args := []interface{}{}
	tagOperatorPair := []string{}
	for range values {
		tagKey := "existsTagKey" + String(5)
		tagOperatorPair = append(tagOperatorPair, fmt.Sprintf("mapContains(%s, @%s)", tagMapType, tagKey))
		args = append(args, clickhouse.Named(tagKey, item.GetKey()))
	}
	return fmt.Sprintf(" AND %s (%s)", notStr, strings.Join(tagOperatorPair, " OR ")), args
}

func (r *ClickHouseReader) GetTopOperationsV2(ctx context.Context, queryParams *model.GetTopOperationsParams) (*[]model.TopOperationsItem, *model.ApiError) {

	namedArgs := []interface{}{
		clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
		clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
		clickhouse.Named("serviceName", queryParams.ServiceName),
		clickhouse.Named("start_bucket", strconv.FormatInt(queryParams.Start.Unix()-1800, 10)),
		clickhouse.Named("end_bucket", strconv.FormatInt(queryParams.End.Unix(), 10)),
	}

	var topOperationsItems []model.TopOperationsItem

	query := fmt.Sprintf(`
		SELECT
			quantile(0.5)(durationNano) as p50,
			quantile(0.95)(durationNano) as p95,
			quantile(0.99)(durationNano) as p99,
			COUNT(*) as numCalls,
			countIf(statusCode=2) as errorCount,
			name
		FROM %s.%s
		WHERE serviceName = @serviceName AND timestamp>= @start AND timestamp<= @end`,
		r.TraceDB, r.traceTableName,
	)

	resourceSubQuery, err := r.buildResourceSubQuery(queryParams.Tags, queryParams.ServiceName, *queryParams.Start, *queryParams.End)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}
	query += `
			AND (
				resource_fingerprint GLOBAL IN ` +
		resourceSubQuery +
		`) AND ts_bucket_start >= @start_bucket AND ts_bucket_start <= @end_bucket`

	query += " GROUP BY name ORDER BY p99 DESC"
	if queryParams.Limit > 0 {
		query += " LIMIT @limit"
		namedArgs = append(namedArgs, clickhouse.Named("limit", queryParams.Limit))
	}
	err = r.db.Select(ctx, &topOperationsItems, query, namedArgs...)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if topOperationsItems == nil {
		topOperationsItems = []model.TopOperationsItem{}
	}

	return &topOperationsItems, nil
}

func (r *ClickHouseReader) GetTopOperations(ctx context.Context, queryParams *model.GetTopOperationsParams) (*[]model.TopOperationsItem, *model.ApiError) {

	if r.useTraceNewSchema {
		return r.GetTopOperationsV2(ctx, queryParams)
	}

	namedArgs := []interface{}{
		clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
		clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
		clickhouse.Named("serviceName", queryParams.ServiceName),
	}

	var topOperationsItems []model.TopOperationsItem

	query := fmt.Sprintf(`
		SELECT
			quantile(0.5)(durationNano) as p50,
			quantile(0.95)(durationNano) as p95,
			quantile(0.99)(durationNano) as p99,
			COUNT(*) as numCalls,
			countIf(statusCode=2) as errorCount,
			name
		FROM %s.%s
		WHERE serviceName = @serviceName AND timestamp>= @start AND timestamp<= @end`,
		r.TraceDB, r.indexTable,
	)
	args := []interface{}{}
	args = append(args, namedArgs...)
	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)
	if errStatus != nil {
		return nil, errStatus
	}
	query += " GROUP BY name ORDER BY p99 DESC"
	if queryParams.Limit > 0 {
		query += " LIMIT @limit"
		args = append(args, clickhouse.Named("limit", queryParams.Limit))
	}
	err := r.db.Select(ctx, &topOperationsItems, query, args...)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if topOperationsItems == nil {
		topOperationsItems = []model.TopOperationsItem{}
	}

	return &topOperationsItems, nil
}
func (r *ClickHouseReader) GetUsage(ctx context.Context, queryParams *model.GetUsageParams) (*[]model.UsageItem, error) {

	var usageItems []model.UsageItem
	namedArgs := []interface{}{
		clickhouse.Named("interval", queryParams.StepHour),
		clickhouse.Named("start", strconv.FormatInt(queryParams.Start.UnixNano(), 10)),
		clickhouse.Named("end", strconv.FormatInt(queryParams.End.UnixNano(), 10)),
	}
	var query string
	if len(queryParams.ServiceName) != 0 {
		namedArgs = append(namedArgs, clickhouse.Named("serviceName", queryParams.ServiceName))
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL @interval HOUR) as time, sum(count) as count FROM %s.%s WHERE service_name=@serviceName AND timestamp>=@start AND timestamp<=@end GROUP BY time ORDER BY time ASC", r.TraceDB, r.usageExplorerTable)
	} else {
		query = fmt.Sprintf("SELECT toStartOfInterval(timestamp, INTERVAL @interval HOUR) as time, sum(count) as count FROM %s.%s WHERE timestamp>=@start AND timestamp<=@end GROUP BY time ORDER BY time ASC", r.TraceDB, r.usageExplorerTable)
	}

	err := r.db.Select(ctx, &usageItems, query, namedArgs...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	for i := range usageItems {
		usageItems[i].Timestamp = uint64(usageItems[i].Time.UnixNano())
	}

	if usageItems == nil {
		usageItems = []model.UsageItem{}
	}

	return &usageItems, nil
}

func (r *ClickHouseReader) SearchTracesV2(ctx context.Context, params *model.SearchTracesParams,
	smartTraceAlgorithm func(payload []model.SearchSpanResponseItem, targetSpanId string,
		levelUp int, levelDown int, spanLimit int) ([]model.SearchSpansResult, error)) (*[]model.SearchSpansResult, error) {
	searchSpansResult := []model.SearchSpansResult{
		{
			Columns:   []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError", "StatusMessage", "StatusCodeString", "SpanKind"},
			IsSubTree: false,
			Events:    make([][]interface{}, 0),
		},
	}

	var traceSummary model.TraceSummary
	summaryQuery := fmt.Sprintf("SELECT * from %s.%s WHERE trace_id=$1", r.TraceDB, r.traceSummaryTable)
	err := r.db.QueryRow(ctx, summaryQuery, params.TraceID).Scan(&traceSummary.TraceID, &traceSummary.Start, &traceSummary.End, &traceSummary.NumSpans)
	if err != nil {
		if err == sql.ErrNoRows {
			return &searchSpansResult, nil
		}
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	if traceSummary.NumSpans > uint64(params.MaxSpansInTrace) {
		zap.L().Error("Max spans allowed in a trace limit reached", zap.Int("MaxSpansInTrace", params.MaxSpansInTrace),
			zap.Uint64("Count", traceSummary.NumSpans))
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			data := map[string]interface{}{
				"traceSize":            traceSummary.NumSpans,
				"maxSpansInTraceLimit": params.MaxSpansInTrace,
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_MAX_SPANS_ALLOWED_LIMIT_REACHED, data, claims.Email, true, false)
		}
		return nil, fmt.Errorf("max spans allowed in trace limit reached, please contact support for more details")
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if ok {
		data := map[string]interface{}{
			"traceSize": traceSummary.NumSpans,
		}
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_TRACE_DETAIL_API, data, claims.Email, true, false)
	}

	var startTime, endTime, durationNano uint64
	var searchScanResponses []model.SpanItemV2

	query := fmt.Sprintf("SELECT timestamp, duration_nano, span_id, trace_id, has_error, kind, resource_string_service$$name, name, references, attributes_string, attributes_number, attributes_bool, resources_string, events, status_message, status_code_string, kind_string FROM %s.%s WHERE trace_id=$1 and ts_bucket_start>=$2 and ts_bucket_start<=$3", r.TraceDB, r.traceTableName)

	start := time.Now()

	err = r.db.Select(ctx, &searchScanResponses, query, params.TraceID, strconv.FormatInt(traceSummary.Start.Unix()-1800, 10), strconv.FormatInt(traceSummary.End.Unix(), 10))

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}
	end := time.Now()
	zap.L().Debug("getTraceSQLQuery took: ", zap.Duration("duration", end.Sub(start)))

	searchSpansResult[0].Events = make([][]interface{}, len(searchScanResponses))

	searchSpanResponses := []model.SearchSpanResponseItem{}
	start = time.Now()
	for _, item := range searchScanResponses {
		ref := []model.OtelSpanRef{}
		err := json.Unmarshal([]byte(item.References), &ref)
		if err != nil {
			zap.L().Error("Error unmarshalling references", zap.Error(err))
			return nil, err
		}

		// merge attributes_number and attributes_bool to attributes_string
		for k, v := range item.Attributes_bool {
			item.Attributes_string[k] = fmt.Sprintf("%v", v)
		}
		for k, v := range item.Attributes_number {
			item.Attributes_string[k] = fmt.Sprintf("%v", v)
		}
		for k, v := range item.Resources_string {
			item.Attributes_string[k] = v
		}

		jsonItem := model.SearchSpanResponseItem{
			SpanID:           item.SpanID,
			TraceID:          item.TraceID,
			ServiceName:      item.ServiceName,
			Name:             item.Name,
			Kind:             int32(item.Kind),
			DurationNano:     int64(item.DurationNano),
			HasError:         item.HasError,
			StatusMessage:    item.StatusMessage,
			StatusCodeString: item.StatusCodeString,
			SpanKind:         item.SpanKind,
			References:       ref,
			Events:           item.Events,
			TagMap:           item.Attributes_string,
		}

		jsonItem.TimeUnixNano = uint64(item.TimeUnixNano.UnixNano() / 1000000)

		searchSpanResponses = append(searchSpanResponses, jsonItem)
		if startTime == 0 || jsonItem.TimeUnixNano < startTime {
			startTime = jsonItem.TimeUnixNano
		}
		if endTime == 0 || jsonItem.TimeUnixNano > endTime {
			endTime = jsonItem.TimeUnixNano
		}
		if durationNano == 0 || uint64(jsonItem.DurationNano) > durationNano {
			durationNano = uint64(jsonItem.DurationNano)
		}
	}
	end = time.Now()
	zap.L().Debug("getTraceSQLQuery unmarshal took: ", zap.Duration("duration", end.Sub(start)))

	err = r.featureFlags.CheckFeature(model.SmartTraceDetail)
	smartAlgoEnabled := err == nil
	if len(searchScanResponses) > params.SpansRenderLimit && smartAlgoEnabled {
		start = time.Now()
		searchSpansResult, err = smartTraceAlgorithm(searchSpanResponses, params.SpanID, params.LevelUp, params.LevelDown, params.SpansRenderLimit)
		if err != nil {
			return nil, err
		}
		end = time.Now()
		zap.L().Debug("smartTraceAlgo took: ", zap.Duration("duration", end.Sub(start)))
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			data := map[string]interface{}{
				"traceSize":        len(searchScanResponses),
				"spansRenderLimit": params.SpansRenderLimit,
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LARGE_TRACE_OPENED, data, claims.Email, true, false)
		}
	} else {
		for i, item := range searchSpanResponses {
			spanEvents := item.GetValues()
			searchSpansResult[0].Events[i] = spanEvents
		}
	}

	searchSpansResult[0].StartTimestampMillis = startTime - (durationNano / 1000000)
	searchSpansResult[0].EndTimestampMillis = endTime + (durationNano / 1000000)

	return &searchSpansResult, nil
}

func (r *ClickHouseReader) SearchTraces(ctx context.Context, params *model.SearchTracesParams,
	smartTraceAlgorithm func(payload []model.SearchSpanResponseItem, targetSpanId string,
		levelUp int, levelDown int, spanLimit int) ([]model.SearchSpansResult, error)) (*[]model.SearchSpansResult, error) {

	if r.useTraceNewSchema {
		return r.SearchTracesV2(ctx, params, smartTraceAlgorithm)
	}

	var countSpans uint64
	countQuery := fmt.Sprintf("SELECT count() as count from %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)
	err := r.db.QueryRow(ctx, countQuery, params.TraceID).Scan(&countSpans)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	if countSpans > uint64(params.MaxSpansInTrace) {
		zap.L().Error("Max spans allowed in a trace limit reached", zap.Int("MaxSpansInTrace", params.MaxSpansInTrace),
			zap.Uint64("Count", countSpans))
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			data := map[string]interface{}{
				"traceSize":            countSpans,
				"maxSpansInTraceLimit": params.MaxSpansInTrace,
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_MAX_SPANS_ALLOWED_LIMIT_REACHED, data, claims.Email, true, false)
		}
		return nil, fmt.Errorf("max spans allowed in trace limit reached, please contact support for more details")
	}

	claims, ok := authtypes.ClaimsFromContext(ctx)
	if ok {
		data := map[string]interface{}{
			"traceSize": countSpans,
		}
		telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_TRACE_DETAIL_API, data, claims.Email, true, false)
	}

	var startTime, endTime, durationNano uint64
	var searchScanResponses []model.SearchSpanDBResponseItem

	query := fmt.Sprintf("SELECT timestamp, traceID, model FROM %s.%s WHERE traceID=$1", r.TraceDB, r.SpansTable)

	start := time.Now()

	err = r.db.Select(ctx, &searchScanResponses, query, params.TraceID)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}
	end := time.Now()
	zap.L().Debug("getTraceSQLQuery took: ", zap.Duration("duration", end.Sub(start)))
	searchSpansResult := []model.SearchSpansResult{{
		Columns:   []string{"__time", "SpanId", "TraceId", "ServiceName", "Name", "Kind", "DurationNano", "TagsKeys", "TagsValues", "References", "Events", "HasError", "StatusMessage", "StatusCodeString", "SpanKind"},
		Events:    make([][]interface{}, len(searchScanResponses)),
		IsSubTree: false,
	},
	}

	searchSpanResponses := []model.SearchSpanResponseItem{}
	start = time.Now()
	for _, item := range searchScanResponses {
		var jsonItem model.SearchSpanResponseItem
		easyjson.Unmarshal([]byte(item.Model), &jsonItem)
		jsonItem.TimeUnixNano = uint64(item.Timestamp.UnixNano() / 1000000)
		searchSpanResponses = append(searchSpanResponses, jsonItem)
		if startTime == 0 || jsonItem.TimeUnixNano < startTime {
			startTime = jsonItem.TimeUnixNano
		}
		if endTime == 0 || jsonItem.TimeUnixNano > endTime {
			endTime = jsonItem.TimeUnixNano
		}
		if durationNano == 0 || uint64(jsonItem.DurationNano) > durationNano {
			durationNano = uint64(jsonItem.DurationNano)
		}
	}
	end = time.Now()
	zap.L().Debug("getTraceSQLQuery unmarshal took: ", zap.Duration("duration", end.Sub(start)))

	err = r.featureFlags.CheckFeature(model.SmartTraceDetail)
	smartAlgoEnabled := err == nil
	if len(searchScanResponses) > params.SpansRenderLimit && smartAlgoEnabled {
		start = time.Now()
		searchSpansResult, err = smartTraceAlgorithm(searchSpanResponses, params.SpanID, params.LevelUp, params.LevelDown, params.SpansRenderLimit)
		if err != nil {
			return nil, err
		}
		end = time.Now()
		zap.L().Debug("smartTraceAlgo took: ", zap.Duration("duration", end.Sub(start)))
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			data := map[string]interface{}{
				"traceSize":        len(searchScanResponses),
				"spansRenderLimit": params.SpansRenderLimit,
			}
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LARGE_TRACE_OPENED, data, claims.Email, true, false)
		}
	} else {
		for i, item := range searchSpanResponses {
			spanEvents := item.GetValues()
			searchSpansResult[0].Events[i] = spanEvents
		}
	}

	searchSpansResult[0].StartTimestampMillis = startTime - (durationNano / 1000000)
	searchSpansResult[0].EndTimestampMillis = endTime + (durationNano / 1000000)

	return &searchSpansResult, nil
}

func (r *ClickHouseReader) GetSpansForTrace(ctx context.Context, traceID string, traceDetailsQuery string) ([]model.SpanItemV2, *model.ApiError) {
	var traceSummary model.TraceSummary
	summaryQuery := fmt.Sprintf("SELECT * from %s.%s WHERE trace_id=$1", r.TraceDB, r.traceSummaryTable)
	err := r.db.QueryRow(ctx, summaryQuery, traceID).Scan(&traceSummary.TraceID, &traceSummary.Start, &traceSummary.End, &traceSummary.NumSpans)
	if err != nil {
		if err == sql.ErrNoRows {
			return []model.SpanItemV2{}, nil
		}
		zap.L().Error("Error in processing trace summary sql query", zap.Error(err))
		return nil, model.ExecutionError(fmt.Errorf("error in processing trace summary sql query: %w", err))
	}

	var searchScanResponses []model.SpanItemV2
	queryStartTime := time.Now()
	err = r.db.Select(ctx, &searchScanResponses, traceDetailsQuery, traceID, strconv.FormatInt(traceSummary.Start.Unix()-1800, 10), strconv.FormatInt(traceSummary.End.Unix(), 10))
	zap.L().Info(traceDetailsQuery)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, model.ExecutionError(fmt.Errorf("error in processing trace data sql query: %w", err))
	}
	zap.L().Info("trace details query took: ", zap.Duration("duration", time.Since(queryStartTime)), zap.String("traceID", traceID))

	return searchScanResponses, nil
}

func (r *ClickHouseReader) GetWaterfallSpansForTraceWithMetadataCache(ctx context.Context, traceID string) (*model.GetWaterfallSpansForTraceWithMetadataCache, error) {
	cachedTraceData := new(model.GetWaterfallSpansForTraceWithMetadataCache)
	cacheStatus, err := r.cache.Retrieve(ctx, fmt.Sprintf("getWaterfallSpansForTraceWithMetadata-%v", traceID), cachedTraceData, false)
	if err != nil {
		zap.L().Debug("error in retrieving getWaterfallSpansForTraceWithMetadata cache", zap.Error(err), zap.String("traceID", traceID))
		return nil, err
	}

	if cacheStatus != cache.RetrieveStatusHit {
		return nil, errors.Errorf("cache status for getWaterfallSpansForTraceWithMetadata : %s, traceID: %s", cacheStatus, traceID)
	}

	if time.Since(time.UnixMilli(int64(cachedTraceData.EndTime))) < r.fluxIntervalForTraceDetail {
		zap.L().Info("the trace end time falls under the flux interval, skipping getWaterfallSpansForTraceWithMetadata cache", zap.String("traceID", traceID))
		return nil, errors.Errorf("the trace end time falls under the flux interval, skipping getWaterfallSpansForTraceWithMetadata cache, traceID: %s", traceID)
	}

	zap.L().Info("cache is successfully hit, applying cache for getWaterfallSpansForTraceWithMetadata", zap.String("traceID", traceID))
	return cachedTraceData, nil
}

func (r *ClickHouseReader) GetWaterfallSpansForTraceWithMetadata(ctx context.Context, traceID string, req *model.GetWaterfallSpansForTraceWithMetadataParams) (*model.GetWaterfallSpansForTraceWithMetadataResponse, *model.ApiError) {
	response := new(model.GetWaterfallSpansForTraceWithMetadataResponse)
	var startTime, endTime, durationNano, totalErrorSpans, totalSpans uint64
	var spanIdToSpanNodeMap = map[string]*model.Span{}
	var traceRoots []*model.Span
	var serviceNameToTotalDurationMap = map[string]uint64{}
	var serviceNameIntervalMap = map[string][]tracedetail.Interval{}
	var hasMissingSpans bool

	claims, claimsPresent := authtypes.ClaimsFromContext(ctx)
	cachedTraceData, err := r.GetWaterfallSpansForTraceWithMetadataCache(ctx, traceID)
	if err == nil {
		startTime = cachedTraceData.StartTime
		endTime = cachedTraceData.EndTime
		durationNano = cachedTraceData.DurationNano
		spanIdToSpanNodeMap = cachedTraceData.SpanIdToSpanNodeMap
		serviceNameToTotalDurationMap = cachedTraceData.ServiceNameToTotalDurationMap
		traceRoots = cachedTraceData.TraceRoots
		totalSpans = cachedTraceData.TotalSpans
		totalErrorSpans = cachedTraceData.TotalErrorSpans
		hasMissingSpans = cachedTraceData.HasMissingSpans

		if claimsPresent {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_TRACE_DETAIL_API, map[string]interface{}{"traceSize": totalSpans}, claims.Email, true, false)
		}
	}

	if err != nil {
		zap.L().Info("cache miss for getWaterfallSpansForTraceWithMetadata", zap.String("traceID", traceID))

		searchScanResponses, err := r.GetSpansForTrace(ctx, traceID, fmt.Sprintf("SELECT timestamp, duration_nano, span_id, trace_id, has_error, kind, resource_string_service$$name, name, references, attributes_string, attributes_number, attributes_bool, resources_string, events, status_message, status_code_string, kind_string FROM %s.%s WHERE trace_id=$1 and ts_bucket_start>=$2 and ts_bucket_start<=$3 ORDER BY timestamp ASC, name ASC", r.TraceDB, r.traceTableName))
		if err != nil {
			return nil, err
		}
		if len(searchScanResponses) == 0 {
			return response, nil
		}
		totalSpans = uint64(len(searchScanResponses))

		if claimsPresent {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_TRACE_DETAIL_API, map[string]interface{}{"traceSize": totalSpans}, claims.Email, true, false)
		}

		processingBeforeCache := time.Now()
		for _, item := range searchScanResponses {
			ref := []model.OtelSpanRef{}
			err := json.Unmarshal([]byte(item.References), &ref)
			if err != nil {
				zap.L().Error("getWaterfallSpansForTraceWithMetadata: error unmarshalling references", zap.Error(err), zap.String("traceID", traceID))
				return nil, model.BadRequest(fmt.Errorf("getWaterfallSpansForTraceWithMetadata: error unmarshalling references %w", err))
			}

			// merge attributes_number and attributes_bool to attributes_string
			for k, v := range item.Attributes_bool {
				item.Attributes_string[k] = fmt.Sprintf("%v", v)
			}
			for k, v := range item.Attributes_number {
				item.Attributes_string[k] = fmt.Sprintf("%v", v)
			}
			for k, v := range item.Resources_string {
				item.Attributes_string[k] = v
			}

			jsonItem := model.Span{
				SpanID:           item.SpanID,
				TraceID:          item.TraceID,
				ServiceName:      item.ServiceName,
				Name:             item.Name,
				Kind:             int32(item.Kind),
				DurationNano:     item.DurationNano,
				HasError:         item.HasError,
				StatusMessage:    item.StatusMessage,
				StatusCodeString: item.StatusCodeString,
				SpanKind:         item.SpanKind,
				References:       ref,
				Events:           item.Events,
				TagMap:           item.Attributes_string,
				Children:         make([]*model.Span, 0),
			}

			// metadata calculation
			startTimeUnixNano := uint64(item.TimeUnixNano.UnixNano())
			if startTime == 0 || startTimeUnixNano < startTime {
				startTime = startTimeUnixNano
			}
			if endTime == 0 || (startTimeUnixNano+jsonItem.DurationNano) > endTime {
				endTime = (startTimeUnixNano + jsonItem.DurationNano)
			}
			if durationNano == 0 || jsonItem.DurationNano > durationNano {
				durationNano = jsonItem.DurationNano
			}

			if jsonItem.HasError {
				totalErrorSpans = totalErrorSpans + 1
			}

			// convert start timestamp to millis because right now frontend is expecting it in millis
			jsonItem.TimeUnixNano = uint64(item.TimeUnixNano.UnixNano() / 1000000)

			// collect the intervals for service for execution time calculation
			serviceNameIntervalMap[jsonItem.ServiceName] =
				append(serviceNameIntervalMap[jsonItem.ServiceName], tracedetail.Interval{StartTime: jsonItem.TimeUnixNano, Duration: jsonItem.DurationNano / 1000000, Service: jsonItem.ServiceName})

			// append to the span node map
			spanIdToSpanNodeMap[jsonItem.SpanID] = &jsonItem
		}

		// traverse through the map and append each node to the children array of the parent node
		// and add the missing spans
		for _, spanNode := range spanIdToSpanNodeMap {
			hasParentSpanNode := false
			for _, reference := range spanNode.References {
				if reference.RefType == "CHILD_OF" && reference.SpanId != "" {
					hasParentSpanNode = true

					if parentNode, exists := spanIdToSpanNodeMap[reference.SpanId]; exists {
						parentNode.Children = append(parentNode.Children, spanNode)
					} else {
						// insert the missing span
						missingSpan := model.Span{
							SpanID:           reference.SpanId,
							TraceID:          spanNode.TraceID,
							ServiceName:      "",
							Name:             "Missing Span",
							TimeUnixNano:     spanNode.TimeUnixNano,
							Kind:             0,
							DurationNano:     spanNode.DurationNano,
							HasError:         false,
							StatusMessage:    "",
							StatusCodeString: "",
							SpanKind:         "",
							Children:         make([]*model.Span, 0),
						}
						missingSpan.Children = append(missingSpan.Children, spanNode)
						spanIdToSpanNodeMap[missingSpan.SpanID] = &missingSpan
						traceRoots = append(traceRoots, &missingSpan)
						hasMissingSpans = true
					}
				}
			}
			if !hasParentSpanNode && !tracedetail.ContainsWaterfallSpan(traceRoots, spanNode) {
				traceRoots = append(traceRoots, spanNode)
			}
		}

		// sort the trace roots to add missing spans at the right order
		sort.Slice(traceRoots, func(i, j int) bool {
			if traceRoots[i].TimeUnixNano == traceRoots[j].TimeUnixNano {
				return traceRoots[i].Name < traceRoots[j].Name
			}
			return traceRoots[i].TimeUnixNano < traceRoots[j].TimeUnixNano
		})

		serviceNameToTotalDurationMap = tracedetail.CalculateServiceTime(serviceNameIntervalMap)

		traceCache := model.GetWaterfallSpansForTraceWithMetadataCache{
			StartTime:                     startTime,
			EndTime:                       endTime,
			DurationNano:                  durationNano,
			TotalSpans:                    totalSpans,
			TotalErrorSpans:               totalErrorSpans,
			SpanIdToSpanNodeMap:           spanIdToSpanNodeMap,
			ServiceNameToTotalDurationMap: serviceNameToTotalDurationMap,
			TraceRoots:                    traceRoots,
			HasMissingSpans:               hasMissingSpans,
		}

		zap.L().Info("getWaterfallSpansForTraceWithMetadata: processing pre cache", zap.Duration("duration", time.Since(processingBeforeCache)), zap.String("traceID", traceID))
		cacheErr := r.cache.Store(ctx, fmt.Sprintf("getWaterfallSpansForTraceWithMetadata-%v", traceID), &traceCache, time.Minute*5)
		if cacheErr != nil {
			zap.L().Debug("failed to store cache for getWaterfallSpansForTraceWithMetadata", zap.String("traceID", traceID), zap.Error(err))
		}
	}

	processingPostCache := time.Now()
	selectedSpans, uncollapsedSpans, rootServiceName, rootServiceEntryPoint := tracedetail.GetSelectedSpans(req.UncollapsedSpans, req.SelectedSpanID, traceRoots, spanIdToSpanNodeMap, req.IsSelectedSpanIDUnCollapsed)
	zap.L().Info("getWaterfallSpansForTraceWithMetadata: processing post cache", zap.Duration("duration", time.Since(processingPostCache)), zap.String("traceID", traceID))

	response.Spans = selectedSpans
	response.UncollapsedSpans = uncollapsedSpans
	response.StartTimestampMillis = startTime / 1000000
	response.EndTimestampMillis = endTime / 1000000
	response.TotalSpansCount = totalSpans
	response.TotalErrorSpansCount = totalErrorSpans
	response.RootServiceName = rootServiceName
	response.RootServiceEntryPoint = rootServiceEntryPoint
	response.ServiceNameToTotalDurationMap = serviceNameToTotalDurationMap
	response.HasMissingSpans = hasMissingSpans
	return response, nil
}

func (r *ClickHouseReader) GetFlamegraphSpansForTraceCache(ctx context.Context, traceID string) (*model.GetFlamegraphSpansForTraceCache, error) {
	cachedTraceData := new(model.GetFlamegraphSpansForTraceCache)
	cacheStatus, err := r.cache.Retrieve(ctx, fmt.Sprintf("getFlamegraphSpansForTrace-%v", traceID), cachedTraceData, false)
	if err != nil {
		zap.L().Debug("error in retrieving getFlamegraphSpansForTrace cache", zap.Error(err), zap.String("traceID", traceID))
		return nil, err
	}

	if cacheStatus != cache.RetrieveStatusHit {
		return nil, errors.Errorf("cache status for getFlamegraphSpansForTrace : %s, traceID: %s", cacheStatus, traceID)
	}

	if time.Since(time.UnixMilli(int64(cachedTraceData.EndTime))) < r.fluxIntervalForTraceDetail {
		zap.L().Info("the trace end time falls under the flux interval, skipping getFlamegraphSpansForTrace cache", zap.String("traceID", traceID))
		return nil, errors.Errorf("the trace end time falls under the flux interval, skipping getFlamegraphSpansForTrace cache, traceID: %s", traceID)
	}

	zap.L().Info("cache is successfully hit, applying cache for getFlamegraphSpansForTrace", zap.String("traceID", traceID))
	return cachedTraceData, nil
}

func (r *ClickHouseReader) GetFlamegraphSpansForTrace(ctx context.Context, traceID string, req *model.GetFlamegraphSpansForTraceParams) (*model.GetFlamegraphSpansForTraceResponse, *model.ApiError) {
	trace := new(model.GetFlamegraphSpansForTraceResponse)
	var startTime, endTime, durationNano uint64
	var spanIdToSpanNodeMap = map[string]*model.FlamegraphSpan{}
	// map[traceID][level]span
	var selectedSpans = [][]*model.FlamegraphSpan{}
	var traceRoots []*model.FlamegraphSpan

	// get the trace tree from cache!
	cachedTraceData, err := r.GetFlamegraphSpansForTraceCache(ctx, traceID)

	if err == nil {
		startTime = cachedTraceData.StartTime
		endTime = cachedTraceData.EndTime
		durationNano = cachedTraceData.DurationNano
		selectedSpans = cachedTraceData.SelectedSpans
		traceRoots = cachedTraceData.TraceRoots
	}

	if err != nil {
		zap.L().Info("cache miss for getFlamegraphSpansForTrace", zap.String("traceID", traceID))

		searchScanResponses, err := r.GetSpansForTrace(ctx, traceID, fmt.Sprintf("SELECT timestamp, duration_nano, span_id, trace_id, has_error,references, resource_string_service$$name, name FROM %s.%s WHERE trace_id=$1 and ts_bucket_start>=$2 and ts_bucket_start<=$3 ORDER BY timestamp ASC, name ASC", r.TraceDB, r.traceTableName))
		if err != nil {
			return nil, err
		}
		if len(searchScanResponses) == 0 {
			return trace, nil
		}

		processingBeforeCache := time.Now()
		for _, item := range searchScanResponses {
			ref := []model.OtelSpanRef{}
			err := json.Unmarshal([]byte(item.References), &ref)
			if err != nil {
				zap.L().Error("Error unmarshalling references", zap.Error(err))
				return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("error in unmarshalling references: %w", err)}
			}

			jsonItem := model.FlamegraphSpan{
				SpanID:       item.SpanID,
				TraceID:      item.TraceID,
				ServiceName:  item.ServiceName,
				Name:         item.Name,
				DurationNano: item.DurationNano,
				HasError:     item.HasError,
				References:   ref,
				Children:     make([]*model.FlamegraphSpan, 0),
			}

			// metadata calculation
			startTimeUnixNano := uint64(item.TimeUnixNano.UnixNano())
			if startTime == 0 || startTimeUnixNano < startTime {
				startTime = startTimeUnixNano
			}
			if endTime == 0 || (startTimeUnixNano+jsonItem.DurationNano) > endTime {
				endTime = (startTimeUnixNano + jsonItem.DurationNano)
			}
			if durationNano == 0 || jsonItem.DurationNano > durationNano {
				durationNano = jsonItem.DurationNano
			}

			jsonItem.TimeUnixNano = uint64(item.TimeUnixNano.UnixNano() / 1000000)
			spanIdToSpanNodeMap[jsonItem.SpanID] = &jsonItem
		}

		// traverse through the map and append each node to the children array of the parent node
		// and add missing spans
		for _, spanNode := range spanIdToSpanNodeMap {
			hasParentSpanNode := false
			for _, reference := range spanNode.References {
				if reference.RefType == "CHILD_OF" && reference.SpanId != "" {
					hasParentSpanNode = true
					if parentNode, exists := spanIdToSpanNodeMap[reference.SpanId]; exists {
						parentNode.Children = append(parentNode.Children, spanNode)
					} else {
						// insert the missing spans
						missingSpan := model.FlamegraphSpan{
							SpanID:       reference.SpanId,
							TraceID:      spanNode.TraceID,
							ServiceName:  "",
							Name:         "Missing Span",
							TimeUnixNano: spanNode.TimeUnixNano,
							DurationNano: spanNode.DurationNano,
							HasError:     false,
							Children:     make([]*model.FlamegraphSpan, 0),
						}
						missingSpan.Children = append(missingSpan.Children, spanNode)
						spanIdToSpanNodeMap[missingSpan.SpanID] = &missingSpan
						traceRoots = append(traceRoots, &missingSpan)
					}
				}
			}
			if !hasParentSpanNode && !tracedetail.ContainsFlamegraphSpan(traceRoots, spanNode) {
				traceRoots = append(traceRoots, spanNode)
			}
		}

		selectedSpans = tracedetail.GetSelectedSpansForFlamegraph(traceRoots, spanIdToSpanNodeMap)
		traceCache := model.GetFlamegraphSpansForTraceCache{
			StartTime:     startTime,
			EndTime:       endTime,
			DurationNano:  durationNano,
			SelectedSpans: selectedSpans,
			TraceRoots:    traceRoots,
		}

		zap.L().Info("getFlamegraphSpansForTrace: processing pre cache", zap.Duration("duration", time.Since(processingBeforeCache)), zap.String("traceID", traceID))
		cacheErr := r.cache.Store(ctx, fmt.Sprintf("getFlamegraphSpansForTrace-%v", traceID), &traceCache, time.Minute*5)
		if cacheErr != nil {
			zap.L().Debug("failed to store cache for getFlamegraphSpansForTrace", zap.String("traceID", traceID), zap.Error(err))
		}
	}

	processingPostCache := time.Now()
	selectedSpansForRequest := tracedetail.GetSelectedSpansForFlamegraphForRequest(req.SelectedSpanID, selectedSpans, startTime, endTime)
	zap.L().Info("getFlamegraphSpansForTrace: processing post cache", zap.Duration("duration", time.Since(processingPostCache)), zap.String("traceID", traceID))

	trace.Spans = selectedSpansForRequest
	trace.StartTimestampMillis = startTime / 1000000
	trace.EndTimestampMillis = endTime / 1000000
	return trace, nil
}

func (r *ClickHouseReader) GetDependencyGraph(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceMapDependencyResponseItem, error) {

	response := []model.ServiceMapDependencyResponseItem{}

	args := []interface{}{}
	args = append(args,
		clickhouse.Named("start", uint64(queryParams.Start.Unix())),
		clickhouse.Named("end", uint64(queryParams.End.Unix())),
		clickhouse.Named("duration", uint64(queryParams.End.Unix()-queryParams.Start.Unix())),
	)

	query := fmt.Sprintf(`
		WITH
			quantilesMergeState(0.5, 0.75, 0.9, 0.95, 0.99)(duration_quantiles_state) AS duration_quantiles_state,
			finalizeAggregation(duration_quantiles_state) AS result
		SELECT
			src as parent,
			dest as child,
			result[1] AS p50,
			result[2] AS p75,
			result[3] AS p90,
			result[4] AS p95,
			result[5] AS p99,
			sum(total_count) as callCount,
			sum(total_count)/ @duration AS callRate,
			sum(error_count)/sum(total_count) * 100 as errorRate
		FROM %s.%s
		WHERE toUInt64(toDateTime(timestamp)) >= @start AND toUInt64(toDateTime(timestamp)) <= @end`,
		r.TraceDB, r.dependencyGraphTable,
	)

	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	filterQuery, filterArgs := services.BuildServiceMapQuery(tags)
	query += filterQuery + " GROUP BY src, dest;"
	args = append(args, filterArgs...)

	zap.L().Debug("GetDependencyGraph query", zap.String("query", query), zap.Any("args", args))

	err := r.db.Select(ctx, &response, query, args...)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query %w", err)
	}

	return &response, nil
}

func getLocalTableName(tableName string) string {

	tableNameSplit := strings.Split(tableName, ".")
	return tableNameSplit[0] + "." + strings.Split(tableNameSplit[1], "distributed_")[1]

}

func (r *ClickHouseReader) SetTTLLogsV2(ctx context.Context, params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// Keep only latest 100 transactions/requests
	r.deleteTtlTransactions(ctx, 100)
	// uuid is used as transaction id
	uuidWithHyphen := uuid.New()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}

	tableNameArray := []string{r.logsDB + "." + r.logsLocalTableV2, r.logsDB + "." + r.logsResourceLocalTableV2}

	// check if there is existing things to be done
	for _, tableName := range tableNameArray {
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending {
			return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
		}
	}

	// TTL query for logs_v2 table
	ttlLogsV2 := fmt.Sprintf(
		"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(timestamp / 1000000000) + "+
			"INTERVAL %v SECOND DELETE", tableNameArray[0], r.cluster, params.DelDuration)
	if len(params.ColdStorageVolume) > 0 {
		ttlLogsV2 += fmt.Sprintf(", toDateTime(timestamp / 1000000000)"+
			" + INTERVAL %v SECOND TO VOLUME '%s'",
			params.ToColdStorageDuration, params.ColdStorageVolume)
	}

	// TTL query for logs_v2_resource table
	// adding 1800 as our bucket size is 1800 seconds
	ttlLogsV2Resource := fmt.Sprintf(
		"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + "+
			"INTERVAL %v SECOND DELETE", tableNameArray[1], r.cluster, params.DelDuration)
	if len(params.ColdStorageVolume) > 0 {
		ttlLogsV2Resource += fmt.Sprintf(", toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + "+
			"INTERVAL %v SECOND TO VOLUME '%s'",
			params.ToColdStorageDuration, params.ColdStorageVolume)
	}

	ttlPayload := map[string]string{
		tableNameArray[0]: ttlLogsV2,
		tableNameArray[1]: ttlLogsV2Resource,
	}

	// set the ttl if nothing is pending/ no errors
	go func(ttlPayload map[string]string) {
		for tableName, query := range ttlPayload {
			// https://github.com/SigNoz/signoz/issues/5470
			// we will change ttl for only the new parts and not the old ones
			query += " SETTINGS materialize_ttl_after_modify=0"

			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.L().Error("error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}

			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			zap.L().Info("Executing TTL request: ", zap.String("request", query))
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, query); err != nil {
				zap.L().Error("error while setting ttl", zap.Error(err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}

	}(ttlPayload)
	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) SetTTLTracesV2(ctx context.Context, params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// uuid is used as transaction id
	uuidWithHyphen := uuid.New()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)
	tableNames := []string{
		r.TraceDB + "." + r.traceTableName,
		r.TraceDB + "." + r.traceResourceTableV3,
		r.TraceDB + "." + signozErrorIndexTable,
		r.TraceDB + "." + signozUsageExplorerTable,
		r.TraceDB + "." + defaultDependencyGraphTable,
		r.TraceDB + "." + r.traceSummaryTable,
	}

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}

	// check if there is existing things to be done
	for _, tableName := range tableNames {
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending {
			return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
		}
	}

	// TTL query
	ttlV2 := "ALTER TABLE %s ON CLUSTER %s MODIFY TTL toDateTime(%s) + INTERVAL %v SECOND DELETE"
	ttlV2ColdStorage := ", toDateTime(%s) + INTERVAL %v SECOND TO VOLUME '%s'"

	// TTL query for resource table
	ttlV2Resource := "ALTER TABLE %s ON CLUSTER %s MODIFY TTL toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + INTERVAL %v SECOND DELETE"
	ttlTracesV2ResourceColdStorage := ", toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + INTERVAL %v SECOND TO VOLUME '%s'"

	for _, distributedTableName := range tableNames {
		go func(distributedTableName string) {
			tableName := getLocalTableName(distributedTableName)

			// for trace summary table, we need to use end instead of timestamp
			timestamp := "timestamp"
			if strings.HasSuffix(distributedTableName, r.traceSummaryTable) {
				timestamp = "end"
			}

			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.L().Error("Error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}
			req := fmt.Sprintf(ttlV2, tableName, r.cluster, timestamp, params.DelDuration)
			if strings.HasSuffix(distributedTableName, r.traceResourceTableV3) {
				req = fmt.Sprintf(ttlV2Resource, tableName, r.cluster, params.DelDuration)
			}

			if len(params.ColdStorageVolume) > 0 {
				if strings.HasSuffix(distributedTableName, r.traceResourceTableV3) {
					req += fmt.Sprintf(ttlTracesV2ResourceColdStorage, params.ToColdStorageDuration, params.ColdStorageVolume)
				} else {
					req += fmt.Sprintf(ttlV2ColdStorage, timestamp, params.ToColdStorageDuration, params.ColdStorageVolume)
				}
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("Error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			req += " SETTINGS materialize_ttl_after_modify=0;"
			zap.L().Error(" ExecutingTTL request: ", zap.String("request", req))
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.L().Error("Error in executing set TTL query", zap.Error(err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}(distributedTableName)
	}
	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

// SetTTL sets the TTL for traces or metrics or logs tables.
// This is an async API which creates goroutines to set TTL.
// Status of TTL update is tracked with ttl_status table in sqlite db.
// SetTTL sets the TTL for traces or metrics or logs tables.
// This is an async API which creates goroutines to set TTL.
// Status of TTL update is tracked with ttl_status table in sqlite db.
func (r *ClickHouseReader) SetTTL(ctx context.Context,
	params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// Keep only latest 100 transactions/requests
	r.deleteTtlTransactions(ctx, 100)
	// uuid is used as transaction id
	uuidWithHyphen := uuid.New()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}

	switch params.Type {
	case constants.TraceTTL:
		if r.useTraceNewSchema {
			return r.SetTTLTracesV2(ctx, params)
		}

		tableNames := []string{
			signozTraceDBName + "." + signozTraceTableName,
			signozTraceDBName + "." + signozDurationMVTable,
			signozTraceDBName + "." + signozSpansTable,
			signozTraceDBName + "." + signozErrorIndexTable,
			signozTraceDBName + "." + signozUsageExplorerTable,
			signozTraceDBName + "." + defaultDependencyGraphTable,
		}
		for _, tableName := range tableNames {
			tableName := getLocalTableName(tableName)
			statusItem, err := r.checkTTLStatusItem(ctx, tableName)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
			}
			if statusItem.Status == constants.StatusPending {
				return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
			}
		}
		for _, tableName := range tableNames {
			tableName := getLocalTableName(tableName)
			// TODO: DB queries should be implemented with transactional statements but currently clickhouse doesn't support them. Issue: https://github.com/ClickHouse/ClickHouse/issues/22086
			go func(tableName string) {
				_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
				if dbErr != nil {
					zap.L().Error("Error in inserting to ttl_status table", zap.Error(dbErr))
					return
				}
				req := fmt.Sprintf(
					"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(timestamp) + INTERVAL %v SECOND DELETE",
					tableName, r.cluster, params.DelDuration)
				if len(params.ColdStorageVolume) > 0 {
					req += fmt.Sprintf(", toDateTime(timestamp) + INTERVAL %v SECOND TO VOLUME '%s'",
						params.ToColdStorageDuration, params.ColdStorageVolume)
				}
				err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
				if err != nil {
					zap.L().Error("Error in setting cold storage", zap.Error(err))
					statusItem, err := r.checkTTLStatusItem(ctx, tableName)
					if err == nil {
						_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
						if dbErr != nil {
							zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
							return
						}
					}
					return
				}
				req += " SETTINGS materialize_ttl_after_modify=0;"
				zap.L().Error("Executing TTL request: ", zap.String("request", req))
				statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
				if err := r.db.Exec(context.Background(), req); err != nil {
					zap.L().Error("Error in executing set TTL query", zap.Error(err))
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
					return
				}
				_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
			}(tableName)
		}

	case constants.MetricsTTL:
		tableNames := []string{
			signozMetricDBName + "." + signozSampleLocalTableName,
			signozMetricDBName + "." + signozSamplesAgg5mLocalTableName,
			signozMetricDBName + "." + signozSamplesAgg30mLocalTableName,
			signozMetricDBName + "." + signozExpHistLocalTableName,
			signozMetricDBName + "." + signozTSLocalTableNameV4,
			signozMetricDBName + "." + signozTSLocalTableNameV46Hrs,
			signozMetricDBName + "." + signozTSLocalTableNameV41Day,
			signozMetricDBName + "." + signozTSLocalTableNameV41Week,
		}
		for _, tableName := range tableNames {
			statusItem, err := r.checkTTLStatusItem(ctx, tableName)
			if err != nil {
				return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
			}
			if statusItem.Status == constants.StatusPending {
				return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
			}
		}
		metricTTL := func(tableName string) {
			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.L().Error("Error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}
			timeColumn := "timestamp_ms"
			if strings.Contains(tableName, "v4") || strings.Contains(tableName, "exp_hist") {
				timeColumn = "unix_milli"
			}

			req := fmt.Sprintf(
				"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(toUInt32(%s / 1000), 'UTC') + "+
					"INTERVAL %v SECOND DELETE", tableName, r.cluster, timeColumn, params.DelDuration)
			if len(params.ColdStorageVolume) > 0 {
				req += fmt.Sprintf(", toDateTime(toUInt32(%s / 1000), 'UTC')"+
					" + INTERVAL %v SECOND TO VOLUME '%s'",
					timeColumn, params.ToColdStorageDuration, params.ColdStorageVolume)
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("Error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			req += " SETTINGS materialize_ttl_after_modify=0"
			zap.L().Info("Executing TTL request: ", zap.String("request", req))
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.L().Error("error while setting ttl.", zap.Error(err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}
		for _, tableName := range tableNames {
			go metricTTL(tableName)
		}
	case constants.LogsTTL:
		if r.useLogsNewSchema {
			return r.SetTTLLogsV2(ctx, params)
		}

		tableName := r.logsDB + "." + r.logsLocalTable
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending {
			return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
		}
		go func(tableName string) {
			_, dbErr := r.localDB.Exec("INSERT INTO ttl_status (transaction_id, created_at, updated_at, table_name, ttl, status, cold_storage_ttl) VALUES (?, ?, ?, ?, ?, ?, ?)", uuid, time.Now(), time.Now(), tableName, params.DelDuration, constants.StatusPending, coldStorageDuration)
			if dbErr != nil {
				zap.L().Error("error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}
			req := fmt.Sprintf(
				"ALTER TABLE %v ON CLUSTER %s MODIFY TTL toDateTime(timestamp / 1000000000) + "+
					"INTERVAL %v SECOND DELETE", tableName, r.cluster, params.DelDuration)
			if len(params.ColdStorageVolume) > 0 {
				req += fmt.Sprintf(", toDateTime(timestamp / 1000000000)"+
					" + INTERVAL %v SECOND TO VOLUME '%s'",
					params.ToColdStorageDuration, params.ColdStorageVolume)
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, tableName)
				if err == nil {
					_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			req += " SETTINGS materialize_ttl_after_modify=0"
			zap.L().Info("Executing TTL request: ", zap.String("request", req))
			statusItem, _ := r.checkTTLStatusItem(ctx, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.L().Error("error while setting ttl", zap.Error(err))
				_, dbErr := r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusFailed, statusItem.Id)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.localDB.Exec("UPDATE ttl_status SET updated_at = ?, status = ? WHERE id = ?", time.Now(), constants.StatusSuccess, statusItem.Id)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}(tableName)

	default:
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while setting ttl. ttl type should be <metrics|traces>, got %v",
			params.Type)}
	}

	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) deleteTtlTransactions(_ context.Context, numberOfTransactionsStore int) {
	_, err := r.localDB.Exec("DELETE FROM ttl_status WHERE transaction_id NOT IN (SELECT distinct transaction_id FROM ttl_status ORDER BY created_at DESC LIMIT ?)", numberOfTransactionsStore)
	if err != nil {
		zap.L().Error("Error in processing ttl_status delete sql query", zap.Error(err))
	}
}

// checkTTLStatusItem checks if ttl_status table has an entry for the given table name
func (r *ClickHouseReader) checkTTLStatusItem(_ context.Context, tableName string) (model.TTLStatusItem, *model.ApiError) {
	statusItem := []model.TTLStatusItem{}

	query := `SELECT id, status, ttl, cold_storage_ttl FROM ttl_status WHERE table_name = ? ORDER BY created_at DESC`

	zap.L().Info("checkTTLStatusItem query", zap.String("query", query), zap.String("tableName", tableName))

	stmt, err := r.localDB.Preparex(query)

	if err != nil {
		zap.L().Error("Error preparing query for checkTTLStatusItem", zap.Error(err))
		return model.TTLStatusItem{}, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}

	err = stmt.Select(&statusItem, tableName)

	if len(statusItem) == 0 {
		return model.TTLStatusItem{}, nil
	}
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return model.TTLStatusItem{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
	}
	return statusItem[0], nil
}

// setTTLQueryStatus fetches ttl_status table status from DB
func (r *ClickHouseReader) setTTLQueryStatus(ctx context.Context, tableNameArray []string) (string, *model.ApiError) {
	failFlag := false
	status := constants.StatusSuccess
	for _, tableName := range tableNameArray {
		statusItem, err := r.checkTTLStatusItem(ctx, tableName)
		emptyStatusStruct := model.TTLStatusItem{}
		if statusItem == emptyStatusStruct {
			return "", nil
		}
		if err != nil {
			return "", &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending && statusItem.UpdatedAt.Unix()-time.Now().Unix() < 3600 {
			status = constants.StatusPending
			return status, nil
		}
		if statusItem.Status == constants.StatusFailed {
			failFlag = true
		}
	}
	if failFlag {
		status = constants.StatusFailed
	}

	return status, nil
}

func (r *ClickHouseReader) setColdStorage(ctx context.Context, tableName string, coldStorageVolume string) *model.ApiError {

	// Set the storage policy for the required table. If it is already set, then setting it again
	// will not a problem.
	if len(coldStorageVolume) > 0 {
		policyReq := fmt.Sprintf("ALTER TABLE %s ON CLUSTER %s MODIFY SETTING storage_policy='tiered'", tableName, r.cluster)

		zap.L().Info("Executing Storage policy request: ", zap.String("request", policyReq))
		if err := r.db.Exec(ctx, policyReq); err != nil {
			zap.L().Error("error while setting storage policy", zap.Error(err))
			return &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while setting storage policy. Err=%v", err)}
		}
	}
	return nil
}

// GetDisks returns a list of disks {name, type} configured in clickhouse DB.
func (r *ClickHouseReader) GetDisks(ctx context.Context) (*[]model.DiskItem, *model.ApiError) {
	diskItems := []model.DiskItem{}

	query := "SELECT name,type FROM system.disks"
	if err := r.db.Select(ctx, &diskItems, query); err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting disks. Err=%v", err)}
	}

	return &diskItems, nil
}

func getLocalTableNameArray(tableNames []string) []string {
	var localTableNames []string
	for _, name := range tableNames {
		tableNameSplit := strings.Split(name, ".")
		localTableNames = append(localTableNames, tableNameSplit[0]+"."+strings.Split(tableNameSplit[1], "distributed_")[1])
	}
	return localTableNames
}

// GetTTL returns current ttl, expected ttl and past setTTL status for metrics/traces.
func (r *ClickHouseReader) GetTTL(ctx context.Context, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError) {

	parseTTL := func(queryResp string) (int, int) {

		zap.L().Info("Parsing TTL from: ", zap.String("queryResp", queryResp))
		deleteTTLExp := regexp.MustCompile(`toIntervalSecond\(([0-9]*)\)`)
		moveTTLExp := regexp.MustCompile(`toIntervalSecond\(([0-9]*)\) TO VOLUME`)

		var delTTL, moveTTL int = -1, -1

		m := deleteTTLExp.FindStringSubmatch(queryResp)
		if len(m) > 1 {
			seconds_int, err := strconv.Atoi(m[1])
			if err != nil {
				return -1, -1
			}
			delTTL = seconds_int / 3600
		}

		m = moveTTLExp.FindStringSubmatch(queryResp)
		if len(m) > 1 {
			seconds_int, err := strconv.Atoi(m[1])
			if err != nil {
				return -1, -1
			}
			moveTTL = seconds_int / 3600
		}

		return delTTL, moveTTL
	}

	getMetricsTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp []model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v'", signozSampleLocalTableName)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.L().Error("error while getting ttl", zap.Error(err))
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		if len(dbResp) == 0 {
			return nil, nil
		} else {
			return &dbResp[0], nil
		}
	}

	getTracesTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp []model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v' AND database='%v'", r.traceLocalTableName, signozTraceDBName)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.L().Error("error while getting ttl", zap.Error(err))
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		if len(dbResp) == 0 {
			return nil, nil
		} else {
			return &dbResp[0], nil
		}
	}

	getLogsTTL := func() (*model.DBResponseTTL, *model.ApiError) {
		var dbResp []model.DBResponseTTL

		query := fmt.Sprintf("SELECT engine_full FROM system.tables WHERE name='%v' AND database='%v'", r.logsLocalTableName, r.logsDB)

		err := r.db.Select(ctx, &dbResp, query)

		if err != nil {
			zap.L().Error("error while getting ttl", zap.Error(err))
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. Err=%v", err)}
		}
		if len(dbResp) == 0 {
			return nil, nil
		} else {
			return &dbResp[0], nil
		}
	}

	switch ttlParams.Type {
	case constants.TraceTTL:
		tableNameArray := []string{signozTraceDBName + "." + signozTraceTableName, signozTraceDBName + "." + signozDurationMVTable, signozTraceDBName + "." + signozSpansTable, signozTraceDBName + "." + signozErrorIndexTable, signozTraceDBName + "." + signozUsageExplorerTable, signozTraceDBName + "." + defaultDependencyGraphTable}

		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getTracesTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTtl != -1 {
			ttlQuery.ColdStorageTtl = ttlQuery.ColdStorageTtl / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{TracesTime: delTTL, TracesMoveTime: moveTTL, ExpectedTracesTime: ttlQuery.TTL, ExpectedTracesMoveTime: ttlQuery.ColdStorageTtl, Status: status}, nil

	case constants.MetricsTTL:
		tableNameArray := []string{signozMetricDBName + "." + signozSampleTableName}
		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getMetricsTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTtl != -1 {
			ttlQuery.ColdStorageTtl = ttlQuery.ColdStorageTtl / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{MetricsTime: delTTL, MetricsMoveTime: moveTTL, ExpectedMetricsTime: ttlQuery.TTL, ExpectedMetricsMoveTime: ttlQuery.ColdStorageTtl, Status: status}, nil

	case constants.LogsTTL:
		tableNameArray := []string{r.logsDB + "." + r.logsTable}
		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getLogsTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTtl != -1 {
			ttlQuery.ColdStorageTtl = ttlQuery.ColdStorageTtl / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{LogsTime: delTTL, LogsMoveTime: moveTTL, ExpectedLogsTime: ttlQuery.TTL, ExpectedLogsMoveTime: ttlQuery.ColdStorageTtl, Status: status}, nil

	default:
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while getting ttl. ttl type should be metrics|traces, got %v",
			ttlParams.Type)}
	}

}

func (r *ClickHouseReader) ListErrors(ctx context.Context, queryParams *model.ListErrorsParams) (*[]model.Error, *model.ApiError) {

	var getErrorResponses []model.Error

	query := "SELECT any(exceptionMessage) as exceptionMessage, count() AS exceptionCount, min(timestamp) as firstSeen, max(timestamp) as lastSeen, groupID"
	if len(queryParams.ServiceName) != 0 {
		query = query + ", serviceName"
	} else {
		query = query + ", any(serviceName) as serviceName"
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + ", exceptionType"
	} else {
		query = query + ", any(exceptionType) as exceptionType"
	}
	query += fmt.Sprintf(" FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}

	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName ilike @serviceName"
		args = append(args, clickhouse.Named("serviceName", "%"+queryParams.ServiceName+"%"))
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + " AND exceptionType ilike @exceptionType"
		args = append(args, clickhouse.Named("exceptionType", "%"+queryParams.ExceptionType+"%"))
	}

	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)

	if errStatus != nil {
		zap.L().Error("Error in processing tags", zap.Error(errStatus))
		return nil, errStatus
	}
	query = query + " GROUP BY groupID"
	if len(queryParams.ServiceName) != 0 {
		query = query + ", serviceName"
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + ", exceptionType"
	}
	if len(queryParams.OrderParam) != 0 {
		if queryParams.Order == constants.Descending {
			query = query + " ORDER BY " + queryParams.OrderParam + " DESC"
		} else if queryParams.Order == constants.Ascending {
			query = query + " ORDER BY " + queryParams.OrderParam + " ASC"
		}
	}
	if queryParams.Limit > 0 {
		query = query + " LIMIT @limit"
		args = append(args, clickhouse.Named("limit", queryParams.Limit))
	}

	if queryParams.Offset > 0 {
		query = query + " OFFSET @offset"
		args = append(args, clickhouse.Named("offset", queryParams.Offset))
	}

	err := r.db.Select(ctx, &getErrorResponses, query, args...)
	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	return &getErrorResponses, nil
}

func (r *ClickHouseReader) CountErrors(ctx context.Context, queryParams *model.CountErrorsParams) (uint64, *model.ApiError) {

	var errorCount uint64

	query := fmt.Sprintf("SELECT count(distinct(groupID)) FROM %s.%s WHERE timestamp >= @timestampL AND timestamp <= @timestampU", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("timestampL", strconv.FormatInt(queryParams.Start.UnixNano(), 10)), clickhouse.Named("timestampU", strconv.FormatInt(queryParams.End.UnixNano(), 10))}
	if len(queryParams.ServiceName) != 0 {
		query = query + " AND serviceName ilike @serviceName"
		args = append(args, clickhouse.Named("serviceName", "%"+queryParams.ServiceName+"%"))
	}
	if len(queryParams.ExceptionType) != 0 {
		query = query + " AND exceptionType ilike @exceptionType"
		args = append(args, clickhouse.Named("exceptionType", "%"+queryParams.ExceptionType+"%"))
	}

	// create TagQuery from TagQueryParams
	tags := createTagQueryFromTagQueryParams(queryParams.Tags)
	subQuery, argsSubQuery, errStatus := buildQueryWithTagParams(ctx, tags)
	query += subQuery
	args = append(args, argsSubQuery...)

	if errStatus != nil {
		zap.L().Error("Error in processing tags", zap.Error(errStatus))
		return 0, errStatus
	}

	err := r.db.QueryRow(ctx, query, args...).Scan(&errorCount)
	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return 0, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	return errorCount, nil
}

func (r *ClickHouseReader) GetErrorFromErrorID(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.L().Error("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var getErrorWithSpanReponse []model.ErrorWithSpan

	query := fmt.Sprintf("SELECT errorID, exceptionType, exceptionStacktrace, exceptionEscaped, exceptionMessage, timestamp, spanID, traceID, serviceName, groupID FROM %s.%s WHERE timestamp = @timestamp AND groupID = @groupID AND errorID = @errorID LIMIT 1", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)
	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetErrorFromGroupID(ctx context.Context, queryParams *model.GetErrorParams) (*model.ErrorWithSpan, *model.ApiError) {

	var getErrorWithSpanReponse []model.ErrorWithSpan

	query := fmt.Sprintf("SELECT errorID, exceptionType, exceptionStacktrace, exceptionEscaped, exceptionMessage, timestamp, spanID, traceID, serviceName, groupID FROM %s.%s WHERE timestamp = @timestamp AND groupID = @groupID LIMIT 1", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getErrorWithSpanReponse, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}

	if len(getErrorWithSpanReponse) > 0 {
		return &getErrorWithSpanReponse[0], nil
	} else {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("Error/Exception not found")}
	}

}

func (r *ClickHouseReader) GetNextPrevErrorIDs(ctx context.Context, queryParams *model.GetErrorParams) (*model.NextPrevErrorIDs, *model.ApiError) {

	if queryParams.ErrorID == "" {
		zap.L().Error("errorId missing from params")
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: fmt.Errorf("ErrorID missing from params")}
	}
	var err *model.ApiError
	getNextPrevErrorIDsResponse := model.NextPrevErrorIDs{
		GroupID: queryParams.GroupID,
	}
	getNextPrevErrorIDsResponse.NextErrorID, getNextPrevErrorIDsResponse.NextTimestamp, err = r.getNextErrorID(ctx, queryParams)
	if err != nil {
		zap.L().Error("Unable to get next error ID due to err: ", zap.Error(err))
		return nil, err
	}
	getNextPrevErrorIDsResponse.PrevErrorID, getNextPrevErrorIDsResponse.PrevTimestamp, err = r.getPrevErrorID(ctx, queryParams)
	if err != nil {
		zap.L().Error("Unable to get prev error ID due to err: ", zap.Error(err))
		return nil, err
	}
	return &getNextPrevErrorIDsResponse, nil

}

func (r *ClickHouseReader) getNextErrorID(ctx context.Context, queryParams *model.GetErrorParams) (string, time.Time, *model.ApiError) {

	var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

	query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp >= @timestamp AND errorID != @errorID ORDER BY timestamp ASC LIMIT 2", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}
	if len(getNextErrorIDReponse) == 0 {
		zap.L().Info("NextErrorID not found")
		return "", time.Time{}, nil
	} else if len(getNextErrorIDReponse) == 1 {
		zap.L().Info("NextErrorID found")
		return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
	} else {
		if getNextErrorIDReponse[0].Timestamp.UnixNano() == getNextErrorIDReponse[1].Timestamp.UnixNano() {
			var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

			query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp = @timestamp AND errorID > @errorID ORDER BY errorID ASC LIMIT 1", r.TraceDB, r.errorTable)
			args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

			err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

			zap.L().Info(query)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
			}
			if len(getNextErrorIDReponse) == 0 {
				var getNextErrorIDReponse []model.NextPrevErrorIDsDBResponse

				query := fmt.Sprintf("SELECT errorID as nextErrorID, timestamp as nextTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp > @timestamp ORDER BY timestamp ASC LIMIT 1", r.TraceDB, r.errorTable)
				args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

				err := r.db.Select(ctx, &getNextErrorIDReponse, query, args...)

				zap.L().Info(query)

				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
				}

				if len(getNextErrorIDReponse) == 0 {
					zap.L().Info("NextErrorID not found")
					return "", time.Time{}, nil
				} else {
					zap.L().Info("NextErrorID found")
					return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
				}
			} else {
				zap.L().Info("NextErrorID found")
				return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
			}
		} else {
			zap.L().Info("NextErrorID found")
			return getNextErrorIDReponse[0].NextErrorID, getNextErrorIDReponse[0].NextTimestamp, nil
		}
	}
}

func (r *ClickHouseReader) getPrevErrorID(ctx context.Context, queryParams *model.GetErrorParams) (string, time.Time, *model.ApiError) {

	var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

	query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp <= @timestamp AND errorID != @errorID ORDER BY timestamp DESC LIMIT 2", r.TraceDB, r.errorTable)
	args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

	err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
	}
	if len(getPrevErrorIDReponse) == 0 {
		zap.L().Info("PrevErrorID not found")
		return "", time.Time{}, nil
	} else if len(getPrevErrorIDReponse) == 1 {
		zap.L().Info("PrevErrorID found")
		return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
	} else {
		if getPrevErrorIDReponse[0].Timestamp.UnixNano() == getPrevErrorIDReponse[1].Timestamp.UnixNano() {
			var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

			query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp = @timestamp AND errorID < @errorID ORDER BY errorID DESC LIMIT 1", r.TraceDB, r.errorTable)
			args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

			err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

			zap.L().Info(query)

			if err != nil {
				zap.L().Error("Error in processing sql query", zap.Error(err))
				return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
			}
			if len(getPrevErrorIDReponse) == 0 {
				var getPrevErrorIDReponse []model.NextPrevErrorIDsDBResponse

				query := fmt.Sprintf("SELECT errorID as prevErrorID, timestamp as prevTimestamp FROM %s.%s WHERE groupID = @groupID AND timestamp < @timestamp ORDER BY timestamp DESC LIMIT 1", r.TraceDB, r.errorTable)
				args := []interface{}{clickhouse.Named("errorID", queryParams.ErrorID), clickhouse.Named("groupID", queryParams.GroupID), clickhouse.Named("timestamp", strconv.FormatInt(queryParams.Timestamp.UnixNano(), 10))}

				err := r.db.Select(ctx, &getPrevErrorIDReponse, query, args...)

				zap.L().Info(query)

				if err != nil {
					zap.L().Error("Error in processing sql query", zap.Error(err))
					return "", time.Time{}, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing sql query")}
				}

				if len(getPrevErrorIDReponse) == 0 {
					zap.L().Info("PrevErrorID not found")
					return "", time.Time{}, nil
				} else {
					zap.L().Info("PrevErrorID found")
					return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
				}
			} else {
				zap.L().Info("PrevErrorID found")
				return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
			}
		} else {
			zap.L().Info("PrevErrorID found")
			return getPrevErrorIDReponse[0].PrevErrorID, getPrevErrorIDReponse[0].PrevTimestamp, nil
		}
	}
}

func (r *ClickHouseReader) GetTotalSpans(ctx context.Context) (uint64, error) {

	var totalSpans uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s;", signozTraceDBName, r.traceTableName)
	r.db.QueryRow(ctx, queryStr).Scan(&totalSpans)

	return totalSpans, nil
}

func (r *ClickHouseReader) GetSpansInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (uint64, error) {

	var spansInLastHeartBeatInterval uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d));", signozTraceDBName, signozSpansTable, int(interval.Minutes()))
	if r.useTraceNewSchema {
		queryStr = fmt.Sprintf("SELECT count() from %s.%s where ts_bucket_start >= toUInt64(toUnixTimestamp(now() - toIntervalMinute(%d))) - 1800 and timestamp > toUnixTimestamp(now()-toIntervalMinute(%d));", signozTraceDBName, r.traceTableName, int(interval.Minutes()), int(interval.Minutes()))
	}
	r.db.QueryRow(ctx, queryStr).Scan(&spansInLastHeartBeatInterval)

	return spansInLastHeartBeatInterval, nil
}

func (r *ClickHouseReader) GetTotalLogs(ctx context.Context) (uint64, error) {

	var totalLogs uint64

	queryStr := fmt.Sprintf("SELECT count() from %s.%s;", r.logsDB, r.logsTableName)
	r.db.QueryRow(ctx, queryStr).Scan(&totalLogs)

	return totalLogs, nil
}

func (r *ClickHouseReader) FetchTemporality(ctx context.Context, metricNames []string) (map[string]map[v3.Temporality]bool, error) {

	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)

	query := fmt.Sprintf(`SELECT DISTINCT metric_name, temporality FROM %s.%s WHERE metric_name IN $1`, signozMetricDBName, signozTSTableNameV41Day)

	rows, err := r.db.Query(ctx, query, metricNames)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var metricName, temporality string
		err := rows.Scan(&metricName, &temporality)
		if err != nil {
			return nil, err
		}
		if _, ok := metricNameToTemporality[metricName]; !ok {
			metricNameToTemporality[metricName] = make(map[v3.Temporality]bool)
		}
		metricNameToTemporality[metricName][v3.Temporality(temporality)] = true
	}
	return metricNameToTemporality, nil
}

func (r *ClickHouseReader) GetTimeSeriesInfo(ctx context.Context) (map[string]interface{}, error) {

	queryStr := fmt.Sprintf("SELECT countDistinct(fingerprint) as count from %s.%s where metric_name not like 'signoz_%%' group by metric_name order by count desc;", signozMetricDBName, signozTSTableNameV41Day)

	rows, _ := r.db.Query(ctx, queryStr)

	var totalTS uint64
	totalTS = 0

	var maxTS uint64
	maxTS = 0

	count := 0
	for rows.Next() {

		var value uint64
		rows.Scan(&value)
		totalTS += value
		if count == 0 {
			maxTS = value
		}
		count += 1
	}

	timeSeriesData := map[string]interface{}{}
	timeSeriesData["totalTS"] = totalTS
	timeSeriesData["maxTS"] = maxTS

	return timeSeriesData, nil
}

func (r *ClickHouseReader) GetSamplesInfoInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (uint64, error) {

	var totalSamples uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where metric_name not like 'signoz_%%' and unix_milli > toUnixTimestamp(now()-toIntervalMinute(%d))*1000;", signozMetricDBName, signozSampleTableName, int(interval.Minutes()))

	r.db.QueryRow(ctx, queryStr).Scan(&totalSamples)

	return totalSamples, nil
}

func (r *ClickHouseReader) GetTotalSamples(ctx context.Context) (uint64, error) {
	var totalSamples uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where metric_name not like 'signoz_%%';", signozMetricDBName, signozSampleTableName)

	r.db.QueryRow(ctx, queryStr).Scan(&totalSamples)

	return totalSamples, nil
}

func (r *ClickHouseReader) GetDistributedInfoInLastHeartBeatInterval(ctx context.Context) (map[string]interface{}, error) {

	clusterInfo := []model.ClusterInfo{}

	queryStr := `SELECT shard_num, shard_weight, replica_num, errors_count, slowdowns_count, estimated_recovery_time FROM system.clusters where cluster='cluster';`
	r.db.Select(ctx, &clusterInfo, queryStr)
	if len(clusterInfo) == 1 {
		return clusterInfo[0].GetMapFromStruct(), nil
	}

	return nil, nil
}

func (r *ClickHouseReader) GetLogsInfoInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (uint64, error) {

	var totalLogLines uint64

	queryStr := fmt.Sprintf("select count() from %s.%s where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d))*1000000000;", r.logsDB, r.logsTableV2, int(interval.Minutes()))

	err := r.db.QueryRow(ctx, queryStr).Scan(&totalLogLines)

	return totalLogLines, err
}

func (r *ClickHouseReader) GetTagsInfoInLastHeartBeatInterval(ctx context.Context, interval time.Duration) (*model.TagsInfo, error) {
	queryStr := fmt.Sprintf(`select serviceName, stringTagMap['deployment.environment'] as env, 
	stringTagMap['telemetry.sdk.language'] as language from %s.%s 
	where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d))
	group by serviceName, env, language;`, r.TraceDB, r.traceTableName, int(interval.Minutes()))

	if r.useTraceNewSchema {
		queryStr = fmt.Sprintf(`select serviceName, resources_string['deployment.environment'] as env, 
	resources_string['telemetry.sdk.language'] as language from %s.%s 
	where timestamp > toUnixTimestamp(now()-toIntervalMinute(%d))
	group by serviceName, env, language;`, r.TraceDB, r.traceTableName, int(interval.Minutes()))
	}

	tagTelemetryDataList := []model.TagTelemetryData{}
	err := r.db.Select(ctx, &tagTelemetryDataList, queryStr)

	if err != nil {
		zap.L().Error("Error in processing sql query: ", zap.Error(err))
		return nil, err
	}

	tagsInfo := model.TagsInfo{
		Languages: make(map[string]interface{}),
		Services:  make(map[string]interface{}),
	}

	for _, tagTelemetryData := range tagTelemetryDataList {

		if len(tagTelemetryData.ServiceName) != 0 && strings.Contains(tagTelemetryData.ServiceName, "prod") {
			tagsInfo.Env = tagTelemetryData.ServiceName
		}
		if len(tagTelemetryData.Env) != 0 && strings.Contains(tagTelemetryData.Env, "prod") {
			tagsInfo.Env = tagTelemetryData.Env
		}
		if len(tagTelemetryData.Language) != 0 {
			tagsInfo.Languages[tagTelemetryData.Language] = struct{}{}
		}
		if len(tagTelemetryData.ServiceName) != 0 {
			tagsInfo.Services[tagTelemetryData.ServiceName] = struct{}{}
		}

	}

	return &tagsInfo, nil
}

// remove this after sometime
func removeUnderscoreDuplicateFields(fields []model.Field) []model.Field {
	lookup := map[string]model.Field{}
	for _, v := range fields {
		lookup[v.Name+v.DataType] = v
	}

	for k := range lookup {
		if strings.Contains(k, ".") {
			delete(lookup, strings.ReplaceAll(k, ".", "_"))
		}
	}

	updatedFields := []model.Field{}
	for _, v := range lookup {
		updatedFields = append(updatedFields, v)
	}
	return updatedFields
}

func (r *ClickHouseReader) GetLogFields(ctx context.Context) (*model.GetFieldsResponse, *model.ApiError) {
	// response will contain top level fields from the otel log model
	response := model.GetFieldsResponse{
		Selected:    constants.StaticSelectedLogFields,
		Interesting: []model.Field{},
	}

	// get attribute keys
	attributes := []model.Field{}
	query := fmt.Sprintf("SELECT DISTINCT name, datatype from %s.%s group by name, datatype", r.logsDB, r.logsAttributeKeys)
	err := r.db.Select(ctx, &attributes, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	// get resource keys
	resources := []model.Field{}
	query = fmt.Sprintf("SELECT DISTINCT name, datatype from %s.%s group by name, datatype", r.logsDB, r.logsResourceKeys)
	err = r.db.Select(ctx, &resources, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	//remove this code after sometime
	attributes = removeUnderscoreDuplicateFields(attributes)
	resources = removeUnderscoreDuplicateFields(resources)

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsLocalTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	r.extractSelectedAndInterestingFields(statements[0].Statement, constants.Attributes, &attributes, &response)
	r.extractSelectedAndInterestingFields(statements[0].Statement, constants.Resources, &resources, &response)

	return &response, nil
}

func (r *ClickHouseReader) extractSelectedAndInterestingFields(tableStatement string, overrideFieldType string, fields *[]model.Field, response *model.GetFieldsResponse) {
	for _, field := range *fields {
		if overrideFieldType != "" {
			field.Type = overrideFieldType
		}
		// all static fields are assumed to be selected as we don't allow changing them
		if isColumn(r.useLogsNewSchema, tableStatement, field.Type, field.Name, field.DataType) {
			response.Selected = append(response.Selected, field)
		} else {
			response.Interesting = append(response.Interesting, field)
		}
	}
}

func (r *ClickHouseReader) UpdateLogFieldV2(ctx context.Context, field *model.UpdateField) *model.ApiError {
	if !field.Selected {
		return model.ForbiddenError(errors.New("removing a selected field is not allowed, please reach out to support."))
	}

	colname := utils.GetClickhouseColumnNameV2(field.Type, field.DataType, field.Name)

	dataType := strings.ToLower(field.DataType)
	if dataType == "int64" || dataType == "float64" {
		dataType = "number"
	}
	attrColName := fmt.Sprintf("%s_%s", field.Type, dataType)
	for _, table := range []string{r.logsLocalTableV2, r.logsTableV2} {
		q := "ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s` %s DEFAULT %s['%s'] CODEC(ZSTD(1))"
		query := fmt.Sprintf(q,
			r.logsDB, table,
			r.cluster,
			colname, field.DataType,
			attrColName,
			field.Name,
		)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}

		query = fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s_exists` bool DEFAULT if(mapContains(%s, '%s') != 0, true, false) CODEC(ZSTD(1))",
			r.logsDB, table,
			r.cluster,
			colname,
			attrColName,
			field.Name,
		)
		err = r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
	}

	// create the index
	if strings.ToLower(field.DataType) == "bool" {
		// there is no point in creating index for bool attributes as the cardinality is just 2
		return nil
	}

	if field.IndexType == "" {
		field.IndexType = constants.DefaultLogSkipIndexType
	}
	if field.IndexGranularity == 0 {
		field.IndexGranularity = constants.DefaultLogSkipIndexGranularity
	}
	query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD INDEX IF NOT EXISTS `%s_idx` (`%s`) TYPE %s  GRANULARITY %d",
		r.logsDB, r.logsLocalTableV2,
		r.cluster,
		colname,
		colname,
		field.IndexType,
		field.IndexGranularity,
	)
	err := r.db.Exec(ctx, query)
	if err != nil {
		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	return nil
}

func (r *ClickHouseReader) UpdateLogField(ctx context.Context, field *model.UpdateField) *model.ApiError {
	// don't allow updating static fields
	if field.Type == constants.Static {
		err := errors.New("cannot update static fields")
		return &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	if r.useLogsNewSchema {
		return r.UpdateLogFieldV2(ctx, field)
	}

	// if a field is selected it means that the field needs to be indexed
	if field.Selected {
		colname := utils.GetClickhouseColumnName(field.Type, field.DataType, field.Name)

		keyColName := fmt.Sprintf("%s_%s_key", field.Type, strings.ToLower(field.DataType))
		valueColName := fmt.Sprintf("%s_%s_value", field.Type, strings.ToLower(field.DataType))

		// create materialized column

		for _, table := range []string{r.logsLocalTable, r.logsTable} {
			q := "ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS %s %s DEFAULT %s[indexOf(%s, '%s')] CODEC(ZSTD(1))"
			query := fmt.Sprintf(q,
				r.logsDB, table,
				r.cluster,
				colname, field.DataType,
				valueColName,
				keyColName,
				field.Name,
			)
			err := r.db.Exec(ctx, query)
			if err != nil {
				return &model.ApiError{Err: err, Typ: model.ErrorInternal}
			}

			query = fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS %s_exists` bool DEFAULT if(indexOf(%s, '%s') != 0, true, false) CODEC(ZSTD(1))",
				r.logsDB, table,
				r.cluster,
				strings.TrimSuffix(colname, "`"),
				keyColName,
				field.Name,
			)
			err = r.db.Exec(ctx, query)
			if err != nil {
				return &model.ApiError{Err: err, Typ: model.ErrorInternal}
			}
		}

		// create the index
		if strings.ToLower(field.DataType) == "bool" {
			// there is no point in creating index for bool attributes as the cardinality is just 2
			return nil
		}

		if field.IndexType == "" {
			field.IndexType = constants.DefaultLogSkipIndexType
		}
		if field.IndexGranularity == 0 {
			field.IndexGranularity = constants.DefaultLogSkipIndexGranularity
		}
		query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD INDEX IF NOT EXISTS %s_idx` (%s) TYPE %s  GRANULARITY %d",
			r.logsDB, r.logsLocalTable,
			r.cluster,
			strings.TrimSuffix(colname, "`"),
			colname,
			field.IndexType,
			field.IndexGranularity,
		)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}

	} else {
		// We are not allowing to delete a materialized column
		// For more details please check https://github.com/SigNoz/signoz/issues/4566
		return model.ForbiddenError(errors.New("Removing a selected field is not allowed, please reach out to support."))

		// Delete the index first
		// query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s DROP INDEX IF EXISTS %s_idx`", r.logsDB, r.logsLocalTable, r.cluster, strings.TrimSuffix(colname, "`"))
		// err := r.db.Exec(ctx, query)
		// if err != nil {
		// 	return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		// }

		// for _, table := range []string{r.logsTable, r.logsLocalTable} {
		// 	// drop materialized column from logs table
		// 	query := "ALTER TABLE %s.%s ON CLUSTER %s DROP COLUMN IF EXISTS %s "
		// 	err := r.db.Exec(ctx, fmt.Sprintf(query,
		// 		r.logsDB, table,
		// 		r.cluster,
		// 		colname,
		// 	),
		// 	)
		// 	if err != nil {
		// 		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		// 	}

		// 	// drop exists column on logs table
		// 	query = "ALTER TABLE %s.%s ON CLUSTER %s DROP COLUMN IF EXISTS %s_exists` "
		// 	err = r.db.Exec(ctx, fmt.Sprintf(query,
		// 		r.logsDB, table,
		// 		r.cluster,
		// 		strings.TrimSuffix(colname, "`"),
		// 	),
		// 	)
		// 	if err != nil {
		// 		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		// 	}
		// }
	}
	return nil
}

func (r *ClickHouseReader) GetTraceFields(ctx context.Context) (*model.GetFieldsResponse, *model.ApiError) {
	// response will contain top level fields from the otel trace model
	response := model.GetFieldsResponse{
		Selected:    []model.Field{},
		Interesting: []model.Field{},
	}

	// get the top level selected fields
	for _, field := range constants.NewStaticFieldsTraces {
		if (v3.AttributeKey{} == field) {
			continue
		}
		response.Selected = append(response.Selected, model.Field{
			Name:     field.Key,
			DataType: field.DataType.String(),
			Type:     constants.Static,
		})
	}

	// get attribute keys
	attributes := []model.Field{}
	query := fmt.Sprintf("SELECT tagKey, tagType, dataType from %s.%s group by tagKey, tagType, dataType", r.TraceDB, r.spanAttributesKeysTable)
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	defer rows.Close()

	var tagKey string
	var dataType string
	var tagType string
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType); err != nil {
			return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
		attributes = append(attributes, model.Field{
			Name:     tagKey,
			DataType: dataType,
			Type:     tagType,
		})
	}

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.TraceDB, r.traceLocalTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	r.extractSelectedAndInterestingFields(statements[0].Statement, "", &attributes, &response)

	return &response, nil

}

func (r *ClickHouseReader) UpdateTraceField(ctx context.Context, field *model.UpdateField) *model.ApiError {
	if !field.Selected {
		return model.ForbiddenError(errors.New("removing a selected field is not allowed, please reach out to support."))
	}

	// name of the materialized column
	colname := utils.GetClickhouseColumnNameV2(field.Type, field.DataType, field.Name)

	field.DataType = strings.ToLower(field.DataType)

	// dataType and chDataType of the materialized column
	var dataTypeMap = map[string]string{
		"string":  "string",
		"bool":    "bool",
		"int64":   "number",
		"float64": "number",
	}
	var chDataTypeMap = map[string]string{
		"string":  "String",
		"bool":    "Bool",
		"int64":   "Float64",
		"float64": "Float64",
	}
	chDataType := chDataTypeMap[field.DataType]
	dataType := dataTypeMap[field.DataType]

	// typeName: tag => attributes, resource => resources
	typeName := field.Type
	if field.Type == string(v3.AttributeKeyTypeTag) {
		typeName = constants.Attributes
	} else if field.Type == string(v3.AttributeKeyTypeResource) {
		typeName = constants.Resources
	}

	attrColName := fmt.Sprintf("%s_%s", typeName, dataType)
	for _, table := range []string{r.traceLocalTableName, r.traceTableName} {
		q := "ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s` %s DEFAULT %s['%s'] CODEC(ZSTD(1))"
		query := fmt.Sprintf(q,
			r.TraceDB, table,
			r.cluster,
			colname, chDataType,
			attrColName,
			field.Name,
		)
		err := r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}

		query = fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s_exists` bool DEFAULT if(mapContains(%s, '%s') != 0, true, false) CODEC(ZSTD(1))",
			r.TraceDB, table,
			r.cluster,
			colname,
			attrColName,
			field.Name,
		)
		err = r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
	}

	// create the index
	if strings.ToLower(field.DataType) == "bool" {
		// there is no point in creating index for bool attributes as the cardinality is just 2
		return nil
	}

	if field.IndexType == "" {
		field.IndexType = constants.DefaultLogSkipIndexType
	}
	if field.IndexGranularity == 0 {
		field.IndexGranularity = constants.DefaultLogSkipIndexGranularity
	}
	query := fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD INDEX IF NOT EXISTS `%s_idx` (`%s`) TYPE %s  GRANULARITY %d",
		r.TraceDB, r.traceLocalTableName,
		r.cluster,
		colname,
		colname,
		field.IndexType,
		field.IndexGranularity,
	)
	err := r.db.Exec(ctx, query)
	if err != nil {
		return &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	// add a default minmax index for numbers
	if dataType == "number" {
		query = fmt.Sprintf("ALTER TABLE %s.%s ON CLUSTER %s ADD INDEX IF NOT EXISTS `%s_minmax_idx` (`%s`) TYPE minmax  GRANULARITY 1",
			r.TraceDB, r.traceLocalTableName,
			r.cluster,
			colname,
			colname,
		)
		err = r.db.Exec(ctx, query)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorInternal}
		}
	}

	return nil
}

func (r *ClickHouseReader) GetLogs(ctx context.Context, params *model.LogsFilterParams) (*[]model.SignozLog, *model.ApiError) {
	response := []model.SignozLog{}
	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	isPaginatePrev := logs.CheckIfPrevousPaginateAndModifyOrder(params)
	filterSql, lenFilters, err := logs.GenerateSQLWhere(fields, params)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	data := map[string]interface{}{
		"lenFilters": lenFilters,
	}
	if lenFilters != 0 {
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LOGS_FILTERS, data, claims.Email, true, false)
		}
	}

	query := fmt.Sprintf("%s from %s.%s", constants.LogsSQLSelect, r.logsDB, r.logsTable)

	if filterSql != "" {
		query = fmt.Sprintf("%s where %s", query, filterSql)
	}

	query = fmt.Sprintf("%s order by %s %s limit %d", query, params.OrderBy, params.Order, params.Limit)
	err = r.db.Select(ctx, &response, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}
	if isPaginatePrev {
		// rever the results from db
		for i, j := 0, len(response)-1; i < j; i, j = i+1, j-1 {
			response[i], response[j] = response[j], response[i]
		}
	}
	return &response, nil
}

func (r *ClickHouseReader) TailLogs(ctx context.Context, client *model.LogsTailClient) {

	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		client.Error <- apiErr.Err
		return
	}

	filterSql, lenFilters, err := logs.GenerateSQLWhere(fields, &model.LogsFilterParams{
		Query: client.Filter.Query,
	})

	data := map[string]interface{}{
		"lenFilters": lenFilters,
	}
	if lenFilters != 0 {
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LOGS_FILTERS, data, claims.Email, true, false)
		}
	}

	if err != nil {
		client.Error <- err
		return
	}

	query := fmt.Sprintf("%s from %s.%s", constants.LogsSQLSelect, r.logsDB, r.logsTable)

	tsStart := uint64(time.Now().UnixNano())
	if client.Filter.TimestampStart != 0 {
		tsStart = client.Filter.TimestampStart
	}

	var idStart string
	if client.Filter.IdGt != "" {
		idStart = client.Filter.IdGt
	}

	ticker := time.NewTicker(time.Duration(r.liveTailRefreshSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			zap.L().Debug("closing go routine : " + client.Name)
			return
		case <-ticker.C:
			// get the new 100 logs as anything more older won't make sense
			tmpQuery := fmt.Sprintf("%s where timestamp >='%d'", query, tsStart)
			if filterSql != "" {
				tmpQuery = fmt.Sprintf("%s and %s", tmpQuery, filterSql)
			}
			if idStart != "" {
				tmpQuery = fmt.Sprintf("%s and id > '%s'", tmpQuery, idStart)
			}
			tmpQuery = fmt.Sprintf("%s order by timestamp desc, id desc limit 100", tmpQuery)
			response := []model.SignozLog{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.L().Error("Error while getting logs", zap.Error(err))
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				select {
				case <-ctx.Done():
					done := true
					client.Done <- &done
					zap.L().Debug("closing go routine while sending logs : " + client.Name)
					return
				default:
					client.Logs <- &response[i]
					if i == 0 {
						tsStart = response[i].Timestamp
						idStart = response[i].ID
					}
				}
			}
		}
	}
}

func (r *ClickHouseReader) AggregateLogs(ctx context.Context, params *model.LogsAggregateParams) (*model.GetLogsAggregatesResponse, *model.ApiError) {
	logAggregatesDBResponseItems := []model.LogsAggregatesDBResponseItem{}

	function := "toFloat64(count()) as value"
	if params.Function != "" {
		function = fmt.Sprintf("toFloat64(%s) as value", params.Function)
	}

	fields, apiErr := r.GetLogFields(ctx)
	if apiErr != nil {
		return nil, apiErr
	}

	filterSql, lenFilters, err := logs.GenerateSQLWhere(fields, &model.LogsFilterParams{
		Query: params.Query,
	})
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorBadData}
	}

	data := map[string]interface{}{
		"lenFilters": lenFilters,
	}
	if lenFilters != 0 {
		claims, ok := authtypes.ClaimsFromContext(ctx)
		if ok {
			telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_LOGS_FILTERS, data, claims.Email, true, false)
		}
	}

	query := ""
	if params.GroupBy != "" {
		query = fmt.Sprintf("SELECT toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(timestamp/1000000000), INTERVAL %d minute))*1000000000) as ts_start_interval, toString(%s) as groupBy, "+
			"%s "+
			"FROM %s.%s WHERE (timestamp >= '%d' AND timestamp <= '%d' )",
			params.StepSeconds/60, params.GroupBy, function, r.logsDB, r.logsTable, params.TimestampStart, params.TimestampEnd)
	} else {
		query = fmt.Sprintf("SELECT toInt64(toUnixTimestamp(toStartOfInterval(toDateTime(timestamp/1000000000), INTERVAL %d minute))*1000000000) as ts_start_interval, "+
			"%s "+
			"FROM %s.%s WHERE (timestamp >= '%d' AND timestamp <= '%d' )",
			params.StepSeconds/60, function, r.logsDB, r.logsTable, params.TimestampStart, params.TimestampEnd)
	}
	if filterSql != "" {
		query = fmt.Sprintf("%s AND ( %s ) ", query, filterSql)
	}
	if params.GroupBy != "" {
		query = fmt.Sprintf("%s GROUP BY ts_start_interval, toString(%s) as groupBy ORDER BY ts_start_interval", query, params.GroupBy)
	} else {
		query = fmt.Sprintf("%s GROUP BY ts_start_interval ORDER BY ts_start_interval", query)
	}

	err = r.db.Select(ctx, &logAggregatesDBResponseItems, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	aggregateResponse := model.GetLogsAggregatesResponse{
		Items: make(map[int64]model.LogsAggregatesResponseItem),
	}

	for i := range logAggregatesDBResponseItems {
		if elem, ok := aggregateResponse.Items[int64(logAggregatesDBResponseItems[i].Timestamp)]; ok {
			if params.GroupBy != "" && logAggregatesDBResponseItems[i].GroupBy != "" {
				elem.GroupBy[logAggregatesDBResponseItems[i].GroupBy] = logAggregatesDBResponseItems[i].Value
			}
			aggregateResponse.Items[logAggregatesDBResponseItems[i].Timestamp] = elem
		} else {
			if params.GroupBy != "" && logAggregatesDBResponseItems[i].GroupBy != "" {
				aggregateResponse.Items[logAggregatesDBResponseItems[i].Timestamp] = model.LogsAggregatesResponseItem{
					Timestamp: logAggregatesDBResponseItems[i].Timestamp,
					GroupBy:   map[string]interface{}{logAggregatesDBResponseItems[i].GroupBy: logAggregatesDBResponseItems[i].Value},
				}
			} else if params.GroupBy == "" {
				aggregateResponse.Items[logAggregatesDBResponseItems[i].Timestamp] = model.LogsAggregatesResponseItem{
					Timestamp: logAggregatesDBResponseItems[i].Timestamp,
					Value:     logAggregatesDBResponseItems[i].Value,
				}
			}
		}

	}

	return &aggregateResponse, nil
}

func (r *ClickHouseReader) QueryDashboardVars(ctx context.Context, query string) (*model.DashboardVar, error) {
	var result = model.DashboardVar{VariableValues: make([]interface{}, 0)}
	rows, err := r.db.Query(ctx, query)

	zap.L().Info(query)

	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, err
	}

	var (
		columnTypes = rows.ColumnTypes()
		vars        = make([]interface{}, len(columnTypes))
	)
	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
	}

	defer rows.Close()
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		for _, v := range vars {
			switch v := v.(type) {
			case *string, *int8, *int16, *int32, *int64, *uint8, *uint16, *uint32, *uint64, *float32, *float64, *time.Time, *bool:
				result.VariableValues = append(result.VariableValues, reflect.ValueOf(v).Elem().Interface())
			default:
				return nil, fmt.Errorf("unsupported value type encountered")
			}
		}
	}
	return &result, nil
}

func (r *ClickHouseReader) GetMetricAggregateAttributes(
	ctx context.Context,
	req *v3.AggregateAttributeRequest,
	skipDotNames bool,
) (*v3.AggregateAttributeResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.AggregateAttributeResponse

	query = fmt.Sprintf("SELECT metric_name, type, is_monotonic, temporality FROM %s.%s WHERE metric_name ILIKE $1 GROUP BY metric_name, type, is_monotonic, temporality", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText))

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	seen := make(map[string]struct{})

	var metricName, typ, temporality string
	var isMonotonic bool
	for rows.Next() {
		if err := rows.Scan(&metricName, &typ, &isMonotonic, &temporality); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		if skipDotNames && strings.Contains(metricName, ".") {
			continue
		}

		// Non-monotonic cumulative sums are treated as gauges
		if typ == "Sum" && !isMonotonic && temporality == string(v3.Cumulative) {
			typ = "Gauge"
		}
		// unlike traces/logs `tag`/`resource` type, the `Type` will be metric type
		key := v3.AttributeKey{
			Key:      metricName,
			DataType: v3.AttributeKeyDataTypeFloat64,
			Type:     v3.AttributeKeyType(typ),
			IsColumn: true,
		}
		// remove duplicates
		if _, ok := seen[metricName+typ]; ok {
			continue
		}
		seen[metricName+typ] = struct{}{}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMetricAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	// skips the internal attributes i.e attributes starting with __
	query = fmt.Sprintf("SELECT arrayJoin(tagKeys) AS distinctTagKey FROM (SELECT JSONExtractKeys(labels) AS tagKeys FROM %s.%s WHERE metric_name=$1 AND unix_milli >= $2 GROUP BY tagKeys) WHERE distinctTagKey ILIKE $3 AND distinctTagKey NOT LIKE '\\_\\_%%' GROUP BY distinctTagKey", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, req.AggregateAttribute, common.PastDayRoundOff(), fmt.Sprintf("%%%s%%", req.SearchText))
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var attributeKey string
	for rows.Next() {
		if err := rows.Scan(&attributeKey); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      attributeKey,
			DataType: v3.AttributeKeyDataTypeString, // https://github.com/OpenObservability/OpenMetrics/blob/main/proto/openmetrics_data_model.proto#L64-L72.
			Type:     v3.AttributeKeyTypeTag,
			IsColumn: false,
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMetricAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var attributeValues v3.FilterAttributeValueResponse

	query = fmt.Sprintf("SELECT JSONExtractString(labels, $1) AS tagValue FROM %s.%s WHERE metric_name IN $2 AND JSONExtractString(labels, $3) ILIKE $4 AND unix_milli >= $5 GROUP BY tagValue", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	names := []string{req.AggregateAttribute}
	if _, ok := metrics.MetricsUnderTransition[req.AggregateAttribute]; ok {
		names = append(names, metrics.MetricsUnderTransition[req.AggregateAttribute])
	}

	rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, names, req.FilterAttributeKey, fmt.Sprintf("%%%s%%", req.SearchText), common.PastDayRoundOff())

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var atrributeValue string
	for rows.Next() {
		if err := rows.Scan(&atrributeValue); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		// https://github.com/OpenObservability/OpenMetrics/blob/main/proto/openmetrics_data_model.proto#L64-L72
		// this may change in future if we use OTLP as the data model
		attributeValues.StringAttributeValues = append(attributeValues.StringAttributeValues, atrributeValue)
	}

	return &attributeValues, nil
}

func (r *ClickHouseReader) GetMetricMetadata(ctx context.Context, metricName, serviceName string) (*v3.MetricMetadataResponse, error) {

	unixMilli := common.PastDayRoundOff()

	// Note: metric metadata should be accessible regardless of the time range selection
	// our standard retention period is 30 days, so we are querying the table v4_1_day to reduce the
	// amount of data scanned
	query := fmt.Sprintf("SELECT temporality, description, type, unit, is_monotonic from %s.%s WHERE metric_name=$1 AND unix_milli >= $2 GROUP BY temporality, description, type, unit, is_monotonic", signozMetricDBName, signozTSTableNameV41Day)
	rows, err := r.db.Query(ctx, query, metricName, unixMilli)
	if err != nil {
		zap.L().Error("Error while fetching metric metadata", zap.Error(err))
		return nil, fmt.Errorf("error while fetching metric metadata: %s", err.Error())
	}
	defer rows.Close()

	var deltaExists, isMonotonic bool
	var temporality, description, metricType, unit string
	for rows.Next() {
		if err := rows.Scan(&temporality, &description, &metricType, &unit, &isMonotonic); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		if temporality == string(v3.Delta) {
			deltaExists = true
		}
	}

	query = fmt.Sprintf("SELECT JSONExtractString(labels, 'le') as le from %s.%s WHERE metric_name=$1 AND unix_milli >= $2 AND type = 'Histogram' AND JSONExtractString(labels, 'service_name') = $3 GROUP BY le ORDER BY le", signozMetricDBName, signozTSTableNameV41Day)
	rows, err = r.db.Query(ctx, query, metricName, unixMilli, serviceName)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var leFloat64 []float64
	for rows.Next() {
		var leStr string
		if err := rows.Scan(&leStr); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		le, err := strconv.ParseFloat(leStr, 64)
		// ignore the error and continue if the value is not a float
		// ideally this should not happen but we have seen ClickHouse
		// returning empty string for some values
		if err != nil {
			zap.L().Error("error while parsing le value", zap.Error(err))
			continue
		}
		if math.IsInf(le, 0) {
			continue
		}
		leFloat64 = append(leFloat64, le)
	}

	return &v3.MetricMetadataResponse{
		Delta:       deltaExists,
		Le:          leFloat64,
		Description: description,
		Unit:        unit,
		Type:        metricType,
		IsMonotonic: isMonotonic,
		Temporality: temporality,
	}, nil
}

// GetCountOfThings returns the count of things in the query
// This is a generic function that can be used to check if any data exists for a given query
func (r *ClickHouseReader) GetCountOfThings(ctx context.Context, query string) (uint64, error) {
	var count uint64
	err := r.db.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *ClickHouseReader) GetLatestReceivedMetric(
	ctx context.Context, metricNames []string, labelValues map[string]string,
) (*model.MetricStatus, *model.ApiError) {
	// at least 1 metric name must be specified.
	// this query can be too slow otherwise.
	if len(metricNames) < 1 {
		return nil, model.BadRequest(fmt.Errorf("atleast 1 metric name must be specified"))
	}

	quotedMetricNames := []string{}
	for _, m := range metricNames {
		quotedMetricNames = append(quotedMetricNames, utils.ClickHouseFormattedValue(m))
	}
	commaSeparatedMetricNames := strings.Join(quotedMetricNames, ", ")

	whereClauseParts := []string{
		fmt.Sprintf(`metric_name in (%s)`, commaSeparatedMetricNames),
	}

	if labelValues != nil {
		for label, val := range labelValues {
			whereClauseParts = append(
				whereClauseParts,
				fmt.Sprintf(`JSONExtractString(labels, '%s') = '%s'`, label, val),
			)
		}
	}

	if len(whereClauseParts) < 1 {
		return nil, nil
	}

	whereClause := strings.Join(whereClauseParts, " AND ")

	query := fmt.Sprintf(`
		SELECT metric_name, anyLast(labels), max(unix_milli)
		from %s.%s
		where %s
		group by metric_name
		limit 1
		`, signozMetricDBName, signozTSTableNameV4, whereClause,
	)

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf(
			"couldn't query clickhouse for received metrics status: %w", err,
		))
	}
	defer rows.Close()

	var result *model.MetricStatus

	if rows.Next() {

		result = &model.MetricStatus{}
		var labelsJson string

		err := rows.Scan(
			&result.MetricName,
			&labelsJson,
			&result.LastReceivedTsMillis,
		)
		if err != nil {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't scan metric status row: %w", err,
			))
		}

		err = json.Unmarshal([]byte(labelsJson), &result.LastReceivedLabels)
		if err != nil {
			return nil, model.InternalError(fmt.Errorf(
				"couldn't unmarshal metric labels json: %w", err,
			))
		}
	}

	return result, nil
}

func isColumn(useLogsNewSchema bool, tableStatement, attrType, field, datType string) bool {
	// value of attrType will be `resource` or `tag`, if `tag` change it to `attribute`
	var name string
	if useLogsNewSchema {
		// adding explict '`'
		name = fmt.Sprintf("`%s`", utils.GetClickhouseColumnNameV2(attrType, datType, field))
	} else {
		name = utils.GetClickhouseColumnName(attrType, datType, field)
	}
	return strings.Contains(tableStatement, fmt.Sprintf("%s ", name))
}

func (r *ClickHouseReader) GetLogAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.AggregateAttributeResponse
	var stringAllowed bool

	where := ""
	switch req.Operator {
	case
		v3.AggregateOperatorCountDistinct,
		v3.AggregateOperatorCount:
		where = "tag_key ILIKE $1"
		stringAllowed = true
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRate,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorP05,
		v3.AggregateOperatorP10,
		v3.AggregateOperatorP20,
		v3.AggregateOperatorP25,
		v3.AggregateOperatorP50,
		v3.AggregateOperatorP75,
		v3.AggregateOperatorP90,
		v3.AggregateOperatorP95,
		v3.AggregateOperatorP99,
		v3.AggregateOperatorAvg,
		v3.AggregateOperatorSum,
		v3.AggregateOperatorMin,
		v3.AggregateOperatorMax:
		where = "tag_key ILIKE $1 AND (tag_data_type='int64' or tag_data_type='float64')"
		stringAllowed = false
	case
		v3.AggregateOperatorNoOp:
		return &v3.AggregateAttributeResponse{}, nil
	default:
		return nil, fmt.Errorf("unsupported aggregate operator")
	}

	query = fmt.Sprintf("SELECT DISTINCT(tag_key), tag_type, tag_data_type from %s.%s WHERE %s limit $2", r.logsDB, r.logsTagAttributeTableV2, where)
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), req.Limit)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsLocalTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching logs schema: %s", err.Error())
	}

	var tagKey string
	var dataType string
	var attType string
	for rows.Next() {
		if err := rows.Scan(&tagKey, &attType, &dataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(attType),
			IsColumn: isColumn(r.useLogsNewSchema, statements[0].Statement, attType, tagKey, dataType),
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}
	// add other attributes
	for _, field := range constants.StaticFieldsLogsV3 {
		if (!stringAllowed && field.DataType == v3.AttributeKeyDataTypeString) || (v3.AttributeKey{} == field) {
			continue
		} else if len(req.SearchText) == 0 || strings.Contains(field.Key, req.SearchText) {
			response.AttributeKeys = append(response.AttributeKeys, field)
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) GetLogAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	if len(req.SearchText) != 0 {
		query = fmt.Sprintf("select distinct tag_key, tag_type, tag_data_type from  %s.%s where tag_key ILIKE $1 limit $2", r.logsDB, r.logsTagAttributeTableV2)
		rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), req.Limit)
	} else {
		query = fmt.Sprintf("select distinct tag_key, tag_type, tag_data_type from  %s.%s limit $1", r.logsDB, r.logsTagAttributeTableV2)
		rows, err = r.db.Query(ctx, query, req.Limit)
	}

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.logsDB, r.logsLocalTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching logs schema: %s", err.Error())
	}

	var attributeKey string
	var attributeDataType string
	var tagType string
	for rows.Next() {
		if err := rows.Scan(&attributeKey, &tagType, &attributeDataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}

		key := v3.AttributeKey{
			Key:      attributeKey,
			DataType: v3.AttributeKeyDataType(attributeDataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn(r.useLogsNewSchema, statements[0].Statement, tagType, attributeKey, attributeDataType),
		}

		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	// add other attributes
	for _, f := range constants.StaticFieldsLogsV3 {
		if (v3.AttributeKey{} == f) {
			continue
		}
		if len(req.SearchText) == 0 || strings.Contains(f.Key, req.SearchText) {
			response.AttributeKeys = append(response.AttributeKeys, f)
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) GetLogAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	var err error
	var filterValueColumn string
	var rows driver.Rows
	var attributeValues v3.FilterAttributeValueResponse

	// if dataType or tagType is not present return empty response
	if len(req.FilterAttributeKeyDataType) == 0 || len(req.TagType) == 0 {
		// also check if it is not a top level key
		if _, ok := constants.StaticFieldsLogsV3[req.FilterAttributeKey]; !ok {
			return &v3.FilterAttributeValueResponse{}, nil
		}
	}

	// ignore autocomplete request for body
	if req.FilterAttributeKey == "body" || req.FilterAttributeKey == "__attrs" {
		return &v3.FilterAttributeValueResponse{}, nil
	}

	// if data type is bool, return true and false
	if req.FilterAttributeKeyDataType == v3.AttributeKeyDataTypeBool {
		return &v3.FilterAttributeValueResponse{
			BoolAttributeValues: []bool{true, false},
		}, nil
	}

	query := "select distinct"
	switch req.FilterAttributeKeyDataType {
	case v3.AttributeKeyDataTypeInt64:
		filterValueColumn = "number_value"
	case v3.AttributeKeyDataTypeFloat64:
		filterValueColumn = "number_value"
	case v3.AttributeKeyDataTypeString:
		filterValueColumn = "string_value"
	}

	searchText := fmt.Sprintf("%%%s%%", req.SearchText)

	// check if the tagKey is a topLevelColumn
	if _, ok := constants.StaticFieldsLogsV3[req.FilterAttributeKey]; ok {
		// query the column for the last 48 hours
		filterValueColumnWhere := req.FilterAttributeKey
		selectKey := req.FilterAttributeKey
		if req.FilterAttributeKeyDataType != v3.AttributeKeyDataTypeString {
			filterValueColumnWhere = fmt.Sprintf("toString(%s)", req.FilterAttributeKey)
			selectKey = fmt.Sprintf("toInt64(%s)", req.FilterAttributeKey)
		}

		// prepare the query and run
		if len(req.SearchText) != 0 {
			query = fmt.Sprintf("select distinct %s from %s.%s where timestamp >= toInt64(toUnixTimestamp(now() - INTERVAL 48 HOUR)*1000000000) and %s ILIKE $1 limit $2", selectKey, r.logsDB, r.logsLocalTableName, filterValueColumnWhere)
			rows, err = r.db.Query(ctx, query, searchText, req.Limit)
		} else {
			query = fmt.Sprintf("select distinct %s from %s.%s where timestamp >= toInt64(toUnixTimestamp(now() - INTERVAL 48 HOUR)*1000000000) limit $1", selectKey, r.logsDB, r.logsLocalTableName)
			rows, err = r.db.Query(ctx, query, req.Limit)
		}
	} else if len(req.SearchText) != 0 {
		filterValueColumnWhere := filterValueColumn
		if req.FilterAttributeKeyDataType != v3.AttributeKeyDataTypeString {
			filterValueColumnWhere = fmt.Sprintf("toString(%s)", filterValueColumn)
		}
		query = fmt.Sprintf("SELECT DISTINCT %s FROM %s.%s WHERE tag_key=$1 AND %s ILIKE $2 AND tag_type=$3 LIMIT $4", filterValueColumn, r.logsDB, r.logsTagAttributeTableV2, filterValueColumnWhere)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, searchText, req.TagType, req.Limit)
	} else {
		query = fmt.Sprintf("SELECT DISTINCT %s FROM %s.%s WHERE tag_key=$1 AND tag_type=$2 LIMIT $3", filterValueColumn, r.logsDB, r.logsTagAttributeTableV2)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, req.TagType, req.Limit)
	}

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var strAttributeValue string
	var float64AttributeValue sql.NullFloat64
	var int64AttributeValue sql.NullInt64
	for rows.Next() {
		switch req.FilterAttributeKeyDataType {
		case v3.AttributeKeyDataTypeInt64:
			if err := rows.Scan(&int64AttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			if int64AttributeValue.Valid {
				attributeValues.NumberAttributeValues = append(attributeValues.NumberAttributeValues, int64AttributeValue.Int64)
			}
		case v3.AttributeKeyDataTypeFloat64:
			if err := rows.Scan(&float64AttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			if float64AttributeValue.Valid {
				attributeValues.NumberAttributeValues = append(attributeValues.NumberAttributeValues, float64AttributeValue.Float64)
			}
		case v3.AttributeKeyDataTypeString:
			if err := rows.Scan(&strAttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			attributeValues.StringAttributeValues = append(attributeValues.StringAttributeValues, strAttributeValue)
		}
	}

	return &attributeValues, nil

}

func readRow(vars []interface{}, columnNames []string, countOfNumberCols int) ([]string, map[string]string, []map[string]string, *v3.Point) {
	// Each row will have a value and a timestamp, and an optional list of label values
	// example: {Timestamp: ..., Value: ...}
	// The timestamp may also not present in some cases where the time series is reduced to single value
	var point v3.Point

	// groupBy is a container to hold label values for the current point
	// example: ["frontend", "/fetch"]
	var groupBy []string

	var groupAttributesArray []map[string]string
	// groupAttributes is a container to hold the key-value pairs for the current
	// metric point.
	// example: {"serviceName": "frontend", "operation": "/fetch"}
	groupAttributes := make(map[string]string)

	isValidPoint := false

	for idx, v := range vars {
		colName := columnNames[idx]
		switch v := v.(type) {
		case *string:
			// special case for returning all labels in metrics datasource
			if colName == "fullLabels" {
				var metric map[string]string
				err := json.Unmarshal([]byte(*v), &metric)
				if err != nil {
					zap.L().Error("unexpected error encountered", zap.Error(err))
				}
				for key, val := range metric {
					groupBy = append(groupBy, val)
					if _, ok := groupAttributes[key]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{key: val})
					}
					groupAttributes[key] = val
				}
			} else {
				groupBy = append(groupBy, *v)
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: *v})
				}
				groupAttributes[colName] = *v
			}
		case *time.Time:
			point.Timestamp = v.UnixMilli()
		case *float64, *float32:
			if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
				isValidPoint = true
				point.Value = float64(reflect.ValueOf(v).Elem().Float())
			} else {
				groupBy = append(groupBy, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Float()))
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Float())})
				}
				groupAttributes[colName] = fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Float())
			}
		case **float64, **float32:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Float()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = value
				} else {
					groupBy = append(groupBy, fmt.Sprintf("%v", value))
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", value)})
					}
					groupAttributes[colName] = fmt.Sprintf("%v", value)
				}
			}
		case *uint, *uint8, *uint64, *uint16, *uint32:
			if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
				isValidPoint = true
				point.Value = float64(reflect.ValueOf(v).Elem().Uint())
			} else {
				groupBy = append(groupBy, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint()))
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint())})
				}
				groupAttributes[colName] = fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Uint())
			}
		case **uint, **uint8, **uint64, **uint16, **uint32:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Uint()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = float64(value)
				} else {
					groupBy = append(groupBy, fmt.Sprintf("%v", value))
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", value)})
					}
					groupAttributes[colName] = fmt.Sprintf("%v", value)
				}
			}
		case *int, *int8, *int16, *int32, *int64:
			if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
				isValidPoint = true
				point.Value = float64(reflect.ValueOf(v).Elem().Int())
			} else {
				groupBy = append(groupBy, fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int()))
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int())})
				}
				groupAttributes[colName] = fmt.Sprintf("%v", reflect.ValueOf(v).Elem().Int())
			}
		case **int, **int8, **int16, **int32, **int64:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Int()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = float64(value)
				} else {
					groupBy = append(groupBy, fmt.Sprintf("%v", value))
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", value)})
					}
					groupAttributes[colName] = fmt.Sprintf("%v", value)
				}
			}
		case *bool:
			groupBy = append(groupBy, fmt.Sprintf("%v", *v))
			if _, ok := groupAttributes[colName]; !ok {
				groupAttributesArray = append(groupAttributesArray, map[string]string{colName: fmt.Sprintf("%v", *v)})
			}
			groupAttributes[colName] = fmt.Sprintf("%v", *v)

		default:
			zap.L().Error("unsupported var type found in query builder query result", zap.Any("v", v), zap.String("colName", colName))
		}
	}
	if isValidPoint {
		return groupBy, groupAttributes, groupAttributesArray, &point
	}
	return groupBy, groupAttributes, groupAttributesArray, nil
}

func readRowsForTimeSeriesResult(rows driver.Rows, vars []interface{}, columnNames []string, countOfNumberCols int) ([]*v3.Series, error) {
	// when groupBy is applied, each combination of cartesian product
	// of attribute values is a separate series. Each item in seriesToPoints
	// represent a unique series where the key is sorted attribute values joined
	// by "," and the value is the list of points for that series

	// For instance, group by (serviceName, operation)
	// with two services and three operations in each will result in (maximum of) 6 series
	// ("frontend", "order") x ("/fetch", "/fetch/{Id}", "/order")
	//
	// ("frontend", "/fetch")
	// ("frontend", "/fetch/{Id}")
	// ("frontend", "/order")
	// ("order", "/fetch")
	// ("order", "/fetch/{Id}")
	// ("order", "/order")
	seriesToPoints := make(map[string][]v3.Point)
	var keys []string
	// seriesToAttrs is a mapping of key to a map of attribute key to attribute value
	// for each series. This is used to populate the series' attributes
	// For instance, for the above example, the seriesToAttrs will be
	// {
	//   "frontend,/fetch": {"serviceName": "frontend", "operation": "/fetch"},
	//   "frontend,/fetch/{Id}": {"serviceName": "frontend", "operation": "/fetch/{Id}"},
	//   "frontend,/order": {"serviceName": "frontend", "operation": "/order"},
	//   "order,/fetch": {"serviceName": "order", "operation": "/fetch"},
	//   "order,/fetch/{Id}": {"serviceName": "order", "operation": "/fetch/{Id}"},
	//   "order,/order": {"serviceName": "order", "operation": "/order"},
	// }
	seriesToAttrs := make(map[string]map[string]string)
	labelsArray := make(map[string][]map[string]string)
	for rows.Next() {
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		groupBy, groupAttributes, groupAttributesArray, metricPoint := readRow(vars, columnNames, countOfNumberCols)
		// skip the point if the value is NaN or Inf
		// are they ever useful enough to be returned?
		if metricPoint != nil && (math.IsNaN(metricPoint.Value) || math.IsInf(metricPoint.Value, 0)) {
			continue
		}
		sort.Strings(groupBy)
		key := strings.Join(groupBy, "")
		if _, exists := seriesToAttrs[key]; !exists {
			keys = append(keys, key)
		}
		seriesToAttrs[key] = groupAttributes
		labelsArray[key] = groupAttributesArray
		if metricPoint != nil {
			seriesToPoints[key] = append(seriesToPoints[key], *metricPoint)
		}
	}

	var seriesList []*v3.Series
	for _, key := range keys {
		points := seriesToPoints[key]
		series := v3.Series{Labels: seriesToAttrs[key], Points: points, LabelsArray: labelsArray[key]}
		seriesList = append(seriesList, &series)
	}
	return seriesList, getPersonalisedError(rows.Err())
}

func logCommentKVs(ctx context.Context) map[string]string {
	kv := ctx.Value(common.LogCommentKey)
	if kv == nil {
		return nil
	}
	logCommentKVs, ok := kv.(map[string]string)
	if !ok {
		return nil
	}
	return logCommentKVs
}

// GetTimeSeriesResultV3 runs the query and returns list of time series
func (r *ClickHouseReader) GetTimeSeriesResultV3(ctx context.Context, query string) ([]*v3.Series, error) {

	ctxArgs := map[string]interface{}{"query": query}
	for k, v := range logCommentKVs(ctx) {
		ctxArgs[k] = v
	}

	defer utils.Elapsed("GetTimeSeriesResultV3", ctxArgs)()

	// Hook up query progress reporting if requested.
	queryId := ctx.Value("queryId")
	if queryId != nil {
		qid, ok := queryId.(string)
		if !ok {
			zap.L().Error("GetTimeSeriesResultV3: queryId in ctx not a string as expected", zap.Any("queryId", queryId))

		} else {
			ctx = clickhouse.Context(ctx, clickhouse.WithProgress(
				func(p *clickhouse.Progress) {
					go func() {
						err := r.queryProgressTracker.ReportQueryProgress(qid, p)
						if err != nil {
							zap.L().Error(
								"Couldn't report query progress",
								zap.String("queryId", qid), zap.Error(err),
							)
						}
					}()
				},
			))
		}
	}

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("error while reading time series result", zap.Error(err))
		return nil, errors.New(err.Error())
	}
	defer rows.Close()

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
		vars        = make([]interface{}, len(columnTypes))
	)
	var countOfNumberCols int

	for i := range columnTypes {
		vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
		switch columnTypes[i].ScanType().Kind() {
		case reflect.Float32,
			reflect.Float64,
			reflect.Uint,
			reflect.Uint8,
			reflect.Uint16,
			reflect.Uint32,
			reflect.Uint64,
			reflect.Int,
			reflect.Int8,
			reflect.Int16,
			reflect.Int32,
			reflect.Int64:
			countOfNumberCols++
		}
	}

	return readRowsForTimeSeriesResult(rows, vars, columnNames, countOfNumberCols)
}

// GetListResultV3 runs the query and returns list of rows
func (r *ClickHouseReader) GetListResultV3(ctx context.Context, query string) ([]*v3.Row, error) {

	ctxArgs := map[string]interface{}{"query": query}
	for k, v := range logCommentKVs(ctx) {
		ctxArgs[k] = v
	}

	defer utils.Elapsed("GetListResultV3", ctxArgs)()

	rows, err := r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("error while reading time series result", zap.Error(err))
		return nil, errors.New(err.Error())
	}
	defer rows.Close()

	var (
		columnTypes = rows.ColumnTypes()
		columnNames = rows.Columns()
	)

	var rowList []*v3.Row

	for rows.Next() {
		var vars = make([]interface{}, len(columnTypes))
		for i := range columnTypes {
			vars[i] = reflect.New(columnTypes[i].ScanType()).Interface()
		}
		if err := rows.Scan(vars...); err != nil {
			return nil, err
		}
		row := map[string]interface{}{}
		var t time.Time
		for idx, v := range vars {
			if columnNames[idx] == "timestamp" {
				switch v := v.(type) {
				case *uint64:
					t = time.Unix(0, int64(*v))
				case *time.Time:
					t = *v
				}
			} else if columnNames[idx] == "timestamp_datetime" {
				t = *v.(*time.Time)
			} else if columnNames[idx] == "events" {
				var events []map[string]interface{}
				eventsFromDB, ok := v.(*[]string)
				if !ok {
					continue
				}
				for _, event := range *eventsFromDB {
					var eventMap map[string]interface{}
					json.Unmarshal([]byte(event), &eventMap)
					events = append(events, eventMap)
				}
				row[columnNames[idx]] = events
			} else {
				row[columnNames[idx]] = v
			}
		}

		// remove duplicate _ attributes for logs.
		// remove this function after a month
		removeDuplicateUnderscoreAttributes(row)

		rowList = append(rowList, &v3.Row{Timestamp: t, Data: row})
	}

	return rowList, getPersonalisedError(rows.Err())

}

func getPersonalisedError(err error) error {
	if err == nil {
		return nil
	}
	zap.L().Error("error while reading result", zap.Error(err))
	if strings.Contains(err.Error(), "code: 307") {
		return chErrors.ErrResourceBytesLimitExceeded
	}

	if strings.Contains(err.Error(), "code: 159") {
		return chErrors.ErrResourceTimeLimitExceeded
	}
	return err
}

func removeDuplicateUnderscoreAttributes(row map[string]interface{}) {
	if val, ok := row["attributes_int64"]; ok {
		attributes := val.(*map[string]int64)
		for key := range *attributes {
			if strings.Contains(key, ".") {
				uKey := strings.ReplaceAll(key, ".", "_")
				delete(*attributes, uKey)
			}
		}

	}

	if val, ok := row["attributes_float64"]; ok {
		attributes := val.(*map[string]float64)
		for key := range *attributes {
			if strings.Contains(key, ".") {
				uKey := strings.ReplaceAll(key, ".", "_")
				delete(*attributes, uKey)
			}
		}

	}

	if val, ok := row["attributes_bool"]; ok {
		attributes := val.(*map[string]bool)
		for key := range *attributes {
			if strings.Contains(key, ".") {
				uKey := strings.ReplaceAll(key, ".", "_")
				delete(*attributes, uKey)
			}
		}

	}
	for _, k := range []string{"attributes_string", "resources_string"} {
		if val, ok := row[k]; ok {
			attributes := val.(*map[string]string)
			for key := range *attributes {
				if strings.Contains(key, ".") {
					uKey := strings.ReplaceAll(key, ".", "_")
					delete(*attributes, uKey)
				}
			}

		}
	}
}
func (r *ClickHouseReader) CheckClickHouse(ctx context.Context) error {
	rows, err := r.db.Query(ctx, "SELECT 1")
	if err != nil {
		return err
	}
	defer rows.Close()

	return nil
}

func (r *ClickHouseReader) GetTraceAggregateAttributes(ctx context.Context, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error) {
	var query string
	var err error
	var rows driver.Rows
	var response v3.AggregateAttributeResponse
	var stringAllowed bool

	where := ""
	switch req.Operator {
	case
		v3.AggregateOperatorCountDistinct,
		v3.AggregateOperatorCount:
		where = "tag_key ILIKE $1"
		stringAllowed = true
	case
		v3.AggregateOperatorRateSum,
		v3.AggregateOperatorRateMax,
		v3.AggregateOperatorRateAvg,
		v3.AggregateOperatorRate,
		v3.AggregateOperatorRateMin,
		v3.AggregateOperatorP05,
		v3.AggregateOperatorP10,
		v3.AggregateOperatorP20,
		v3.AggregateOperatorP25,
		v3.AggregateOperatorP50,
		v3.AggregateOperatorP75,
		v3.AggregateOperatorP90,
		v3.AggregateOperatorP95,
		v3.AggregateOperatorP99,
		v3.AggregateOperatorAvg,
		v3.AggregateOperatorSum,
		v3.AggregateOperatorMin,
		v3.AggregateOperatorMax:
		where = "tag_key ILIKE $1 AND tag_data_type='float64'"
		stringAllowed = false
	case
		v3.AggregateOperatorNoOp:
		return &v3.AggregateAttributeResponse{}, nil
	default:
		return nil, fmt.Errorf("unsupported aggregate operator")
	}
	query = fmt.Sprintf("SELECT DISTINCT(tag_key), tag_type, tag_data_type FROM %s.%s WHERE %s", r.TraceDB, r.spanAttributeTableV2, where)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText))

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.TraceDB, r.traceLocalTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching trace schema: %s", err.Error())
	}

	var tagKey string
	var dataType string
	var tagType string
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn(true, statements[0].Statement, tagType, tagKey, dataType),
		}

		if _, ok := constants.DeprecatedStaticFieldsTraces[tagKey]; !ok {
			response.AttributeKeys = append(response.AttributeKeys, key)
		}
	}

	fields := constants.NewStaticFieldsTraces
	if !r.useTraceNewSchema {
		fields = constants.DeprecatedStaticFieldsTraces
	}

	// add the new static fields
	for _, field := range fields {
		if (!stringAllowed && field.DataType == v3.AttributeKeyDataTypeString) || (v3.AttributeKey{} == field) {
			continue
		} else if len(req.SearchText) == 0 || strings.Contains(field.Key, req.SearchText) {
			response.AttributeKeys = append(response.AttributeKeys, field)
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) GetTraceAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {

	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	query = fmt.Sprintf("SELECT DISTINCT(tag_key), tag_type, tag_data_type FROM %s.%s WHERE tag_key ILIKE $1 LIMIT $2", r.TraceDB, r.spanAttributeTableV2)

	rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), req.Limit)

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.TraceDB, r.traceLocalTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching trace schema: %s", err.Error())
	}

	var tagKey string
	var dataType string
	var tagType string
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn(true, statements[0].Statement, tagType, tagKey, dataType),
		}

		// don't send deprecated static fields
		// this is added so that once the old tenants are moved to new schema,
		// they old attributes are not sent to the frontend autocomplete
		if _, ok := constants.DeprecatedStaticFieldsTraces[tagKey]; !ok {
			response.AttributeKeys = append(response.AttributeKeys, key)
		}
	}

	// remove this later just to have NewStaticFieldsTraces in the response
	fields := constants.NewStaticFieldsTraces
	if !r.useTraceNewSchema {
		fields = constants.DeprecatedStaticFieldsTraces
	}

	// add the new static fields
	for _, f := range fields {
		if (v3.AttributeKey{} == f) {
			continue
		}
		if len(req.SearchText) == 0 || strings.Contains(f.Key, req.SearchText) {
			response.AttributeKeys = append(response.AttributeKeys, f)
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) GetTraceAttributeValues(ctx context.Context, req *v3.FilterAttributeValueRequest) (*v3.FilterAttributeValueResponse, error) {
	var query string
	var filterValueColumn string
	var err error
	var rows driver.Rows
	var attributeValues v3.FilterAttributeValueResponse

	// if dataType or tagType is not present return empty response
	if len(req.FilterAttributeKeyDataType) == 0 || len(req.TagType) == 0 {
		// add data type if it's a top level key
		if k, ok := constants.StaticFieldsTraces[req.FilterAttributeKey]; ok {
			req.FilterAttributeKeyDataType = k.DataType
		} else {
			return &v3.FilterAttributeValueResponse{}, nil
		}
	}

	// if data type is bool, return true and false
	if req.FilterAttributeKeyDataType == v3.AttributeKeyDataTypeBool {
		return &v3.FilterAttributeValueResponse{
			BoolAttributeValues: []bool{true, false},
		}, nil
	}

	query = "SELECT DISTINCT"
	switch req.FilterAttributeKeyDataType {
	case v3.AttributeKeyDataTypeFloat64:
		filterValueColumn = "number_value"
	case v3.AttributeKeyDataTypeString:
		filterValueColumn = "string_value"
	}

	searchText := fmt.Sprintf("%%%s%%", req.SearchText)

	// check if the tagKey is a topLevelColumn
	// here we are using StaticFieldsTraces instead of NewStaticFieldsTraces as we want to consider old columns as well.
	if _, ok := constants.StaticFieldsTraces[req.FilterAttributeKey]; ok {
		// query the column for the last 48 hours
		filterValueColumnWhere := req.FilterAttributeKey
		selectKey := req.FilterAttributeKey
		if req.FilterAttributeKeyDataType != v3.AttributeKeyDataTypeString {
			filterValueColumnWhere = fmt.Sprintf("toString(%s)", req.FilterAttributeKey)
			selectKey = fmt.Sprintf("toInt64(%s)", req.FilterAttributeKey)
		}

		// TODO(nitya): remove 24 hour limit in future after checking the perf/resource implications
		where := "timestamp >= toDateTime64(now() - INTERVAL 48 HOUR, 9)"
		if r.useTraceNewSchema {
			where += " AND ts_bucket_start >= toUInt64(toUnixTimestamp(now() - INTERVAL 48 HOUR))"
		}
		query = fmt.Sprintf("SELECT DISTINCT %s FROM %s.%s WHERE %s AND %s ILIKE $1 LIMIT $2", selectKey, r.TraceDB, r.traceTableName, where, filterValueColumnWhere)
		rows, err = r.db.Query(ctx, query, searchText, req.Limit)
	} else {
		filterValueColumnWhere := filterValueColumn
		if req.FilterAttributeKeyDataType != v3.AttributeKeyDataTypeString {
			filterValueColumnWhere = fmt.Sprintf("toString(%s)", filterValueColumn)
		}
		query = fmt.Sprintf("SELECT DISTINCT %s FROM %s.%s WHERE tag_key=$1 AND %s ILIKE $2 AND tag_type=$3 LIMIT $4", filterValueColumn, r.TraceDB, r.spanAttributeTableV2, filterValueColumnWhere)
		rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, searchText, req.TagType, req.Limit)
	}

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var strAttributeValue string
	var float64AttributeValue sql.NullFloat64
	for rows.Next() {
		switch req.FilterAttributeKeyDataType {
		case v3.AttributeKeyDataTypeFloat64:
			if err := rows.Scan(&float64AttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			if float64AttributeValue.Valid {
				attributeValues.NumberAttributeValues = append(attributeValues.NumberAttributeValues, float64AttributeValue.Float64)
			}
		case v3.AttributeKeyDataTypeString:
			if err := rows.Scan(&strAttributeValue); err != nil {
				return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
			}
			attributeValues.StringAttributeValues = append(attributeValues.StringAttributeValues, strAttributeValue)
		}
	}

	return &attributeValues, nil
}

func (r *ClickHouseReader) GetSpanAttributeKeysV2(ctx context.Context) (map[string]v3.AttributeKey, error) {
	var query string
	var err error
	var rows driver.Rows
	response := map[string]v3.AttributeKey{}

	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, dataType FROM %s.%s", r.TraceDB, r.spanAttributesKeysTable)

	rows, err = r.db.Query(ctx, query)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	statements := []model.ShowCreateTableStatement{}
	query = fmt.Sprintf("SHOW CREATE TABLE %s.%s", r.TraceDB, r.traceTableName)
	err = r.db.Select(ctx, &statements, query)
	if err != nil {
		return nil, fmt.Errorf("error while fetching trace schema: %s", err.Error())
	}

	var tagKey string
	var dataType string
	var tagType string
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn(true, statements[0].Statement, tagType, tagKey, dataType),
		}

		name := tagKey + "##" + tagType + "##" + strings.ToLower(dataType)
		response[name] = key
	}

	for _, key := range constants.StaticFieldsTraces {
		name := key.Key + "##" + key.Type.String() + "##" + strings.ToLower(key.DataType.String())
		response[name] = key
	}

	return response, nil
}

func (r *ClickHouseReader) GetSpanAttributeKeys(ctx context.Context) (map[string]v3.AttributeKey, error) {
	if r.useTraceNewSchema {
		return r.GetSpanAttributeKeysV2(ctx)
	}
	var query string
	var err error
	var rows driver.Rows
	response := map[string]v3.AttributeKey{}

	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, dataType, isColumn FROM %s.%s", r.TraceDB, r.spanAttributesKeysTable)

	rows, err = r.db.Query(ctx, query)

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var tagKey string
	var dataType string
	var tagType string
	var isColumn bool
	for rows.Next() {
		if err := rows.Scan(&tagKey, &tagType, &dataType, &isColumn); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		key := v3.AttributeKey{
			Key:      tagKey,
			DataType: v3.AttributeKeyDataType(dataType),
			Type:     v3.AttributeKeyType(tagType),
			IsColumn: isColumn,
		}
		response[tagKey] = key
	}

	// add the deprecated static fields as they are not present in spanAttributeKeysTable
	for _, f := range constants.DeprecatedStaticFieldsTraces {
		response[f.Key] = f
	}

	return response, nil
}

func (r *ClickHouseReader) LiveTailLogsV4(ctx context.Context, query string, timestampStart uint64, idStart string, client *model.LogsLiveTailClientV2) {
	if timestampStart == 0 {
		timestampStart = uint64(time.Now().UnixNano())
	} else {
		timestampStart = uint64(utils.GetEpochNanoSecs(int64(timestampStart)))
	}

	ticker := time.NewTicker(time.Duration(r.liveTailRefreshSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			zap.L().Debug("closing go routine : " + client.Name)
			return
		case <-ticker.C:
			// get the new 100 logs as anything more older won't make sense
			var tmpQuery string
			bucketStart := (timestampStart / NANOSECOND) - 1800

			// we have to form the query differently if the resource filters are used
			if strings.Contains(query, r.logsResourceTableV2) {
				tmpQuery = fmt.Sprintf("seen_at_ts_bucket_start >=%d)) AND ts_bucket_start >=%d AND timestamp >=%d", bucketStart, bucketStart, timestampStart)
			} else {
				tmpQuery = fmt.Sprintf("ts_bucket_start >=%d AND timestamp >=%d", bucketStart, timestampStart)
			}
			if idStart != "" {
				tmpQuery = fmt.Sprintf("%s AND id > '%s'", tmpQuery, idStart)
			}

			// the reason we are doing desc is that we need the latest logs first
			tmpQuery = query + tmpQuery + " order by timestamp desc, id desc limit 100"

			// using the old structure since we can directly read it to the struct as use it.
			response := []model.SignozLogV2{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.L().Error("Error while getting logs", zap.Error(err))
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				client.Logs <- &response[i]
				if i == 0 {
					timestampStart = response[i].Timestamp
					idStart = response[i].ID
				}
			}
		}
	}
}

func (r *ClickHouseReader) LiveTailLogsV3(ctx context.Context, query string, timestampStart uint64, idStart string, client *model.LogsLiveTailClient) {
	if timestampStart == 0 {
		timestampStart = uint64(time.Now().UnixNano())
	} else {
		timestampStart = uint64(utils.GetEpochNanoSecs(int64(timestampStart)))
	}

	ticker := time.NewTicker(time.Duration(r.liveTailRefreshSeconds) * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			done := true
			client.Done <- &done
			zap.L().Debug("closing go routine : " + client.Name)
			return
		case <-ticker.C:
			// get the new 100 logs as anything more older won't make sense
			tmpQuery := fmt.Sprintf("timestamp >='%d'", timestampStart)
			if idStart != "" {
				tmpQuery = fmt.Sprintf("%s AND id > '%s'", tmpQuery, idStart)
			}
			// the reason we are doing desc is that we need the latest logs first
			tmpQuery = query + tmpQuery + " order by timestamp desc, id desc limit 100"

			// using the old structure since we can directly read it to the struct as use it.
			response := []model.SignozLog{}
			err := r.db.Select(ctx, &response, tmpQuery)
			if err != nil {
				zap.L().Error("Error while getting logs", zap.Error(err))
				client.Error <- err
				return
			}
			for i := len(response) - 1; i >= 0; i-- {
				client.Logs <- &response[i]
				if i == 0 {
					timestampStart = response[i].Timestamp
					idStart = response[i].ID
				}
			}
		}
	}
}

func (r *ClickHouseReader) AddRuleStateHistory(ctx context.Context, ruleStateHistory []model.RuleStateHistory) error {
	var statement driver.Batch
	var err error

	defer func() {
		if statement != nil {
			statement.Abort()
		}
	}()

	statement, err = r.db.PrepareBatch(ctx, fmt.Sprintf("INSERT INTO %s.%s (rule_id, rule_name, overall_state, overall_state_changed, state, state_changed, unix_milli, labels, fingerprint, value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
		signozHistoryDBName, ruleStateHistoryTableName))

	if err != nil {
		return err
	}

	for _, history := range ruleStateHistory {
		err = statement.Append(history.RuleID, history.RuleName, history.OverallState, history.OverallStateChanged, history.State, history.StateChanged, history.UnixMilli, history.Labels, history.Fingerprint, history.Value)
		if err != nil {
			return err
		}
	}

	err = statement.Send()
	if err != nil {
		return err
	}
	return nil
}

func (r *ClickHouseReader) GetLastSavedRuleStateHistory(ctx context.Context, ruleID string) ([]model.RuleStateHistory, error) {
	query := fmt.Sprintf("SELECT * FROM %s.%s WHERE rule_id = '%s' AND state_changed = true ORDER BY unix_milli DESC LIMIT 1 BY fingerprint",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID)

	history := []model.RuleStateHistory{}
	err := r.db.Select(ctx, &history, query)
	if err != nil {
		return nil, err
	}
	return history, nil
}

func (r *ClickHouseReader) ReadRuleStateHistoryByRuleID(
	ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*model.RuleStateTimeline, error) {

	var conditions []string

	conditions = append(conditions, fmt.Sprintf("rule_id = '%s'", ruleID))

	conditions = append(conditions, fmt.Sprintf("unix_milli >= %d AND unix_milli < %d", params.Start, params.End))

	if params.State != "" {
		conditions = append(conditions, fmt.Sprintf("state = '%s'", params.State))
	}

	if params.Filters != nil && len(params.Filters.Items) != 0 {
		for _, item := range params.Filters.Items {
			toFormat := item.Value
			op := v3.FilterOperator(strings.ToLower(strings.TrimSpace(string(item.Operator))))
			if op == v3.FilterOperatorContains || op == v3.FilterOperatorNotContains {
				toFormat = fmt.Sprintf("%%%s%%", toFormat)
			}
			fmtVal := utils.ClickHouseFormattedValue(toFormat)
			switch op {
			case v3.FilterOperatorEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') = %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotEqual:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') != %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotIn:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') NOT IN %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLike:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotLike:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorRegex:
				conditions = append(conditions, fmt.Sprintf("match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotRegex:
				conditions = append(conditions, fmt.Sprintf("not match(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') > %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorGreaterThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') >= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThan:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') < %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorLessThanOrEq:
				conditions = append(conditions, fmt.Sprintf("JSONExtractString(labels, '%s') <= %s", item.Key.Key, fmtVal))
			case v3.FilterOperatorContains:
				conditions = append(conditions, fmt.Sprintf("like(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorNotContains:
				conditions = append(conditions, fmt.Sprintf("notLike(JSONExtractString(labels, '%s'), %s)", item.Key.Key, fmtVal))
			case v3.FilterOperatorExists:
				conditions = append(conditions, fmt.Sprintf("has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			case v3.FilterOperatorNotExists:
				conditions = append(conditions, fmt.Sprintf("not has(JSONExtractKeys(labels), '%s')", item.Key.Key))
			default:
				return nil, fmt.Errorf("unsupported filter operator")
			}
		}
	}
	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf("SELECT * FROM %s.%s WHERE %s ORDER BY unix_milli %s LIMIT %d OFFSET %d",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause, params.Order, params.Limit, params.Offset)

	history := []model.RuleStateHistory{}
	zap.L().Debug("rule state history query", zap.String("query", query))
	err := r.db.Select(ctx, &history, query)
	if err != nil {
		zap.L().Error("Error while reading rule state history", zap.Error(err))
		return nil, err
	}

	var total uint64
	zap.L().Debug("rule state history total query", zap.String("query", fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE %s",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause)))
	err = r.db.QueryRow(ctx, fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE %s",
		signozHistoryDBName, ruleStateHistoryTableName, whereClause)).Scan(&total)
	if err != nil {
		return nil, err
	}

	labelsQuery := fmt.Sprintf("SELECT DISTINCT labels FROM %s.%s WHERE rule_id = $1",
		signozHistoryDBName, ruleStateHistoryTableName)
	rows, err := r.db.Query(ctx, labelsQuery, ruleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	labelsMap := make(map[string][]string)
	for rows.Next() {
		var rawLabel string
		err = rows.Scan(&rawLabel)
		if err != nil {
			return nil, err
		}
		label := map[string]string{}
		err = json.Unmarshal([]byte(rawLabel), &label)
		if err != nil {
			return nil, err
		}
		for k, v := range label {
			labelsMap[k] = append(labelsMap[k], v)
		}
	}

	timeline := &model.RuleStateTimeline{
		Items:  history,
		Total:  total,
		Labels: labelsMap,
	}

	return timeline, nil
}

func (r *ClickHouseReader) ReadRuleStateHistoryTopContributorsByRuleID(
	ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) ([]model.RuleStateHistoryContributor, error) {
	query := fmt.Sprintf(`SELECT
		fingerprint,
		any(labels) as labels,
		count(*) as count
	FROM %s.%s
	WHERE rule_id = '%s' AND (state_changed = true) AND (state = '%s') AND unix_milli >= %d AND unix_milli <= %d
	GROUP BY fingerprint
	HAVING labels != '{}'
	ORDER BY count DESC`,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.Start, params.End)

	zap.L().Debug("rule state history top contributors query", zap.String("query", query))
	contributors := []model.RuleStateHistoryContributor{}
	err := r.db.Select(ctx, &contributors, query)
	if err != nil {
		zap.L().Error("Error while reading rule state history", zap.Error(err))
		return nil, err
	}

	return contributors, nil
}

func (r *ClickHouseReader) GetOverallStateTransitions(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) ([]model.ReleStateItem, error) {

	tmpl := `WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateFiring.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateInactive.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT *
FROM matched_events
ORDER BY firing_time ASC;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End)

	zap.L().Debug("overall state transitions query", zap.String("query", query))

	transitions := []model.RuleStateTransition{}
	err := r.db.Select(ctx, &transitions, query)
	if err != nil {
		return nil, err
	}

	stateItems := []model.ReleStateItem{}

	for idx, item := range transitions {
		start := item.FiringTime
		end := item.ResolutionTime
		stateItems = append(stateItems, model.ReleStateItem{
			State: item.State,
			Start: start,
			End:   end,
		})
		if idx < len(transitions)-1 {
			nextStart := transitions[idx+1].FiringTime
			if nextStart > end {
				stateItems = append(stateItems, model.ReleStateItem{
					State: model.StateInactive,
					Start: end,
					End:   nextStart,
				})
			}
		}
	}

	// fetch the most recent overall_state from the table
	var state model.AlertState
	stateQuery := fmt.Sprintf("SELECT state FROM %s.%s WHERE rule_id = '%s' AND unix_milli <= %d ORDER BY unix_milli DESC LIMIT 1",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.End)
	if err := r.db.QueryRow(ctx, stateQuery).Scan(&state); err != nil {
		if err != sql.ErrNoRows {
			return nil, err
		}
		state = model.StateInactive
	}

	if len(transitions) == 0 {
		// no transitions found, it is either firing or inactive for whole time range
		stateItems = append(stateItems, model.ReleStateItem{
			State: state,
			Start: params.Start,
			End:   params.End,
		})
	} else {
		// there were some transitions, we need to add the last state at the end
		if state == model.StateInactive {
			stateItems = append(stateItems, model.ReleStateItem{
				State: model.StateInactive,
				Start: transitions[len(transitions)-1].ResolutionTime,
				End:   params.End,
			})
		} else {
			// fetch the most recent firing event from the table in the given time range
			var firingTime int64
			firingQuery := fmt.Sprintf(`
			SELECT
				unix_milli
			FROM %s.%s
			WHERE rule_id = '%s' AND overall_state_changed = true AND overall_state = '%s' AND unix_milli <= %d
			ORDER BY unix_milli DESC LIMIT 1`, signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.End)
			if err := r.db.QueryRow(ctx, firingQuery).Scan(&firingTime); err != nil {
				return nil, err
			}
			stateItems = append(stateItems, model.ReleStateItem{
				State: model.StateInactive,
				Start: transitions[len(transitions)-1].ResolutionTime,
				End:   firingTime,
			})
			stateItems = append(stateItems, model.ReleStateItem{
				State: model.StateFiring,
				Start: firingTime,
				End:   params.End,
			})
		}
	}
	return stateItems, nil
}

func (r *ClickHouseReader) GetAvgResolutionTime(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (float64, error) {

	tmpl := `
WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateFiring.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateInactive.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT AVG(resolution_time - firing_time) / 1000 AS avg_resolution_time
FROM matched_events;
`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End)

	zap.L().Debug("avg resolution time query", zap.String("query", query))
	var avgResolutionTime float64
	err := r.db.QueryRow(ctx, query).Scan(&avgResolutionTime)
	if err != nil {
		return 0, err
	}

	return avgResolutionTime, nil
}

func (r *ClickHouseReader) GetAvgResolutionTimeByInterval(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*v3.Series, error) {

	step := common.MinAllowedStepInterval(params.Start, params.End)

	tmpl := `
WITH firing_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS firing_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateFiring.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
resolution_events AS (
    SELECT
        rule_id,
        state,
        unix_milli AS resolution_time
    FROM %s.%s
    WHERE overall_state = '` + model.StateInactive.String() + `' 
      AND overall_state_changed = true
      AND rule_id IN ('%s')
	  AND unix_milli >= %d AND unix_milli <= %d
),
matched_events AS (
    SELECT
        f.rule_id,
        f.state,
        f.firing_time,
        MIN(r.resolution_time) AS resolution_time
    FROM firing_events f
    LEFT JOIN resolution_events r
        ON f.rule_id = r.rule_id
    WHERE r.resolution_time > f.firing_time
    GROUP BY f.rule_id, f.state, f.firing_time
)
SELECT toStartOfInterval(toDateTime(firing_time / 1000), INTERVAL %d SECOND) AS ts, AVG(resolution_time - firing_time) / 1000 AS avg_resolution_time
FROM matched_events
GROUP BY ts
ORDER BY ts ASC;`

	query := fmt.Sprintf(tmpl,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End,
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, params.Start, params.End, step)

	zap.L().Debug("avg resolution time by interval query", zap.String("query", query))
	result, err := r.GetTimeSeriesResultV3(ctx, query)
	if err != nil || len(result) == 0 {
		return nil, err
	}

	return result[0], nil
}

func (r *ClickHouseReader) GetTotalTriggers(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (uint64, error) {
	query := fmt.Sprintf("SELECT count(*) FROM %s.%s WHERE rule_id = '%s' AND (state_changed = true) AND (state = '%s') AND unix_milli >= %d AND unix_milli <= %d",
		signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.Start, params.End)

	var totalTriggers uint64

	err := r.db.QueryRow(ctx, query).Scan(&totalTriggers)
	if err != nil {
		return 0, err
	}

	return totalTriggers, nil
}

func (r *ClickHouseReader) GetTriggersByInterval(ctx context.Context, ruleID string, params *model.QueryRuleStateHistory) (*v3.Series, error) {
	step := common.MinAllowedStepInterval(params.Start, params.End)

	query := fmt.Sprintf("SELECT count(*), toStartOfInterval(toDateTime(intDiv(unix_milli, 1000)), INTERVAL %d SECOND) as ts FROM %s.%s WHERE rule_id = '%s' AND (state_changed = true) AND (state = '%s') AND unix_milli >= %d AND unix_milli <= %d GROUP BY ts ORDER BY ts ASC",
		step, signozHistoryDBName, ruleStateHistoryTableName, ruleID, model.StateFiring.String(), params.Start, params.End)

	result, err := r.GetTimeSeriesResultV3(ctx, query)
	if err != nil || len(result) == 0 {
		return nil, err
	}

	return result[0], nil
}

func (r *ClickHouseReader) GetMinAndMaxTimestampForTraceID(ctx context.Context, traceID []string) (int64, int64, error) {
	var minTime, maxTime time.Time

	query := fmt.Sprintf("SELECT min(timestamp), max(timestamp) FROM %s.%s WHERE traceID IN ('%s')",
		r.TraceDB, r.SpansTable, strings.Join(traceID, "','"))

	zap.L().Debug("GetMinAndMaxTimestampForTraceID", zap.String("query", query))

	err := r.db.QueryRow(ctx, query).Scan(&minTime, &maxTime)
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return 0, 0, err
	}

	// return current time if traceID not found
	if minTime.IsZero() || maxTime.IsZero() {
		zap.L().Debug("minTime or maxTime is zero, traceID not found")
		return time.Now().UnixNano(), time.Now().UnixNano(), nil
	}

	zap.L().Debug("GetMinAndMaxTimestampForTraceID", zap.Any("minTime", minTime), zap.Any("maxTime", maxTime))

	return minTime.UnixNano(), maxTime.UnixNano(), nil
}

func (r *ClickHouseReader) ReportQueryStartForProgressTracking(
	queryId string,
) (func(), *model.ApiError) {
	return r.queryProgressTracker.ReportQueryStarted(queryId)
}

func (r *ClickHouseReader) SubscribeToQueryProgress(
	queryId string,
) (<-chan model.QueryProgress, func(), *model.ApiError) {
	return r.queryProgressTracker.SubscribeToQueryProgress(queryId)
}
