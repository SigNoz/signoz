package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addSystemDashboard struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddSystemDashboardFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_system_dashboard"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addSystemDashboard{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (migration *addSystemDashboard) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addSystemDashboard) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	sqls := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "system_dashboard",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "dashboard_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "version", DataType: sqlschema.DataTypeBigInt, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("org_id"),
				ReferencedTableName:   sqlschema.TableName("organizations"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
			{
				ReferencingColumnName: sqlschema.ColumnName("dashboard_id"),
				ReferencedTableName:   sqlschema.TableName("dashboard"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})

	// (org_id, name) is what makes provisioning safe across replicas: the state
	// row is written in the same transaction as the dashboard, so a losing racer
	// rolls back its dashboard too.
	sqls = append(sqls, migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "system_dashboard",
			ColumnNames: []sqlschema.ColumnName{"org_id", "name"},
		},
	)...)
	sqls = append(sqls, migration.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "system_dashboard",
			ColumnNames: []sqlschema.ColumnName{"dashboard_id"},
		},
	)...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addSystemDashboard) Down(context.Context, *bun.DB) error {
	return nil
}
