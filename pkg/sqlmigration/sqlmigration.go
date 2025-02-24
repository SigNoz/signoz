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

func MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := GetColumnType(ctx, bun, table, column)
	if err != nil {
		return err
	}

	// bigint for postgres and INTEGER for sqlite
	if columnType != "bigint" && columnType != "INTEGER" {
		return nil
	}

	// if the columns is integer then do this
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new timestamp column
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN `+column+` TIMESTAMP`); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int (unix timestamp) to timestamp
	if bun.Dialect().Name() == dialect.SQLite {
		if _, err := bun.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = datetime(`+column+`_old, 'unixepoch')`); err != nil {
			return err
		}
	} else {
		if _, err := bun.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = to_timestamp(cast(`+column+`_old as INTEGER))`); err != nil {
			return err
		}
	}

	// drop old column
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
		return err
	}

	return nil
}

func MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := GetColumnType(ctx, bun, table, column)
	if err != nil {
		return err
	}

	if columnType != "bigint" && columnType != "INTEGER" {
		return nil
	}

	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new boolean column
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN `+column+` BOOLEAN`); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int to boolean
	if _, err := bun.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = CASE WHEN `+column+`_old = 1 THEN true ELSE false END`); err != nil {
		return err
	}

	// drop old column
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
		return err
	}

	return nil
}
