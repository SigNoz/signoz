package sqlstore

import (
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
)

const (
	ProviderSQLite   = "sqlite"
	ProviderPostgres = "postgres"

	SQLiteModeDelete = "delete"
	SQLiteModeWAL    = "wal"

	SQLiteTransactionModeDeferred  = "deferred"
	SQLiteTransactionModeImmediate = "immediate"
	SQLiteTransactionModeExclusive = "exclusive"
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

	// Mode is the journal mode for the sqlite database.
	Mode string `mapstructure:"mode"`

	// BusyTimeout is the timeout for the sqlite database to wait for a lock.
	BusyTimeout time.Duration `mapstructure:"busy_timeout"`

	// TransactionMode is the default transaction locking behavior for the sqlite database.
	TransactionMode string `mapstructure:"transaction_mode"`
}

type ConnectionConfig struct {
	// MaxOpenConns is the maximum number of open connections to the database.
	MaxOpenConns int `mapstructure:"max_open_conns"`

	// MaxConnLifetime is the maximum amount of time a connection may be reused.
	// If max_conn_lifetime == 0, connections are not closed due to a connection's age.
	MaxConnLifetime time.Duration `mapstructure:"max_conn_lifetime"`
}

func NewConfigFactory() factory.ConfigFactory {
	return factory.NewConfigFactory(factory.MustNewName("sqlstore"), newConfig)
}

func newConfig() factory.Config {
	return Config{
		Provider: ProviderSQLite,
		Connection: ConnectionConfig{
			MaxOpenConns:    100,
			MaxConnLifetime: 0,
		},
		Sqlite: SqliteConfig{
			Path:            "/var/lib/signoz/signoz.db",
			Mode:            SQLiteModeWAL,
			BusyTimeout:     10000 * time.Millisecond, // increasing the defaults from https://github.com/mattn/go-sqlite3/blob/master/sqlite3.go#L1098 because of transpilation from C to GO
			TransactionMode: SQLiteTransactionModeImmediate,
		},
	}

}

func (c Config) Validate() error {
	switch c.Provider {
	case ProviderSQLite:
		if c.Sqlite.Path == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::sqlite::path cannot be empty")
		}
		switch c.Sqlite.Mode {
		case SQLiteModeDelete, SQLiteModeWAL:
		default:
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::sqlite::mode must be one of [%s, %s], got %q", SQLiteModeDelete, SQLiteModeWAL, c.Sqlite.Mode)
		}
		if c.Sqlite.BusyTimeout < 0 {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::sqlite::busy_timeout cannot be negative, got %v", c.Sqlite.BusyTimeout)
		}
		switch c.Sqlite.TransactionMode {
		case SQLiteTransactionModeDeferred, SQLiteTransactionModeImmediate, SQLiteTransactionModeExclusive:
		default:
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::sqlite::transaction_mode must be one of [%s, %s, %s], got %q", SQLiteTransactionModeDeferred, SQLiteTransactionModeImmediate, SQLiteTransactionModeExclusive, c.Sqlite.TransactionMode)
		}
	case ProviderPostgres:
		if c.Postgres.DSN == "" {
			return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::postgres::dsn cannot be empty")
		}
	default:
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::provider must be one of [%s, %s], got %q", ProviderSQLite, ProviderPostgres, c.Provider)
	}

	if c.Connection.MaxOpenConns <= 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::max_open_conns must be positive, got %d", c.Connection.MaxOpenConns)
	}
	if c.Connection.MaxConnLifetime < 0 {
		return errors.NewInvalidInputf(errors.CodeInvalidInput, "sqlstore::max_conn_lifetime cannot be negative, got %v", c.Connection.MaxConnLifetime)
	}

	return nil
}
