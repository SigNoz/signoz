package config

import (
	"os"
)

type Config struct {
	SignozJwtSecret                               string
	StorageType                                   string
	ClickHouseUrl                                 string
	ClickHouseOptimizeReadInOrderRegex            string
	ClickHouseMaxExecutionTimeLeaf                string
	ClickHouseTimeoutBeforeCheckingExecutionSpeed string
	ClickHouseMaxBytesToRead                      string
	SmtpEnabled                                   string
	DeploymentType                                string
	SmtpHost                                      string
	SmtpPort                                      string
	SmtpUsername                                  string
	SmtpPassword                                  string
	SmtpFrom                                      string
}

var AppConfig Config

func LoadConfig() {
	AppConfig = Config{
		SignozJwtSecret:                               os.Getenv("SIGNOZ_JWT_SECRET"),
		StorageType:                                   os.Getenv("STORAGE"),
		ClickHouseUrl:                                 os.Getenv("CLICKHOUSE_URL"),
		ClickHouseOptimizeReadInOrderRegex:            os.Getenv("CLICKHOUSE_OPTIMIZE_READ_IN_ORDER_REGEX"),
		ClickHouseMaxExecutionTimeLeaf:                os.Getenv("CLICKHOUSE_MAX_EXECUTION_TIME_LEAF"),
		ClickHouseTimeoutBeforeCheckingExecutionSpeed: os.Getenv("CLICKHOUSE_TIMEOUT_BEFORE_CHECKING_EXECUTION_SPEED"),
		ClickHouseMaxBytesToRead:                      os.Getenv("CLICKHOUSE_MAX_BYTES_TO_READ"),
		SmtpEnabled:                                   os.Getenv("SMTP_ENABLED"),
		DeploymentType:                                os.Getenv("DEPLOYMENT_TYPE"),
		SmtpHost:                                      os.Getenv("SMTP_HOST"),
		SmtpPort:                                      os.Getenv("SMTP_PORT"),
		SmtpUsername:                                  os.Getenv("SMTP_USERNAME"),
		SmtpPassword:                                  os.Getenv("SMTP_PASSWORD"),
		SmtpFrom:                                      os.Getenv("SMTP_FROM"),
	}
}
