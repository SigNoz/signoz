package sqlite

import (
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.uber.org/zap"
)

type provider struct {
	sqlDB  *sql.DB
	bunDB  *bun.DB
	sqlxDB *sqlx.DB
}

func New(config sqlstore.Config, providerConfig sqlstore.ProviderConfig) (sqlstore.Provider, error) {
	if config.Provider != "sqlite" {
		return nil, fmt.Errorf("provider %q is not supported by sqlite", config.Provider)
	}

	sqlDB, err := sql.Open("sqlite3", "file:"+config.Sqlite.Path)
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(config.Sqlite.MaxOpenConns)
	bunDB := bun.NewDB(sqlDB, sqlitedialect.New())

	providerConfig.Logger.Info("connected to sqlite", zap.String("path", config.Sqlite.Path+"?_foreign_keys=true"))

	// enable foreign key support
	if _, err := bunDB.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		return nil, err
	}
	providerConfig.Logger.Info("enabled foreign key support in sqlite", zap.String("path", config.Sqlite.Path))

	sqlxDB := sqlx.NewDb(sqlDB, "sqlite3")

	return &provider{
		sqlDB:  sqlDB,
		bunDB:  bunDB,
		sqlxDB: sqlxDB,
	}, nil
}

func (e *provider) BunDB() *bun.DB {
	return e.bunDB
}

func (e *provider) SqlDB() *sql.DB {
	return e.sqlDB
}

func (e *provider) SqlxDB() *sqlx.DB {
	return e.sqlxDB
}
