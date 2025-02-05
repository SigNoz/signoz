package constants

import (
	"maps"
	"os"
	"strconv"
	"testing"
	"time"

	"go.signoz.io/signoz/pkg/query-service/model"
	v3 "go.signoz.io/signoz/pkg/query-service/model/v3"
)

const (
	HTTPHostPort    = "0.0.0.0:8080" // Address to serve http (query service)
	PrivateHostPort = "0.0.0.0:8085" // Address to server internal services like alert manager
	DebugHttpPort   = "0.0.0.0:6060" // Address to serve http (pprof)
	OpAmpWsEndpoint = "0.0.0.0:4320" // address for opamp websocket
)

type ContextKey string

const ContextUserKey ContextKey = "user"

var ConfigSignozIo = "https://config.signoz.io/api/v1"

var DEFAULT_TELEMETRY_ANONYMOUS = false

func IsOSSTelemetryEnabled() bool {
	ossSegmentKey := GetOrDefaultEnv("OSS_TELEMETRY_ENABLED", "true")
	return ossSegmentKey == "true"
}

const MaxAllowedPointsInTimeSeries = 300

func IsTelemetryEnabled() bool {
	if testing.Testing() {
		return false
	}

	isTelemetryEnabledStr := os.Getenv("TELEMETRY_ENABLED")
	isTelemetryEnabledBool, err := strconv.ParseBool(isTelemetryEnabledStr)
	if err != nil {
		return true
	}
	return isTelemetryEnabledBool
}

const TraceTTL = "traces"
const MetricsTTL = "metrics"
const LogsTTL = "logs"

const DurationSort = "DurationSort"
const TimestampSort = "TimestampSort"
const PreferRPM = "PreferRPM"

const SpanSearchScopeRoot = "isroot"
const SpanSearchScopeEntryPoint = "isentrypoint"

func GetAlertManagerApiPrefix() string {
	if os.Getenv("ALERTMANAGER_API_PREFIX") != "" {
		return os.Getenv("ALERTMANAGER_API_PREFIX")
	}
	return "http://alertmanager:9093/api/"
}

var TELEMETRY_HEART_BEAT_DURATION_MINUTES = GetOrDefaultEnvInt("TELEMETRY_HEART_BEAT_DURATION_MINUTES", 720)

var TELEMETRY_ACTIVE_USER_DURATION_MINUTES = GetOrDefaultEnvInt("TELEMETRY_ACTIVE_USER_DURATION_MINUTES", 360)

var InviteEmailTemplate = GetOrDefaultEnv("INVITE_EMAIL_TEMPLATE", "/root/templates/invitation_email_template.html")

// Alert manager channel subpath
var AmChannelApiPath = GetOrDefaultEnv("ALERTMANAGER_API_CHANNEL_PATH", "v1/routes")

var OTLPTarget = GetOrDefaultEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
var LogExportBatchSize = GetOrDefaultEnv("OTEL_BLRP_MAX_EXPORT_BATCH_SIZE", "512")

// [Deprecated] SIGNOZ_LOCAL_DB_PATH is deprecated and scheduled for removal. Please use SIGNOZ_SQLSTORE_SQLITE_PATH instead.
var RELATIONAL_DATASOURCE_PATH = GetOrDefaultEnv("SIGNOZ_LOCAL_DB_PATH", "/var/lib/signoz/signoz.db")

var DurationSortFeature = GetOrDefaultEnv("DURATION_SORT_FEATURE", "true")

var TimestampSortFeature = GetOrDefaultEnv("TIMESTAMP_SORT_FEATURE", "true")

var PreferRPMFeature = GetOrDefaultEnv("PREFER_RPM_FEATURE", "false")

// TODO(srikanthccv): remove after backfilling is done
func UseMetricsPreAggregation() bool {
	return GetOrDefaultEnv("USE_METRICS_PRE_AGGREGATION", "true") == "true"
}

func EnableHostsInfraMonitoring() bool {
	return GetOrDefaultEnv("ENABLE_INFRA_METRICS", "true") == "true"
}

var KafkaSpanEval = GetOrDefaultEnv("KAFKA_SPAN_EVAL", "false")

func IsDurationSortFeatureEnabled() bool {
	isDurationSortFeatureEnabledStr := DurationSortFeature
	isDurationSortFeatureEnabledBool, err := strconv.ParseBool(isDurationSortFeatureEnabledStr)
	if err != nil {
		return false
	}
	return isDurationSortFeatureEnabledBool
}

func IsTimestampSortFeatureEnabled() bool {
	isTimestampSortFeatureEnabledStr := TimestampSortFeature
	isTimestampSortFeatureEnabledBool, err := strconv.ParseBool(isTimestampSortFeatureEnabledStr)
	if err != nil {
		return false
	}
	return isTimestampSortFeatureEnabledBool
}

func IsPreferRPMFeatureEnabled() bool {
	preferRPMFeatureEnabledStr := PreferRPMFeature
	preferRPMFeatureEnabledBool, err := strconv.ParseBool(preferRPMFeatureEnabledStr)
	if err != nil {
		return false
	}
	return preferRPMFeatureEnabledBool
}

var DEFAULT_FEATURE_SET = model.FeatureSet{
	model.Feature{
		Name:       DurationSort,
		Active:     IsDurationSortFeatureEnabled(),
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	}, model.Feature{
		Name:       TimestampSort,
		Active:     IsTimestampSortFeatureEnabled(),
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	model.Feature{
		Name:       model.UseSpanMetrics,
		Active:     false,
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
	model.Feature{
		Name:       PreferRPM,
		Active:     IsPreferRPMFeatureEnabled(),
		Usage:      0,
		UsageLimit: -1,
		Route:      "",
	},
}

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
	SIGNOZ_SAMPLES_V4_TABLENAME                = "distributed_samples_v4"
	SIGNOZ_SAMPLES_V4_AGG_5M_TABLENAME         = "distributed_samples_v4_agg_5m"
	SIGNOZ_SAMPLES_V4_AGG_30M_TABLENAME        = "distributed_samples_v4_agg_30m"
	SIGNOZ_EXP_HISTOGRAM_TABLENAME             = "distributed_exp_hist"
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
	TracesExplorerViewSQLSelectBeforeSubQuery = "SELECT subQuery.serviceName, subQuery.name, count() AS " +
		"span_count, subQuery.durationNano, subQuery.traceID AS traceID FROM %s.%s INNER JOIN ( SELECT * FROM "
	TracesExplorerViewSQLSelectAfterSubQuery = "AS inner_subquery ) AS subQuery ON %s.%s.traceID = subQuery.traceID WHERE %s %s " +
		"GROUP BY subQuery.traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY subQuery.durationNano desc LIMIT 1 BY subQuery.traceID "
	TracesExplorerViewSQLSelectQuery = "SELECT subQuery.serviceName, subQuery.name, count() AS " +
		"span_count, subQuery.durationNano, traceID FROM %s.%s GLOBAL INNER JOIN subQuery ON %s.traceID = subQuery.traceID GROUP " +
		"BY traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY subQuery.durationNano desc;"
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
	// the simple attributes are not present here as
	// they are taken care by new format <attribute_type>_<attribute_datatype>_'<attribute_key>'
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

var StaticFieldsTraces = map[string]v3.AttributeKey{}

func init() {
	StaticFieldsTraces = maps.Clone(NewStaticFieldsTraces)
	maps.Copy(StaticFieldsTraces, DeprecatedStaticFieldsTraces)
}

const TRACE_V4_MAX_PAGINATION_LIMIT = 10000

const MaxResultRowsForCHQuery = 1_000_000
