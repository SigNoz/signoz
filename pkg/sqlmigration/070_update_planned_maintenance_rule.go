package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updatePlannedMaintenanceRule struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

type plannedMaintenanceRuleRow struct {
	bun.BaseModel `bun:"table:planned_maintenance_rule"`

	ID                   string `bun:"id"`
	PlannedMaintenanceID string `bun:"planned_maintenance_id"`
	RuleID               string `bun:"rule_id"`
}

func NewUpdatePlannedMaintenanceRuleFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("update_planned_maintenance_rule"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &updatePlannedMaintenanceRule{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *updatePlannedMaintenanceRule) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updatePlannedMaintenanceRule) Up(ctx context.Context, db *bun.DB) error {
	table, _, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("planned_maintenance_rule"))
	if err != nil {
		return err
	}

	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// Read all existing rows
	var rows []*plannedMaintenanceRuleRow
	err = tx.NewSelect().Model(&rows).Scan(ctx)
	if err != nil {
		return err
	}

	// Drop the existing table
	dropTableSQLs := migration.sqlschema.Operator().DropTable(table)
	for _, sql := range dropTableSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// Create the table fresh without CASCADE constraints
	newTable := &sqlschema.Table{
		Name: sqlschema.TableName("planned_maintenance_rule"),
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "planned_maintenance_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "rule_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: "planned_maintenance_id",
				ReferencedTableName:   "planned_maintenance",
				ReferencedColumnName:  "id",
			},
			{
				ReferencingColumnName: "rule_id",
				ReferencedTableName:   "rule",
				ReferencedColumnName:  "id",
			},
		},
	}

	createTableSQLs := migration.sqlschema.Operator().CreateTable(newTable)
	for _, sql := range createTableSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// Re-insert the data
	if len(rows) > 0 {
		_, err = tx.NewInsert().Model(&rows).Exec(ctx)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *updatePlannedMaintenanceRule) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
