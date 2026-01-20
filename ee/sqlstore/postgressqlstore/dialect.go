package postgressqlstore

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
	Integer  = "bigint"
	Text     = "text"
)

var (
	Org                = "org"
	User               = "user"
	UserNoCascade      = "user_no_cascade"
	FactorPassword     = "factor_password"
	CloudIntegration   = "cloud_integration"
	AgentConfigVersion = "agent_config_version"
)

var (
	OrgReference                = `("org_id") REFERENCES "organizations" ("id")`
	UserReference               = `("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`
	UserReferenceNoCascade      = `("user_id") REFERENCES "users" ("id")`
	FactorPasswordReference     = `("password_id") REFERENCES "factor_password" ("id")`
	CloudIntegrationReference   = `("cloud_integration_id") REFERENCES "cloud_integration" ("id") ON DELETE CASCADE`
	AgentConfigVersionReference = `("version_id") REFERENCES "agent_config_version" ("id")`
)

type dialect struct{}

func (dialect *dialect) IntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnType, err := dialect.GetColumnType(ctx, bun, table, column)
	if err != nil {
		return err
	}

	// bigint for postgres and INTEGER for sqlite
	if columnType != "bigint" {
		return nil
	}

	// if the columns is integer then do this
	if _, err := bun.
		ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
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

	if _, err := bun.
		NewUpdate().
		Table(table).
		Set(column + " = to_timestamp(cast(" + column + "_old as INTEGER))").
		Where("1=1").
		Exec(ctx); err != nil {
		return err
	}

	// drop old column
	if _, err := bun.
		NewDropColumn().
		Table(table).
		Column(column + "_old").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (dialect *dialect) IntToBoolean(ctx context.Context, bun bun.IDB, table string, column string) error {
	columnExists, err := dialect.ColumnExists(ctx, bun, table, column)
	if err != nil {
		return err
	}
	if !columnExists {
		return nil
	}

	columnType, err := dialect.GetColumnType(ctx, bun, table, column)
	if err != nil {
		return err
	}

	if columnType != "bigint" {
		return nil
	}

	if _, err := bun.
		ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new boolean column
	if _, err := bun.
		NewAddColumn().
		Table(table).
		ColumnExpr(column + " BOOLEAN").
		Exec(ctx); err != nil {
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

func (dialect *dialect) GetColumnType(ctx context.Context, bun bun.IDB, table string, column string) (string, error) {
	var columnType string

	err := bun.NewSelect().
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

func (dialect *dialect) ColumnExists(ctx context.Context, bun bun.IDB, table string, column string) (bool, error) {
	var count int
	err := bun.NewSelect().
		ColumnExpr("COUNT(*)").
		TableExpr("information_schema.columns").
		Where("table_name = ?", table).
		Where("column_name = ?", column).
		Scan(ctx, &count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (dialect *dialect) AddColumn(ctx context.Context, bun bun.IDB, table string, column string, columnExpr string) error {
	exists, err := dialect.ColumnExists(ctx, bun, table, column)
	if err != nil {
		return err
	}
	if !exists {
		_, err = bun.
			NewAddColumn().
			Table(table).
			ColumnExpr(column + " " + columnExpr).
			Exec(ctx)
		if err != nil {
			return err
		}

	}

	return nil
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

	if newColumnExists {
		return true, nil
	}

	if !oldColumnExists {
		return false, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "old column: %s doesn't exist", oldColumnName)
	}

	_, err = bun.
		ExecContext(ctx, "ALTER TABLE "+table+" RENAME COLUMN "+oldColumnName+" TO "+newColumnName)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (dialect *dialect) DropColumn(ctx context.Context, bun bun.IDB, table string, column string) error {
	exists, err := dialect.ColumnExists(ctx, bun, table, column)
	if err != nil {
		return err
	}
	if exists {
		_, err = bun.
			NewDropColumn().
			Table(table).
			Column(column).
			Exec(ctx)
		if err != nil {
			return err
		}

	}

	return nil
}

func (dialect *dialect) TableExists(ctx context.Context, bun bun.IDB, table interface{}) (bool, error) {

	count := 0
	err := bun.
		NewSelect().
		ColumnExpr("count(*)").
		Table("pg_catalog.pg_tables").
		Where("tablename = ?", bun.Dialect().Tables().Get(reflect.TypeOf(table)).Name).
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
		} else if reference == UserNoCascade && !slices.Contains(fkReferences, UserReferenceNoCascade) {
			fkReferences = append(fkReferences, UserReferenceNoCascade)
		} else if reference == FactorPassword && !slices.Contains(fkReferences, FactorPasswordReference) {
			fkReferences = append(fkReferences, FactorPasswordReference)
		} else if reference == CloudIntegration && !slices.Contains(fkReferences, CloudIntegrationReference) {
			fkReferences = append(fkReferences, CloudIntegrationReference)
		} else if reference == AgentConfigVersion && !slices.Contains(fkReferences, AgentConfigVersionReference) {
			fkReferences = append(fkReferences, AgentConfigVersionReference)
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
	query := fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET DEFAULT %s, ALTER COLUMN %s SET NOT NULL", table, column, defaultValue, column)
	if _, err := bun.ExecContext(ctx, query); err != nil {
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

func (dialect *dialect) DropColumnWithForeignKeyConstraint(ctx context.Context, bunIDB bun.IDB, model interface{}, column string) error {
	existingTable := bunIDB.Dialect().Tables().Get(reflect.TypeOf(model))
	columnExists, err := dialect.ColumnExists(ctx, bunIDB, existingTable.Name, column)
	if err != nil {
		return err
	}

	if !columnExists {
		return nil
	}

	_, err = bunIDB.
		NewDropColumn().
		Model(model).
		Column(column).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}
