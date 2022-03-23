package constants

import (
	"os"
	"strconv"
)

const HTTPHostPort = "0.0.0.0:8080"

var DruidClientUrl = os.Getenv("DruidClientUrl")
var DruidDatasource = os.Getenv("DruidDatasource")
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

func GetAlertManagerApiPrefix() string {
	if os.Getenv("ALERTMANAGER_API_PREFIX") != "" {
		return os.Getenv("ALERTMANAGER_API_PREFIX")
	}
	return "http://alertmanager:9093/api/"
}

// Alert manager channel subpath 
var AmChannelApiPath = GetOrDefaultEnv("ALERTMANAGER_API_CHANNEL_PATH", "v1/routes")

var RELATIONAL_DATASOURCE_PATH = GetOrDefaultEnv("SIGNOZ_LOCAL_DB_PATH", "/var/lib/signoz/signoz.db")

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
)


func GetOrDefaultEnv(key string, fallback string) string {
	v := os.Getenv(key)
	if len(v) == 0 {
		return fallback
	}
	return v
}