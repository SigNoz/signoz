package telemetrystore

import (
	"fmt"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/promengine"
)

type Config struct {
	// Provider is the provider to use
	Provider string `mapstructure:"provider"`

	// Connection is the connection configuration
	Connection ConnectionConfig `mapstructure:",squash"`

	// Clickhouse is the clickhouse configuration
	Clickhouse ClickhouseConfig `mapstructure:"clickhouse"`

	// Prometheus is the prometheus configuration
	Prometheus promengine.Config `mapstructure:"prometheus"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int `mapstructure:"max_open_conns"`

	// MaxIdleConns is the maximum number of connections in the idle connection pool.
	MaxIdleConns int `mapstructure:"max_idle_conns"`

	// DialTimeout is the timeout for dialing a new connection.
	DialTimeout time.Duration `mapstructure:"dial_timeout"`
}

type QuerySettings struct {
	MaxExecutionTime                    int `mapstructure:"max_execution_time"`
	MaxExecutionTimeLeaf                int `mapstructure:"max_execution_time_leaf"`
	TimeoutBeforeCheckingExecutionSpeed int `mapstructure:"timeout_before_checking_execution_speed"`
	MaxBytesToRead                      int `mapstructure:"max_bytes_to_read"`
	MaxResultRowsForCHQuery             int `mapstructure:"max_result_rows_for_ch_query"`
}

type ClickhouseConfig struct {
	// DSN is the database source name.
	DSN string `mapstructure:"dsn"`

	// QuerySettings is the query settings for clickhouse.
	QuerySettings QuerySettings `mapstructure:"settings"`
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
			DSN: "tcp://localhost:9000",
		},
		Prometheus: promengine.Config{
			RemoteReadConfig: promengine.RemoteReadConfig{
				URL: &url.URL{
					Scheme: "tcp",
					Host:   "localhost:9000",
					Path:   "/signoz_metrics",
				},
			},
			ActiveQueryTrackerConfig: promengine.ActiveQueryTrackerConfig{
				Enabled:       true,
				Path:          "",
				MaxConcurrent: 20,
			},
		},
	}

}

func (c Config) Validate() error {
	dsn, err := url.Parse(c.Clickhouse.DSN)
	if err != nil {
		return err
	}

	if c.Prometheus.RemoteReadConfig.URL.Host != dsn.Host {
		return fmt.Errorf("mismatch between host in prometheus.remote_read.url %q and clickhouse.dsn %q", c.Prometheus.RemoteReadConfig.URL.Host, dsn.Host)
	}

	if c.Prometheus.RemoteReadConfig.URL.Scheme != dsn.Scheme {
		return fmt.Errorf("mismatch between scheme in prometheus.remote_read.url %q and clickhouse.dsn %q", c.Prometheus.RemoteReadConfig.URL.Scheme, dsn.Scheme)
	}

	return nil
}
