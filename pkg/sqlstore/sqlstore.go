package sqlstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"
)

type SQLStoreTxOptions = sql.TxOptions

type SQLStore interface {
	// SQLDB returns the underlying sql.DB.
	SQLDB() *sql.DB

	// BunDB returns an instance of bun.DB. This is the recommended way to interact with the database.
	BunDB() *bun.DB

	// Returns the dialect of the database.
	Dialect() SQLDialect

	Formatter() SQLFormatter

	// RunInTxCtx runs the given callback in a transaction. It creates and injects a new context with the transaction.
	// If a transaction is present in the context, it will be used.
	RunInTxCtx(ctx context.Context, opts *SQLStoreTxOptions, cb func(ctx context.Context) error) error

	// BunDBCtx returns an instance of bun.IDB for the given context.
	// If a transaction is present in the context, it will be used. Otherwise, the default will be used.
	BunDBCtx(ctx context.Context) bun.IDB

	// WrapNotFoundErrf wraps the given error with the given message and returns it.
	WrapNotFoundErrf(err error, code errors.Code, format string, args ...any) error

	// WrapAlreadyExistsErrf wraps the given error with the given message and returns it.
	WrapAlreadyExistsErrf(err error, code errors.Code, format string, args ...any) error
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

	// Checks if a table exists.
	TableExists(ctx context.Context, bun bun.IDB, table interface{}) (bool, error)

	// Toggles foreign key constraint for the given database. This makes sense only for sqlite. This cannot take a transaction as an argument and needs to take the db
	// as an argument.
	ToggleForeignKeyConstraint(ctx context.Context, bun *bun.DB, enable bool) error
}

type SQLFormatter interface {
	// JSONExtractString takes a JSON path (e.g., "$.labels.severity")
	JSONExtractString(column, path string) []byte

	// JSONType used to determine the type of the value extracted from the path
	JSONType(column, path string) []byte

	// JSONIsArray used to check whether the value is array or not
	JSONIsArray(column, path string) []byte

	// JSONArrayElements returns query as well as columns alias to be used for select and where clause
	JSONArrayElements(column, path, alias string) ([]byte, []byte)

	// JSONArrayOfStrings returns query as well as columns alias to be used for select and where clause
	JSONArrayOfStrings(column, path, alias string) ([]byte, []byte)

	// JSONArrayAgg aggregates values into a JSON array
	JSONArrayAgg(expression string) []byte

	// JSONArrayLiteral creates a literal JSON array from the given string values
	JSONArrayLiteral(values ...string) []byte

	// JSONKeys return extracted key from json as well as alias to be used for select and where clause
	JSONKeys(column, path, alias string) ([]byte, []byte)

	// TextToJsonColumn converts a text column to JSON type
	TextToJsonColumn(column string) []byte

	// LowerExpression wraps any SQL expression with lower() function for case-insensitive operations
	LowerExpression(expression string) []byte
}
