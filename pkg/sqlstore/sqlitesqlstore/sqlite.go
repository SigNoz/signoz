package sqlitesqlstore

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.uber.org/zap"
)

type provider struct {
	sqlDB  *sql.DB
	bunDB  *bun.DB
	sqlxDB *sqlx.DB
}

func NewFactory() factory.ProviderFactory[sqlstore.SQLStore, sqlstore.Config] {
	return factory.NewProviderFactory(factory.MustNewName("sqlite"), New)
}

func New(ctx context.Context, settings factory.ProviderSettings, config sqlstore.Config) (sqlstore.SQLStore, error) {
	if config.Provider != "sqlite" {
		return nil, fmt.Errorf("provider %q is not supported by sqlite", config.Provider)
	}

	sqlDB, err := sql.Open("sqlite3", "file:"+config.Sqlite.Path+"?_foreign_keys=true")
	if err != nil {
		return nil, err
	}

	settings.ZapLogger.Info("connected to sqlite", zap.String("path", config.Sqlite.Path))

	// Set connection options
	sqlDB.SetMaxOpenConns(config.Connection.MaxOpenConns)

	// Initialize ORMs
	bunDB := bun.NewDB(sqlDB, sqlitedialect.New())
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

func (e *provider) SQLDB() *sql.DB {
	return e.sqlDB
}

func (e *provider) SQLxDB() *sqlx.DB {
	return e.sqlxDB
}
