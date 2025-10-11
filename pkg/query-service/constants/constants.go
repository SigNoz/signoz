package constants

import (
	"maps"
	"os"
	"regexp"
	"strconv"
	"time"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

const (
	HTTPHostPort    = "0.0.0.0:8080" // Address to serve http (query service)
	PrivateHostPort = "0.0.0.0:8085" // Address to server internal services like alert manager
	DebugHttpPort   = "0.0.0.0:6060" // Address to serve http (pprof)
	OpAmpWsEndpoint = "0.0.0.0:4320" // address for opamp websocket
)

const MaxAllowedPointsInTimeSeries = 300

const TraceTTL = "traces"
const MetricsTTL = "metrics"
const LogsTTL = "logs"

const SpanSearchScopeRoot = "isroot"
const SpanSearchScopeEntryPoint = "isentrypoint"
const OrderBySpanCount = "span_count"

// Deprecated: Use the new emailing service instead
var InviteEmailTemplate = GetOrDefaultEnv("INVITE_EMAIL_TEMPLATE", "/root/templates/invitation_email.gotmpl")

var MetricsExplorerClickhouseThreads = GetOrDefaultEnvInt("METRICS_EXPLORER_CLICKHOUSE_THREADS", 8)
var UpdatedMetricsMetadataCachePrefix = GetOrDefaultEnv("METRICS_UPDATED_METADATA_CACHE_KEY", "UPDATED_METRICS_METADATA")

const NormalizedMetricsMapCacheKey = "NORMALIZED_METRICS_MAP_CACHE_KEY"
const NormalizedMetricsMapQueryThreads = 10

var NormalizedMetricsMapRegex = regexp.MustCompile(`[^a-zA-Z0-9]`)
var NormalizedMetricsMapQuantileRegex = regexp.MustCompile(`(?i)([._-]?quantile.*)$`)

// TODO(srikanthccv): remove after backfilling is done
func UseMetricsPreAggregation() bool {
	return GetOrDefaultEnv("USE_METRICS_PRE_AGGREGATION", "true") == "true"
}

var KafkaSpanEval = GetOrDefaultEnv("KAFKA_SPAN_EVAL", "false")

func GetEvalDelay() time.Duration {
	evalDelayStr := GetOrDefaultEnv("RULES_EVAL_DELAY", "2m")
	evalDelayDuration, err := time.ParseDuration(evalDelayStr)
	if err != nil {
		return 0
	}
	return evalDelayDuration
}

const (
	TraceID                        = "traceID"
	ServiceName                    = "serviceName"
	HttpRoute                      = "httpRoute"
	HttpHost                       = "httpHost"
	HttpUrl                        = "httpUrl"
	HttpMethod                     = "httpMethod"
	OperationDB                    = "name"
	OperationRequest               = "operation"
	Status                         = "status"
	Duration                       = "duration"
	DBName                         = "dbName"
	DBOperation                    = "dbOperation"
	DBSystem                       = "dbSystem"
	MsgSystem                      = "msgSystem"
	MsgOperation                   = "msgOperation"
	Timestamp                      = "timestamp"
	RPCMethod                      = "rpcMethod"
	ResponseStatusCode             = "responseStatusCode"
	Descending                     = "descending"
	Ascending                      = "ascending"
	StatusPending                  = "pending"
	StatusFailed                   = "failed"
	StatusSuccess                  = "success"
	ExceptionType                  = "exceptionType"
	ExceptionCount                 = "exceptionCount"
	LastSeen                       = "lastSeen"
	FirstSeen                      = "firstSeen"
	Attributes                     = "attributes"
	Resources                      = "resources"
	Static                         = "static"
	DefaultLogSkipIndexType        = "bloom_filter(0.01)"
	DefaultLogSkipIndexGranularity = 64
)

var GroupByColMap = map[string]struct{}{
	ServiceName:        {},
	HttpHost:           {},
	HttpRoute:          {},
	HttpUrl:            {},
	HttpMethod:         {},
	OperationDB:        {},
	DBName:             {},
	DBOperation:        {},
	DBSystem:           {},
	MsgOperation:       {},
	MsgSystem:          {},
	RPCMethod:          {},
	ResponseStatusCode: {},
}

const (
	SIGNOZ_METRIC_DBNAME                       = "signoz_metrics"
	SIGNOZ_SAMPLES_V4_LOCAL_TABLENAME          = "samples_v4"
	SIGNOZ_SAMPLES_V4_TABLENAME                = "distributed_samples_v4"
	SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME         = "distributed_samples_v4_agg_5m"
	SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME        = "distributed_samples_v4_agg_30m"
	SIGNOZ_EXP_HISTOGRAM_TABLENAME             = "distributed_exp_hist"
	SIGNOZ_EXP_HISTOGRAM_LOCAL_TABLENAME       = "exp_hist"
	SIGNOZ_TRACE_DBNAME                        = "signoz_traces"
	SIGNOZ_SPAN_INDEX_TABLENAME                = "distributed_signoz_index_v2"
	SIGNOZ_SPAN_INDEX_V3                       = "distributed_signoz_index_v3"
	SIGNOZ_SPAN_INDEX_LOCAL_TABLENAME          = "signoz_index_v2"
	SIGNOZ_SPAN_INDEX_V3_LOCAL_TABLENAME       = "signoz_index_v3"
	SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME       = "time_series_v4"
	SIGNOZ_TIMESERIES_V4_TABLENAME             = "distributed_time_series_v4"
	SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME  = "time_series_v4_6hrs"
	SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME  = "time_series_v4_1day"
	SIGNOZ_TIMESERIES_v4_1WEEK_LOCAL_TABLENAME = "time_series_v4_1week"
	SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME        = "distributed_time_series_v4_1day"
	SIGNOZ_TOP_LEVEL_OPERATIONS_TABLENAME      = "distributed_top_level_operations"
	SIGNOZ_TIMESERIES_v4_TABLENAME             = "distributed_time_series_v4"
	SIGNOZ_TIMESERIES_v4_1WEEK_TABLENAME       = "distributed_time_series_v4_1week"
	SIGNOZ_TIMESERIES_v4_6HRS_TABLENAME        = "distributed_time_series_v4_6hrs"
	SIGNOZ_ATTRIBUTES_METADATA_TABLENAME       = "distributed_attributes_metadata"
	SIGNOZ_ATTRIBUTES_METADATA_LOCAL_TABLENAME = "attributes_metadata"
)

// alert related constants
const (
	// AlertHelpPage is used in case default alert repo url is not set
	AlertHelpPage   = "https://signoz.io/docs/userguide/alerts-management/#generator-url"
	AlertTimeFormat = "2006-01-02 15:04:05"
)

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}

func GetOrDefaultEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	intVal, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return intVal
}

const (
	STRING                = "String"
	UINT32                = "UInt32"
	LOWCARDINALITY_STRING = "LowCardinality(String)"
	INT32                 = "Int32"
	UINT8                 = "Uint8"
)

var StaticSelectedLogFields = []model.Field{
	{
		Name:     "timestamp",
		DataType: UINT32,
		Type:     Static,
	},
	{
		Name:     "id",
		DataType: STRING,
		Type:     Static,
	},
	{
		Name:     "severity_text",
		DataType: LOWCARDINALITY_STRING,
		Type:     Static,
	},
	{
		Name:     "severity_number",
		DataType: UINT8,
		Type:     Static,
	},
	{
		Name:     "trace_flags",
		DataType: UINT32,
		Type:     Static,
	},
	{
		Name:     "trace_id",
		DataType: STRING,
		Type:     Static,
	},
	{
		Name:     "span_id",
		DataType: STRING,
		Type:     Static,
	},
}

const (
	LogsSQLSelect = "SELECT " +
		"timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body," +
		"CAST((attributes_string_key, attributes_string_value), 'Map(String, String)') as  attributes_string," +
		"CAST((attributes_int64_key, attributes_int64_value), 'Map(String, Int64)') as  attributes_int64," +
		"CAST((attributes_float64_key, attributes_float64_value), 'Map(String, Float64)') as  attributes_float64," +
		"CAST((attributes_bool_key, attributes_bool_value), 'Map(String, Bool)') as  attributes_bool," +
		"CAST((resources_string_key, resources_string_value), 'Map(String, String)') as resources_string," +
		"CAST((scope_string_key, scope_string_value), 'Map(String, String)') as scope "
	LogsSQLSelectV2 = "SELECT " +
		"timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, scope_name, scope_version, body, " +
		"attributes_string, " +
		"attributes_number, " +
		"attributes_bool, " +
		"resources_string, " +
		"scope_string "
	TracesExplorerViewSQLSelectWithSubQuery = "(SELECT traceID, durationNano, " +
		"serviceName, name FROM %s.%s WHERE parentSpanID = '' AND %s ORDER BY durationNano DESC LIMIT 1 BY traceID"
	TracesExplorerViewSQLSelectBeforeSubQuery = "SELECT subQuery.serviceName as `subQuery.serviceName`, subQuery.name as `subQuery.name`, count() AS " +
		"span_count, subQuery.durationNano as `subQuery.durationNano`, subQuery.traceID FROM " +
		"(SELECT traceID AS dist_traceID, timestamp, ts_bucket_start FROM %s.%s WHERE %s%s) as dist_table " +
		"INNER JOIN ( SELECT * FROM "
	TracesExplorerViewSQLSelectAfterSubQuery = " AS inner_subquery ) AS subQuery ON dist_table.dist_traceID = subQuery.traceID " +
		"GROUP BY subQuery.traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY subQuery.durationNano desc LIMIT 1 BY subQuery.traceID "
	TracesExplorerSpanCountWithSubQuery  = "(SELECT trace_id, count() as span_count FROM %s.%s WHERE %s %s GROUP BY trace_id ORDER BY span_count DESC LIMIT 1 BY trace_id"
	TraceExplorerSpanCountBeforeSubQuery = "SELECT serviceName, name, subQuery.span_count as span_count, durationNano, trace_id as traceID from %s.%s GLOBAL INNER JOIN ( SELECT * FROM "
	TraceExplorerSpanCountAfterSubQuery  = "AS inner_subquery ) AS subQuery ON %s.%s.trace_id = subQuery.trace_id WHERE parent_span_id = '' AND %s ORDER BY subQuery.span_count DESC"
)

// ReservedColumnTargetAliases identifies result value from a user
// written clickhouse query. The column alias indcate which value is
// to be considered as final result (or target)
var ReservedColumnTargetAliases = map[string]struct{}{
	"__result": {},
	"__value":  {},
	"result":   {},
	"res":      {},
	"value":    {},
}

// logsPPLPfx is a short constant for logsPipelinePrefix
// TODO(Raj): Remove old prefix after new processor based pipelines have been rolled out
const LogsPPLPfx = "signozlogspipeline/pipeline_"
const OldLogsPPLPfx = "logstransform/pipeline_"

const IntegrationPipelineIdPrefix = "integration"

// The datatype present here doesn't represent the actual datatype of column in the logs table.

var StaticFieldsLogsV3 = map[string]v3.AttributeKey{
	"timestamp": {},
	"id":        {},
	"trace_id": {
		Key:      "trace_id",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"span_id": {
		Key:      "span_id",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"trace_flags": {
		Key:      "trace_flags",
		DataType: v3.AttributeKeyDataTypeInt64,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"severity_text": {
		Key:      "severity_text",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"severity_number": {
		Key:      "severity_number",
		DataType: v3.AttributeKeyDataTypeInt64,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"body": {
		Key:      "body",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"__attrs": {
		Key:      "__attrs",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"scope_name": {
		Key:      "scope_name",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
	"scope_version": {
		Key:      "scope_version",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeUnspecified,
		IsColumn: true,
	},
}

const SigNozOrderByValue = "#SIGNOZ_VALUE"

const TIMESTAMP = "timestamp"

const FirstQueryGraphLimit = "first_query_graph_limit"
const SecondQueryGraphLimit = "second_query_graph_limit"

const DefaultFilterSuggestionsAttributesLimit = 50
const MaxFilterSuggestionsAttributesLimit = 100
const DefaultFilterSuggestionsExamplesLimit = 2
const MaxFilterSuggestionsExamplesLimit = 10

var SpanRenderLimitStr = GetOrDefaultEnv("SPAN_RENDER_LIMIT", "2500")
var MaxSpansInTraceStr = GetOrDefaultEnv("MAX_SPANS_IN_TRACE", "250000")

var NewStaticFieldsTraces = map[string]v3.AttributeKey{
	"timestamp": {},
	"trace_id": {
		Key:      "trace_id",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"span_id": {
		Key:      "span_id",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"trace_state": {
		Key:      "trace_state",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"parent_span_id": {
		Key:      "parent_span_id",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"flags": {
		Key:      "flags",
		DataType: v3.AttributeKeyDataTypeInt64,
		IsColumn: true,
	},
	"name": {
		Key:      "name",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"kind": {
		Key:      "kind",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"kind_string": {
		Key:      "kind_string",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"duration_nano": {
		Key:      "duration_nano",
		DataType: v3.AttributeKeyDataTypeFloat64,
		IsColumn: true,
	},
	"status_code": {
		Key:      "status_code",
		DataType: v3.AttributeKeyDataTypeFloat64,
		IsColumn: true,
	},
	"status_message": {
		Key:      "status_message",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"status_code_string": {
		Key:      "status_code_string",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},

	// new support for composite attributes
	"response_status_code": {
		Key:      "response_status_code",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"external_http_url": {
		Key:      "external_http_url",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"http_url": {
		Key:      "http_url",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"external_http_method": {
		Key:      "external_http_method",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"http_method": {
		Key:      "http_method",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"http_host": {
		Key:      "http_host",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"db_name": {
		Key:      "db_name",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"db_operation": {
		Key:      "db_operation",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"has_error": {
		Key:      "has_error",
		DataType: v3.AttributeKeyDataTypeBool,
		IsColumn: true,
	},
	"is_remote": {
		Key:      "is_remote",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},

	// these are just added so that we don't use the aliased columns
	"resource_string_service$$name": {
		Key:      "resource_string_service$$name",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_http$$route": {
		Key:      "attribute_string_http$$route",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_messaging$$system": {
		Key:      "attribute_string_messaging$$system",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_messaging$$operation": {
		Key:      "attribute_string_messaging$$operation",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_db$$system": {
		Key:      "attribute_string_db$$system",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_rpc$$system": {
		Key:      "attribute_string_rpc$$system",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_rpc$$service": {
		Key:      "attribute_string_rpc$$service",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_rpc$$method": {
		Key:      "attribute_string_rpc$$method",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"attribute_string_peer$$service": {
		Key:      "attribute_string_peer$$service",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
}

var DeprecatedStaticFieldsTraces = map[string]v3.AttributeKey{
	"traceID": {
		Key:      "traceID",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"spanID": {
		Key:      "spanID",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"parentSpanID": {
		Key:      "parentSpanID",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"flags": {
		Key:      "flags",
		DataType: v3.AttributeKeyDataTypeInt64,
		IsColumn: true,
	},
	"name": {
		Key:      "name",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"kind": {
		Key:      "kind",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"spanKind": {
		Key:      "spanKind",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"durationNano": {
		Key:      "durationNano",
		DataType: v3.AttributeKeyDataTypeFloat64,
		IsColumn: true,
	},
	"statusCode": {
		Key:      "statusCode",
		DataType: v3.AttributeKeyDataTypeFloat64,
		IsColumn: true,
	},
	"statusMessage": {
		Key:      "statusMessage",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"statusCodeString": {
		Key:      "statusCodeString",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},

	// old support for composite attributes
	"responseStatusCode": {
		Key:      "responseStatusCode",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"externalHttpUrl": {
		Key:      "externalHttpUrl",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"httpUrl": {
		Key:      "httpUrl",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"externalHttpMethod": {
		Key:      "externalHttpMethod",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"httpMethod": {
		Key:      "httpMethod",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"httpHost": {
		Key:      "httpHost",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"dbName": {
		Key:      "dbName",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"dbOperation": {
		Key:      "dbOperation",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"hasError": {
		Key:      "hasError",
		DataType: v3.AttributeKeyDataTypeBool,
		IsColumn: true,
	},
	"isRemote": {
		Key:      "isRemote",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},

	// old support for resource attributes
	"serviceName": {
		Key:      "serviceName",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},

	// old support for simple attributes
	"httpRoute": {
		Key:      "httpRoute",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"msgSystem": {
		Key:      "msgSystem",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"msgOperation": {
		Key:      "msgOperation",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"dbSystem": {
		Key:      "dbSystem",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"rpcSystem": {
		Key:      "rpcSystem",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"rpcService": {
		Key:      "rpcService",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"rpcMethod": {
		Key:      "rpcMethod",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
	"peerService": {
		Key:      "peerService",
		DataType: v3.AttributeKeyDataTypeString,
		IsColumn: true,
	},
}

// TODO(nitya): remove this later
var OldToNewTraceFieldsMap = map[string]string{
	// deprecated intrinsic -> new intrinsic
	"traceID":          "trace_id",
	"spanID":           "span_id",
	"parentSpanID":     "parent_span_id",
	"spanKind":         "kind_string",
	"durationNano":     "duration_nano",
	"statusCode":       "status_code",
	"statusMessage":    "status_message",
	"statusCodeString": "status_code_string",

	// deprecated derived -> new derived / materialized
	"references":         "links",
	"responseStatusCode": "response_status_code",
	"externalHttpUrl":    "external_http_url",
	"httpUrl":            "http_url",
	"externalHttpMethod": "external_http_method",
	"httpMethod":         "http_method",
	"httpHost":           "http_host",
	"dbName":             "db_name",
	"dbOperation":        "db_operation",
	"hasError":           "has_error",
	"isRemote":           "is_remote",
	"serviceName":        "resource_string_service$$name",
	"httpRoute":          "attribute_string_http$$route",
	"msgSystem":          "attribute_string_messaging$$system",
	"msgOperation":       "attribute_string_messaging$$operation",
	"dbSystem":           "attribute_string_db$$system",
	"rpcSystem":          "attribute_string_rpc$$system",
	"rpcService":         "attribute_string_rpc$$service",
	"rpcMethod":          "attribute_string_rpc$$method",
	"peerService":        "attribute_string_peer$$service",
}

var StaticFieldsTraces = map[string]v3.AttributeKey{}

var IsDotMetricsEnabled = false
var PreferSpanMetrics = false
var MaxJSONFlatteningDepth = 1

func init() {
	StaticFieldsTraces = maps.Clone(NewStaticFieldsTraces)
	maps.Copy(StaticFieldsTraces, DeprecatedStaticFieldsTraces)
	if GetOrDefaultEnv(DotMetricsEnabled, "true") == "true" {
		IsDotMetricsEnabled = true
	}
	if GetOrDefaultEnv("USE_SPAN_METRICS", "false") == "true" {
		PreferSpanMetrics = true
	}

	// set max flattening depth
	depth, err := strconv.Atoi(GetOrDefaultEnv(maxJSONFlatteningDepth, "1"))
	if err == nil {
		MaxJSONFlatteningDepth = depth
	}
}

const TRACE_V4_MAX_PAGINATION_LIMIT = 10000

const MaxResultRowsForCHQuery = 1_000_000

var ChDataTypeMap = map[string]string{
	"string":  "String",
	"bool":    "Bool",
	"int64":   "Float64",
	"float64": "Float64",
}

var MaterializedDataTypeMap = map[string]string{
	"string":  "string",
	"bool":    "bool",
	"int64":   "number",
	"float64": "number",
}

const InspectMetricsMaxTimeDiff = 1800000

const DotMetricsEnabled = "DOT_METRICS_ENABLED"
const maxJSONFlatteningDepth = "MAX_JSON_FLATTENING_DEPTH"
