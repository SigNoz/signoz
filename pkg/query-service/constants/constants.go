package constants

import (
	"os"
	"strconv"
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

var ConfigSignozIo = "https://config.signoz.io/api/v1"

var DEFAULT_TELEMETRY_ANONYMOUS = false

func IsTelemetryEnabled() bool {
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

func GetAlertManagerApiPrefix() string {
	if os.Getenv("ALERTMANAGER_API_PREFIX") != "" {
		return os.Getenv("ALERTMANAGER_API_PREFIX")
	}
	return "http://alertmanager:9093/api/"
}

// Alert manager channel subpath
var AmChannelApiPath = GetOrDefaultEnv("ALERTMANAGER_API_CHANNEL_PATH", "v1/routes")

var RELATIONAL_DATASOURCE_PATH = GetOrDefaultEnv("SIGNOZ_LOCAL_DB_PATH", "/var/lib/signoz/signoz.db")

var DurationSortFeature = GetOrDefaultEnv("DURATION_SORT_FEATURE", "true")

var TimestampSortFeature = GetOrDefaultEnv("TIMESTAMP_SORT_FEATURE", "true")

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
	SIGNOZ_METRIC_DBNAME        = "signoz_metrics"
	SIGNOZ_SAMPLES_TABLENAME    = "distributed_samples_v2"
	SIGNOZ_TIMESERIES_TABLENAME = "distributed_time_series_v2"
	SIGNOZ_TRACE_DBNAME         = "signoz_traces"
	SIGNOZ_SPAN_INDEX_TABLENAME = "distributed_signoz_index_v2"
)

var TimeoutExcludedRoutes = map[string]bool{
	"/api/v1/logs/tail": true,
}

// alert related constants
const (
	// AlertHelpPage is used in case default alert repo url is not set
	AlertHelpPage = "https://signoz.io/docs/userguide/alerts-management/#generator-url"
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

var StaticInterestingLogFields = []model.LogField{
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
	{
		Name:     "trace_flags",
		DataType: UINT32,
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
}

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
}

const (
	LogsSQLSelect = "SELECT " +
		"timestamp, id, trace_id, span_id, trace_flags, severity_text, severity_number, body," +
		"CAST((attributes_string_key, attributes_string_value), 'Map(String, String)') as  attributes_string," +
		"CAST((attributes_int64_key, attributes_int64_value), 'Map(String, Int64)') as  attributes_int64," +
		"CAST((attributes_float64_key, attributes_float64_value), 'Map(String, Float64)') as  attributes_float64," +
		"CAST((resources_string_key, resources_string_value), 'Map(String, String)') as resources_string "
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

// The datatype present here doesn't represent the actual datatype of column in the logs table.
var StaticFieldsLogsV3 = []v3.AttributeKey{
	{
		Key:      "trace_id",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
	},
	{
		Key:      "span_id",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
	},
	{
		Key:      "trace_flags",
		DataType: v3.AttributeKeyDataTypeInt64,
		Type:     v3.AttributeKeyTypeTag,
	},
	{
		Key:      "severity_text",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
	},
	{
		Key:      "severity_number",
		DataType: v3.AttributeKeyDataTypeInt64,
		Type:     v3.AttributeKeyTypeTag,
	},
	{
		Key:      "body",
		DataType: v3.AttributeKeyDataTypeString,
		Type:     v3.AttributeKeyTypeTag,
	},
}

var LogsTopLevelColumnsV3 = map[string]struct{}{
	"trace_id":        {},
	"span_id":         {},
	"trace_flags":     {},
	"severity_text":   {},
	"severity_number": {},
	"timestamp":       {},
	"id":              {},
}

const SigNozOrderByValue = "#SIGNOZ_VALUE"
