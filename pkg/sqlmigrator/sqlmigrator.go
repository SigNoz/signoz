package sqlmigrator

import (
	"context"
)

// SQLMigrator is the interface for the SQLMigrator.
type SQLMigrator interface {
	// Migrate migrates the database. Migrate acquires a lock on the database and runs the migrations.
	Migrate(context.Context) error
	// Rollback rolls back the database. Rollback acquires a lock on the database and rolls back the migrations.
	Rollback(context.Context) error
	// Check returns nil if the database is up to date and an error listing pending migrations otherwise.
	Check(context.Context) error
}
