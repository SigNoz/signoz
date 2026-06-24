package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addIntegrationDashboard struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddIntegrationDashboardFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_integration_dashboard"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addIntegrationDashboard{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (m *addIntegrationDashboard) Register(migrations *migrate.Migrations) error {
	return migrations.Register(m.Up, m.Down)
}

func (m *addIntegrationDashboard) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	sqls := m.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "integration_dashboard",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "dashboard_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "provider", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "slug", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{
			ColumnNames: []sqlschema.ColumnName{"id"},
		},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("dashboard_id"),
				ReferencedTableName:   sqlschema.TableName("dashboard"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})
	sqls = append(sqls, m.sqlschema.Operator().CreateIndex(
		&sqlschema.UniqueIndex{
			TableName:   "integration_dashboard",
			ColumnNames: []sqlschema.ColumnName{"dashboard_id"},
		},
	)...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (m *addIntegrationDashboard) Down(context.Context, *bun.DB) error {
	return nil
}
