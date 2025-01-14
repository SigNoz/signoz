package sqlstore

import (
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	Provider   string           `mapstructure:"provider"`
	Connection ConnectionConfig `mapstructure:",squash"`
	Sqlite     SqliteConfig     `mapstructure:"sqlite"`
}

type SqliteConfig struct {
	Path string `mapstructure:"path"`
}

type ConnectionConfig struct {
	MaxOpenConns int `mapstructure:"max_open_conns"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sqlstore"), newConfig)
}

func newConfig() factory.Config {
	return &Config{
		Provider: "sqlite",
		Connection: ConnectionConfig{
			MaxOpenConns: 100,
		},
		Sqlite: SqliteConfig{
			Path: "/var/lib/signoz/signoz.db",
		},
	}

}

func (c Config) Validate() error {
	return nil
}
