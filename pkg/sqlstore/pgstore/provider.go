package pgstore

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type provider struct {
	settings factory.ScopedProviderSettings
	sqldb    *sql.DB
	bundb    *bun.DB
	sqlxdb   *sqlx.DB
}

func NewFactory() factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("postgres"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/sqlstore/pgstore")

	sqldb, err := sql.Open("postgres", config.Postgres.DSN)
	if err != nil {
		return nil, err
	}
	settings.Logger().InfoContext(ctx, "connected to postgres", "dsn", config.Postgres.DSN)
	sqldb.SetMaxOpenConns(config.Connection.MaxOpenConns)

	return &provider{
		settings: settings,
		sqldb:    sqldb,
		bundb:    bun.NewDB(sqldb, pgdialect.New()),
		sqlxdb:   sqlx.NewDb(sqldb, "postgres"),
	}, nil
}

func (provider *provider) BunDB() *bun.DB {
	return provider.bundb
}

func (provider *provider) SQLDB() *sql.DB {
	return provider.sqldb
}

func (provider *provider) SQLxDB() *sqlx.DB {
	return provider.sqlxdb
}
