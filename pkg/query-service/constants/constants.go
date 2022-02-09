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

const ALERTMANAGER_API_PREFIX = "http://alertmanager:9093/api/"
const RELATIONAL_DATASOURCE_PATH = "/var/lib/signoz/signoz.db"

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
