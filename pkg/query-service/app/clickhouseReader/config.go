package clickhouseReader

import (
	"time"

	"go.signoz.io/signoz/pkg/confmap"
)

type Config struct {
	Provider                            string        `mapstructure:"provider"`
	DSN                                 string        `mapstructure:"dsn"`
	Cluster                             string        `mapstructure:"cluster"`
	PrometheusConfigPath                string        `mapstructure:"prometheus_config_path"`
	MaxIdleConnections                  int           `mapstructure:"max_idle_connections"`
	MaxOpenConnections                  int           `mapstructure:"max_open_connections"`
	DialTimeout                         time.Duration `mapstructure:"dial_timeout"`
	OptimizeReadInOrderRegex            string        `mapstructure:"optimize_read_in_order_regex"`
	MaxExecutionTimeLeaf                string        `mapstructure:"max_execution_time_leaf"`
	TimeoutBeforeCheckingExecutionSpeed string        `mapstructure:"timeout_before_checking_execution_speed"`
	MaxBytesToRead                      string        `mapstructure:"max_bytes_to_read"`
}

func (c *Config) NewWithDefaults() confmap.Config {
	return &Config{
		Provider:                            "clickhouse",
		DSN:                                 "tcp://localhost:9000",
		Cluster:                             "cluster",
		PrometheusConfigPath:                "/etc/signoz/config/prometheus.yml",
		MaxIdleConnections:                  50,
		MaxOpenConnections:                  100,
		DialTimeout:                         5 * time.Second,
		OptimizeReadInOrderRegex:            "",
		MaxExecutionTimeLeaf:                "",
		TimeoutBeforeCheckingExecutionSpeed: "",
		MaxBytesToRead:                      "",
	}
}

func (c *Config) Validate() error {
	return nil
}
