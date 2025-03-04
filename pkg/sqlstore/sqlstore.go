package sqlstore

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
	"github.com/uptrace/bun"
)

// SQLStore is the interface for the SQLStore.
type SQLStore interface {
	// SQLDB returns the underlying sql.DB.
	SQLDB() *sql.DB
	// BunDB returns an instance of bun.DB. This is the recommended way to interact with the database.
	BunDB() *bun.DB
	// SQLxDB returns an instance of sqlx.DB.
	SQLxDB() *sqlx.DB
	// Returns the dialect of the database.
	Dialect() SQLDialect
}

type SQLStoreHook interface {
	bun.QueryHook
}

type SQLDialect interface {
	MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error
	MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error
	GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error)
	ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error)
}
