package sqlstoretest

import (
	"database/sql"
	"fmt"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"go.signoz.io/signoz/pkg/sqlstore"
)

var _ sqlstore.SQLStore = (*Provider)(nil)

type Provider struct {
	db     *sql.DB
	mock   sqlmock.Sqlmock
	bunDB  *bun.DB
	sqlxDB *sqlx.DB
}

func New(config sqlstore.Config, matcher sqlmock.QueryMatcher) *Provider {
	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(matcher))
	if err != nil {
		panic(err)
	}

	var bunDB *bun.DB
	var sqlxDB *sqlx.DB

	if config.Provider == "sqlite" {
		bunDB = bun.NewDB(db, sqlitedialect.New())
		sqlxDB = sqlx.NewDb(db, "sqlite3")
	} else {
		panic(fmt.Errorf("provider %q is not supported by mockSQLStore", config.Provider))
	}

	return &Provider{
		db:     db,
		mock:   mock,
		bunDB:  bunDB,
		sqlxDB: sqlxDB,
	}
}

func (provider *Provider) BunDB() *bun.DB {
	return provider.bunDB
}

func (provider *Provider) SQLDB() *sql.DB {
	return provider.db
}

func (provider *Provider) SQLxDB() *sqlx.DB {
	return provider.sqlxDB
}

func (provider *Provider) Mock() sqlmock.Sqlmock {
	return provider.mock
}
