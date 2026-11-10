package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addUserDashboardPreference struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddUserDashboardPreferenceFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_user_dashboard_preference"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addUserDashboardPreference{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *addUserDashboardPreference) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addUserDashboardPreference) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	sqls := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "user_dashboard_preference",
		Columns: []*sqlschema.Column{
			{Name: "user_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "dashboard_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "is_pinned", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "false"},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"user_id", "dashboard_id"}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{
				ReferencingColumnName: sqlschema.ColumnName("user_id"),
				ReferencedTableName:   sqlschema.TableName("users"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
			{
				ReferencingColumnName: sqlschema.ColumnName("dashboard_id"),
				ReferencedTableName:   sqlschema.TableName("dashboard"),
				ReferencedColumnName:  sqlschema.ColumnName("id"),
			},
		},
	})

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addUserDashboardPreference) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
