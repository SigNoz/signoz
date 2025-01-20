package sqlmigrator

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

// SQLMigrator is the interface for the SQLMigrator.
type SQLMigrator interface {
	// Migrate migrates the database. Migrate acquires a lock on the database and runs the migrations.
	Migrate(context.Context) error
	// Rollback rolls back the database. Rollback acquires a lock on the database and rolls back the migrations.
	Rollback(context.Context) error
}

// SQLMigration is the interface for a single migration.
type SQLMigration interface {
	// Register registers the migration with the given migrations. Each migration needs to be registered
	//in a dedicated `*.go` file so that the correct migration semantics can be detected.
	Register(*migrate.Migrations) error
	// Up runs the migration.
	Up(context.Context, *bun.DB) error
	// Down rolls back the migration.
	Down(context.Context, *bun.DB) error
}
