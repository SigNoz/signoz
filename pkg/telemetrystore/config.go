package telemetrystore

import (
	"time"

	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider to use
	Provider string `mapstructure:"provider"`
	// Connection is the connection configuration
	Connection ConnectionConfig `mapstructure:",squash"`
	// Clickhouse is the clickhouse configuration
	Clickhouse ClickhouseConfig `mapstructure:"clickhouse"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int `mapstructure:"max_open_conns"`
}

type ClickhouseConfig struct {
	Address  string `mapstructure:"address"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`

	MaxIdleConns int           `mapstructure:"max_idle_conns"`
	MaxOpenConns int           `mapstructure:"max_open_conns"`
	DialTimeout  time.Duration `mapstructure:"dial_timeout"`

	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	AltHosts     []string      `mapstructure:"alt_hosts"`

	Debug bool `mapstructure:"debug"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("telemetrystore"), newConfig)

}

func newConfig() factory.Config {
	return Config{
		Provider: "clickhouse",
		Connection: ConnectionConfig{
			MaxOpenConns: 100,
		},
		Clickhouse: ClickhouseConfig{
			Address: "localhost:9000",
		},
	}
}

func (c Config) Validate() error {
	return nil
}
