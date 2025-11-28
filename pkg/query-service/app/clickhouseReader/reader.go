package clickhouseReader

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"reflect"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/query-service/model/metrics_explorer"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/uptrace/bun"

	errorsV2 "github.com/SigNoz/signoz/pkg/errors"
	"github.com/google/uuid"
	"github.com/pkg/errors"

	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/util/stats"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/SigNoz/signoz/pkg/cache"

	"go.uber.org/zap"

	queryprogress "github.com/SigNoz/signoz/pkg/query-service/app/clickhouseReader/query_progress"
	"github.com/SigNoz/signoz/pkg/query-service/app/resource"
	"github.com/SigNoz/signoz/pkg/query-service/app/services"
	"github.com/SigNoz/signoz/pkg/query-service/app/traces/smart"
	"github.com/SigNoz/signoz/pkg/query-service/app/traces/tracedetail"
	"github.com/SigNoz/signoz/pkg/query-service/common"
	"github.com/SigNoz/signoz/pkg/query-service/constants"
	chErrors "github.com/SigNoz/signoz/pkg/query-service/errors"
	"github.com/SigNoz/signoz/pkg/query-service/metrics"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	"github.com/SigNoz/signoz/pkg/query-service/utils"
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
	signozMetadataDbName      = "signoz_metadata"
	signozMeterDBName         = "signoz_meter"
	signozMeterSamplesName    = "samples_agg_1d"

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

	signozTableAttributesMetadata      = "distributed_attributes_metadata"
	signozLocalTableAttributesMetadata = "attributes_metadata"

	signozUpdatedMetricsMetadataLocalTable = "updated_metadata"
	signozUpdatedMetricsMetadataTable      = "distributed_updated_metadata"
	minTimespanForProgressiveSearch        = time.Hour
	minTimespanForProgressiveSearchMargin  = time.Minute
	maxProgressiveSteps                    = 4
	charset                                = "abcdefghijklmnopqrstuvwxyz" +
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
	prometheus              prometheus.Prometheus
	sqlDB                   sqlstore.SQLStore
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
	queryProgressTracker    queryprogress.QueryProgressTracker

	logsTableV2              string
	logsLocalTableV2         string
	logsResourceTableV2      string
	logsResourceLocalTableV2 string

	liveTailRefreshSeconds int
	cluster                string

	logsTableName      string
	logsLocalTableName string

	traceTableName       string
	traceLocalTableName  string
	traceResourceTableV3 string
	traceSummaryTable    string

	fluxIntervalForTraceDetail time.Duration
	cache                      cache.Cache
	cacheForTraceDetail        cache.Cache
	metadataDB                 string
	metadataTable              string
}

// NewTraceReader returns a TraceReader for the database
func NewReader(
	sqlDB sqlstore.SQLStore,
	telemetryStore telemetrystore.TelemetryStore,
	prometheus prometheus.Prometheus,
	cluster string,
	fluxIntervalForTraceDetail time.Duration,
	cacheForTraceDetail cache.Cache,
	cache cache.Cache,
	options *Options,
) *ClickHouseReader {
	if options == nil {
		options = NewOptions(primaryNamespace, archiveNamespace)
	}

	logsTableName := options.primary.LogsTableV2
	logsLocalTableName := options.primary.LogsLocalTableV2
	traceTableName := options.primary.TraceIndexTableV3
	traceLocalTableName := options.primary.TraceLocalTableNameV3

	return &ClickHouseReader{
		db:                         telemetryStore.ClickhouseDB(),
		prometheus:                 prometheus,
		sqlDB:                      sqlDB,
		TraceDB:                    options.primary.TraceDB,
		operationsTable:            options.primary.OperationsTable,
		indexTable:                 options.primary.IndexTable,
		errorTable:                 options.primary.ErrorTable,
		usageExplorerTable:         options.primary.UsageExplorerTable,
		durationTable:              options.primary.DurationTable,
		SpansTable:                 options.primary.SpansTable,
		spanAttributeTableV2:       options.primary.SpanAttributeTableV2,
		spanAttributesKeysTable:    options.primary.SpanAttributeKeysTable,
		dependencyGraphTable:       options.primary.DependencyGraphTable,
		topLevelOperationsTable:    options.primary.TopLevelOperationsTable,
		logsDB:                     options.primary.LogsDB,
		logsTable:                  options.primary.LogsTable,
		logsLocalTable:             options.primary.LogsLocalTable,
		logsAttributeKeys:          options.primary.LogsAttributeKeysTable,
		logsResourceKeys:           options.primary.LogsResourceKeysTable,
		logsTagAttributeTableV2:    options.primary.LogsTagAttributeTableV2,
		liveTailRefreshSeconds:     options.primary.LiveTailRefreshSeconds,
		cluster:                    cluster,
		queryProgressTracker:       queryprogress.NewQueryProgressTracker(),
		logsTableV2:                options.primary.LogsTableV2,
		logsLocalTableV2:           options.primary.LogsLocalTableV2,
		logsResourceTableV2:        options.primary.LogsResourceTableV2,
		logsResourceLocalTableV2:   options.primary.LogsResourceLocalTableV2,
		logsTableName:              logsTableName,
		logsLocalTableName:         logsLocalTableName,
		traceLocalTableName:        traceLocalTableName,
		traceTableName:             traceTableName,
		traceResourceTableV3:       options.primary.TraceResourceTableV3,
		traceSummaryTable:          options.primary.TraceSummaryTable,
		fluxIntervalForTraceDetail: fluxIntervalForTraceDetail,
		cache:                      cache,
		cacheForTraceDetail:        cacheForTraceDetail,
		metadataDB:                 options.primary.MetadataDB,
		metadataTable:              options.primary.MetadataTable,
	}
}

func (r *ClickHouseReader) GetInstantQueryMetricsResult(ctx context.Context, queryParams *model.InstantQueryMetricsParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.prometheus.Engine().NewInstantQuery(ctx, r.prometheus.Storage(), nil, queryParams.Query, queryParams.Time)
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
	err = prometheus.RemoveExtraLabels(res, prometheus.FingerprintAsPromLabelName)
	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return res, &qs, nil

}

func (r *ClickHouseReader) GetQueryRangeResult(ctx context.Context, query *model.QueryRangeParams) (*promql.Result, *stats.QueryStats, *model.ApiError) {
	qry, err := r.prometheus.Engine().NewRangeQuery(ctx, r.prometheus.Storage(), nil, query.Query, query.Start, query.End, query.Step)

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
	err = prometheus.RemoveExtraLabels(res, prometheus.FingerprintAsPromLabelName)
	if err != nil {
		return nil, nil, &model.ApiError{Typ: model.ErrorInternal, Err: err}
	}
	return res, &qs, nil
}

func (r *ClickHouseReader) GetServicesList(ctx context.Context) (*[]string, error) {
	services := []string{}
	rows, err := r.db.Query(ctx, fmt.Sprintf(`SELECT DISTINCT resource_string_service$$name FROM %s.%s WHERE ts_bucket_start > (toUnixTimestamp(now() - INTERVAL 1 DAY) - 1800) AND toDate(timestamp) > now() - INTERVAL 1 DAY`, r.TraceDB, r.traceTableName))
	if err != nil {
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

func (r *ClickHouseReader) GetTopLevelOperations(ctx context.Context, start, end time.Time, services []string) (*map[string][]string, *model.ApiError) {
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

func (r *ClickHouseReader) GetServices(ctx context.Context, queryParams *model.GetServicesParams) (*[]model.ServiceItem, *model.ApiError) {

	if r.indexTable == "" {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: ErrNoIndexTable}
	}

	topLevelOps, apiErr := r.GetTopLevelOperations(ctx, *queryParams.Start, *queryParams.End, nil)
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
					quantile(0.99)(duration_nano) as p99,
					avg(duration_nano) as avgDuration,
					count(*) as numCalls
				FROM %s.%s
				WHERE resource_string_service$$name = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end`,
				r.TraceDB, r.traceTableName,
			)
			errorQuery := fmt.Sprintf(
				`SELECT
					count(*) as numErrors
				FROM %s.%s
				WHERE resource_string_service$$name = @serviceName AND name In @names AND timestamp>= @start AND timestamp<= @end AND statusCode=2`,
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

func (r *ClickHouseReader) GetEntryPointOperations(ctx context.Context, queryParams *model.GetTopOperationsParams) (*[]model.TopOperationsItem, error) {
	// Step 1: Get top operations for the given service
	topOps, err := r.GetTopOperations(ctx, queryParams)
	if err != nil {
		return nil, errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "Error in getting Top Operations")
	}
	if topOps == nil {
		return nil, errorsV2.Newf(errorsV2.TypeNotFound, errorsV2.CodeNotFound, "no top operations found")
	}

	// Step 2: Get entry point operation names for the given service using GetTopLevelOperations
	// instead of running a separate query
	serviceName := []string{queryParams.ServiceName}
	var startTime, endTime time.Time
	if queryParams.Start != nil {
		startTime = *queryParams.Start
	}
	if queryParams.End != nil {
		endTime = *queryParams.End
	}
	topLevelOpsResult, apiErr := r.GetTopLevelOperations(ctx, startTime, endTime, serviceName)

	if apiErr != nil {
		return nil, errorsV2.Wrapf(apiErr.Err, errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to get top level operations")
	}

	// Create a set of entry point operations
	entryPointSet := map[string]struct{}{}

	// Extract operations for the requested service from topLevelOpsResult
	if serviceOperations, ok := (*topLevelOpsResult)[queryParams.ServiceName]; ok {
		// Skip the first "overflow_operation" if present
		startIdx := 0
		if len(serviceOperations) > 0 && serviceOperations[0] == "overflow_operation" {
			startIdx = 1
		}

		// Add each operation name to the entry point set
		for i := startIdx; i < len(serviceOperations); i++ {
			entryPointSet[serviceOperations[i]] = struct{}{}
		}
	}

	// Step 3: Filter topOps based on entryPointSet (same as original)
	var filtered []model.TopOperationsItem
	for _, op := range *topOps {
		if _, ok := entryPointSet[op.Name]; ok {
			filtered = append(filtered, op)
		}
	}

	return &filtered, nil
}

func (r *ClickHouseReader) GetTopOperations(ctx context.Context, queryParams *model.GetTopOperationsParams) (*[]model.TopOperationsItem, *model.ApiError) {

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
			countIf(status_code=2) as errorCount,
			name
		FROM %s.%s
		WHERE resource_string_service$$name = @serviceName AND timestamp>= @start AND timestamp<= @end`,
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

func (r *ClickHouseReader) GetWaterfallSpansForTraceWithMetadataCache(ctx context.Context, orgID valuer.UUID, traceID string) (*model.GetWaterfallSpansForTraceWithMetadataCache, error) {
	cachedTraceData := new(model.GetWaterfallSpansForTraceWithMetadataCache)
	err := r.cacheForTraceDetail.Get(ctx, orgID, strings.Join([]string{"getWaterfallSpansForTraceWithMetadata", traceID}, "-"), cachedTraceData)
	if err != nil {
		zap.L().Debug("error in retrieving getWaterfallSpansForTraceWithMetadata cache", zap.Error(err), zap.String("traceID", traceID))
		return nil, err
	}

	if time.Since(time.UnixMilli(int64(cachedTraceData.EndTime))) < r.fluxIntervalForTraceDetail {
		zap.L().Info("the trace end time falls under the flux interval, skipping getWaterfallSpansForTraceWithMetadata cache", zap.String("traceID", traceID))
		return nil, errors.Errorf("the trace end time falls under the flux interval, skipping getWaterfallSpansForTraceWithMetadata cache, traceID: %s", traceID)
	}

	zap.L().Info("cache is successfully hit, applying cache for getWaterfallSpansForTraceWithMetadata", zap.String("traceID", traceID))
	return cachedTraceData, nil
}

func (r *ClickHouseReader) GetWaterfallSpansForTraceWithMetadata(ctx context.Context, orgID valuer.UUID, traceID string, req *model.GetWaterfallSpansForTraceWithMetadataParams) (*model.GetWaterfallSpansForTraceWithMetadataResponse, error) {
	response := new(model.GetWaterfallSpansForTraceWithMetadataResponse)
	var startTime, endTime, durationNano, totalErrorSpans, totalSpans uint64
	var spanIdToSpanNodeMap = map[string]*model.Span{}
	var traceRoots []*model.Span
	var serviceNameToTotalDurationMap = map[string]uint64{}
	var serviceNameIntervalMap = map[string][]tracedetail.Interval{}
	var hasMissingSpans bool

	cachedTraceData, err := r.GetWaterfallSpansForTraceWithMetadataCache(ctx, orgID, traceID)
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
	}

	if err != nil {
		zap.L().Info("cache miss for getWaterfallSpansForTraceWithMetadata", zap.String("traceID", traceID))

		searchScanResponses, err := r.GetSpansForTrace(ctx, traceID, fmt.Sprintf("SELECT DISTINCT ON (span_id) timestamp, duration_nano, span_id, trace_id, has_error, kind, resource_string_service$$name, name, links as references, attributes_string, attributes_number, attributes_bool, resources_string, events, status_message, status_code_string, kind_string FROM %s.%s WHERE trace_id=$1 and ts_bucket_start>=$2 and ts_bucket_start<=$3 ORDER BY timestamp ASC, name ASC", r.TraceDB, r.traceTableName))
		if err != nil {
			return nil, err
		}
		if len(searchScanResponses) == 0 {
			return response, nil
		}
		totalSpans = uint64(len(searchScanResponses))
		processingBeforeCache := time.Now()
		for _, item := range searchScanResponses {
			ref := []model.OtelSpanRef{}
			err := json.Unmarshal([]byte(item.References), &ref)
			if err != nil {
				zap.L().Error("getWaterfallSpansForTraceWithMetadata: error unmarshalling references", zap.Error(err), zap.String("traceID", traceID))
				return nil, errorsV2.Newf(errorsV2.TypeInvalidInput, errorsV2.CodeInvalidInput, "getWaterfallSpansForTraceWithMetadata: error unmarshalling references %s", err.Error())
			}

			// merge attributes_number and attributes_bool to attributes_string
			for k, v := range item.Attributes_bool {
				item.Attributes_string[k] = fmt.Sprintf("%v", v)
			}
			for k, v := range item.Attributes_number {
				item.Attributes_string[k] = strconv.FormatFloat(v, 'f', -1, 64)
			}
			for k, v := range item.Resources_string {
				item.Attributes_string[k] = v
			}

			events := make([]model.Event, 0)
			for _, event := range item.Events {
				var eventMap model.Event
				err = json.Unmarshal([]byte(event), &eventMap)
				if err != nil {
					zap.L().Error("Error unmarshalling events", zap.Error(err))
					return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "getWaterfallSpansForTraceWithMetadata: error in unmarshalling events %s", err.Error())
				}
				events = append(events, eventMap)
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
				Events:           events,
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
							Events:           make([]model.Event, 0),
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
		cacheErr := r.cacheForTraceDetail.Set(ctx, orgID, strings.Join([]string{"getWaterfallSpansForTraceWithMetadata", traceID}, "-"), &traceCache, time.Minute*5)
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

func (r *ClickHouseReader) GetFlamegraphSpansForTraceCache(ctx context.Context, orgID valuer.UUID, traceID string) (*model.GetFlamegraphSpansForTraceCache, error) {
	cachedTraceData := new(model.GetFlamegraphSpansForTraceCache)
	err := r.cacheForTraceDetail.Get(ctx, orgID, strings.Join([]string{"getFlamegraphSpansForTrace", traceID}, "-"), cachedTraceData)
	if err != nil {
		zap.L().Debug("error in retrieving getFlamegraphSpansForTrace cache", zap.Error(err), zap.String("traceID", traceID))
		return nil, err
	}

	if time.Since(time.UnixMilli(int64(cachedTraceData.EndTime))) < r.fluxIntervalForTraceDetail {
		zap.L().Info("the trace end time falls under the flux interval, skipping getFlamegraphSpansForTrace cache", zap.String("traceID", traceID))
		return nil, errors.Errorf("the trace end time falls under the flux interval, skipping getFlamegraphSpansForTrace cache, traceID: %s", traceID)
	}

	zap.L().Info("cache is successfully hit, applying cache for getFlamegraphSpansForTrace", zap.String("traceID", traceID))
	return cachedTraceData, nil
}

func (r *ClickHouseReader) GetFlamegraphSpansForTrace(ctx context.Context, orgID valuer.UUID, traceID string, req *model.GetFlamegraphSpansForTraceParams) (*model.GetFlamegraphSpansForTraceResponse, error) {
	trace := new(model.GetFlamegraphSpansForTraceResponse)
	var startTime, endTime, durationNano uint64
	var spanIdToSpanNodeMap = map[string]*model.FlamegraphSpan{}
	// map[traceID][level]span
	var selectedSpans = [][]*model.FlamegraphSpan{}
	var traceRoots []*model.FlamegraphSpan

	// get the trace tree from cache!
	cachedTraceData, err := r.GetFlamegraphSpansForTraceCache(ctx, orgID, traceID)

	if err == nil {
		startTime = cachedTraceData.StartTime
		endTime = cachedTraceData.EndTime
		durationNano = cachedTraceData.DurationNano
		selectedSpans = cachedTraceData.SelectedSpans
		traceRoots = cachedTraceData.TraceRoots
	}

	if err != nil {
		zap.L().Info("cache miss for getFlamegraphSpansForTrace", zap.String("traceID", traceID))

		searchScanResponses, err := r.GetSpansForTrace(ctx, traceID, fmt.Sprintf("SELECT timestamp, duration_nano, span_id, trace_id, has_error,links as references, resource_string_service$$name, name, events FROM %s.%s WHERE trace_id=$1 and ts_bucket_start>=$2 and ts_bucket_start<=$3 ORDER BY timestamp ASC, name ASC", r.TraceDB, r.traceTableName))
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
				return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "getFlamegraphSpansForTrace: error in unmarshalling references %s", err.Error())
			}

			events := make([]model.Event, 0)
			for _, event := range item.Events {
				var eventMap model.Event
				err = json.Unmarshal([]byte(event), &eventMap)
				if err != nil {
					zap.L().Error("Error unmarshalling events", zap.Error(err))
					return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "getFlamegraphSpansForTrace: error in unmarshalling events %s", err.Error())
				}
				events = append(events, eventMap)
			}

			jsonItem := model.FlamegraphSpan{
				SpanID:       item.SpanID,
				TraceID:      item.TraceID,
				ServiceName:  item.ServiceName,
				Name:         item.Name,
				DurationNano: item.DurationNano,
				HasError:     item.HasError,
				References:   ref,
				Events:       events,
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
							Events:       make([]model.Event, 0),
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
		cacheErr := r.cacheForTraceDetail.Set(ctx, orgID, strings.Join([]string{"getFlamegraphSpansForTrace", traceID}, "-"), &traceCache, time.Minute*5)
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

func (r *ClickHouseReader) setTTLLogs(ctx context.Context, orgID string, params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	hasCustomRetention, err := r.hasCustomRetentionColumn(ctx)
	if hasCustomRetention {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("SetTTLV2 only supported")}
	}
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing TTL")}
	}
	// uuid is used as transaction id
	uuidWithHyphen := uuid.New()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}

	tableNameArray := []string{
		r.logsDB + "." + r.logsLocalTableV2,
		r.logsDB + "." + r.logsResourceLocalTableV2,
		getLocalTableName(r.logsDB + "." + r.logsAttributeKeys),
		getLocalTableName(r.logsDB + "." + r.logsResourceKeys),
	}

	// check if there is existing things to be done
	for _, tableName := range tableNameArray {
		statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
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

	ttlLogsV2AttributeKeys := fmt.Sprintf(
		"ALTER TABLE %v ON CLUSTER %s MODIFY TTL timestamp + "+
			"INTERVAL %v SECOND DELETE", tableNameArray[2], r.cluster, params.DelDuration)

	ttlLogsV2ResourceKeys := fmt.Sprintf(
		"ALTER TABLE %v ON CLUSTER %s MODIFY TTL timestamp + "+
			"INTERVAL %v SECOND DELETE", tableNameArray[3], r.cluster, params.DelDuration)

	ttlPayload := map[string]string{
		tableNameArray[0]: ttlLogsV2,
		tableNameArray[1]: ttlLogsV2Resource,
		tableNameArray[2]: ttlLogsV2AttributeKeys,
		tableNameArray[3]: ttlLogsV2ResourceKeys,
	}

	// set the ttl if nothing is pending/ no errors
	go func(ttlPayload map[string]string) {
		for tableName, query := range ttlPayload {
			// https://github.com/SigNoz/signoz/issues/5470
			// we will change ttl for only the new parts and not the old ones
			query += " SETTINGS materialize_ttl_after_modify=0"

			ttl := types.TTLSetting{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				TransactionID:  uuid,
				TableName:      tableName,
				TTL:            int(params.DelDuration),
				Status:         constants.StatusPending,
				ColdStorageTTL: coldStorageDuration,
				OrgID:          orgID,
			}
			_, dbErr := r.
				sqlDB.
				BunDB().
				NewInsert().
				Model(&ttl).
				Exec(ctx)
			if dbErr != nil {
				zap.L().Error("error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}

			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
				if err == nil {
					_, dbErr := r.
						sqlDB.
						BunDB().
						NewUpdate().
						Model(new(types.TTLSetting)).
						Set("updated_at = ?", time.Now()).
						Set("status = ?", constants.StatusFailed).
						Where("id = ?", statusItem.ID.StringValue()).
						Exec(ctx)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			zap.L().Info("Executing TTL request: ", zap.String("request", query))
			statusItem, _ := r.checkTTLStatusItem(ctx, orgID, tableName)
			if err := r.db.Exec(ctx, query); err != nil {
				zap.L().Error("error while setting ttl", zap.Error(err))
				_, dbErr := r.
					sqlDB.
					BunDB().
					NewUpdate().
					Model(new(types.TTLSetting)).
					Set("updated_at = ?", time.Now()).
					Set("status = ?", constants.StatusFailed).
					Where("id = ?", statusItem.ID.StringValue()).
					Exec(ctx)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.
				sqlDB.
				BunDB().
				NewUpdate().
				Model(new(types.TTLSetting)).
				Set("updated_at = ?", time.Now()).
				Set("status = ?", constants.StatusSuccess).
				Where("id = ?", statusItem.ID.StringValue()).
				Exec(ctx)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}

	}(ttlPayload)
	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) setTTLTraces(ctx context.Context, orgID string, params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
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
		r.TraceDB + "." + r.spanAttributesKeysTable,
	}

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}

	// check if there is existing things to be done
	for _, tableName := range tableNames {
		statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
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

			ttl := types.TTLSetting{
				Identifiable: types.Identifiable{
					ID: valuer.GenerateUUID(),
				},
				TimeAuditable: types.TimeAuditable{
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				},
				TransactionID:  uuid,
				TableName:      tableName,
				TTL:            int(params.DelDuration),
				Status:         constants.StatusPending,
				ColdStorageTTL: coldStorageDuration,
				OrgID:          orgID,
			}
			_, dbErr := r.
				sqlDB.
				BunDB().
				NewInsert().
				Model(&ttl).
				Exec(ctx)
			if dbErr != nil {
				zap.L().Error("error in inserting to ttl_status table", zap.Error(dbErr))
				return
			}

			req := fmt.Sprintf(ttlV2, tableName, r.cluster, timestamp, params.DelDuration)
			if strings.HasSuffix(distributedTableName, r.traceResourceTableV3) {
				req = fmt.Sprintf(ttlV2Resource, tableName, r.cluster, params.DelDuration)
			}

			if len(params.ColdStorageVolume) > 0 && !strings.HasSuffix(distributedTableName, r.spanAttributesKeysTable) {
				if strings.HasSuffix(distributedTableName, r.traceResourceTableV3) {
					req += fmt.Sprintf(ttlTracesV2ResourceColdStorage, params.ToColdStorageDuration, params.ColdStorageVolume)
				} else {
					req += fmt.Sprintf(ttlV2ColdStorage, timestamp, params.ToColdStorageDuration, params.ColdStorageVolume)
				}
			}
			err := r.setColdStorage(context.Background(), tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("Error in setting cold storage", zap.Error(err))
				statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
				if err == nil {
					_, dbErr := r.
						sqlDB.
						BunDB().
						NewUpdate().
						Model(new(types.TTLSetting)).
						Set("updated_at = ?", time.Now()).
						Set("status = ?", constants.StatusFailed).
						Where("id = ?", statusItem.ID.StringValue()).
						Exec(ctx)
					if dbErr != nil {
						zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
						return
					}
				}
				return
			}
			req += " SETTINGS materialize_ttl_after_modify=0;"
			zap.L().Error(" ExecutingTTL request: ", zap.String("request", req))
			statusItem, _ := r.checkTTLStatusItem(ctx, orgID, tableName)
			if err := r.db.Exec(ctx, req); err != nil {
				zap.L().Error("Error in executing set TTL query", zap.Error(err))
				_, dbErr := r.
					sqlDB.
					BunDB().
					NewUpdate().
					Model(new(types.TTLSetting)).
					Set("updated_at = ?", time.Now()).
					Set("status = ?", constants.StatusFailed).
					Where("id = ?", statusItem.ID.StringValue()).
					Exec(ctx)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
				return
			}
			_, dbErr = r.
				sqlDB.
				BunDB().
				NewUpdate().
				Model(new(types.TTLSetting)).
				Set("updated_at = ?", time.Now()).
				Set("status = ?", constants.StatusSuccess).
				Where("id = ?", statusItem.ID.StringValue()).
				Exec(ctx)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
		}(distributedTableName)
	}
	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) hasCustomRetentionColumn(ctx context.Context) (bool, error) {
	// Directly query for the _retention_days column existence
	query := fmt.Sprintf("SELECT 1 FROM system.columns WHERE database = '%s' AND table = '%s' AND name = '_retention_days' LIMIT 1", r.logsDB, r.logsLocalTableV2)

	var exists uint8 // Changed from int to uint8 to match ClickHouse's UInt8 type
	err := r.db.QueryRow(ctx, query).Scan(&exists)
	if err != nil {
		if err == sql.ErrNoRows {
			// Column doesn't exist
			zap.L().Debug("_retention_days column not found in logs table", zap.String("table", r.logsLocalTableV2))
			return false, nil
		}
		zap.L().Error("Error checking for _retention_days column", zap.Error(err))
		return false, errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "error checking columns")
	}

	zap.L().Debug("Found _retention_days column in logs table", zap.String("table", r.logsLocalTableV2))
	return true, nil
}

func (r *ClickHouseReader) SetTTLV2(ctx context.Context, orgID string, params *model.CustomRetentionTTLParams) (*model.CustomRetentionTTLResponse, error) {

	hasCustomRetention, err := r.hasCustomRetentionColumn(ctx)
	if err != nil {
		return nil, errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "custom retention not supported")
	}

	if !hasCustomRetention {
		zap.L().Info("Custom retention not supported, falling back to standard TTL method",
			zap.String("orgID", orgID))

		ttlParams := &model.TTLParams{
			Type:        params.Type,
			DelDuration: int64(params.DefaultTTLDays * 24 * 3600),
		}
		if params.ColdStorageVolume != "" {
			ttlParams.ColdStorageVolume = params.ColdStorageVolume
		} else {
			ttlParams.ColdStorageVolume = ""
		}

		if params.ToColdStorageDurationDays > 0 {
			ttlParams.ToColdStorageDuration = params.ToColdStorageDurationDays * 24 * 3600
		} else {
			ttlParams.ToColdStorageDuration = 0
		}

		ttlResult, apiErr := r.SetTTL(ctx, orgID, ttlParams)
		if apiErr != nil {
			return nil, errorsV2.Wrapf(apiErr.Err, errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to set standard TTL")
		}

		return &model.CustomRetentionTTLResponse{
			Message: fmt.Sprintf("Custom retention not supported, applied standard TTL of %d days. %s", params.DefaultTTLDays, ttlResult.Message),
		}, nil
	}

	// Keep only latest 100 transactions/requests
	r.deleteTtlTransactions(ctx, orgID, 100)

	uuidWithHyphen := valuer.GenerateUUID()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)

	if params.Type != constants.LogsTTL {
		return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "custom retention TTL only supported for logs")
	}

	// Validate TTL conditions
	if err := r.validateTTLConditions(ctx, params.TTLConditions); err != nil {
		return nil, err
	}

	// Calculate cold storage duration
	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 && params.ToColdStorageDurationDays > 0 {
		coldStorageDuration = int(params.ToColdStorageDurationDays) // Already in days
	}

	tableNames := []string{
		r.logsDB + "." + r.logsLocalTableV2,
		r.logsDB + "." + r.logsResourceLocalTableV2,
		getLocalTableName(r.logsDB + "." + r.logsAttributeKeys),
		getLocalTableName(r.logsDB + "." + r.logsResourceKeys),
	}
	distributedTableNames := []string{
		r.logsDB + "." + r.logsTableV2,
		r.logsDB + "." + r.logsResourceTableV2,
	}

	for _, tableName := range tableNames {
		statusItem, err := r.checkCustomRetentionTTLStatusItem(ctx, orgID, tableName)
		if err != nil {
			return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "error in processing custom_retention_ttl_status check sql query")
		}
		if statusItem.Status == constants.StatusPending {
			return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "custom retention TTL is already running")
		}
	}

	multiIfExpr := r.buildMultiIfExpression(params.TTLConditions, params.DefaultTTLDays, false)
	resourceMultiIfExpr := r.buildMultiIfExpression(params.TTLConditions, params.DefaultTTLDays, true)

	ttlPayload := make(map[string][]string)

	queries := []string{
		fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days UInt16 DEFAULT %s`,
			tableNames[0], r.cluster, multiIfExpr),
		// for distributed table
		fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days UInt16 DEFAULT %s`,
			distributedTableNames[0], r.cluster, multiIfExpr),
	}

	if len(params.ColdStorageVolume) > 0 && coldStorageDuration > 0 {
		queries = append(queries, fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days_cold UInt16 DEFAULT %d`,
			tableNames[0], r.cluster, coldStorageDuration))
		// for distributed table
		queries = append(queries, fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days_cold UInt16 DEFAULT %d`,
			distributedTableNames[0], r.cluster, coldStorageDuration))

		queries = append(queries, fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY TTL toDateTime(timestamp / 1000000000) + toIntervalDay(_retention_days) DELETE, toDateTime(timestamp / 1000000000) + toIntervalDay(_retention_days_cold) TO VOLUME '%s' SETTINGS materialize_ttl_after_modify=0`,
			tableNames[0], r.cluster, params.ColdStorageVolume))
	}

	ttlPayload[tableNames[0]] = queries

	resourceQueries := []string{
		fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days UInt16 DEFAULT %s`,
			tableNames[1], r.cluster, resourceMultiIfExpr),
		// for distributed table
		fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days UInt16 DEFAULT %s`,
			distributedTableNames[1], r.cluster, resourceMultiIfExpr),
	}

	if len(params.ColdStorageVolume) > 0 && coldStorageDuration > 0 {
		resourceQueries = append(resourceQueries, fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days_cold UInt16 DEFAULT %d`,
			tableNames[1], r.cluster, coldStorageDuration))
		// for distributed table
		resourceQueries = append(resourceQueries, fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY COLUMN _retention_days_cold UInt16 DEFAULT %d`,
			distributedTableNames[1], r.cluster, coldStorageDuration))
		resourceQueries = append(resourceQueries, fmt.Sprintf(`ALTER TABLE %s ON CLUSTER %s MODIFY TTL toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + toIntervalDay(_retention_days) DELETE, toDateTime(seen_at_ts_bucket_start) + toIntervalSecond(1800) + toIntervalDay(_retention_days_cold) TO VOLUME '%s' SETTINGS materialize_ttl_after_modify=0`,
			tableNames[1], r.cluster, params.ColdStorageVolume))
	}

	ttlPayload[tableNames[1]] = resourceQueries

	// NOTE: Since logs support custom rule based retention, that makes it difficult to identify which attributes, resource keys
	// we need to keep, hence choosing MAX for safe side and not to create any complex solution for this.
	maxRetentionTTL := params.DefaultTTLDays
	for _, rule := range params.TTLConditions {
		maxRetentionTTL = max(maxRetentionTTL, rule.TTLDays)
	}

	ttlPayload[tableNames[2]] = []string{
		fmt.Sprintf("ALTER TABLE %s ON CLUSTER %s MODIFY TTL timestamp + toIntervalDay(%d) DELETE SETTINGS materialize_ttl_after_modify=0",
			tableNames[2], r.cluster, maxRetentionTTL),
	}

	ttlPayload[tableNames[3]] = []string{
		fmt.Sprintf("ALTER TABLE %s ON CLUSTER %s MODIFY TTL timestamp + toIntervalDay(%d) DELETE SETTINGS materialize_ttl_after_modify=0",
			tableNames[3], r.cluster, maxRetentionTTL),
	}

	ttlConditionsJSON, err := json.Marshal(params.TTLConditions)
	if err != nil {
		return nil, errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "error marshalling TTL condition")
	}

	for tableName, queries := range ttlPayload {
		customTTL := types.TTLSetting{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			TransactionID:  uuid,
			TableName:      tableName,
			TTL:            params.DefaultTTLDays,
			Condition:      string(ttlConditionsJSON),
			Status:         constants.StatusPending,
			ColdStorageTTL: coldStorageDuration,
			OrgID:          orgID,
		}

		// Insert TTL setting record
		_, dbErr := r.sqlDB.BunDB().NewInsert().Model(&customTTL).Exec(ctx)
		if dbErr != nil {
			zap.L().Error("error in inserting to custom_retention_ttl_settings table", zap.Error(dbErr))
			return nil, errorsV2.Wrapf(dbErr, errorsV2.TypeInternal, errorsV2.CodeInternal, "error inserting TTL settings")
		}

		if len(params.ColdStorageVolume) > 0 && coldStorageDuration > 0 {
			err := r.setColdStorage(ctx, tableName, params.ColdStorageVolume)
			if err != nil {
				zap.L().Error("error in setting cold storage", zap.Error(err))
				r.updateCustomRetentionTTLStatus(ctx, orgID, tableName, constants.StatusFailed)
				return nil, errorsV2.Wrapf(err.Err, errorsV2.TypeInternal, errorsV2.CodeInternal, "error setting cold storage for table %s", tableName)
			}
		}

		for i, query := range queries {
			zap.L().Debug("Executing custom retention TTL request: ", zap.String("request", query), zap.Int("step", i+1))
			if err := r.db.Exec(ctx, query); err != nil {
				zap.L().Error("error while setting custom retention ttl", zap.Error(err))
				r.updateCustomRetentionTTLStatus(ctx, orgID, tableName, constants.StatusFailed)
				return nil, errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "error setting custom retention TTL for table %s, query: %s", tableName, query)
			}
		}

		r.updateCustomRetentionTTLStatus(ctx, orgID, tableName, constants.StatusSuccess)
	}

	return &model.CustomRetentionTTLResponse{
		Message: "custom retention TTL has been successfully set up",
	}, nil
}

// New method to build multiIf expressions with support for multiple AND conditions
func (r *ClickHouseReader) buildMultiIfExpression(ttlConditions []model.CustomRetentionRule, defaultTTLDays int, isResourceTable bool) string {
	var conditions []string

	for i, rule := range ttlConditions {
		zap.L().Debug("Processing rule", zap.Int("ruleIndex", i), zap.Int("ttlDays", rule.TTLDays), zap.Int("conditionsCount", len(rule.Filters)))

		if len(rule.Filters) == 0 {
			zap.L().Warn("Rule has no filters, skipping", zap.Int("ruleIndex", i))
			continue
		}

		// Build AND conditions for this rule
		var andConditions []string
		for j, condition := range rule.Filters {
			zap.L().Debug("Processing condition", zap.Int("ruleIndex", i), zap.Int("conditionIndex", j), zap.String("key", condition.Key), zap.Strings("values", condition.Values))

			// This should not happen as validation should catch it
			if len(condition.Values) == 0 {
				zap.L().Error("Condition has no values - this should have been caught in validation", zap.Int("ruleIndex", i), zap.Int("conditionIndex", j))
				continue
			}

			// Properly quote values for IN clause
			quotedValues := make([]string, len(condition.Values))
			for k, v := range condition.Values {
				quotedValues[k] = fmt.Sprintf("'%s'", v)
			}

			var conditionExpr string
			if isResourceTable {
				// For resource table, use JSONExtractString
				conditionExpr = fmt.Sprintf(
					"JSONExtractString(labels, '%s') IN (%s)",
					condition.Key,
					strings.Join(quotedValues, ", "),
				)
			} else {
				// For main logs table, use resources_string
				conditionExpr = fmt.Sprintf(
					"resources_string['%s'] IN (%s)",
					condition.Key,
					strings.Join(quotedValues, ", "),
				)
			}
			andConditions = append(andConditions, conditionExpr)
		}

		if len(andConditions) > 0 {
			// Join all conditions with AND
			fullCondition := strings.Join(andConditions, " AND ")
			conditionWithTTL := fmt.Sprintf("%s, %d", fullCondition, rule.TTLDays)
			zap.L().Debug("Adding condition to multiIf", zap.String("condition", conditionWithTTL))
			conditions = append(conditions, conditionWithTTL)
		}
	}

	// Handle case where no valid conditions were found
	if len(conditions) == 0 {
		zap.L().Info("No valid conditions found, returning default TTL", zap.Int("defaultTTLDays", defaultTTLDays))
		return fmt.Sprintf("%d", defaultTTLDays)
	}

	result := fmt.Sprintf(
		"multiIf(%s, %d)",
		strings.Join(conditions, ", "),
		defaultTTLDays,
	)

	zap.L().Debug("Final multiIf expression", zap.String("expression", result))
	return result
}

func (r *ClickHouseReader) GetCustomRetentionTTL(ctx context.Context, orgID string) (*model.GetCustomRetentionTTLResponse, error) {
	// Check if V2 (custom retention) is supported
	hasCustomRetention, err := r.hasCustomRetentionColumn(ctx)
	if err != nil {
		// If there's an error checking, assume V1 and proceed
		zap.L().Warn("Error checking for custom retention column, assuming V1", zap.Error(err))
		hasCustomRetention = false
	}

	response := &model.GetCustomRetentionTTLResponse{}

	if hasCustomRetention {
		// V2 - Custom retention is supported
		response.Version = "v2"

		// Get the latest custom retention TTL setting
		customTTL := new(types.TTLSetting)
		err := r.sqlDB.BunDB().NewSelect().
			Model(customTTL).
			Where("org_id = ?", orgID).
			Where("table_name = ?", r.logsDB+"."+r.logsLocalTableV2).
			OrderExpr("created_at DESC").
			Limit(1).
			Scan(ctx)

		if err != nil && err != sql.ErrNoRows {
			zap.L().Error("Error in processing sql query", zap.Error(err))
			return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "error in processing get custom ttl query")
		}

		if err == sql.ErrNoRows {
			// No V2 configuration found, return defaults
			response.DefaultTTLDays = 15
			response.TTLConditions = []model.CustomRetentionRule{}
			response.Status = constants.StatusFailed
			response.ColdStorageTTLDays = -1
			return response, nil
		}

		// Parse TTL conditions from Condition
		var ttlConditions []model.CustomRetentionRule
		if customTTL.Condition != "" {
			if err := json.Unmarshal([]byte(customTTL.Condition), &ttlConditions); err != nil {
				zap.L().Error("Error parsing TTL conditions", zap.Error(err))
				ttlConditions = []model.CustomRetentionRule{}
			}
		}

		response.DefaultTTLDays = customTTL.TTL
		response.TTLConditions = ttlConditions
		response.Status = customTTL.Status
		response.ColdStorageTTLDays = customTTL.ColdStorageTTL

	} else {
		// V1 - Traditional TTL
		response.Version = "v1"

		// Get V1 TTL configuration
		ttlParams := &model.GetTTLParams{
			Type: constants.LogsTTL,
		}

		ttlResult, apiErr := r.GetTTL(ctx, orgID, ttlParams)
		if apiErr != nil {
			return nil, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "error getting V1 TTL: %s", apiErr.Error())
		}

		response.ExpectedLogsTime = ttlResult.ExpectedLogsTime
		response.ExpectedLogsMoveTime = ttlResult.ExpectedLogsMoveTime
		response.Status = ttlResult.Status
		response.ColdStorageTTLDays = -1
		if ttlResult.LogsTime > 0 {
			response.DefaultTTLDays = ttlResult.LogsTime / 24
		}
		if ttlResult.LogsMoveTime > 0 {
			response.ColdStorageTTLDays = ttlResult.LogsMoveTime / 24
		}

		// For V1, we don't have TTL conditions
		response.TTLConditions = []model.CustomRetentionRule{}
	}

	return response, nil
}

func (r *ClickHouseReader) checkCustomRetentionTTLStatusItem(ctx context.Context, orgID string, tableName string) (*types.TTLSetting, error) {
	ttl := new(types.TTLSetting)
	err := r.sqlDB.BunDB().NewSelect().
		Model(ttl).
		Where("table_name = ?", tableName).
		Where("org_id = ?", orgID).
		OrderExpr("created_at DESC").
		Limit(1).
		Scan(ctx)

	if err != nil && err != sql.ErrNoRows {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return ttl, errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "error in processing custom_retention_ttl_status check sql query")
	}

	return ttl, nil
}

func (r *ClickHouseReader) updateCustomRetentionTTLStatus(ctx context.Context, orgID, tableName, status string) {
	statusItem, err := r.checkCustomRetentionTTLStatusItem(ctx, orgID, tableName)
	if err == nil && statusItem != nil {
		_, dbErr := r.sqlDB.BunDB().NewUpdate().
			Model(new(types.TTLSetting)).
			Set("updated_at = ?", time.Now()).
			Set("status = ?", status).
			Where("id = ?", statusItem.ID.StringValue()).
			Exec(ctx)
		if dbErr != nil {
			zap.L().Error("Error in processing custom_retention_ttl_status update sql query", zap.Error(dbErr))
		}
	}
}

// Enhanced validation function with duplicate detection and efficient key validation
func (r *ClickHouseReader) validateTTLConditions(ctx context.Context, ttlConditions []model.CustomRetentionRule) error {
	if len(ttlConditions) == 0 {
		return nil
	}

	// Collect all unique keys and detect duplicates
	var allKeys []string
	keySet := make(map[string]struct{})
	conditionSignatures := make(map[string]bool)

	for i, rule := range ttlConditions {
		if len(rule.Filters) == 0 {
			return errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "rule at index %d has no filters", i)
		}

		// Create a signature for this rule's conditions to detect duplicates
		var conditionKeys []string
		var conditionValues []string

		for j, condition := range rule.Filters {
			if len(condition.Values) == 0 {
				return errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "condition at rule %d, condition %d has no values", i, j)
			}

			// Collect unique keys
			if _, exists := keySet[condition.Key]; !exists {
				allKeys = append(allKeys, condition.Key)
				keySet[condition.Key] = struct{}{}
			}

			// Build signature for duplicate detection
			conditionKeys = append(conditionKeys, condition.Key)
			conditionValues = append(conditionValues, strings.Join(condition.Values, ","))
		}

		// Create signature by sorting keys and values to handle order-independent comparison
		sort.Strings(conditionKeys)
		sort.Strings(conditionValues)
		signature := strings.Join(conditionKeys, "|") + ":" + strings.Join(conditionValues, "|")

		if conditionSignatures[signature] {
			return errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "duplicate rule detected at index %d: rules with identical conditions are not allowed", i)
		}
		conditionSignatures[signature] = true
	}

	if len(allKeys) == 0 {
		return nil
	}

	// Create placeholders for IN query
	placeholders := make([]string, len(allKeys))
	for i := range allKeys {
		placeholders[i] = "?"
	}

	// Efficient validation using IN query
	query := fmt.Sprintf("SELECT name FROM %s.%s WHERE name IN (%s)",
		r.logsDB, r.logsResourceKeys, strings.Join(placeholders, ", "))

	// Convert keys to interface{} for query parameters
	params := make([]interface{}, len(allKeys))
	for i, key := range allKeys {
		params[i] = key
	}

	rows, err := r.db.Query(ctx, query, params...)
	if err != nil {
		return errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to validate resource keys")
	}
	defer rows.Close()

	// Collect valid keys
	validKeys := make(map[string]struct{})
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return errorsV2.Wrapf(err, errorsV2.TypeInternal, errorsV2.CodeInternal, "failed to scan resource keys")
		}
		validKeys[name] = struct{}{}
	}

	// Find invalid keys
	var invalidKeys []string
	for _, key := range allKeys {
		if _, exists := validKeys[key]; !exists {
			invalidKeys = append(invalidKeys, key)
		}
	}

	if len(invalidKeys) > 0 {
		return errorsV2.Newf(errorsV2.TypeInternal, errorsV2.CodeInternal, "invalid resource keys found: %v. Please check logs_resource_keys table for valid keys", invalidKeys)
	}

	return nil
}

// SetTTL sets the TTL for traces or metrics or logs tables.
// This is an async API which creates goroutines to set TTL.
// Status of TTL update is tracked with ttl_status table in sqlite db.
func (r *ClickHouseReader) SetTTL(ctx context.Context, orgID string, params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// Keep only latest 100 transactions/requests
	r.deleteTtlTransactions(ctx, orgID, 100)

	switch params.Type {
	case constants.TraceTTL:
		return r.setTTLTraces(ctx, orgID, params)
	case constants.MetricsTTL:
		return r.setTTLMetrics(ctx, orgID, params)
	case constants.LogsTTL:
		return r.setTTLLogs(ctx, orgID, params)
	default:
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error while setting ttl. ttl type should be <metrics|traces>, got %v", params.Type)}
	}

}

func (r *ClickHouseReader) setTTLMetrics(ctx context.Context, orgID string, params *model.TTLParams) (*model.SetTTLResponseItem, *model.ApiError) {
	// uuid is used as transaction id
	uuidWithHyphen := uuid.New()
	uuid := strings.Replace(uuidWithHyphen.String(), "-", "", -1)

	coldStorageDuration := -1
	if len(params.ColdStorageVolume) > 0 {
		coldStorageDuration = int(params.ToColdStorageDuration)
	}
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
		statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
		if err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
		}
		if statusItem.Status == constants.StatusPending {
			return nil, &model.ApiError{Typ: model.ErrorConflict, Err: fmt.Errorf("TTL is already running")}
		}
	}
	metricTTL := func(tableName string) {
		ttl := types.TTLSetting{
			Identifiable: types.Identifiable{
				ID: valuer.GenerateUUID(),
			},
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			TransactionID:  uuid,
			TableName:      tableName,
			TTL:            int(params.DelDuration),
			Status:         constants.StatusPending,
			ColdStorageTTL: coldStorageDuration,
			OrgID:          orgID,
		}
		_, dbErr := r.
			sqlDB.
			BunDB().
			NewInsert().
			Model(&ttl).
			Exec(ctx)
		if dbErr != nil {
			zap.L().Error("error in inserting to ttl_status table", zap.Error(dbErr))
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
			statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
			if err == nil {
				_, dbErr := r.
					sqlDB.
					BunDB().
					NewUpdate().
					Model(new(types.TTLSetting)).
					Set("updated_at = ?", time.Now()).
					Set("status = ?", constants.StatusFailed).
					Where("id = ?", statusItem.ID.StringValue()).
					Exec(ctx)
				if dbErr != nil {
					zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
					return
				}
			}
			return
		}
		req += " SETTINGS materialize_ttl_after_modify=0"
		zap.L().Info("Executing TTL request: ", zap.String("request", req))
		statusItem, _ := r.checkTTLStatusItem(ctx, orgID, tableName)
		if err := r.db.Exec(ctx, req); err != nil {
			zap.L().Error("error while setting ttl.", zap.Error(err))
			_, dbErr := r.
				sqlDB.
				BunDB().
				NewUpdate().
				Model(new(types.TTLSetting)).
				Set("updated_at = ?", time.Now()).
				Set("status = ?", constants.StatusFailed).
				Where("id = ?", statusItem.ID.StringValue()).
				Exec(ctx)
			if dbErr != nil {
				zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
				return
			}
			return
		}
		_, dbErr = r.
			sqlDB.
			BunDB().
			NewUpdate().
			Model(new(types.TTLSetting)).
			Set("updated_at = ?", time.Now()).
			Set("status = ?", constants.StatusSuccess).
			Where("id = ?", statusItem.ID.StringValue()).
			Exec(ctx)
		if dbErr != nil {
			zap.L().Error("Error in processing ttl_status update sql query", zap.Error(dbErr))
			return
		}
	}
	for _, tableName := range tableNames {
		go metricTTL(tableName)
	}
	return &model.SetTTLResponseItem{Message: "move ttl has been successfully set up"}, nil
}

func (r *ClickHouseReader) deleteTtlTransactions(ctx context.Context, orgID string, numberOfTransactionsStore int) {
	limitTransactions := []string{}
	err := r.
		sqlDB.
		BunDB().
		NewSelect().
		Column("transaction_id").
		Model(new(types.TTLSetting)).
		Where("org_id = ?", orgID).
		Group("transaction_id").
		OrderExpr("MAX(created_at) DESC").
		Limit(numberOfTransactionsStore).
		Scan(ctx, &limitTransactions)

	if err != nil {
		zap.L().Error("Error in processing ttl_status delete sql query", zap.Error(err))
	}

	_, err = r.
		sqlDB.
		BunDB().
		NewDelete().
		Model(new(types.TTLSetting)).
		Where("transaction_id NOT IN (?)", bun.In(limitTransactions)).
		Exec(ctx)
	if err != nil {
		zap.L().Error("Error in processing ttl_status delete sql query", zap.Error(err))
	}
}

// checkTTLStatusItem checks if ttl_status table has an entry for the given table name
func (r *ClickHouseReader) checkTTLStatusItem(ctx context.Context, orgID string, tableName string) (*types.TTLSetting, *model.ApiError) {
	zap.L().Info("checkTTLStatusItem query", zap.String("tableName", tableName))
	ttl := new(types.TTLSetting)
	err := r.
		sqlDB.
		BunDB().
		NewSelect().
		Model(ttl).
		Where("table_name = ?", tableName).
		Where("org_id = ?", orgID).
		OrderExpr("created_at DESC").
		Limit(1).
		Scan(ctx)
	if err != nil && err != sql.ErrNoRows {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return ttl, &model.ApiError{Typ: model.ErrorExec, Err: fmt.Errorf("error in processing ttl_status check sql query")}
	}
	return ttl, nil
}

// setTTLQueryStatus fetches ttl_status table status from DB
func (r *ClickHouseReader) setTTLQueryStatus(ctx context.Context, orgID string, tableNameArray []string) (string, *model.ApiError) {
	failFlag := false
	status := constants.StatusSuccess
	for _, tableName := range tableNameArray {
		statusItem, err := r.checkTTLStatusItem(ctx, orgID, tableName)
		emptyStatusStruct := new(types.TTLSetting)
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
func (r *ClickHouseReader) GetTTL(ctx context.Context, orgID string, ttlParams *model.GetTTLParams) (*model.GetTTLResponseItem, *model.ApiError) {

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
		status, err := r.setTTLQueryStatus(ctx, orgID, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getTracesTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, orgID, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTTL != -1 {
			ttlQuery.ColdStorageTTL = ttlQuery.ColdStorageTTL / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{TracesTime: delTTL, TracesMoveTime: moveTTL, ExpectedTracesTime: ttlQuery.TTL, ExpectedTracesMoveTime: ttlQuery.ColdStorageTTL, Status: status}, nil

	case constants.MetricsTTL:
		tableNameArray := []string{signozMetricDBName + "." + signozSampleTableName}
		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, orgID, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getMetricsTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, orgID, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTTL != -1 {
			ttlQuery.ColdStorageTTL = ttlQuery.ColdStorageTTL / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{MetricsTime: delTTL, MetricsMoveTime: moveTTL, ExpectedMetricsTime: ttlQuery.TTL, ExpectedMetricsMoveTime: ttlQuery.ColdStorageTTL, Status: status}, nil

	case constants.LogsTTL:
		tableNameArray := []string{r.logsDB + "." + r.logsTableName}
		tableNameArray = getLocalTableNameArray(tableNameArray)
		status, err := r.setTTLQueryStatus(ctx, orgID, tableNameArray)
		if err != nil {
			return nil, err
		}
		dbResp, err := getLogsTTL()
		if err != nil {
			return nil, err
		}
		ttlQuery, err := r.checkTTLStatusItem(ctx, orgID, tableNameArray[0])
		if err != nil {
			return nil, err
		}
		ttlQuery.TTL = ttlQuery.TTL / 3600 // convert to hours
		if ttlQuery.ColdStorageTTL != -1 {
			ttlQuery.ColdStorageTTL = ttlQuery.ColdStorageTTL / 3600 // convert to hours
		}

		delTTL, moveTTL := parseTTL(dbResp.EngineFull)
		return &model.GetTTLResponseItem{LogsTime: delTTL, LogsMoveTime: moveTTL, ExpectedLogsTime: ttlQuery.TTL, ExpectedLogsMoveTime: ttlQuery.ColdStorageTTL, Status: status}, nil

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

func (r *ClickHouseReader) FetchTemporality(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string]map[v3.Temporality]bool, error) {
	metricNameToTemporality := make(map[string]map[v3.Temporality]bool)

	// Batch fetch all metadata at once
	metadataMap, apiErr := r.GetUpdatedMetricsMetadata(ctx, orgID, metricNames...)
	if apiErr != nil {
		zap.L().Warn("Failed to fetch updated metrics metadata", zap.Error(apiErr))
		return nil, apiErr
	}

	for metricName, metadata := range metadataMap {
		if metadata == nil {
			continue
		}
		if _, exists := metricNameToTemporality[metricName]; !exists {
			metricNameToTemporality[metricName] = make(map[v3.Temporality]bool)
		}
		metricNameToTemporality[metricName][metadata.Temporality] = true
	}

	return metricNameToTemporality, nil
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

func (r *ClickHouseReader) GetLogFieldsFromNames(ctx context.Context, fieldNames []string) (*model.GetFieldsResponse, *model.ApiError) {
	// response will contain top level fields from the otel log model
	response := model.GetFieldsResponse{
		Selected:    constants.StaticSelectedLogFields,
		Interesting: []model.Field{},
	}

	// get attribute keys
	attributes := []model.Field{}
	query := fmt.Sprintf("SELECT DISTINCT name, datatype from %s.%s where name in ('%s') group by name, datatype", r.logsDB, r.logsAttributeKeys, strings.Join(fieldNames, "','"))
	err := r.db.Select(ctx, &attributes, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

	// get resource keys
	resources := []model.Field{}
	query = fmt.Sprintf("SELECT DISTINCT name, datatype from %s.%s where name in ('%s') group by name, datatype", r.logsDB, r.logsResourceKeys, strings.Join(fieldNames, "','"))
	err = r.db.Select(ctx, &resources, query)
	if err != nil {
		return nil, &model.ApiError{Err: err, Typ: model.ErrorInternal}
	}

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
		if isColumn(tableStatement, field.Type, field.Name, field.DataType) {
			response.Selected = append(response.Selected, field)
		} else {
			response.Interesting = append(response.Interesting, field)
		}
	}
}

func (r *ClickHouseReader) UpdateLogField(ctx context.Context, field *model.UpdateField) *model.ApiError {
	if !field.Selected {
		return model.ForbiddenError(errors.New("removing a selected field is not allowed, please reach out to support."))
	}

	colname := utils.GetClickhouseColumnNameV2(field.Type, field.DataType, field.Name)

	field.DataType = strings.ToLower(field.DataType)
	dataType := constants.MaterializedDataTypeMap[field.DataType]
	chDataType := constants.ChDataTypeMap[field.DataType]

	attrColName := fmt.Sprintf("%s_%s", field.Type, dataType)
	for _, table := range []string{r.logsLocalTableV2, r.logsTableV2} {
		q := "ALTER TABLE %s.%s ON CLUSTER %s ADD COLUMN IF NOT EXISTS `%s` %s DEFAULT %s['%s'] CODEC(ZSTD(1))"
		query := fmt.Sprintf(q,
			r.logsDB, table,
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
	chDataType := constants.ChDataTypeMap[field.DataType]
	dataType := constants.MaterializedDataTypeMap[field.DataType]

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

func (r *ClickHouseReader) GetMetricAggregateAttributes(ctx context.Context, orgID valuer.UUID, req *v3.AggregateAttributeRequest, skipSignozMetrics bool) (*v3.AggregateAttributeResponse, error) {
	var response v3.AggregateAttributeResponse
	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	// Query all relevant metric names from time_series_v4, but leave metadata retrieval to cache/db
	query := fmt.Sprintf(
		`SELECT DISTINCT metric_name 
		 FROM %s.%s 
		 WHERE metric_name ILIKE $1 AND __normalized = $2`,
		signozMetricDBName, signozTSTableNameV41Day)

	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}

	rows, err := r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), normalized)
	if err != nil {
		zap.L().Error("Error while querying metric names", zap.Error(err))
		return nil, fmt.Errorf("error while executing metric name query: %s", err.Error())
	}
	defer rows.Close()

	var metricNames []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, fmt.Errorf("error while scanning metric name: %s", err.Error())
		}
		if skipSignozMetrics && strings.HasPrefix(name, "signoz") {
			continue
		}
		metricNames = append(metricNames, name)
	}

	if len(metricNames) == 0 {
		return &response, nil
	}

	// Get all metadata in one shot
	metadataMap, apiError := r.GetUpdatedMetricsMetadata(ctx, orgID, metricNames...)
	if apiError != nil {
		return &response, fmt.Errorf("error getting updated metrics metadata: %s", apiError.Error())
	}

	seen := make(map[string]struct{})
	for _, name := range metricNames {
		metadata := metadataMap[name]

		typ := string(metadata.MetricType)
		temporality := string(metadata.Temporality)
		isMonotonic := metadata.IsMonotonic

		// Non-monotonic cumulative sums are treated as gauges
		if typ == "Sum" && !isMonotonic && temporality == string(v3.Cumulative) {
			typ = "Gauge"
		}

		// unlike traces/logs `tag`/`resource` type, the `Type` will be metric type
		key := v3.AttributeKey{
			Key:      name,
			DataType: v3.AttributeKeyDataTypeFloat64,
			Type:     v3.AttributeKeyType(typ),
			IsColumn: true,
		}

		if _, ok := seen[name+typ]; ok {
			continue
		}
		seen[name+typ] = struct{}{}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMeterAggregateAttributes(ctx context.Context, orgID valuer.UUID, req *v3.AggregateAttributeRequest) (*v3.AggregateAttributeResponse, error) {
	var response v3.AggregateAttributeResponse
	// Query all relevant metric names from time_series_v4, but leave metadata retrieval to cache/db
	query := fmt.Sprintf(
		`SELECT metric_name,type,temporality,is_monotonic 
		 FROM %s.%s 
		 WHERE metric_name ILIKE $1
		 GROUP BY metric_name,type,temporality,is_monotonic`,
		signozMeterDBName, signozMeterSamplesName)

	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}

	rows, err := r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText))
	if err != nil {
		zap.L().Error("Error while querying meter names", zap.Error(err))
		return nil, fmt.Errorf("error while executing meter name query: %s", err.Error())
	}
	defer rows.Close()

	for rows.Next() {
		var name string
		var typ string
		var temporality string
		var isMonotonic bool
		if err := rows.Scan(&name, &typ, &temporality, &isMonotonic); err != nil {
			return nil, fmt.Errorf("error while scanning meter name: %s", err.Error())
		}

		// Non-monotonic cumulative sums are treated as gauges
		if typ == "Sum" && !isMonotonic && temporality == string(v3.Cumulative) {
			typ = "Gauge"
		}

		// unlike traces/logs `tag`/`resource` type, the `Type` will be metric type
		key := v3.AttributeKey{
			Key:      name,
			DataType: v3.AttributeKeyDataTypeFloat64,
			Type:     v3.AttributeKeyType(typ),
			IsColumn: true,
		}
		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMetricAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	// skips the internal attributes i.e attributes starting with __
	query = fmt.Sprintf("SELECT arrayJoin(tagKeys) AS distinctTagKey FROM (SELECT JSONExtractKeys(labels) AS tagKeys FROM %s.%s WHERE metric_name=$1 AND unix_milli >= $2 AND __normalized = $3 GROUP BY tagKeys) WHERE distinctTagKey ILIKE $4 AND distinctTagKey NOT LIKE '\\_\\_%%' GROUP BY distinctTagKey", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, req.AggregateAttribute, common.PastDayRoundOff(), normalized, fmt.Sprintf("%%%s%%", req.SearchText))
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

func (r *ClickHouseReader) GetMeterAttributeKeys(ctx context.Context, req *v3.FilterAttributeKeyRequest) (*v3.FilterAttributeKeyResponse, error) {
	var query string
	var err error
	var rows driver.Rows
	var response v3.FilterAttributeKeyResponse

	// skips the internal attributes i.e attributes starting with __
	query = fmt.Sprintf("SELECT DISTINCT arrayJoin(JSONExtractKeys(labels)) as attr_name FROM %s.%s WHERE metric_name=$1 AND attr_name ILIKE $2 AND attr_name NOT LIKE '\\_\\_%%'", signozMeterDBName, signozMeterSamplesName)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	rows, err = r.db.Query(ctx, query, req.AggregateAttribute, fmt.Sprintf("%%%s%%", req.SearchText))
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

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	query = fmt.Sprintf("SELECT JSONExtractString(labels, $1) AS tagValue FROM %s.%s WHERE metric_name IN $2 AND JSONExtractString(labels, $3) ILIKE $4 AND unix_milli >= $5 AND __normalized=$6 GROUP BY tagValue", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	names := []string{req.AggregateAttribute}
	names = append(names, metrics.GetTransitionedMetric(req.AggregateAttribute, normalized))

	rows, err = r.db.Query(ctx, query, req.FilterAttributeKey, names, req.FilterAttributeKey, fmt.Sprintf("%%%s%%", req.SearchText), common.PastDayRoundOff(), normalized)

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

func (r *ClickHouseReader) GetMetricMetadata(ctx context.Context, orgID valuer.UUID, metricName, serviceName string) (*v3.MetricMetadataResponse, error) {

	unixMilli := common.PastDayRoundOff()

	// 1. Fetch metadata from cache/db using unified function
	metadataMap, apiError := r.GetUpdatedMetricsMetadata(ctx, orgID, metricName)
	if apiError != nil {
		zap.L().Error("Error in getting metric cached metadata", zap.Error(apiError))
		return nil, fmt.Errorf("error fetching metric metadata: %s", apiError.Err.Error())
	}

	// Defaults in case metadata is not found
	var (
		deltaExists bool
		isMonotonic bool
		temporality string
		description string
		metricType  string
		unit        string
	)

	metadata, ok := metadataMap[metricName]
	if !ok {
		return nil, fmt.Errorf("metric metadata not found: %s", metricName)
	}

	metricType = string(metadata.MetricType)
	temporality = string(metadata.Temporality)
	isMonotonic = metadata.IsMonotonic
	description = metadata.Description
	unit = metadata.Unit

	if temporality == string(v3.Delta) {
		deltaExists = true
	}
	// 2. Only for Histograms, get `le` buckets
	var leFloat64 []float64
	if metricType == string(v3.MetricTypeHistogram) {
		query := fmt.Sprintf(`
			SELECT JSONExtractString(labels, 'le') AS le
			FROM %s.%s
			WHERE metric_name = $1
				AND unix_milli >= $2
				AND type = 'Histogram'
				AND (JSONExtractString(labels, 'service_name') = $3 OR JSONExtractString(labels, 'service.name') = $4)
			GROUP BY le
			ORDER BY le`, signozMetricDBName, signozTSTableNameV41Day)

		rows, err := r.db.Query(ctx, query, metricName, unixMilli, serviceName, serviceName)
		if err != nil {
			zap.L().Error("Error while querying histogram buckets", zap.Error(err))
			return nil, fmt.Errorf("error while querying histogram buckets: %s", err.Error())
		}
		defer rows.Close()

		for rows.Next() {
			var leStr string
			if err := rows.Scan(&leStr); err != nil {
				return nil, fmt.Errorf("error while scanning le: %s", err.Error())
			}
			le, err := strconv.ParseFloat(leStr, 64)
			if err != nil || math.IsInf(le, 0) {
				zap.L().Error("Invalid 'le' bucket value", zap.String("value", leStr), zap.Error(err))
				continue
			}
			leFloat64 = append(leFloat64, le)
		}
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

func isColumn(tableStatement, attrType, field, datType string) bool {
	name := fmt.Sprintf("`%s`", utils.GetClickhouseColumnNameV2(attrType, datType, field))
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

	query = fmt.Sprintf("SELECT DISTINCT(tag_key), tag_type, tag_data_type from %s.%s WHERE %s and tag_type != 'logfield' limit $2", r.logsDB, r.logsTagAttributeTableV2, where)
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
			IsColumn: isColumn(statements[0].Statement, attType, tagKey, dataType),
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

	tagTypeFilter := `tag_type != 'logfield'`
	if req.TagType != "" {
		tagTypeFilter = fmt.Sprintf(`tag_type != 'logfield' and tag_type = '%s'`, req.TagType)
	}

	if len(req.SearchText) != 0 {
		query = fmt.Sprintf("select distinct tag_key, tag_type, tag_data_type from  %s.%s where %s and tag_key ILIKE $1 limit $2", r.logsDB, r.logsTagAttributeTableV2, tagTypeFilter)
		rows, err = r.db.Query(ctx, query, fmt.Sprintf("%%%s%%", req.SearchText), req.Limit)
	} else {
		query = fmt.Sprintf("select distinct tag_key, tag_type, tag_data_type from %s.%s where %s limit $1", r.logsDB, r.logsTagAttributeTableV2, tagTypeFilter)
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
			IsColumn: isColumn(statements[0].Statement, tagType, attributeKey, attributeDataType),
		}

		response.AttributeKeys = append(response.AttributeKeys, key)
	}

	// add other attributes only when the tagType is not specified
	// i.e retrieve all attributes
	if req.TagType == "" {
		for _, f := range constants.StaticFieldsLogsV3 {
			if (v3.AttributeKey{} == f) {
				continue
			}
			if len(req.SearchText) == 0 || strings.Contains(f.Key, req.SearchText) {
				response.AttributeKeys = append(response.AttributeKeys, f)
			}
		}
	}

	return &response, nil
}

func (r *ClickHouseReader) FetchRelatedValues(ctx context.Context, req *v3.FilterAttributeValueRequest) ([]string, error) {
	var andConditions []string

	andConditions = append(andConditions, fmt.Sprintf("unix_milli >= %d", req.StartTimeMillis))
	andConditions = append(andConditions, fmt.Sprintf("unix_milli <= %d", req.EndTimeMillis))

	if len(req.ExistingFilterItems) != 0 {
		for _, item := range req.ExistingFilterItems {
			// we only support string for related values
			if item.Key.DataType != v3.AttributeKeyDataTypeString {
				continue
			}

			var colName string
			switch item.Key.Type {
			case v3.AttributeKeyTypeResource:
				colName = "resource_attributes"
			case v3.AttributeKeyTypeTag:
				colName = "attributes"
			default:
				// we only support resource and tag for related values as of now
				continue
			}
			// IN doesn't make use of map value index, we convert it to = or !=
			operator := item.Operator
			if v3.FilterOperator(strings.ToLower(string(item.Operator))) == v3.FilterOperatorIn {
				operator = "="
			} else if v3.FilterOperator(strings.ToLower(string(item.Operator))) == v3.FilterOperatorNotIn {
				operator = "!="
			}
			addCondition := func(val string) {
				andConditions = append(andConditions, fmt.Sprintf("mapContains(%s, '%s') AND %s['%s'] %s %s", colName, item.Key.Key, colName, item.Key.Key, operator, val))
			}
			switch v := item.Value.(type) {
			case string:
				fmtVal := utils.ClickHouseFormattedValue(v)
				addCondition(fmtVal)
			case []string:
				for _, val := range v {
					fmtVal := utils.ClickHouseFormattedValue(val)
					addCondition(fmtVal)
				}
			case []interface{}:
				for _, val := range v {
					fmtVal := utils.ClickHouseFormattedValue(val)
					addCondition(fmtVal)
				}
			}
		}
	}
	whereClause := strings.Join(andConditions, " AND ")

	var selectColumn string
	switch req.TagType {
	case v3.TagTypeResource:
		selectColumn = "resource_attributes" + "['" + req.FilterAttributeKey + "']"
	case v3.TagTypeTag:
		selectColumn = "attributes" + "['" + req.FilterAttributeKey + "']"
	default:
		selectColumn = "attributes" + "['" + req.FilterAttributeKey + "']"
	}

	filterSubQuery := fmt.Sprintf(
		"SELECT DISTINCT %s FROM %s.%s WHERE %s LIMIT 100",
		selectColumn,
		r.metadataDB,
		r.metadataTable,
		whereClause,
	)
	zap.L().Debug("filterSubQuery for related values", zap.String("query", filterSubQuery))

	rows, err := r.db.Query(ctx, filterSubQuery)
	if err != nil {
		return nil, fmt.Errorf("error while executing query: %s", err.Error())
	}
	defer rows.Close()

	var attributeValues []string
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, fmt.Errorf("error while scanning rows: %s", err.Error())
		}
		if value != "" {
			attributeValues = append(attributeValues, value)
		}
	}

	return attributeValues, nil
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

	if req.IncludeRelated {
		relatedValues, _ := r.FetchRelatedValues(ctx, req)
		attributeValues.RelatedValues = &v3.FilterAttributeValueResponse{
			StringAttributeValues: relatedValues,
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
				val := strconv.FormatFloat(reflect.ValueOf(v).Elem().Float(), 'f', -1, 64)
				groupBy = append(groupBy, val)
				if _, ok := groupAttributes[colName]; !ok {
					groupAttributesArray = append(groupAttributesArray, map[string]string{colName: val})
				}
				groupAttributes[colName] = val
			}
		case **float64, **float32:
			val := reflect.ValueOf(v)
			if val.IsValid() && !val.IsNil() && !val.Elem().IsNil() {
				value := reflect.ValueOf(v).Elem().Elem().Float()
				if _, ok := constants.ReservedColumnTargetAliases[colName]; ok || countOfNumberCols == 1 {
					isValidPoint = true
					point.Value = value
				} else {
					val := strconv.FormatFloat(value, 'f', -1, 64)
					groupBy = append(groupBy, val)
					if _, ok := groupAttributes[colName]; !ok {
						groupAttributesArray = append(groupAttributesArray, map[string]string{colName: val})
					}
					groupAttributes[colName] = val
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

// GetTimeSeriesResultV3 runs the query and returns list of time series
func (r *ClickHouseReader) GetTimeSeriesResultV3(ctx context.Context, query string) ([]*v3.Series, error) {
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
	query = fmt.Sprintf("SELECT DISTINCT(tag_key), tag_type, tag_data_type FROM %s.%s WHERE %s and tag_type != 'spanfield'", r.TraceDB, r.spanAttributeTableV2, where)
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
			IsColumn: isColumn(statements[0].Statement, tagType, tagKey, dataType),
		}

		if _, ok := constants.DeprecatedStaticFieldsTraces[tagKey]; !ok {
			response.AttributeKeys = append(response.AttributeKeys, key)
		}
	}

	fields := constants.NewStaticFieldsTraces
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

	tagTypeFilter := `tag_type != 'spanfield'`
	if req.TagType != "" {
		tagTypeFilter = fmt.Sprintf(`tag_type != 'spanfield' and tag_type = '%s'`, req.TagType)
	}

	query = fmt.Sprintf("SELECT DISTINCT(tag_key), tag_type, tag_data_type FROM %s.%s WHERE tag_key ILIKE $1 and %s LIMIT $2", r.TraceDB, r.spanAttributeTableV2, tagTypeFilter)

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
			IsColumn: isColumn(statements[0].Statement, tagType, tagKey, dataType),
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
	// add the new static fields only when the tagType is not specified
	// i.e retrieve all attributes
	if req.TagType == "" {
		for _, f := range fields {
			if (v3.AttributeKey{} == f) {
				continue
			}
			if len(req.SearchText) == 0 || strings.Contains(f.Key, req.SearchText) {
				response.AttributeKeys = append(response.AttributeKeys, f)
			}
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
		where := "timestamp >= toDateTime64(now() - INTERVAL 48 HOUR, 9) AND ts_bucket_start >= toUInt64(toUnixTimestamp(now() - INTERVAL 48 HOUR))"
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

	if req.IncludeRelated {
		relatedValues, _ := r.FetchRelatedValues(ctx, req)
		attributeValues.RelatedValues = &v3.FilterAttributeValueResponse{
			StringAttributeValues: relatedValues,
		}
	}

	return &attributeValues, nil
}

func (r *ClickHouseReader) GetSpanAttributeKeysByNames(ctx context.Context, names []string) (map[string]v3.AttributeKey, error) {
	var query string
	var err error
	var rows driver.Rows
	response := map[string]v3.AttributeKey{}

	query = fmt.Sprintf("SELECT DISTINCT(tagKey), tagType, dataType FROM %s.%s where tagKey in ('%s')", r.TraceDB, r.spanAttributesKeysTable, strings.Join(names, "','"))

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
			IsColumn: isColumn(statements[0].Statement, tagType, tagKey, dataType),
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

func (r *ClickHouseReader) GetAllMetricFilterAttributeKeys(ctx context.Context, req *metrics_explorer.FilterKeyRequest) (*[]v3.AttributeKey, *model.ApiError) {
	var rows driver.Rows
	var response []v3.AttributeKey
	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}
	query := fmt.Sprintf("SELECT arrayJoin(tagKeys) AS distinctTagKey FROM (SELECT JSONExtractKeys(labels) AS tagKeys FROM %s.%s WHERE unix_milli >= $1 and __normalized = $2 GROUP BY tagKeys) WHERE distinctTagKey ILIKE $3 AND distinctTagKey NOT LIKE '\\_\\_%%' GROUP BY distinctTagKey", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, common.PastDayRoundOff(), normalized, fmt.Sprintf("%%%s%%", req.SearchText)) //only showing past day data
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	var attributeKey string
	for rows.Next() {
		if err := rows.Scan(&attributeKey); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		key := v3.AttributeKey{
			Key:      attributeKey,
			DataType: v3.AttributeKeyDataTypeString, // https://github.com/OpenObservability/OpenMetrics/blob/main/proto/openmetrics_data_model.proto#L64-L72.
			Type:     v3.AttributeKeyTypeTag,
			IsColumn: false,
		}
		response = append(response, key)
	}
	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return &response, nil
}

func (r *ClickHouseReader) GetAllMetricFilterAttributeValues(ctx context.Context, req *metrics_explorer.FilterValueRequest) ([]string, *model.ApiError) {
	var query string
	var err error
	var rows driver.Rows
	var attributeValues []string
	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	query = fmt.Sprintf("SELECT JSONExtractString(labels, $1) AS tagValue FROM %s.%s WHERE JSONExtractString(labels, $2) ILIKE $3 AND unix_milli >= $4 AND __normalized = $5 GROUP BY tagValue", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err = r.db.Query(valueCtx, query, req.FilterKey, req.FilterKey, fmt.Sprintf("%%%s%%", req.SearchText), common.PastDayRoundOff(), normalized) //only showing past day data

	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	var atrributeValue string
	for rows.Next() {
		if err := rows.Scan(&atrributeValue); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		attributeValues = append(attributeValues, atrributeValue)
	}
	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return attributeValues, nil
}

func (r *ClickHouseReader) GetAllMetricFilterUnits(ctx context.Context, req *metrics_explorer.FilterValueRequest) ([]string, *model.ApiError) {
	var rows driver.Rows
	var response []string
	query := fmt.Sprintf("SELECT DISTINCT unit FROM %s.%s WHERE unit ILIKE $1 AND unit IS NOT NULL ORDER BY unit", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}

	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, fmt.Sprintf("%%%s%%", req.SearchText))
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	var attributeKey string
	for rows.Next() {
		if err := rows.Scan(&attributeKey); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		response = append(response, attributeKey)
	}
	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return response, nil
}
func (r *ClickHouseReader) GetAllMetricFilterTypes(ctx context.Context, req *metrics_explorer.FilterValueRequest) ([]string, *model.ApiError) {
	var rows driver.Rows
	var response []string
	query := fmt.Sprintf("SELECT DISTINCT type FROM %s.%s WHERE type ILIKE $1 AND type IS NOT NULL ORDER BY type", signozMetricDBName, signozTSTableNameV41Day)
	if req.Limit != 0 {
		query = query + fmt.Sprintf(" LIMIT %d;", req.Limit)
	}
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, fmt.Sprintf("%%%s%%", req.SearchText))
	if err != nil {
		zap.L().Error("Error while executing query", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	var attributeKey string
	for rows.Next() {
		if err := rows.Scan(&attributeKey); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		response = append(response, attributeKey)
	}
	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return response, nil
}

func (r *ClickHouseReader) GetMetricsDataPoints(ctx context.Context, metricName string) (uint64, *model.ApiError) {
	query := fmt.Sprintf(`SELECT 
    sum(count) as data_points
FROM %s.%s
WHERE metric_name = ?
`, signozMetricDBName, constants.SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME)
	var dataPoints uint64
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.QueryRow(valueCtx, query, metricName).Scan(&dataPoints)
	if err != nil {
		return 0, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return dataPoints, nil // Convert to uint64 before returning
}

func (r *ClickHouseReader) GetMetricsLastReceived(ctx context.Context, metricName string) (int64, *model.ApiError) {
	query := fmt.Sprintf(`SELECT 
    MAX(unix_milli) AS last_received_time
FROM %s.%s
WHERE metric_name = ?
`, signozMetricDBName, signozSamplesAgg30mLocalTableName)
	var lastReceived int64
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.QueryRow(valueCtx, query, metricName).Scan(&lastReceived)
	if err != nil {
		return 0, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	query = fmt.Sprintf(`SELECT 
    MAX(unix_milli) AS last_received_time
FROM %s.%s
WHERE metric_name = ? and unix_milli > ?
`, signozMetricDBName, signozSampleTableName)
	var finalLastReceived int64
	err = r.db.QueryRow(valueCtx, query, metricName, lastReceived).Scan(&finalLastReceived)
	if err != nil {
		return 0, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return finalLastReceived, nil // Convert to uint64 before returning
}

func (r *ClickHouseReader) GetTotalTimeSeriesForMetricName(ctx context.Context, metricName string) (uint64, *model.ApiError) {
	query := fmt.Sprintf(`SELECT 
    uniq(fingerprint) AS timeSeriesCount
FROM %s.%s
WHERE metric_name = ?;`, signozMetricDBName, signozTSTableNameV41Week)
	var timeSeriesCount uint64
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.QueryRow(valueCtx, query, metricName).Scan(&timeSeriesCount)
	if err != nil {
		return 0, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return timeSeriesCount, nil
}

func (r *ClickHouseReader) GetAttributesForMetricName(ctx context.Context, metricName string, start, end *int64, filters *v3.FilterSet) (*[]metrics_explorer.Attribute, *model.ApiError) {
	whereClause := ""
	if filters != nil {
		conditions, _ := utils.BuildFilterConditions(filters, "t")
		if conditions != nil {
			whereClause = "AND " + strings.Join(conditions, " AND ")
		}
	}
	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	const baseQueryTemplate = `
SELECT 
    kv.1 AS key,
    arrayMap(x -> trim(BOTH '"' FROM x), groupUniqArray(1000)(kv.2)) AS values,
    length(groupUniqArray(10000)(kv.2)) AS valueCount
FROM %s.%s
ARRAY JOIN arrayFilter(x -> NOT startsWith(x.1, '__'), JSONExtractKeysAndValuesRaw(labels)) AS kv
WHERE metric_name = ? AND __normalized=? %s`

	var args []interface{}
	args = append(args, metricName)
	tableName := signozTSTableNameV41Week

	args = append(args, normalized)

	if start != nil && end != nil {
		st, en, tsTable, _ := utils.WhichTSTableToUse(*start, *end)
		*start, *end, tableName = st, en, tsTable
		args = append(args, *start, *end)
	} else if start == nil && end == nil {
		tableName = signozTSTableNameV41Week
	}

	query := fmt.Sprintf(baseQueryTemplate, signozMetricDBName, tableName, whereClause)

	if start != nil && end != nil {
		query += " AND unix_milli BETWEEN ? AND ?"
	}

	query += "\nGROUP BY kv.1\nORDER BY valueCount DESC;"

	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, args...)
	if err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	var attributesList []metrics_explorer.Attribute
	for rows.Next() {
		var attr metrics_explorer.Attribute
		if err := rows.Scan(&attr.Key, &attr.Value, &attr.ValueCount); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		attributesList = append(attributesList, attr)
	}

	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	return &attributesList, nil
}

func (r *ClickHouseReader) GetActiveTimeSeriesForMetricName(ctx context.Context, metricName string, duration time.Duration) (uint64, *model.ApiError) {
	milli := time.Now().Add(-duration).UnixMilli()
	query := fmt.Sprintf("SELECT uniq(fingerprint) FROM %s.%s WHERE metric_name = '%s' and unix_milli >= ?", signozMetricDBName, signozTSTableNameV4, metricName)
	var timeSeries uint64
	// Using QueryRow instead of Select since we're only expecting a single value
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.QueryRow(valueCtx, query, milli).Scan(&timeSeries)
	if err != nil {
		return 0, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return timeSeries, nil
}

func (r *ClickHouseReader) ListSummaryMetrics(ctx context.Context, orgID valuer.UUID, req *metrics_explorer.SummaryListMetricsRequest) (*metrics_explorer.SummaryListMetricsResponse, *model.ApiError) {
	var args []interface{}

	// Build filter conditions (if any)
	conditions, _ := utils.BuildFilterConditions(&req.Filters, "t")
	whereClause := ""
	if conditions != nil {
		whereClause = "AND " + strings.Join(conditions, " AND ")
	}

	firstQueryLimit := req.Limit
	samplesOrder := false
	var orderByClauseFirstQuery string
	if req.OrderBy.ColumnName == "samples" {
		samplesOrder = true
		orderByClauseFirstQuery = fmt.Sprintf("ORDER BY timeseries %s", req.OrderBy.Order)
		if req.Limit < 50 {
			firstQueryLimit = 50
		}
	} else {
		orderByClauseFirstQuery = fmt.Sprintf("ORDER BY %s %s", req.OrderBy.ColumnName, req.OrderBy.Order)
	}

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	// Determine which tables to use
	start, end, tsTable, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	sampleTable, countExp := utils.WhichSampleTableToUse(req.Start, req.End)

	metricsQuery := fmt.Sprintf(
		`SELECT 
		    t.metric_name AS metric_name,
		    ANY_VALUE(t.description) AS description,
		    ANY_VALUE(t.type) AS metric_type,
		    ANY_VALUE(t.unit) AS metric_unit,
		    uniq(t.fingerprint) AS timeseries,
			uniq(metric_name) OVER() AS total
		FROM %s.%s AS t
		WHERE unix_milli BETWEEN ? AND ?
		AND NOT startsWith(metric_name, 'signoz')
		AND __normalized = ?
		%s
		GROUP BY t.metric_name
		%s
		LIMIT %d OFFSET %d;`,
		signozMetricDBName, tsTable, whereClause, orderByClauseFirstQuery, firstQueryLimit, req.Offset)

	args = append(args, start, end)
	args = append(args, normalized)
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	begin := time.Now()
	rows, err := r.db.Query(valueCtx, metricsQuery, args...)
	queryDuration := time.Since(begin)
	zap.L().Info("Time taken to execute metrics query to fetch metrics with high time series", zap.String("query", metricsQuery), zap.Any("args", args), zap.Duration("duration", queryDuration))
	if err != nil {
		zap.L().Error("Error executing metrics query", zap.Error(err))
		return &metrics_explorer.SummaryListMetricsResponse{}, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	var response metrics_explorer.SummaryListMetricsResponse
	var metricNames []string

	for rows.Next() {
		var metric metrics_explorer.MetricDetail
		if err := rows.Scan(&metric.MetricName, &metric.Description, &metric.MetricType, &metric.MetricUnit, &metric.TimeSeries, &response.Total); err != nil {
			zap.L().Error("Error scanning metric row", zap.Error(err))
			return &response, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		metricNames = append(metricNames, metric.MetricName)
		response.Metrics = append(response.Metrics, metric)
	}
	if err := rows.Err(); err != nil {
		zap.L().Error("Error iterating over metric rows", zap.Error(err))
		return &response, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	// If no metrics were found, return early.
	if len(metricNames) == 0 {
		return &response, nil
	}

	// Build a comma-separated list of quoted metric names.
	metricsList := "'" + strings.Join(metricNames, "', '") + "'"
	// If samples are being sorted by datapoints, update the ORDER clause.
	if samplesOrder {
		orderByClauseFirstQuery = fmt.Sprintf("ORDER BY s.samples %s", req.OrderBy.Order)
	} else {
		orderByClauseFirstQuery = ""
	}
	args = make([]interface{}, 0)
	var sampleQuery string
	var sb strings.Builder

	if whereClause != "" {
		sb.WriteString(fmt.Sprintf(
			`SELECT 
				s.samples,
				s.metric_name
			FROM (
				SELECT 
					dm.metric_name,
					%s AS samples
				FROM %s.%s AS dm
				WHERE dm.metric_name IN (%s)
				AND dm.fingerprint IN (
					SELECT fingerprint
					FROM %s.%s
					WHERE metric_name IN (%s)
					AND __normalized = ?
					AND unix_milli BETWEEN ? AND ?
					%s
					GROUP BY fingerprint
				)
				AND dm.unix_milli BETWEEN ? AND ?
				GROUP BY dm.metric_name
			) AS s `,
			countExp,
			signozMetricDBName, sampleTable,
			metricsList,
			signozMetricDBName, localTsTable,
			metricsList,
			whereClause,
		))
		args = append(args, normalized)
		args = append(args, start, end)
		args = append(args, req.Start, req.End)
	} else {
		// If no filters, it is a simpler query.
		sb.WriteString(fmt.Sprintf(
			`SELECT 
        s.samples,
        s.metric_name
    FROM (
        SELECT 
            metric_name,
            %s AS samples
        FROM %s.%s
        WHERE metric_name IN (%s)
        AND unix_milli BETWEEN ? AND ?
        GROUP BY metric_name
    ) AS s `,
			countExp,
			signozMetricDBName, sampleTable,
			metricsList))
		args = append(args, req.Start, req.End)
	}

	// Append ORDER BY clause if provided.
	if orderByClauseFirstQuery != "" {
		sb.WriteString(orderByClauseFirstQuery + " ")
	}

	// Append LIMIT clause.
	sb.WriteString(fmt.Sprintf("LIMIT %d;", req.Limit))
	sampleQuery = sb.String()
	begin = time.Now()
	rows, err = r.db.Query(valueCtx, sampleQuery, args...)
	queryDuration = time.Since(begin)
	zap.L().Info("Time taken to execute list summary query", zap.String("query", sampleQuery), zap.Any("args", args), zap.Duration("duration", queryDuration))
	if err != nil {
		zap.L().Error("Error executing samples query", zap.Error(err))
		return &response, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	samplesMap := make(map[string]uint64)

	for rows.Next() {
		var samples uint64
		var metricName string
		if err := rows.Scan(&samples, &metricName); err != nil {
			zap.L().Error("Error scanning sample row", zap.Error(err))
			return &response, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		samplesMap[metricName] = samples
	}
	if err := rows.Err(); err != nil {
		zap.L().Error("Error iterating over sample rows", zap.Error(err))
		return &response, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	//get updated metrics data
	batch, apiError := r.GetUpdatedMetricsMetadata(ctx, orgID, metricNames...)
	if apiError != nil {
		zap.L().Error("Error in getting metrics cached metadata", zap.Error(apiError))
	}

	var filteredMetrics []metrics_explorer.MetricDetail
	for i := range response.Metrics {
		if updatedMetrics, exists := batch[response.Metrics[i].MetricName]; exists {
			response.Metrics[i].MetricType = string(updatedMetrics.MetricType)
			if updatedMetrics.Unit != "" {
				response.Metrics[i].MetricUnit = updatedMetrics.Unit
			}
			if updatedMetrics.Description != "" {
				response.Metrics[i].Description = updatedMetrics.Description
			}
		}
		if samples, exists := samplesMap[response.Metrics[i].MetricName]; exists {
			response.Metrics[i].Samples = samples
			filteredMetrics = append(filteredMetrics, response.Metrics[i])
		}
	}
	response.Metrics = filteredMetrics

	// If ordering by samples, sort in-memory.
	if samplesOrder {
		sort.Slice(response.Metrics, func(i, j int) bool {
			return response.Metrics[i].Samples > response.Metrics[j].Samples
		})
	}

	return &response, nil
}

func (r *ClickHouseReader) GetMetricsTimeSeriesPercentage(ctx context.Context, req *metrics_explorer.TreeMapMetricsRequest) (*[]metrics_explorer.TreeMapResponseItem, *model.ApiError) {
	var args []interface{}

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	// Build filters dynamically
	conditions, _ := utils.BuildFilterConditions(&req.Filters, "")
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "AND " + strings.Join(conditions, " AND ")
	}
	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)

	// Construct the query without backticks
	query := fmt.Sprintf(`
		SELECT 
			metric_name,
			total_value,
			(total_value * 100.0 / total_time_series) AS percentage
		FROM (
			SELECT 
					metric_name,
					uniq(fingerprint) AS total_value,
					(SELECT uniq(fingerprint) 
					 FROM %s.%s 
					 WHERE unix_milli BETWEEN ? AND ? AND __normalized = ?) AS total_time_series
				FROM %s.%s
				WHERE unix_milli BETWEEN ? AND ? AND NOT startsWith(metric_name, 'signoz') AND __normalized = ? %s
				GROUP BY metric_name
			)
			ORDER BY percentage DESC
			LIMIT %d;`,
		signozMetricDBName,
		tsTable,
		signozMetricDBName,
		tsTable,
		whereClause,
		req.Limit,
	)

	args = append(args,
		start, end,
		normalized, // For total_time_series subquery
		start, end, // For main query
		normalized,
	)

	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	begin := time.Now()
	rows, err := r.db.Query(valueCtx, query, args...)
	duration := time.Since(begin)
	zap.L().Info("Time taken to execute time series percentage query", zap.String("query", query), zap.Any("args", args), zap.Duration("duration", duration))
	if err != nil {
		zap.L().Error("Error executing time series percentage query", zap.Error(err), zap.String("query", query))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	var treemap []metrics_explorer.TreeMapResponseItem
	for rows.Next() {
		var item metrics_explorer.TreeMapResponseItem
		if err := rows.Scan(&item.MetricName, &item.TotalValue, &item.Percentage); err != nil {
			zap.L().Error("Error scanning row", zap.Error(err))
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		treemap = append(treemap, item)
	}

	if err := rows.Err(); err != nil {
		zap.L().Error("Error iterating over rows", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	return &treemap, nil
}

func (r *ClickHouseReader) GetMetricsSamplesPercentage(ctx context.Context, req *metrics_explorer.TreeMapMetricsRequest) (*[]metrics_explorer.TreeMapResponseItem, *model.ApiError) {

	conditions, _ := utils.BuildFilterConditions(&req.Filters, "ts")
	whereClause := ""
	if conditions != nil {
		whereClause = "AND " + strings.Join(conditions, " AND ")
	}

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	// Determine time range and tables to use
	start, end, tsTable, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	sampleTable, countExp := utils.WhichSampleTableToUse(req.Start, req.End)

	queryLimit := 50 + req.Limit
	metricsQuery := fmt.Sprintf(
		`SELECT 
		    ts.metric_name AS metric_name,
		    uniq(ts.fingerprint) AS timeSeries
		FROM %s.%s AS ts
		WHERE NOT startsWith(ts.metric_name, 'signoz_')
		AND __normalized = ?
		AND unix_milli BETWEEN ? AND ?
		%s
		GROUP BY ts.metric_name
		ORDER BY timeSeries DESC
		LIMIT %d;`,
		signozMetricDBName, tsTable, whereClause, queryLimit,
	)

	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	begin := time.Now()
	rows, err := r.db.Query(valueCtx, metricsQuery, normalized, start, end)
	duration := time.Since(begin)
	zap.L().Info("Time taken to execute samples percentage metric name query to reduce search space", zap.String("query", metricsQuery), zap.Any("start", start), zap.Any("end", end), zap.Duration("duration", duration))
	if err != nil {
		zap.L().Error("Error executing samples percentage query", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	// Process the query results
	var metricNames []string
	for rows.Next() {
		var metricName string
		var timeSeries uint64
		if err := rows.Scan(&metricName, &timeSeries); err != nil {
			zap.L().Error("Error scanning metric row", zap.Error(err))
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		metricNames = append(metricNames, metricName)
	}
	if err := rows.Err(); err != nil {
		zap.L().Error("Error iterating over metric rows", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	// If no metrics found, return early
	if len(metricNames) == 0 {
		return nil, nil
	}

	// Format metric names for query
	metricsList := "'" + strings.Join(metricNames, "', '") + "'"

	// Build optimized query with JOIN but `unix_milli` filter only on the sample table
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(
		`WITH TotalSamples AS (
			SELECT %s AS total_samples
			FROM %s.%s
			WHERE unix_milli BETWEEN ? AND ?
		)
		SELECT 
			s.samples,
			s.metric_name,
			COALESCE((s.samples * 100.0 / t.total_samples), 0) AS percentage
		FROM 
		(
			SELECT 
				dm.metric_name,
				%s AS samples
			FROM %s.%s AS dm`,
		countExp, signozMetricDBName, sampleTable, // Total samples
		countExp, signozMetricDBName, sampleTable, // Inner select samples
	))

	var args []interface{}
	args = append(args,
		req.Start, req.End, // For total_samples subquery
	)

	// Apply `unix_milli` filter **only** on the sample table (`dm`)
	sb.WriteString(` WHERE dm.unix_milli BETWEEN ? AND ?`)
	args = append(args, req.Start, req.End)

	// Use JOIN instead of IN (subquery) when additional filters exist
	if whereClause != "" {
		sb.WriteString(fmt.Sprintf(
			` AND dm.fingerprint IN (
				SELECT ts.fingerprint 
				FROM %s.%s AS ts
				WHERE ts.metric_name IN (%s)
				AND unix_milli BETWEEN ? AND ?
				AND __normalized = ?
				%s
				GROUP BY ts.fingerprint
			)`,
			signozMetricDBName, localTsTable, metricsList, whereClause,
		))
		args = append(args, start, end, normalized)
	}

	// Apply metric filtering after all conditions
	sb.WriteString(fmt.Sprintf(
		` AND dm.metric_name IN (%s)
			GROUP BY dm.metric_name
		) AS s
		JOIN TotalSamples t ON 1 = 1
		ORDER BY percentage DESC
		LIMIT ?;`,
		metricsList,
	))
	args = append(args, req.Limit)
	sampleQuery := sb.String()

	// Add start and end time to args (only for sample table)

	begin = time.Now()
	// Execute the sample percentage query
	rows, err = r.db.Query(valueCtx, sampleQuery, args...)
	duration = time.Since(begin)
	zap.L().Info("Time taken to execute samples percentage query", zap.String("query", sampleQuery), zap.Any("args", args), zap.Duration("duration", duration))
	if err != nil {
		zap.L().Error("Error executing samples query", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	// Process the results into a response slice
	var treemap []metrics_explorer.TreeMapResponseItem
	for rows.Next() {
		var item metrics_explorer.TreeMapResponseItem
		if err := rows.Scan(&item.TotalValue, &item.MetricName, &item.Percentage); err != nil {
			zap.L().Error("Error scanning row", zap.Error(err))
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		treemap = append(treemap, item)
	}
	if err := rows.Err(); err != nil {
		zap.L().Error("Error iterating over sample rows", zap.Error(err))
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	return &treemap, nil
}

func (r *ClickHouseReader) GetNameSimilarity(ctx context.Context, req *metrics_explorer.RelatedMetricsRequest) (map[string]metrics_explorer.RelatedMetricsScore, *model.ApiError) {
	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	query := fmt.Sprintf(`
		SELECT 
			metric_name,
			any(type) as type,
		    any(temporality) as temporality,
		    any(is_monotonic) as monotonic,
			1 - (levenshteinDistance(?, metric_name) / greatest(NULLIF(length(?), 0), NULLIF(length(metric_name), 0))) AS name_similarity
		FROM %s.%s
		WHERE metric_name != ?
		  AND unix_milli BETWEEN ? AND ?
		 AND NOT startsWith(metric_name, 'signoz')
		AND __normalized = ?
		GROUP BY metric_name
		ORDER BY name_similarity DESC
		LIMIT 30;`,
		signozMetricDBName, tsTable)

	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, req.CurrentMetricName, req.CurrentMetricName, req.CurrentMetricName, start, end, normalized)
	if err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	result := make(map[string]metrics_explorer.RelatedMetricsScore)
	for rows.Next() {
		var metric string
		var sim float64
		var metricType v3.MetricType
		var temporality v3.Temporality
		var isMonotonic bool
		if err := rows.Scan(&metric, &metricType, &temporality, &isMonotonic, &sim); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		result[metric] = metrics_explorer.RelatedMetricsScore{
			NameSimilarity: sim,
			MetricType:     metricType,
			Temporality:    temporality,
			IsMonotonic:    isMonotonic,
		}
	}

	return result, nil
}

func (r *ClickHouseReader) GetAttributeSimilarity(ctx context.Context, req *metrics_explorer.RelatedMetricsRequest) (map[string]metrics_explorer.RelatedMetricsScore, *model.ApiError) {
	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)

	normalized := true
	if constants.IsDotMetricsEnabled {
		normalized = false
	}

	// Get target labels
	extractedLabelsQuery := fmt.Sprintf(`
		SELECT 
			kv.1 AS label_key,
			topK(10)(JSONExtractString(kv.2)) AS label_values
		FROM %s.%s
		ARRAY JOIN JSONExtractKeysAndValuesRaw(labels) AS kv
		WHERE metric_name = ?
		  AND unix_milli between ? and ?
		  AND NOT startsWith(kv.1, '__')
		AND NOT startsWith(metric_name, 'signoz_')
		AND __normalized = ?
		GROUP BY label_key
		LIMIT 50`, signozMetricDBName, tsTable)

	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, extractedLabelsQuery, req.CurrentMetricName, start, end, normalized)
	if err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	var targetKeys []string
	var targetValues []string
	for rows.Next() {
		var key string
		var value []string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		targetKeys = append(targetKeys, key)
		targetValues = append(targetValues, value...)
	}

	targetKeysList := "'" + strings.Join(targetKeys, "', '") + "'"
	targetValuesList := "'" + strings.Join(targetValues, "', '") + "'"

	var priorityList []string
	for _, f := range req.Filters.Items {
		if f.Operator == v3.FilterOperatorEqual {
			priorityList = append(priorityList, fmt.Sprintf("tuple('%s', '%s')", f.Key.Key, f.Value))
		}
	}
	priorityListString := strings.Join(priorityList, ", ")

	candidateLabelsQuery := fmt.Sprintf(`
		WITH 
			arrayDistinct([%s]) AS filter_keys,     
			arrayDistinct([%s]) AS filter_values,
			[%s] AS priority_pairs_input,
			%d AS priority_multiplier
		SELECT 
			metric_name,
			any(type) as type,
			any(temporality) as temporality,
			any(is_monotonic) as monotonic,
			SUM(
				arraySum(
					kv -> if(has(filter_keys, kv.1) AND has(filter_values, kv.2), 1, 0),
					JSONExtractKeysAndValues(labels, 'String')
				)
			)::UInt64 AS raw_match_count,
			SUM(
				arraySum(
					kv ->
						if(
							arrayExists(pr -> pr.1 = kv.1 AND pr.2 = kv.2, priority_pairs_input),
							priority_multiplier,
							0
						),
					JSONExtractKeysAndValues(labels, 'String')
				)
			)::UInt64 AS weighted_match_count,
		toJSONString(
			arrayDistinct(
				arrayFlatten(
					groupArray(
						arrayFilter(
							kv -> arrayExists(pr -> pr.1 = kv.1 AND pr.2 = kv.2, priority_pairs_input),
							JSONExtractKeysAndValues(labels, 'String')
						)
					)
				)
			)
		) AS priority_pairs
		FROM %s.%s
		WHERE rand() %% 100 < 10
		AND unix_milli between ? and ?
		AND NOT startsWith(metric_name, 'signoz_')
		AND __normalized = ?
		GROUP BY metric_name
		ORDER BY weighted_match_count DESC, raw_match_count DESC
		LIMIT 30
		`,
		targetKeysList, targetValuesList, priorityListString, 2,
		signozMetricDBName, tsTable)

	rows, err = r.db.Query(valueCtx, candidateLabelsQuery, start, end, normalized)
	if err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	result := make(map[string]metrics_explorer.RelatedMetricsScore)
	attributeMap := make(map[string]uint64)

	for rows.Next() {
		var metric string
		var metricType v3.MetricType
		var temporality v3.Temporality
		var isMonotonic bool
		var weightedMatchCount, rawMatchCount uint64
		var priorityPairsJSON string

		if err := rows.Scan(&metric, &metricType, &temporality, &isMonotonic, &rawMatchCount, &weightedMatchCount, &priorityPairsJSON); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}

		attributeMap[metric] = weightedMatchCount + (rawMatchCount)/10
		var priorityPairs [][]string
		if err := json.Unmarshal([]byte(priorityPairsJSON), &priorityPairs); err != nil {
			priorityPairs = [][]string{}
		}

		result[metric] = metrics_explorer.RelatedMetricsScore{
			AttributeSimilarity: float64(attributeMap[metric]), // Will be normalized later
			Filters:             priorityPairs,
			MetricType:          metricType,
			Temporality:         temporality,
			IsMonotonic:         isMonotonic,
		}
	}

	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	// Normalize the attribute similarity scores
	normalizeMap := utils.NormalizeMap(attributeMap)
	for metric := range result {
		if score, exists := normalizeMap[metric]; exists {
			metricScore := result[metric]
			metricScore.AttributeSimilarity = score
			result[metric] = metricScore
		}
	}

	return result, nil
}

func (r *ClickHouseReader) GetMetricsAllResourceAttributes(ctx context.Context, start int64, end int64) (map[string]uint64, *model.ApiError) {
	start, end, attTable, _ := utils.WhichAttributesTableToUse(start, end)
	query := fmt.Sprintf(`SELECT 
    key, 
    count(distinct value) AS distinct_value_count
FROM (
    SELECT key, value
    FROM %s.%s
    ARRAY JOIN 
        arrayConcat(mapKeys(resource_attributes)) AS key,
        arrayConcat(mapValues(resource_attributes)) AS value
    WHERE unix_milli between ? and ?
) 
GROUP BY key
ORDER BY distinct_value_count DESC;`, signozMetadataDbName, attTable)
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, start, end)
	if err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	attributes := make(map[string]uint64)
	for rows.Next() {
		var attrs string
		var uniqCount uint64

		if err := rows.Scan(&attrs, &uniqCount); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}
		attributes[attrs] = uniqCount
	}
	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	return attributes, nil
}

func (r *ClickHouseReader) GetInspectMetrics(ctx context.Context, req *metrics_explorer.InspectMetricsRequest, fingerprints []string) (*metrics_explorer.InspectMetricsResponse, *model.ApiError) {
	start, end, _, localTsTable := utils.WhichTSTableToUse(req.Start, req.End)
	fingerprintsString := strings.Join(fingerprints, ",")
	query := fmt.Sprintf(`SELECT
                fingerprint,
                labels,
                unix_milli,
                value as per_series_value
        FROM
                signoz_metrics.distributed_samples_v4
        INNER JOIN (
                SELECT DISTINCT
                        fingerprint,
                        labels
                FROM
                        %s.%s
                WHERE
                        fingerprint in (%s)
                        AND unix_milli >= ?
                        AND unix_milli < ?) as filtered_time_series
                USING fingerprint
        WHERE
                metric_name  = ?
                AND unix_milli >= ?
                AND unix_milli < ?
                ORDER BY fingerprint DESC, unix_milli DESC`, signozMetricDBName, localTsTable, fingerprintsString)
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query, start, end, req.MetricName, start, end)
	if err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	defer rows.Close()

	seriesMap := make(map[uint64]*v3.Series)

	for rows.Next() {
		var fingerprint uint64
		var labelsJSON string
		var unixMilli int64
		var perSeriesValue float64

		if err := rows.Scan(&fingerprint, &labelsJSON, &unixMilli, &perSeriesValue); err != nil {
			return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
		}

		var labelsMap map[string]string
		if err := json.Unmarshal([]byte(labelsJSON), &labelsMap); err != nil {
			return nil, &model.ApiError{Typ: "JsonUnmarshalError", Err: err}
		}

		// Filter out keys starting with "__"
		filteredLabelsMap := make(map[string]string)
		for k, v := range labelsMap {
			if !strings.HasPrefix(k, "__") {
				filteredLabelsMap[k] = v
			}
		}

		var labelsArray []map[string]string
		for k, v := range filteredLabelsMap {
			labelsArray = append(labelsArray, map[string]string{k: v})
		}

		// Check if we already have a Series for this fingerprint.
		series, exists := seriesMap[fingerprint]
		if !exists {
			series = &v3.Series{
				Labels:      filteredLabelsMap,
				LabelsArray: labelsArray,
				Points:      []v3.Point{},
			}
			seriesMap[fingerprint] = series
		}

		series.Points = append(series.Points, v3.Point{
			Timestamp: unixMilli,
			Value:     perSeriesValue,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: "ClickHouseError", Err: err}
	}

	var seriesList []v3.Series
	for _, s := range seriesMap {
		seriesList = append(seriesList, *s)
	}

	return &metrics_explorer.InspectMetricsResponse{
		Series: &seriesList,
	}, nil
}

func (r *ClickHouseReader) GetInspectMetricsFingerprints(ctx context.Context, attributes []string, req *metrics_explorer.InspectMetricsRequest) ([]string, *model.ApiError) {
	// Build dynamic key selections and JSON extracts
	var jsonExtracts []string
	var groupBys []string

	for i, attr := range attributes {
		keyAlias := fmt.Sprintf("key%d", i+1)
		jsonExtracts = append(jsonExtracts, fmt.Sprintf("JSONExtractString(labels, '%s') AS %s", attr, keyAlias))
		groupBys = append(groupBys, keyAlias)
	}

	conditions, _ := utils.BuildFilterConditions(&req.Filters, "")
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "AND " + strings.Join(conditions, " AND ")
	}

	start, end, tsTable, _ := utils.WhichTSTableToUse(req.Start, req.End)
	query := fmt.Sprintf(`
        SELECT 
    arrayDistinct(groupArray(toString(fingerprint))) AS fingerprints
FROM
(
    SELECT 
        metric_name, labels, fingerprint,
        %s
    FROM %s.%s
    WHERE metric_name = ?
      AND unix_milli BETWEEN ? AND ?
    %s
)
GROUP BY %s
ORDER BY length(fingerprints) DESC, rand()
LIMIT 40`, // added rand to get diff value every time we run this query
		strings.Join(jsonExtracts, ", "),
		signozMetricDBName, tsTable,
		whereClause,
		strings.Join(groupBys, ", "))
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	rows, err := r.db.Query(valueCtx, query,
		req.MetricName,
		start,
		end,
	)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	defer rows.Close()

	var fingerprints []string
	for rows.Next() {
		// Create dynamic scanning based on number of attributes
		var batch []string

		if err := rows.Scan(&batch); err != nil {
			return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
		}

		remaining := 40 - len(fingerprints)
		if remaining <= 0 {
			break
		}

		// if this batch would overshoot, only take as many as we need
		if len(batch) > remaining {
			fingerprints = append(fingerprints, batch[:remaining]...)
			break
		}

		// otherwise take the whole batch and keep going
		fingerprints = append(fingerprints, batch...)

	}

	if err := rows.Err(); err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return fingerprints, nil
}

func (r *ClickHouseReader) DeleteMetricsMetadata(ctx context.Context, orgID valuer.UUID, metricName string) *model.ApiError {
	delQuery := fmt.Sprintf(`ALTER TABLE %s.%s DELETE WHERE metric_name = ?;`, signozMetricDBName, signozUpdatedMetricsMetadataLocalTable)
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.Exec(valueCtx, delQuery, metricName)
	if err != nil {
		return &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	r.cache.Delete(ctx, orgID, constants.UpdatedMetricsMetadataCachePrefix+metricName)
	return nil
}

func (r *ClickHouseReader) UpdateMetricsMetadata(ctx context.Context, orgID valuer.UUID, req *model.UpdateMetricsMetadata) *model.ApiError {
	if req.MetricType == v3.MetricTypeHistogram {
		labels := []string{"le"}
		hasLabels, apiError := r.CheckForLabelsInMetric(ctx, req.MetricName, labels)
		if apiError != nil {
			return apiError
		}
		if !hasLabels {
			return &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("metric '%s' cannot be set as histogram type", req.MetricName),
			}
		}
	}

	if req.MetricType == v3.MetricTypeSummary {
		labels := []string{"quantile"}
		hasLabels, apiError := r.CheckForLabelsInMetric(ctx, req.MetricName, labels)
		if apiError != nil {
			return apiError
		}
		if !hasLabels {
			return &model.ApiError{
				Typ: model.ErrorBadData,
				Err: fmt.Errorf("metric '%s' cannot be set as summary type", req.MetricName),
			}
		}
	}

	apiErr := r.DeleteMetricsMetadata(ctx, orgID, req.MetricName)
	if apiErr != nil {
		return apiErr
	}
	insertQuery := fmt.Sprintf(`INSERT INTO %s.%s (metric_name, temporality, is_monotonic, type, description, unit, created_at)
VALUES ( ?, ?, ?, ?, ?, ?, ?);`, signozMetricDBName, signozUpdatedMetricsMetadataTable)
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.Exec(valueCtx, insertQuery, req.MetricName, req.Temporality, req.IsMonotonic, req.MetricType, req.Description, req.Unit, req.CreatedAt.UnixMilli())
	if err != nil {
		return &model.ApiError{Typ: "ClickHouseError", Err: err}
	}
	err = r.cache.Set(ctx, orgID, constants.UpdatedMetricsMetadataCachePrefix+req.MetricName, req, 0)
	if err != nil {
		return &model.ApiError{Typ: "CachingErr", Err: err}
	}
	return nil
}

func (r *ClickHouseReader) CheckForLabelsInMetric(ctx context.Context, metricName string, labels []string) (bool, *model.ApiError) {
	if len(labels) == 0 {
		return true, nil
	}

	conditions := "metric_name = ?"
	for range labels {
		conditions += " AND JSONHas(labels, ?) = 1"
	}

	query := fmt.Sprintf(`
        SELECT count(*) > 0 as has_le
        FROM %s.%s
        WHERE %s
        LIMIT 1`, signozMetricDBName, signozTSTableNameV41Day, conditions)

	args := make([]interface{}, 0, len(labels)+1)
	args = append(args, metricName)
	for _, label := range labels {
		args = append(args, label)
	}

	var hasLE bool
	valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
	err := r.db.QueryRow(valueCtx, query, args...).Scan(&hasLE)
	if err != nil {
		return false, &model.ApiError{
			Typ: "ClickHouseError",
			Err: fmt.Errorf("error checking summary labels: %v", err),
		}
	}
	return hasLE, nil
}

func (r *ClickHouseReader) GetUpdatedMetricsMetadata(ctx context.Context, orgID valuer.UUID, metricNames ...string) (map[string]*model.UpdateMetricsMetadata, *model.ApiError) {
	cachedMetadata := make(map[string]*model.UpdateMetricsMetadata)
	var missingMetrics []string

	// 1. Try cache
	for _, metricName := range metricNames {
		metadata := new(model.UpdateMetricsMetadata)
		cacheKey := constants.UpdatedMetricsMetadataCachePrefix + metricName
		err := r.cache.Get(ctx, orgID, cacheKey, metadata)
		if err == nil {
			cachedMetadata[metricName] = metadata
		} else {
			missingMetrics = append(missingMetrics, metricName)
		}
	}

	// 2. Try updated_metrics_metadata table
	var stillMissing []string
	if len(missingMetrics) > 0 {
		metricList := "'" + strings.Join(missingMetrics, "', '") + "'"
		query := fmt.Sprintf(`SELECT metric_name, type, description, temporality, is_monotonic, unit
			FROM %s.%s 
			WHERE metric_name IN (%s);`, signozMetricDBName, signozUpdatedMetricsMetadataTable, metricList)

		valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
		rows, err := r.db.Query(valueCtx, query)
		if err != nil {
			return cachedMetadata, &model.ApiError{Typ: "ClickhouseErr", Err: fmt.Errorf("error querying metrics metadata: %v", err)}
		}
		defer rows.Close()

		found := make(map[string]struct{})
		for rows.Next() {
			metadata := new(model.UpdateMetricsMetadata)
			if err := rows.Scan(
				&metadata.MetricName,
				&metadata.MetricType,
				&metadata.Description,
				&metadata.Temporality,
				&metadata.IsMonotonic,
				&metadata.Unit,
			); err != nil {
				return cachedMetadata, &model.ApiError{Typ: "ClickhouseErr", Err: fmt.Errorf("error scanning metrics metadata: %v", err)}
			}

			cacheKey := constants.UpdatedMetricsMetadataCachePrefix + metadata.MetricName
			if cacheErr := r.cache.Set(ctx, orgID, cacheKey, metadata, 0); cacheErr != nil {
				zap.L().Error("Failed to store metrics metadata in cache", zap.String("metric_name", metadata.MetricName), zap.Error(cacheErr))
			}
			cachedMetadata[metadata.MetricName] = metadata
			found[metadata.MetricName] = struct{}{}
		}

		// Determine which metrics are still missing
		for _, m := range missingMetrics {
			if _, ok := found[m]; !ok {
				stillMissing = append(stillMissing, m)
			}
		}
	}

	// 3. Fallback: Try time_series_v4_1week table
	if len(stillMissing) > 0 {
		metricList := "'" + strings.Join(stillMissing, "', '") + "'"
		query := fmt.Sprintf(`SELECT DISTINCT metric_name, type, description, temporality, is_monotonic, unit
			FROM %s.%s 
			WHERE metric_name IN (%s)`, signozMetricDBName, signozTSTableNameV4, metricList)
		valueCtx := context.WithValue(ctx, "clickhouse_max_threads", constants.MetricsExplorerClickhouseThreads)
		rows, err := r.db.Query(valueCtx, query)
		if err != nil {
			return cachedMetadata, &model.ApiError{Typ: "ClickhouseErr", Err: fmt.Errorf("error querying time_series_v4 to get metrics metadata: %v", err)}
		}
		defer rows.Close()
		for rows.Next() {
			metadata := new(model.UpdateMetricsMetadata)
			if err := rows.Scan(
				&metadata.MetricName,
				&metadata.MetricType,
				&metadata.Description,
				&metadata.Temporality,
				&metadata.IsMonotonic,
				&metadata.Unit,
			); err != nil {
				return cachedMetadata, &model.ApiError{Typ: "ClickhouseErr", Err: fmt.Errorf("error scanning fallback metadata: %v", err)}
			}

			cacheKey := constants.UpdatedMetricsMetadataCachePrefix + metadata.MetricName
			if cacheErr := r.cache.Set(ctx, orgID, cacheKey, metadata, 0); cacheErr != nil {
				zap.L().Error("Failed to cache fallback metadata", zap.String("metric_name", metadata.MetricName), zap.Error(cacheErr))
			}
			cachedMetadata[metadata.MetricName] = metadata
		}
		if rows.Err() != nil {
			return cachedMetadata, &model.ApiError{Typ: "ClickhouseErr", Err: fmt.Errorf("error scanning fallback metadata: %v", err)}
		}
	}
	return cachedMetadata, nil
}

func (r *ClickHouseReader) SearchTraces(ctx context.Context, params *model.SearchTracesParams) (*[]model.SearchSpansResult, error) {
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
		zap.L().Error("Max spans allowed in a trace limit reached", zap.Int("MaxSpansInTrace", params.MaxSpansInTrace), zap.Uint64("Count", traceSummary.NumSpans))
		return nil, fmt.Errorf("max spans allowed in trace limit reached, please contact support for more details")
	}

	var startTime, endTime, durationNano uint64
	var searchScanResponses []model.SpanItemV2

	query := fmt.Sprintf("SELECT timestamp, duration_nano, span_id, trace_id, has_error, kind, resource_string_service$$name, name, links as references, attributes_string, attributes_number, attributes_bool, resources_string, events, status_message, status_code_string, kind_string FROM %s.%s WHERE trace_id=$1 and ts_bucket_start>=$2 and ts_bucket_start<=$3", r.TraceDB, r.traceTableName)
	err = r.db.Select(ctx, &searchScanResponses, query, params.TraceID, strconv.FormatInt(traceSummary.Start.Unix()-1800, 10), strconv.FormatInt(traceSummary.End.Unix(), 10))
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return nil, fmt.Errorf("error in processing sql query")
	}

	searchSpansResult[0].Events = make([][]interface{}, len(searchScanResponses))

	searchSpanResponses := []model.SearchSpanResponseItem{}

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
			item.Attributes_string[k] = strconv.FormatFloat(v, 'f', -1, 64)
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

	if len(searchScanResponses) > params.SpansRenderLimit {
		searchSpansResult, err = smart.SmartTraceAlgorithm(searchSpanResponses, params.SpanID, params.LevelUp, params.LevelDown, params.SpansRenderLimit)
		if err != nil {
			return nil, err
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

func (r *ClickHouseReader) GetNormalizedStatus(
	ctx context.Context,
	orgID valuer.UUID,
	metricNames []string,
) (map[string]bool, error) {

	if len(metricNames) == 0 {
		return map[string]bool{}, nil
	}

	result := make(map[string]bool, len(metricNames))
	buildKey := func(name string) string {
		return constants.NormalizedMetricsMapCacheKey + ":" + name
	}

	uncached := make([]string, 0, len(metricNames))
	for _, m := range metricNames {
		var status model.MetricsNormalizedMap
		if err := r.cache.Get(ctx, orgID, buildKey(m), &status); err == nil {
			result[m] = status.IsUnNormalized
		} else {
			uncached = append(uncached, m)
		}
	}
	if len(uncached) == 0 {
		return result, nil
	}

	placeholders := "'" + strings.Join(uncached, "', '") + "'"

	q := fmt.Sprintf(
		`SELECT metric_name, toUInt8(__normalized)
           FROM %s.%s
          WHERE metric_name IN (%s)
          GROUP BY metric_name, __normalized`,
		signozMetricDBName, signozTSTableNameV41Day, placeholders,
	)

	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// tmp[m] collects the set {0,1} for a metric name, truth table
	tmp := make(map[string]map[uint8]struct{}, len(uncached))

	for rows.Next() {
		var (
			name       string
			normalized uint8
		)
		if err := rows.Scan(&name, &normalized); err != nil {
			return nil, err
		}
		if _, ok := tmp[name]; !ok {
			tmp[name] = make(map[uint8]struct{}, 2)
		}
		tmp[name][normalized] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for _, m := range uncached {
		set := tmp[m]
		switch {
		case len(set) == 0:
			return nil, fmt.Errorf("metric %q not found in ClickHouse", m)

		case len(set) == 2:
			result[m] = true

		default:
			_, hasUnnorm := set[0]
			result[m] = hasUnnorm
		}
		status := model.MetricsNormalizedMap{
			MetricName:     m,
			IsUnNormalized: result[m],
		}
		_ = r.cache.Set(ctx, orgID, buildKey(m), &status, 0)
	}

	return result, nil
}
