package constants

import (
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

func GetAlertManagerApiPrefix() string {
	if os.Getenv("ALERTMANAGER_API_PREFIX") != "" {
		return os.Getenv("ALERTMANAGER_API_PREFIX")
	}
	return "http://alertmanager:9093/api/"
}

var InviteEmailTemplate = GetOrDefaultEnv("INVITE_EMAIL_TEMPLATE", "/root/templates/invitation_email_template.html")

// Alert manager channel subpath
var AmChannelApiPath = GetOrDefaultEnv("ALERTMANAGER_API_CHANNEL_PATH", "v1/routes")

var OTLPTarget = GetOrDefaultEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
var LogExportBatchSize = GetOrDefaultEnv("OTEL_BLRP_MAX_EXPORT_BATCH_SIZE", "512")

var RELATIONAL_DATASOURCE_PATH = GetOrDefaultEnv("SIGNOZ_LOCAL_DB_PATH", "/var/lib/signoz/signoz.db")

var DurationSortFeature = GetOrDefaultEnv("DURATION_SORT_FEATURE", "true")

var TimestampSortFeature = GetOrDefaultEnv("TIMESTAMP_SORT_FEATURE", "true")

var PreferRPMFeature = GetOrDefaultEnv("PREFER_RPM_FEATURE", "false")

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

func GetContextTimeout() time.Duration {
	contextTimeoutStr := GetOrDefaultEnv("CONTEXT_TIMEOUT", "60")
	contextTimeoutDuration, err := time.ParseDuration(contextTimeoutStr + "s")
	if err != nil {
		return time.Minute
	}
	return contextTimeoutDuration
}

var ContextTimeout = GetContextTimeout()

func GetContextTimeoutMaxAllowed() time.Duration {
	contextTimeoutStr := GetOrDefaultEnv("CONTEXT_TIMEOUT_MAX_ALLOWED", "600")
	contextTimeoutDuration, err := time.ParseDuration(contextTimeoutStr + "s")
	if err != nil {
		return time.Minute
	}
	return contextTimeoutDuration
}

var ContextTimeoutMaxAllowed = GetContextTimeoutMaxAllowed()

const (
	TraceID                        = "traceID"
	ServiceName                    = "serviceName"
	HttpRoute                      = "httpRoute"
	HttpCode                       = "httpCode"
	HttpHost                       = "httpHost"
	HttpUrl                        = "httpUrl"
	HttpMethod                     = "httpMethod"
	Component                      = "component"
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
	Component:          {},
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
	SIGNOZ_METRIC_DBNAME                      = "signoz_metrics"
	SIGNOZ_SAMPLES_TABLENAME                  = "distributed_samples_v2"
	SIGNOZ_SAMPLES_V4_TABLENAME               = "distributed_samples_v4"
	SIGNOZ_TIMESERIES_TABLENAME               = "distributed_time_series_v2"
	SIGNOZ_TRACE_DBNAME                       = "signoz_traces"
	SIGNOZ_SPAN_INDEX_TABLENAME               = "distributed_signoz_index_v2"
	SIGNOZ_TIMESERIES_LOCAL_TABLENAME         = "time_series_v2"
	SIGNOZ_TIMESERIES_v4_LOCAL_TABLENAME      = "time_series_v4"
	SIGNOZ_TIMESERIES_v4_6HRS_LOCAL_TABLENAME = "time_series_v4_6hrs"
	SIGNOZ_TIMESERIES_v4_1DAY_LOCAL_TABLENAME = "time_series_v4_1day"
	SIGNOZ_TIMESERIES_v4_1DAY_TABLENAME       = "distributed_time_series_v4_1day"
)

var TimeoutExcludedRoutes = map[string]bool{
	"/api/v1/logs/tail":     true,
	"/api/v3/logs/livetail": true,
}

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

const (
	STRING                = "String"
	UINT32                = "UInt32"
	LOWCARDINALITY_STRING = "LowCardinality(String)"
	INT32                 = "Int32"
	UINT8                 = "Uint8"
)

var StaticSelectedLogFields = []model.LogField{
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
		"timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body," +
		"CAST((attributes_string_key, attributes_string_value), 'Map(String, String)') as  attributes_string," +
		"CAST((attributes_int64_key, attributes_int64_value), 'Map(String, Int64)') as  attributes_int64," +
		"CAST((attributes_float64_key, attributes_float64_value), 'Map(String, Float64)') as  attributes_float64," +
		"CAST((attributes_bool_key, attributes_bool_value), 'Map(String, Bool)') as  attributes_bool," +
		"CAST((resources_string_key, resources_string_value), 'Map(String, String)') as resources_string "
	TracesExplorerViewSQLSelectWithSubQuery = "WITH subQuery AS (SELECT distinct on (traceID) traceID, durationNano, " +
		"serviceName, name FROM %s.%s WHERE parentSpanID = '' AND %s %s ORDER BY durationNano DESC "
	TracesExplorerViewSQLSelectQuery = "SELECT subQuery.serviceName, subQuery.name, count() AS " +
		"span_count, subQuery.durationNano, traceID FROM %s.%s GLOBAL INNER JOIN subQuery ON %s.traceID = subQuery.traceID GROUP " +
		"BY traceID, subQuery.durationNano, subQuery.name, subQuery.serviceName ORDER BY subQuery.durationNano desc;"
)

// ReservedColumnTargetAliases identifies result value from a user
// written clickhouse query. The column alias indcate which value is
// to be considered as final result (or target)
var ReservedColumnTargetAliases = map[string]struct{}{
	"result": {},
	"res":    {},
	"value":  {},
}

// logsPPLPfx is a short constant for logsPipelinePrefix
const LogsPPLPfx = "logstransform/pipeline_"

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
}

const SigNozOrderByValue = "#SIGNOZ_VALUE"

const TIMESTAMP = "timestamp"

const FirstQueryGraphLimit = "first_query_graph_limit"
const SecondQueryGraphLimit = "second_query_graph_limit"

var TracesListViewDefaultSelectedColumns = []v3.AttributeKey{
	{
		Key:      "serviceName",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "name",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "durationNano",
		DataType: v3.AttributeKeyDataTypeArrayFloat64,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "httpMethod",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
	{
		Key:      "responseStatusCode",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
		IsColumn: true,
	},
}
