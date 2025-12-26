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

	// Returns the formatter for the database.
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
