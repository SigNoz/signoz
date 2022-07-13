package constants

import (
	"os"
	"strconv"
)

const (
	HTTPHostPort    = "0.0.0.0:8080" // Address to serve http (query service)
	PrivateHostPort = "0.0.0.0:8085" // Address to server internal services like alert manager
	DebugHttpPort   = "0.0.0.0:6060" // Address to serve http (pprof)
)

var DefaultTelemetryAnonymous = false

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

func GetAlertManagerApiPrefix() string {
	if os.Getenv("ALERTMANAGER_API_PREFIX") != "" {
		return os.Getenv("ALERTMANAGER_API_PREFIX")
	}
	return "http://alertmanager:9093/api/"
}

// AmChannelApiPath is a channel subpath for Alert manager
var AmChannelApiPath = GetOrDefaultEnv("ALERTMANAGER_API_CHANNEL_PATH", "v1/routes")

var RelationalDatasourcePath = GetOrDefaultEnv("SIGNOZ_LOCAL_DB_PATH", "/var/lib/signoz/signoz.db")

const (
	ServiceName      = "serviceName"
	HttpRoute        = "httpRoute"
	HttpCode         = "httpCode"
	HttpHost         = "httpHost"
	HttpUrl          = "httpUrl"
	HttpMethod       = "httpMethod"
	Component        = "component"
	OperationDB      = "name"
	OperationRequest = "operation"
	Status           = "status"
	Duration         = "duration"
	DBName           = "dbName"
	DBOperation      = "dbOperation"
	DBSystem         = "dbSystem"
	MsgSystem        = "msgSystem"
	MsgOperation     = "msgOperation"
	Timestamp        = "timestamp"
	Descending       = "descending"
	Ascending        = "ascending"
	ContextTimeout   = 60 // seconds
	StatusPending    = "pending"
	StatusFailed     = "failed"
	StatusSuccess    = "success"
	ExceptionType    = "exceptionType"
	ExceptionCount   = "exceptionCount"
	LastSeen         = "lastSeen"
	FirstSeen        = "firstSeen"
)
const (
	SignozMetricDbname        = "signoz_metrics"
	SignozSamplesTableName    = "samples_v2"
	SignozTimeSeriesTableName = "time_series_v2"
)

func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}
