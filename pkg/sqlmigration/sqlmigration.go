package sqlmigration

import (
	"context"
	"database/sql"
	"errors"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

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

var (
	ErrNoExecute = errors.New("no execute")
)

func New(
	ctx context.Context,
	settings factory.ProviderSettings,
	config Config,
	factories factory.NamedMap[factory.ProviderFactory[SQLMigration, Config]],
) (*migrate.Migrations, error) {
	migrations := migrate.NewMigrations()

	for _, factory := range factories.GetInOrder() {
		migration, err := factory.New(ctx, settings, config)
		if err != nil {
			return nil, err
		}

		err = migration.Register(migrations)
		if err != nil {
			return nil, err
		}
	}

	return migrations, nil
}

func MustNew(
	ctx context.Context,
	settings factory.ProviderSettings,
	config Config,
	factories factory.NamedMap[factory.ProviderFactory[SQLMigration, Config]],
) *migrate.Migrations {
	migrations, err := New(ctx, settings, config, factories)
	if err != nil {
		panic(err)
	}
	return migrations
}

func WrapIfNotExists(ctx context.Context, db *bun.DB, table string, column string) func(q *bun.AddColumnQuery) *bun.AddColumnQuery {
	return func(q *bun.AddColumnQuery) *bun.AddColumnQuery {
		if db.Dialect().Name() != dialect.SQLite {
			return q.IfNotExists()
		}

		var result string
		err := db.
			NewSelect().
			ColumnExpr("name").
			Table("pragma_table_info").
			Where("arg = ?", table).
			Where("name = ?", column).
			Scan(ctx, &result)
		if err != nil {
			if err == sql.ErrNoRows {
				return q
			}
			return q.Err(err)
		}

		return q.Err(ErrNoExecute)
	}
}
