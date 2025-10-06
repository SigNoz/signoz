package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addCascadeDeletePlannedMaintenanceRule struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddCascadeDeletePlannedMaintenanceRuleFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_cascade_delete_planned_maintenance_rule"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return newAddCascadeDeletePlannedMaintenanceRule(ctx, providerSettings, config, sqlstore, sqlschema)
	})
}

func newAddCascadeDeletePlannedMaintenanceRule(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addCascadeDeletePlannedMaintenanceRule{
		sqlstore:  sqlstore,
		sqlschema: sqlschema,
	}, nil
}

func (migration *addCascadeDeletePlannedMaintenanceRule) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addCascadeDeletePlannedMaintenanceRule) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("planned_maintenance_rule"))
	if err != nil {
		return err
	}
	fmter := migration.sqlschema.Formatter()
	newTable := table.Clone()

	// Generate SQL to recreate the table with ON DELETE CASCADE
	sqls := [][]byte{}

	// Create temporary table name
	tempTableName := sqlschema.TableName("planned_maintenance_rule__temp")
	tempTable := newTable
	tempTable.Name = tempTableName

	// Build CREATE TABLE statement manually with ON DELETE CASCADE
	createSQL := []byte("CREATE TABLE ")
	createSQL = fmter.AppendIdent(createSQL, string(tempTableName))
	createSQL = append(createSQL, " ("...)

	// Add columns
	for i, column := range tempTable.Columns {
		if i > 0 {
			createSQL = append(createSQL, ", "...)
		}
		createSQL = append(createSQL, column.ToDefinitionSQL(fmter)...)
	}

	// Add primary key constraint
	if tempTable.PrimaryKeyConstraint != nil {
		createSQL = append(createSQL, ", "...)
		createSQL = append(createSQL, tempTable.PrimaryKeyConstraint.ToDefinitionSQL(fmter, tempTable.Name)...)
	}

	// Add foreign key constraints with ON DELETE CASCADE
	for _, fk := range tempTable.ForeignKeyConstraints {
		createSQL = append(createSQL, ", CONSTRAINT "...)
		createSQL = fmter.AppendIdent(createSQL, fk.Name(table.Name))
		createSQL = append(createSQL, " FOREIGN KEY ("...)
		createSQL = fmter.AppendIdent(createSQL, string(fk.ReferencingColumnName))
		createSQL = append(createSQL, ") REFERENCES "...)
		createSQL = fmter.AppendIdent(createSQL, string(fk.ReferencedTableName))
		createSQL = append(createSQL, " ("...)
		createSQL = fmter.AppendIdent(createSQL, string(fk.ReferencedColumnName))
		createSQL = append(createSQL, ")"...)

		// Add ON DELETE CASCADE for all foreign keys
		createSQL = append(createSQL, " ON DELETE CASCADE"...)

		// Add ON UPDATE CASCADE for planned_maintenance_id
		if fk.ReferencingColumnName == sqlschema.ColumnName("planned_maintenance_id") {
			createSQL = append(createSQL, " ON UPDATE CASCADE"...)
		}
	}

	createSQL = append(createSQL, ")"...)
	sqls = append(sqls, createSQL)

	// INSERT data from old table to temp table
	insertSQL := []byte("INSERT INTO ")
	insertSQL = fmter.AppendIdent(insertSQL, string(tempTableName))
	insertSQL = append(insertSQL, " ("...)
	for i, column := range table.Columns {
		if i > 0 {
			insertSQL = append(insertSQL, ", "...)
		}
		insertSQL = fmter.AppendIdent(insertSQL, string(column.Name))
	}
	insertSQL = append(insertSQL, ") SELECT "...)
	for i, column := range table.Columns {
		if i > 0 {
			insertSQL = append(insertSQL, ", "...)
		}
		insertSQL = fmter.AppendIdent(insertSQL, string(column.Name))
	}
	insertSQL = append(insertSQL, " FROM "...)
	insertSQL = fmter.AppendIdent(insertSQL, string(table.Name))
	sqls = append(sqls, insertSQL)

	// DROP old table
	sqls = append(sqls, table.ToDropSQL(fmter))

	// RENAME temp table to original name
	sqls = append(sqls, tempTable.ToRenameSQL(fmter, table.Name))

	// Execute all SQL statements
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// Use uniqueConstraints to avoid unused variable warning
	_ = uniqueConstraints

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addCascadeDeletePlannedMaintenanceRule) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
