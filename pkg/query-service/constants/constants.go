package constants

import (
	"os"
)

const HTTPHostPort = "0.0.0.0:6060"

var DruidClientUrl = os.Getenv("DruidClientUrl")
var DruidDatasource = os.Getenv("DruidDatasource")
