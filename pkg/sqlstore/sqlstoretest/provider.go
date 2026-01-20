package sqlstoretest

import (
	"context"
	"database/sql"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

var _ sqlstore.SQLStore = (*Provider)(nil)

type Provider struct {
	db        *sql.DB
	mock      sqlmock.Sqlmock
	bunDB     *bun.DB
	dialect   *dialect
	formatter sqlstore.SQLFormatter
}

func New(config sqlstore.Config, matcher sqlmock.QueryMatcher) *Provider {
	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(matcher))
	if err != nil {
		panic(err)
	}

	var bunDB *bun.DB

	if config.Provider == "sqlite" {
		bunDB = bun.NewDB(db, sqlitedialect.New())
	} else if config.Provider == "postgres" {
		bunDB = bun.NewDB(db, pgdialect.New())
	} else {
		panic(errors.NewInvalidInputf(errors.CodeInvalidInput, "provider %q is not supported", config.Provider))
	}

	return &Provider{
		db:        db,
		mock:      mock,
		bunDB:     bunDB,
		dialect:   new(dialect),
		formatter: newFormatter(bunDB.Dialect()),
	}
}

func (provider *Provider) BunDB() *bun.DB {
	return provider.bunDB
}

func (provider *Provider) SQLDB() *sql.DB {
	return provider.db
}

func (provider *Provider) Mock() sqlmock.Sqlmock {
	return provider.mock
}

func (provider *Provider) Dialect() sqlstore.SQLDialect {
	return provider.dialect
}

func (provider *Provider) Formatter() sqlstore.SQLFormatter { return provider.formatter }

func (provider *Provider) BunDBCtx(ctx context.Context) bun.IDB {
	return provider.bunDB
}

func (provider *Provider) RunInTxCtx(ctx context.Context, opts *sql.TxOptions, cb func(ctx context.Context) error) error {
	return cb(ctx)
}

func (provider *Provider) WrapNotFoundErrf(err error, code errors.Code, format string, args ...any) error {
	return errors.WrapNotFoundf(err, code, format, args...)
}

func (provider *Provider) WrapAlreadyExistsErrf(err error, code errors.Code, format string, args ...any) error {
	return errors.Wrapf(err, errors.TypeAlreadyExists, code, format, args...)
}
