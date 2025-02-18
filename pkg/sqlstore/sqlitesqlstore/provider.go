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
)

type provider struct {
	settings factory.ScopedProviderSettings
	sqldb    *sql.DB
	bundb    *bun.DB
	sqlxdb   *sqlx.DB
}

func NewFactory(hookFactories ...factory.ProviderFactory[sqlstore.SQLStoreHook, sqlstore.Config]) factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sqlite"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStore, error) {
		hooks := make([]sqlstore.SQLStoreHook, len(hookFactories))
		for i, hookFactory := range hookFactories {
			hook, err := hookFactory.New(ctx, providerSettings, config)
			if err != nil {
				return nil, err
			}
			hooks[i] = hook
		}

		return New(ctx, providerSettings, config, hooks...)
	})
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config, hooks ...sqlstore.SQLStoreHook) (sqlstore.SQLStore, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "go.signoz.io/signoz/pkg/sqlitesqlstore")

	sqldb, err := sql.Open("sqlite3", "file:"+config.Sqlite.Path+"?_foreign_keys=true")
	if err != nil {
		return nil, err
	}
	settings.Logger().InfoContext(ctx, "connected to sqlite", "path", config.Sqlite.Path)
	sqldb.SetMaxOpenConns(config.Connection.MaxOpenConns)

	return &provider{
		settings: settings,
		sqldb:    sqldb,
		bundb:    sqlstore.NewBunDB(sqldb, sqlitedialect.New(), hooks),
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
