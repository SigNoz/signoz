package telemetrystore

import (
	"regexp"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider to use
	Provider string `mapstructure:"provider"`

	// Connection is the connection configuration
	Connection ConnectionConfig `mapstructure:",squash"`

	// Clickhouse is the clickhouse configuration
	Clickhouse ClickhouseConfig `mapstructure:"clickhouse"`

	OceanBase OceanBaseConfig `mapstructure:"oceanbase"`
}

type OceanBaseConfig struct {
	DSN           string        `mapstructure:"dsn"`
	TablePrefix   string        `mapstructure:"table_prefix"`
	QueryTimeout  time.Duration `mapstructure:"query_timeout"`
	MaxQueryRange time.Duration `mapstructure:"max_query_range"`
	MaxResultRows int           `mapstructure:"max_result_rows"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int `mapstructure:"max_open_conns"`

	// MaxIdleConns is the maximum number of connections in the idle connection pool.
	MaxIdleConns int `mapstructure:"max_idle_conns"`

	// DialTimeout is the timeout for dialing a new connection.
	DialTimeout time.Duration `mapstructure:"dial_timeout"`
}

type ClickhouseConfig struct {
	// DSN is the database source name.
	DSN string `mapstructure:"dsn"`

	// Cluster is the cluster name to use for clickhouse.
	Cluster string `mapstructure:"cluster"`

	// QuerySettings is the query settings for clickhouse.
	QuerySettings QuerySettings `mapstructure:"settings"`
}

type QuerySettings struct {
	MaxExecutionTime                    int    `mapstructure:"max_execution_time"`
	MaxExecutionTimeLeaf                int    `mapstructure:"max_execution_time_leaf"`
	TimeoutBeforeCheckingExecutionSpeed int    `mapstructure:"timeout_before_checking_execution_speed"`
	MaxBytesToRead                      int    `mapstructure:"max_bytes_to_read"`
	MaxResultRows                       int    `mapstructure:"max_result_rows"`
	IgnoreDataSkippingIndices           string `mapstructure:"ignore_data_skipping_indices"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("telemetrystore"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Provider: "clickhouse",
		Connection: ConnectionConfig{
			MaxOpenConns: 100,
			MaxIdleConns: 50,
			DialTimeout:  5 * time.Second,
		},
		Clickhouse: ClickhouseConfig{
			DSN:     "tcp://localhost:9000",
			Cluster: "cluster",
		},
		OceanBase: OceanBaseConfig{
			TablePrefix:   "signoz",
			QueryTimeout:  30 * time.Second,
			MaxQueryRange: 93 * 24 * time.Hour,
			MaxResultRows: 10000,
		},
	}

}

func (c Config) Validate() error {
	if c.Provider == "oceanbase" {
		if c.OceanBase.DSN == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "telemetrystore::oceanbase::dsn is required")
		}
		if !regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,39}$`).MatchString(c.OceanBase.TablePrefix) {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid OceanBase table prefix")
		}
		if c.OceanBase.QueryTimeout <= 0 || c.OceanBase.MaxQueryRange <= 0 || c.OceanBase.MaxResultRows <= 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "OceanBase query timeout, range and row limit must be positive")
		}
	}
	return nil
}
