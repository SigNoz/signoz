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

var _ sqlstore.SQLStore = (*MockSQLStore)(nil)

type MockSQLStore struct {
	db     *sql.DB
	mock   sqlmock.Sqlmock
	bunDB  *bun.DB
	sqlxDB *sqlx.DB
}

func New(config sqlstore.Config, matcher sqlmock.QueryMatcher) *MockSQLStore {
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

	return &MockSQLStore{
		db:     db,
		mock:   mock,
		bunDB:  bunDB,
		sqlxDB: sqlxDB,
	}
}

func (s *MockSQLStore) BunDB() *bun.DB {
	return s.bunDB
}

func (s *MockSQLStore) SQLDB() *sql.DB {
	return s.db
}

func (s *MockSQLStore) SQLxDB() *sqlx.DB {
	return s.sqlxDB
}

func (s *MockSQLStore) Mock() sqlmock.Sqlmock {
	return s.mock
}
