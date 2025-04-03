package sqlitesqlstore

import (
	"context"
	"fmt"
	"reflect"
	"slices"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"
)

var (
	Identity = "id"
	Integer  = "INTEGER"
	Text     = "TEXT"
)

var (
	Org  = "org"
	User = "user"
)

var (
	OrgReference  = `("org_id") REFERENCES "organizations" ("id")`
	UserReference = `("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`
)

type dialect struct {
}

func (dialect *dialect) MigrateIntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
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
	if _, err := bun.
		NewAddColumn().
		Table(table).
		ColumnExpr(column + " TIMESTAMP").
		Exec(ctx); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int (unix timestamp) to timestamp
	if _, err := bun.
		NewUpdate().
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

func (dialect *dialect) MigrateIntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
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
	if _, err := bun.
		NewUpdate().
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

func (dialect *dialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	var columnType string

	err := bun.
		NewSelect().
		ColumnExpr("type").
		TableExpr("pragma_table_info(?)", table).
		Where("name = ?", column).
		Scan(ctx, &columnType)
	if err != nil {
		return "", err
	}

	return columnType, nil
}

func (dialect *dialect) ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error) {
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

func (dialect *dialect) RenameColumn(ctx context.Context, bun bun.IDB, table string, oldColumnName string, newColumnName string) (bool, error) {
	oldColumnExists, err := dialect.ColumnExists(ctx, bun, table, oldColumnName)
	if err != nil {
		return false, err
	}

	newColumnExists, err := dialect.ColumnExists(ctx, bun, table, newColumnName)
	if err != nil {
		return false, err
	}

	if !oldColumnExists && newColumnExists {
		return true, nil
	}

	_, err = bun.
		ExecContext(ctx, "ALTER TABLE "+table+" RENAME COLUMN "+oldColumnName+" TO "+newColumnName)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (dialect *dialect) TableExists(ctx context.Context, bun bun.IDB, table interface{}) (bool, error) {

	count := 0
	err := bun.
		NewSelect().
		ColumnExpr("count(*)").
		Table("sqlite_master").
		Where("type = ?", "table").
		Where("name = ?", bun.Dialect().Tables().Get(reflect.TypeOf(table)).Name).
		Scan(ctx, &count)

	if err != nil {
		return false, err
	}

	if count == 0 {
		return false, nil
	}

	return true, nil
}

func (dialect *dialect) RenameTableAndModifyModel(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, references []string, cb func(context.Context) error) error {
	if len(references) == 0 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}
	exists, err := dialect.TableExists(ctx, bun, newModel)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	var fkReferences []string
	for _, reference := range references {
		if reference == Org && !slices.Contains(fkReferences, OrgReference) {
			fkReferences = append(fkReferences, OrgReference)
		} else if reference == User && !slices.Contains(fkReferences, UserReference) {
			fkReferences = append(fkReferences, UserReference)
		}
	}

	createTable := bun.
		NewCreateTable().
		IfNotExists().
		Model(newModel)

	for _, fk := range fkReferences {
		createTable = createTable.ForeignKey(fk)
	}

	_, err = createTable.Exec(ctx)
	if err != nil {
		return err
	}

	err = cb(ctx)
	if err != nil {
		return err
	}

	_, err = bun.
		NewDropTable().
		IfExists().
		Model(oldModel).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (dialect *dialect) AddNotNullDefaultToColumn(ctx context.Context, bun bun.IDB, table string, column, columnType, defaultValue string) error {
	if _, err := bun.NewAddColumn().Table(table).ColumnExpr(fmt.Sprintf("%s_new %s NOT NULL DEFAULT %s ", column, columnType, defaultValue)).Exec(ctx); err != nil {
		return err
	}

	if _, err := bun.NewUpdate().Table(table).Set(fmt.Sprintf("%s_new = %s", column, column)).Where("1=1").Exec(ctx); err != nil {
		return err
	}

	if _, err := bun.NewDropColumn().Table(table).ColumnExpr(column).Exec(ctx); err != nil {
		return err
	}

	if _, err := bun.ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s_new TO %s", table, column, column)); err != nil {
		return err
	}

	return nil
}

func (dialect *dialect) UpdatePrimaryKey(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	if reference == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}
	oldTableName := bun.Dialect().Tables().Get(reflect.TypeOf(oldModel)).Name
	newTableName := bun.Dialect().Tables().Get(reflect.TypeOf(newModel)).Name

	columnType, err := dialect.GetColumnType(ctx, bun, oldTableName, Identity)
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

	_, err = bun.
		NewCreateTable().
		IfNotExists().
		Model(newModel).
		ForeignKey(fkReference).
		Exec(ctx)

	if err != nil {
		return err
	}

	err = cb(ctx)
	if err != nil {
		return err
	}

	_, err = bun.
		NewDropTable().
		IfExists().
		Model(oldModel).
		Exec(ctx)
	if err != nil {
		return err
	}

	_, err = bun.
		ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", newTableName, oldTableName))
	if err != nil {
		return err
	}

	return nil
}

func (dialect *dialect) AddPrimaryKey(ctx context.Context, bun bun.IDB, oldModel interface{}, newModel interface{}, reference string, cb func(context.Context) error) error {
	if reference == "" {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "cannot run migration without reference")
	}
	oldTableName := bun.Dialect().Tables().Get(reflect.TypeOf(oldModel)).Name
	newTableName := bun.Dialect().Tables().Get(reflect.TypeOf(newModel)).Name

	identityExists, err := dialect.ColumnExists(ctx, bun, oldTableName, Identity)
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

	_, err = bun.
		NewCreateTable().
		IfNotExists().
		Model(newModel).
		ForeignKey(fkReference).
		Exec(ctx)

	if err != nil {
		return err
	}

	err = cb(ctx)
	if err != nil {
		return err
	}

	_, err = bun.
		NewDropTable().
		IfExists().
		Model(oldModel).
		Exec(ctx)
	if err != nil {
		return err
	}

	_, err = bun.
		ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", newTableName, oldTableName))
	if err != nil {
		return err
	}

	return nil
}
