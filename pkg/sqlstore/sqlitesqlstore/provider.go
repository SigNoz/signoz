package sqlitesqlstore

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"

	"modernc.org/sqlite"
	sqlite3 "modernc.org/sqlite/lib"
)

type provider struct {
	settings  factory.ScopedProviderSettings
	sqldb     *sql.DB
	bundb     *sqlstore.BunDB
	dialect   *dialect
	formatter sqlstore.SQLFormatter
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
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/sqlitesqlstore")

	connectionParams := url.Values{}
	// do not update the order of the connection params as busy_timeout doesn't work if it's not the first parameter
	connectionParams.Add("_pragma", fmt.Sprintf("busy_timeout(%d)", config.Sqlite.BusyTimeout.Milliseconds()))
	connectionParams.Add("_pragma", fmt.Sprintf("journal_mode(%s)", config.Sqlite.Mode))
	connectionParams.Add("_pragma", "foreign_keys(1)")
	sqldb, err := sql.Open("sqlite", "file:"+config.Sqlite.Path+"?"+connectionParams.Encode())
	if err != nil {
		return nil, err
	}
	settings.Logger().InfoContext(ctx, "connected to sqlite", "path", config.Sqlite.Path)
	sqldb.SetMaxOpenConns(config.Connection.MaxOpenConns)

	sqliteDialect := sqlitedialect.New()
	bunDB := sqlstore.NewBunDB(settings, sqldb, sqliteDialect, hooks)
	return &provider{
		settings:  settings,
		sqldb:     sqldb,
		bundb:     bunDB,
		dialect:   new(dialect),
		formatter: newFormatter(bunDB.Dialect()),
	}, nil
}

func (provider *provider) BunDB() *bun.DB {
	return provider.bundb.DB
}

func (provider *provider) SQLDB() *sql.DB {
	return provider.sqldb
}

func (provider *provider) Dialect() sqlstore.SQLDialect {
	return provider.dialect
}

func (provider *provider) Formatter() sqlstore.SQLFormatter {
	return provider.formatter
}

func (provider *provider) BunDBCtx(ctx context.Context) bun.IDB {
	return provider.bundb.BunDBCtx(ctx)
}

func (provider *provider) RunInTxCtx(ctx context.Context, opts *sql.TxOptions, cb func(ctx context.Context) error) error {
	return provider.bundb.RunInTxCtx(ctx, opts, cb)
}

func (provider *provider) WrapNotFoundErrf(err error, code errors.Code, format string, args ...any) error {
	if err == sql.ErrNoRows {
		return errors.Wrapf(err, errors.TypeNotFound, code, format, args...)
	}

	return err
}

func (provider *provider) WrapAlreadyExistsErrf(err error, code errors.Code, format string, args ...any) error {
	if sqlite3Err, ok := err.(*sqlite.Error); ok {
		if sqlite3Err.Code() == sqlite3.SQLITE_CONSTRAINT_UNIQUE || sqlite3Err.Code() == sqlite3.SQLITE_CONSTRAINT_PRIMARYKEY {
			return errors.Wrapf(err, errors.TypeAlreadyExists, code, format, args...)
		}
	}

	return err
}
