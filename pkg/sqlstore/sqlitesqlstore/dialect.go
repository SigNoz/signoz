package sqlitesqlstore

import (
	"context"

	"github.com/uptrace/bun"
)

type SQLiteDialect struct {
}

func (dialect *SQLiteDialect) MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := dialect.GetColumnType(ctx, bun, table, column)
	if err != nil {
		return err
	}

	if columnType != "INTEGER" {
		return nil
	}

	// if the columns is integer then do this
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new timestamp column
	if _, err := bun.NewAddColumn().Table(table).ColumnExpr(column + " TIMESTAMP").Exec(ctx); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int (unix timestamp) to timestamp
	if _, err := bun.NewUpdate().
		Table(table).
		Set(column + " = datetime(" + column + "_old, 'unixepoch')").
		Where("1=1").
		Exec(ctx); err != nil {
		return err
	}

	// drop old column
	if _, err := bun.NewDropColumn().Table(table).Column(column + "_old").Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (dialect *SQLiteDialect) MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := dialect.GetColumnType(ctx, bun, table, column)
	if err != nil {
		return err
	}

	if columnType != "INTEGER" {
		return nil
	}

	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new boolean column
	if _, err := bun.NewAddColumn().Table(table).ColumnExpr(column + " BOOLEAN").Exec(ctx); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int to boolean
	if _, err := bun.NewUpdate().
		Table(table).
		Set(column + " = CASE WHEN " + column + "_old = 1 THEN true ELSE false END").
		Where("1=1").
		Exec(ctx); err != nil {
		return err
	}

	// drop old column
	if _, err := bun.NewDropColumn().Table(table).Column(column + "_old").Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (dialect *SQLiteDialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	var columnType string
	var err error

	err = bun.NewSelect().
		ColumnExpr("type").
		TableExpr("pragma_table_info(?)", table).
		Where("name = ?", column).
		Scan(ctx, &columnType)

	if err != nil {
		return "", err
	}

	return columnType, nil
}

func (dialect *SQLiteDialect) ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error) {
	var count int
	err := bun.NewSelect().
		ColumnExpr("COUNT(*)").
		TableExpr("pragma_table_info(?)", table).
		Where("name = ?", column).
		Scan(ctx, &count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}
