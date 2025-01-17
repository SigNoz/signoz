package sqlitesqlstore

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.uber.org/zap"
)

type provider struct {
	settings factory.ScopedProviderSettings
	sqldb    *sql.DB
	bundb    *bun.DB
	sqlxdb   *sqlx.DB
}

func NewFactory() factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sqlite"), New)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/sqlitesqlstore")

	sqldb, err := sql.Open("sqlite3", "file:"+config.Sqlite.Path+"?_foreign_keys=true")
	if err != nil {
		return nil, err
	}
	settings.ZapLogger().Info("connected to sqlite", zap.String("path", config.Sqlite.Path))
	sqldb.SetMaxOpenConns(config.Connection.MaxOpenConns)

	return &provider{
		settings: settings,
		sqldb:    sqldb,
		bundb:    bun.NewDB(sqldb, sqlitedialect.New()),
		sqlxdb:   sqlx.NewDb(sqldb, "sqlite3"),
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
