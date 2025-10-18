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
