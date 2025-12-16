package mysqlsqlstore

import (
	"context"
	"reflect"

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
		Where("TABLE_SCHEMA = DATABASE()").
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
		Where("TABLE_SCHEMA = DATABASE()").
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
	if len(references) == 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}

	exists, err := d.TableExists(ctx, db, newModel)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	// Collect foreign key references similar to sqlite/postgres implementation.
	var fkReferences []string
	for _, reference := range references {
		if reference == Org && !slices.Contains(fkReferences, OrgReference) {
			fkReferences = append(fkReferences, OrgReference)
		} else if reference == User && !slices.Contains(fkReferences, UserReference) {
			fkReferences = append(fkReferences, UserReference)
		} else if reference == UserNoCascade && !slices.Contains(fkReferences, UserNoCascadeReference) {
			fkReferences = append(fkReferences, UserNoCascadeReference)
		} else if reference == FactorPassword && !slices.Contains(fkReferences, FactorPasswordReference) {
			fkReferences = append(fkReferences, FactorPasswordReference)
		} else if reference == CloudIntegration && !slices.Contains(fkReferences, CloudIntegrationReference) {
			fkReferences = append(fkReferences, CloudIntegrationReference)
		} else if reference == AgentConfigVersion && !slices.Contains(fkReferences, AgentConfigVersionReference) {
			fkReferences = append(fkReferences, AgentConfigVersionReference)
		}
	}

	createTable := db.
		NewCreateTable().
		IfNotExists().
		Model(newModel)

	for _, fk := range fkReferences {
		createTable = createTable.ForeignKey(fk)
	}

	if _, err = createTable.Exec(ctx); err != nil {
		return err
	}

	if err := cb(ctx); err != nil {
		return err
	}

	if _, err = db.
		NewDropTable().
		IfExists().
		Model(oldModel).
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (d *dialect) UpdatePrimaryKey(ctx context.Context, db bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	if reference == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}
	oldTableName := db.Dialect().Tables().Get(reflect.TypeOf(oldModel)).Name
	newTableName := db.Dialect().Tables().Get(reflect.TypeOf(newModel)).Name

	columnType, err := d.GetColumnType(ctx, db, oldTableName, Identity)
	if err != nil {
		return err
	}
	if columnType == Text {
		return nil
	}

	fkReference := ""
	if reference == Org {
		fkReference = OrgReference
	} else if reference == User {
		fkReference = UserReference
	}

	if _, err = db.
		NewCreateTable().
		IfNotExists().
		Model(newModel).
		ForeignKey(fkReference).
		Exec(ctx); err != nil {
		return err
	}

	if err := cb(ctx); err != nil {
		return err
	}

	if _, err = db.
		NewDropTable().
		IfExists().
		Model(oldModel).
		Exec(ctx); err != nil {
		return err
	}

	if _, err = db.
		ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", newTableName, oldTableName)); err != nil {
		return err
	}

	return nil
}

func (d *dialect) AddPrimaryKey(ctx context.Context, db bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	if reference == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}
	oldTableName := db.Dialect().Tables().Get(reflect.TypeOf(oldModel)).Name
	newTableName := db.Dialect().Tables().Get(reflect.TypeOf(newModel)).Name

	identityExists, err := d.ColumnExists(ctx, db, oldTableName, Identity)
	if err != nil {
		return err
	}
	if identityExists {
		return nil
	}

	fkReference := ""
	if reference == Org {
		fkReference = OrgReference
	} else if reference == User {
		fkReference = UserReference
	}

	if _, err = db.
		NewCreateTable().
		IfNotExists().
		Model(newModel).
		ForeignKey(fkReference).
		Exec(ctx); err != nil {
		return err
	}

	if err := cb(ctx); err != nil {
		return err
	}

	if _, err = db.
		NewDropTable().
		IfExists().
		Model(oldModel).
		Exec(ctx); err != nil {
		return err
	}

	if _, err = db.
		ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", newTableName, oldTableName)); err != nil {
		return err
	}

	return nil
}

func (d *dialect) DropColumnWithForeignKeyConstraint(ctx context.Context, db bun.IDB, model interface{}, column string) error {
	existingTable := db.Dialect().Tables().Get(reflect.TypeOf(model))

	// Align with sqlite/postgres behavior: check for column existence first to keep migrations idempotent.
	columnExists, err := d.ColumnExists(ctx, db, existingTable.Name, column)
	if err != nil {
		return err
	}
	if !columnExists {
		return nil
	}

	_, err = db.
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
		Where("TABLE_SCHEMA = DATABASE()").
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


