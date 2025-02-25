package postgressqlstore

import (
	"context"

	"github.com/uptrace/bun"
)

type PGDialect struct {
}

func (dialect *PGDialect) MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := dialect.GetColumnType(ctx, bun, table, column)
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

	if _, err := bun.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = to_timestamp(cast(`+column+`_old as INTEGER))`); err != nil {
		return err
	}

	// drop old column
	if _, err := bun.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
		return err
	}

	return nil
}

func (dialect *PGDialect) MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := dialect.GetColumnType(ctx, bun, table, column)
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

func (dialect *PGDialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	var columnType string
	var err error
	err = bun.NewSelect().
		ColumnExpr("data_type").
		TableExpr("information_schema.columns").
		Where("table_name = ?", table).
		Where("column_name = ?", column).
		Scan(ctx, &columnType)

	if err != nil {
		return "", err
	}

	return columnType, nil
}
