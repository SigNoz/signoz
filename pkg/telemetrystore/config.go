package telemetrystore

import (
	"fmt"
	"time"

	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider to use
	Provider string `mapstructure:"provider"`
	// Connection is the connection configuration
	Connection ConnectionConfig `mapstructure:",squash"`
	// Clickhouse is the clickhouse configuration
	ClickHouse ClickHouseConfig `mapstructure:"clickhouse"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int           `mapstructure:"max_open_conns"`
	MaxIdleConns int           `mapstructure:"max_idle_conns"`
	DialTimeout  time.Duration `mapstructure:"dial_timeout"`
}

type ClickHouseQuerySettings struct {
	MaxExecutionTime                    int `mapstructure:"max_execution_time"`
	MaxExecutionTimeLeaf                int `mapstructure:"max_execution_time_leaf"`
	TimeoutBeforeCheckingExecutionSpeed int `mapstructure:"timeout_before_checking_execution_speed"`
	MaxBytesToRead                      int `mapstructure:"max_bytes_to_read"`
	MaxResultRowsForCHQuery             int `mapstructure:"max_result_rows_for_ch_query"`
}

type ClickHouseConfig struct {
	DSN string `mapstructure:"dsn"`

	QuerySettings ClickHouseQuerySettings `mapstructure:"settings"`
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
		ClickHouse: ClickHouseConfig{
			DSN: "tcp://localhost:9000",
		},
	}
}

func (c Config) Validate() error {
	if c.Provider != "clickhouse" {
		return fmt.Errorf("provider: %q is not supported", c.Provider)
	}

	return nil
}
