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
	// Returns the type of the column for the given table and column.
	GetColumnType(context.Context, bun.IDB, string, string) (string, error)

	// Migrates an integer column to a timestamp column for the given table and column.
	IntToTimestamp(context.Context, bun.IDB, string, string) error

	// Migrates an integer column to a boolean column for the given table and column.
	IntToBoolean(context.Context, bun.IDB, string, string) error

	// Adds a not null default to the given column for the given table, column, columnType and defaultValue.
	AddNotNullDefaultToColumn(context.Context, bun.IDB, string, string, string, string) error

	// Checks if a column exists in a table for the given table and column.
	ColumnExists(context.Context, bun.IDB, string, string) (bool, error)

	// Adds a column to a table for the given table, column and columnType.
	AddColumn(context.Context, bun.IDB, string, string, string) error

	// Drops a column from a table for the given table and column.
	DropColumn(context.Context, bun.IDB, string, string) error

	// Renames a column in a table for the given table, old column name and new column name.
	RenameColumn(context.Context, bun.IDB, string, string, string) (bool, error)

	// Renames a table and modifies the given model for the given table, old model, new model, references and callback. The old model
	// and new model must inherit bun.BaseModel.
	RenameTableAndModifyModel(context.Context, bun.IDB, interface{}, interface{}, []string, func(context.Context) error) error

	// Updates the primary key for the given table, old model, new model, reference and callback. The old model and new model
	// must inherit bun.BaseModel.
	UpdatePrimaryKey(context.Context, bun.IDB, interface{}, interface{}, string, func(context.Context) error) error

	// Adds a primary key to the given table, old model, new model, reference and callback. The old model and new model
	// must inherit bun.BaseModel.
	AddPrimaryKey(context.Context, bun.IDB, interface{}, interface{}, string, func(context.Context) error) error

	// Drops the column and the associated foreign key constraint for the given table and column.
	DropColumnWithForeignKeyConstraint(context.Context, bun.IDB, interface{}, string) error
}
