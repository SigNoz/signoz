package sqlstore

import (
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
}

type SQLStoreHook interface {
	bun.QueryHook
}
