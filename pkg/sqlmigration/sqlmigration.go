package sqlmigration

import (
	"context"
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

func GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	var columnType string
	var err error

	if bun.Dialect().Name() == dialect.SQLite {
		err = bun.NewSelect().
			ColumnExpr("type").
			TableExpr("pragma_table_info(?)", table).
			Where("name = ?", column).
			Scan(ctx, &columnType)
	} else {
		err = bun.NewSelect().
			ColumnExpr("data_type").
			TableExpr("information_schema.columns").
			Where("table_name = ?", table).
			Where("column_name = ?", column).
			Scan(ctx, &columnType)
	}

	if err != nil {
		return "", err
	}

	return columnType, nil
}
