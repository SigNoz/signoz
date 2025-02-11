package sqlstore

import (
	"go.signoz.io/signoz/pkg/factory"
)

type Config struct {
	// Provider is the provider to use.
	Provider string `mapstructure:"provider"`
	// Connection is the connection configuration.
	Connection ConnectionConfig `mapstructure:",squash"`
	// Sqlite is the sqlite configuration.
	Sqlite SqliteConfig `mapstructure:"sqlite"`
	// Postgres is the postgres configuration.
	Postgres PostgresConfig `mapstructure:"postgres"`
}

type PostgresConfig struct {
	// DSN is the database source name.
	DSN string `mapstructure:"dsn"`
}

type SqliteConfig struct {
	// Path is the path to the sqlite database.
	Path string `mapstructure:"path"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int `mapstructure:"max_open_conns"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sqlstore"), newConfig)
}

func newConfig() factory.Config {
	return Config{
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
