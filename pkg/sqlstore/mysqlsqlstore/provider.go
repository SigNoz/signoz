package mysqlsqlstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/go-sql-driver/mysql"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/mysqldialect"

	_ "github.com/go-sql-driver/mysql"
)

type provider struct {
	settings  factory.ScopedProviderSettings
	sqldb     *sql.DB
	bundb     *sqlstore.BunDB
	dialect   *dialect
	formatter sqlstore.SQLFormatter
}

func NewFactory(hookFactories ...factory.ProviderFactory[sqlstore.SQLStoreHook, sqlstore.Config]) factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("mysql"), func(ctx context.Context, providerSettings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStore, error) {
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
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/mysqlsqlstore")

	sqldb, err := sql.Open("mysql", config.MySQL.DSN)
	if err != nil {
		return nil, err
	}
	// Avoid logging the full DSN because it may contain credentials.
	if parsed, perr := mysql.ParseDSN(config.MySQL.DSN); perr == nil {
		settings.Logger().InfoContext(ctx, "connected to mysql", "addr", parsed.Addr, "db", parsed.DBName)
	} else {
		settings.Logger().InfoContext(ctx, "connected to mysql", "dsn", "redacted")
	}
	sqldb.SetMaxOpenConns(config.Connection.MaxOpenConns)

	mysqlDialect := mysqldialect.New()
	bunDB := sqlstore.NewBunDB(settings, sqldb, mysqlDialect, hooks)
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
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		// 1062: ER_DUP_ENTRY (duplicate entry for key)
		if mysqlErr.Number == 1062 {
			return errors.Wrapf(err, errors.TypeAlreadyExists, code, format, args...)
		}
	}

	return err
}


