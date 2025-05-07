package sqlstore

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/schema"
)

type transactorKey struct{}

type BunDB struct {
	*bun.DB
	settings factory.ScopedProviderSettings
}

func NewBunDB(settings factory.ScopedProviderSettings, sqldb *sql.DB, dialect schema.Dialect, hooks []SQLStoreHook, opts ...bun.DBOption) *BunDB {
	db := bun.NewDB(sqldb, dialect, opts...)

	for _, hook := range hooks {
		db.AddQueryHook(hook)
	}

	return &BunDB{db, settings}
}

func (db *BunDB) RunInTxCtx(ctx context.Context, opts *sql.TxOptions, cb func(ctx context.Context) error) error {
	tx, ok := txFromContext(ctx)
	if ok {
		return cb(ctx)
	}

	// begin transaction
	tx, err := db.BeginTx(ctx, opts)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "cannot begin transaction")
	}

	defer func() {
		if err := tx.Rollback(); err != nil {
			if err != sql.ErrTxDone {
				db.settings.Logger().ErrorContext(ctx, "cannot rollback transaction", "error", err)
			}
		}
	}()

	if err := cb(newContextWithTx(ctx, tx)); err != nil {
		return err
	}

	return tx.Commit()
}

func (db *BunDB) BunDBCtx(ctx context.Context) bun.IDB {
	tx, ok := txFromContext(ctx)
	if !ok {
		return db.DB
	}
	return tx
}

func newContextWithTx(ctx context.Context, tx bun.Tx) context.Context {
	return context.WithValue(ctx, transactorKey{}, tx)
}

func txFromContext(ctx context.Context) (bun.Tx, bool) {
	tx, ok := ctx.Value(transactorKey{}).(bun.Tx)
	return tx, ok
}
