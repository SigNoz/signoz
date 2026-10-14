package sqlstore

import (
	"context"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/config"
	"github.com/SigNoz/signoz/pkg/config/envprovider"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewWithEnvProvider(t *testing.T) {
	t.Setenv("SIGNOZ_SQLSTORE_PROVIDER", "sqlite")
	t.Setenv("SIGNOZ_SQLSTORE_SQLITE_PATH", "/tmp/test.db")
	t.Setenv("SIGNOZ_SQLSTORE_SQLITE_MODE", "wal")
	t.Setenv("SIGNOZ_SQLSTORE_SQLITE_BUSY__TIMEOUT", "5s")
	t.Setenv("SIGNOZ_SQLSTORE_SQLITE_TRANSACTION__MODE", "immediate")
	t.Setenv("SIGNOZ_SQLSTORE_MAX__OPEN__CONNS", "50")
	t.Setenv("SIGNOZ_SQLSTORE_MAX__CONN__LIFETIME", "3h")

	conf, err := config.New(
		context.Background(),
		config.ResolverConfig{
			Uris: []string{"env:"},
			ProviderFactories: []config.ProviderFactory{
				envprovider.NewFactory(),
			},
		},
		[]factory.ConfigFactory{
			NewConfigFactory(),
		},
	)
	require.NoError(t, err)

	actual := &Config{}
	err = conf.Unmarshal("sqlstore", actual)
	require.NoError(t, err)

	expected := &Config{
		Provider: "sqlite",
		Connection: ConnectionConfig{
			MaxOpenConns:    50,
			MaxConnLifetime: time.Hour * 3,
		},
		Sqlite: SqliteConfig{
			Path:            "/tmp/test.db",
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "immediate",
		},
	}

	assert.Equal(t, expected, actual)
	assert.NoError(t, actual.Validate())
}

func validSQLiteConfig() Config {
	return Config{
		Provider: ProviderSQLite,
		Connection: ConnectionConfig{
			MaxOpenConns:    100,
			MaxConnLifetime: 0,
		},
		Sqlite: SqliteConfig{
			Path:            "/var/lib/signoz/signoz.db",
			Mode:            SQLiteModeWAL,
			BusyTimeout:     10 * time.Second,
			TransactionMode: SQLiteTransactionModeImmediate,
		},
	}
}

func validPostgresConfig() Config {
	return Config{
		Provider: ProviderPostgres,
		Connection: ConnectionConfig{
			MaxOpenConns:    100,
			MaxConnLifetime: 0,
		},
		Postgres: PostgresConfig{
			DSN: "postgres://user:pass@localhost:5432/signoz?sslmode=disable",
		},
	}
}

func TestValidate(t *testing.T) {
	testCases := []struct {
		name    string
		mutate  func(*Config)
		wantErr string
	}{
		{
			name: "ValidSQLiteDefaults",
		},
		{
			name: "ValidPostgres",
			mutate: func(c *Config) {
				*c = validPostgresConfig()
			},
		},
		{
			name: "EmptyProvider",
			mutate: func(c *Config) {
				c.Provider = ""
			},
			wantErr: `sqlstore::provider must be one of [sqlite, postgres], got ""`,
		},
		{
			name: "UnknownProvider",
			mutate: func(c *Config) {
				c.Provider = "mysql"
			},
			wantErr: `sqlstore::provider must be one of [sqlite, postgres], got "mysql"`,
		},
		{
			name: "EmptySQLitePath",
			mutate: func(c *Config) {
				c.Sqlite.Path = ""
			},
			wantErr: "sqlstore::sqlite::path cannot be empty",
		},
		{
			name: "InvalidSQLiteMode",
			mutate: func(c *Config) {
				c.Sqlite.Mode = "memory"
			},
			wantErr: `sqlstore::sqlite::mode must be one of [delete, wal], got "memory"`,
		},
		{
			name: "NegativeSQLiteBusyTimeout",
			mutate: func(c *Config) {
				c.Sqlite.BusyTimeout = -time.Second
			},
			wantErr: "sqlstore::sqlite::busy_timeout cannot be negative, got -1s",
		},
		{
			name: "InvalidSQLiteTransactionMode",
			mutate: func(c *Config) {
				c.Sqlite.TransactionMode = "read_only"
			},
			wantErr: `sqlstore::sqlite::transaction_mode must be one of [deferred, immediate, exclusive], got "read_only"`,
		},
		{
			name: "EmptyPostgresDSN",
			mutate: func(c *Config) {
				*c = validPostgresConfig()
				c.Postgres.DSN = ""
			},
			wantErr: "sqlstore::postgres::dsn cannot be empty",
		},
		{
			name: "NonPositiveMaxOpenConns",
			mutate: func(c *Config) {
				c.Connection.MaxOpenConns = 0
			},
			wantErr: "sqlstore::max_open_conns must be positive, got 0",
		},
		{
			name: "NegativeMaxConnLifetime",
			mutate: func(c *Config) {
				c.Connection.MaxConnLifetime = -time.Minute
			},
			wantErr: "sqlstore::max_conn_lifetime cannot be negative, got -1m0s",
		},
		{
			name: "SQLiteModeDeleteAndDeferredAreValid",
			mutate: func(c *Config) {
				c.Sqlite.Mode = SQLiteModeDelete
				c.Sqlite.TransactionMode = SQLiteTransactionModeDeferred
			},
		},
		{
			name: "SQLiteTransactionModeExclusiveIsValid",
			mutate: func(c *Config) {
				c.Sqlite.TransactionMode = SQLiteTransactionModeExclusive
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := validSQLiteConfig()
			if tc.mutate != nil {
				tc.mutate(&cfg)
			}

			err := cfg.Validate()
			if tc.wantErr == "" {
				assert.NoError(t, err)
				return
			}

			require.Error(t, err)
			assert.EqualError(t, err, tc.wantErr)
		})
	}
}
