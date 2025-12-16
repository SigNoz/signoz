package mysqlsqlstore

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"
)

type dialect struct{}

func (d *dialect) GetColumnType(ctx context.Context, db bun.IDB, table string, column string) (string, error) {
	var columnType string

	err := db.
		NewSelect().
		ColumnExpr("DATA_TYPE").
		TableExpr("INFORMATION_SCHEMA.COLUMNS").
		Where("TABLE_NAME = ?", table).
		Where("COLUMN_NAME = ?", column).
		Scan(ctx, &columnType)
	if err != nil {
		return "", err
	}

	return columnType, nil
}

func (d *dialect) IntToTimestamp(ctx context.Context, db bun.IDB, table string, column string) error {
	columnType, err := d.GetColumnType(ctx, db, table, column)
	if err != nil {
		return err
	}

	if columnType != "bigint" && columnType != "int" && columnType != "integer" {
		return nil
	}

	// rename original column
	if _, err := db.ExecContext(ctx, "ALTER TABLE "+table+" RENAME COLUMN "+column+" TO "+column+"_old"); err != nil {
		return err
	}

	// add new timestamp column
	if _, err := db.
		NewAddColumn().
		Table(table).
		ColumnExpr(column + " TIMESTAMP").
		Exec(ctx); err != nil {
		return err
	}

	// copy data converting from unix timestamp to TIMESTAMP
	if _, err := db.
		NewUpdate().
		Table(table).
		Set(column + " = FROM_UNIXTIME(" + column + "_old)").
		Where("1=1").
		Exec(ctx); err != nil {
		return err
	}

	// drop old column
	if _, err := db.
		NewDropColumn().
		Table(table).
		Column(column + "_old").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (d *dialect) IntToBoolean(ctx context.Context, db bun.IDB, table string, column string) error {
	columnExists, err := d.ColumnExists(ctx, db, table, column)
	if err != nil {
		return err
	}
	if !columnExists {
		return nil
	}

	columnType, err := d.GetColumnType(ctx, db, table, column)
	if err != nil {
		return err
	}

	if columnType != "bigint" && columnType != "int" && columnType != "integer" {
		return nil
	}

	if _, err := db.ExecContext(ctx, "ALTER TABLE "+table+" RENAME COLUMN "+column+" TO "+column+"_old"); err != nil {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table(table).
		ColumnExpr(column + " BOOLEAN").
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.
		NewUpdate().
		Table(table).
		Set(column + " = CASE WHEN "+column+"_old = 1 THEN TRUE ELSE FALSE END").
		Where("1=1").
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.
		NewDropColumn().
		Table(table).
		Column(column + "_old").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (d *dialect) AddNotNullDefaultToColumn(ctx context.Context, db bun.IDB, table string, column string, columnType string, defaultValue string) error {
	_, err := db.ExecContext(ctx, "ALTER TABLE "+table+" MODIFY "+column+" "+columnType+" NOT NULL DEFAULT "+defaultValue)
	return err
}

func (d *dialect) ColumnExists(ctx context.Context, db bun.IDB, table string, column string) (bool, error) {
	var count int
	err := db.NewSelect().
		ColumnExpr("COUNT(*)").
		TableExpr("INFORMATION_SCHEMA.COLUMNS").
		Where("TABLE_NAME = ?", table).
		Where("COLUMN_NAME = ?", column).
		Scan(ctx, &count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (d *dialect) AddColumn(ctx context.Context, db bun.IDB, table string, column string, columnExpr string) error {
	exists, err := d.ColumnExists(ctx, db, table, column)
	if err != nil {
		return err
	}
	if !exists {
		if _, err := db.
			NewAddColumn().
			Table(table).
			ColumnExpr(column + " " + columnExpr).
			Exec(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (d *dialect) DropColumn(ctx context.Context, db bun.IDB, table string, column string) error {
	exists, err := d.ColumnExists(ctx, db, table, column)
	if err != nil {
		return err
	}
	if exists {
		if _, err := db.
			NewDropColumn().
			Table(table).
			Column(column).
			Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func (d *dialect) RenameColumn(ctx context.Context, db bun.IDB, table string, oldColumnName string, newColumnName string) (bool, error) {
	oldExists, err := d.ColumnExists(ctx, db, table, oldColumnName)
	if err != nil {
		return false, err
	}
	newExists, err := d.ColumnExists(ctx, db, table, newColumnName)
	if err != nil {
		return false, err
	}

	if newExists {
		return true, nil
	}
	if !oldExists {
		return false, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "old column: %s does not exist", oldColumnName)
	}

	if _, err := db.ExecContext(ctx, "ALTER TABLE "+table+" RENAME COLUMN "+oldColumnName+" TO "+newColumnName); err != nil {
		return false, err
	}

	return true, nil
}

func (d *dialect) RenameTableAndModifyModel(ctx context.Context, db bun.IDB, oldModel interface{}, newModel interface{}, references []string, cb func(context.Context) error) error {
	// For MySQL initial support, reuse the generic migration callback and rely on cb to perform model-specific operations.
	if len(references) == 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}

	return cb(ctx)
}

func (d *dialect) UpdatePrimaryKey(ctx context.Context, db bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	// For initial MySQL support, delegate details to callback to keep implementation minimal.
	return cb(ctx)
}

func (d *dialect) AddPrimaryKey(ctx context.Context, db bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	// For initial MySQL support, delegate details to callback to keep implementation minimal.
	return cb(ctx)
}

func (d *dialect) DropColumnWithForeignKeyConstraint(ctx context.Context, db bun.IDB, model interface{}, column string) error {
	// Minimal implementation: attempt to drop the column; MySQL will enforce FK constraints.
	_, err := db.
		NewDropColumn().
		Model(model).
		Column(column).
		Exec(ctx)
	return err
}

func (d *dialect) TableExists(ctx context.Context, db bun.IDB, table interface{}) (bool, error) {
	// Use bun's schema metadata to resolve table name.
	tableName := db.Dialect().Tables().Get(reflect.TypeOf(table)).Name

	var count int
	err := db.NewSelect().
		ColumnExpr("COUNT(*)").
		TableExpr("INFORMATION_SCHEMA.TABLES").
		Where("TABLE_NAME = ?", tableName).
		Scan(ctx, &count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (d *dialect) ToggleForeignKeyConstraint(ctx context.Context, db *bun.DB, enable bool) error {
	// MySQL does not require toggling foreign key constraints for the same scenarios as sqlite; no-op.
	return nil
}


