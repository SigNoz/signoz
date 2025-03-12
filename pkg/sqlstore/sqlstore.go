package sqlstore

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
	"github.com/uptrace/bun"
)

type SQLStoreTxOptions = sql.TxOptions

type SQLStore interface {
	// SQLDB returns the underlying sql.DB.
	SQLDB() *sql.DB

	// BunDB returns an instance of bun.DB. This is the recommended way to interact with the database.
	BunDB() *bun.DB

	// SQLxDB returns an instance of sqlx.DB. This is the legacy ORM used.
	SQLxDB() *sqlx.DB

	// Returns the dialect of the database.
	Dialect() SQLDialect

	// RunInTxCtx runs the given callback in a transaction. It creates and injects a new context with the transaction.
	// If a transaction is present in the context, it will be used.
	RunInTxCtx(ctx context.Context, opts *SQLStoreTxOptions, cb func(ctx context.Context) error) error

	// BunDBCtx returns an instance of bun.IDB for the given context.
	// If a transaction is present in the context, it will be used. Otherwise, the default will be used.
	BunDBCtx(ctx context.Context) bun.IDB
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
