package sqlitesqlstore

import (
	"context"
	"fmt"
	"reflect"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"
)

const (
	Identity string = "id"
	Integer  string = "INTEGER"
	Text     string = "TEXT"
)

const (
	Org                string = "org"
	User               string = "user"
	UserNoCascade      string = "user_no_cascade"
	FactorPassword     string = "factor_password"
	CloudIntegration   string = "cloud_integration"
	AgentConfigVersion string = "agent_config_version"
)

const (
	OrgReference                string = `("org_id") REFERENCES "organizations" ("id")`
	UserReference               string = `("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`
	UserNoCascadeReference      string = `("user_id") REFERENCES "users" ("id")`
	FactorPasswordReference     string = `("password_id") REFERENCES "factor_password" ("id")`
	CloudIntegrationReference   string = `("cloud_integration_id") REFERENCES "cloud_integration" ("id") ON DELETE CASCADE`
	AgentConfigVersionReference string = `("version_id") REFERENCES "agent_config_version" ("id")`
)

const (
	OrgField string = "org_id"
)

type dialect struct{}

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

func (dialect *dialect) IntToTimestamp(ctx context.Context, bun bun.IDB, table string, column string) error {
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

func (dialect *dialect) DropColumnWithForeignKeyConstraint(ctx context.Context, bunIDB bun.IDB, model interface{}, column string) error {
	var isForeignKeyEnabled bool
	if err := bunIDB.QueryRowContext(ctx, "PRAGMA foreign_keys").Scan(&isForeignKeyEnabled); err != nil {
		return err
	}

	if isForeignKeyEnabled {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "foreign keys are enabled, please disable them before running this migration")
	}

	existingTable := bunIDB.Dialect().Tables().Get(reflect.TypeOf(model))
	columnExists, err := dialect.ColumnExists(ctx, bunIDB, existingTable.Name, column)
	if err != nil {
		return err
	}

	if !columnExists {
		return nil
	}

	newTableName := existingTable.Name + "_tmp"

	// Create the newTmpTable query
	createTableQuery := bunIDB.NewCreateTable().Model(model).ModelTableExpr(newTableName)

	var columnNames []string

	for _, field := range existingTable.Fields {
		if field.Name != column {
			columnNames = append(columnNames, string(field.SQLName))
		}

		if field.Name == OrgField {
			createTableQuery = createTableQuery.ForeignKey(OrgReference)
		}
	}

	if _, err = createTableQuery.Exec(ctx); err != nil {
		return err
	}

	// Copy data from old table to new table
	if _, err := bunIDB.ExecContext(ctx, fmt.Sprintf("INSERT INTO %s SELECT %s FROM %s", newTableName, strings.Join(columnNames, ", "), existingTable.Name)); err != nil {
		return err
	}

	_, err = bunIDB.NewDropTable().Table(existingTable.Name).Exec(ctx)
	if err != nil {
		return err
	}

	_, err = bunIDB.ExecContext(ctx, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", newTableName, existingTable.Name))
	if err != nil {
		return err
	}

	return nil
}

func (dialect *dialect) ToggleForeignKeyConstraint(ctx context.Context, bun *bun.DB, enable bool) error {
	if enable {
		_, err := bun.ExecContext(ctx, "PRAGMA foreign_keys = ON")
		return err
	}

	_, err := bun.ExecContext(ctx, "PRAGMA foreign_keys = OFF")
	return err
}
