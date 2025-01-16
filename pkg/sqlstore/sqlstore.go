package sqlstore

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
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

// SQLStoreMigrator is the interface for the SQLStoreMigrator.
type SQLStoreMigrator interface {
	// Migrate migrates the database. Migrate acquires a lock on the database and runs the migrations.
	Migrate(ctx context.Context) error
	// Rollback rolls back the database. Rollback acquires a lock on the database and rolls back the migrations.
	Rollback(ctx context.Context) error
}

// SQLStoreMigration is the interface for defining a single migration.
type SQLStoreMigration interface {
	// Register registers the migration with the given migrations.
	// Register must be called by each migration implementation to ensure that the correct go filename is detected.
	Register(*migrate.Migrations) error
	// Up runs the migration.
	Up(context.Context, *bun.DB) error
	// Down rolls back the migration.
	Down(context.Context, *bun.DB) error
}
