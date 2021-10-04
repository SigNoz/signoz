package constants

import (
	"os"
)

const HTTPHostPort = "0.0.0.0:8080"

var DruidClientUrl = os.Getenv("DruidClientUrl")
var DruidDatasource = os.Getenv("DruidDatasource")

const TraceTTL = "traces"
const MetricsTTL = "metrics"
