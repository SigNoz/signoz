package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type recreateUserDashboardPreference struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewRecreateUserDashboardPreferenceFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("recreate_user_dashboard_pref"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &recreateUserDashboardPreference{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *recreateUserDashboardPreference) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

// Up replaces the composite (user_id, dashboard_id) primary key with a surrogate
// id primary key, demotes the pair to a unique index, and adds created_at /
// updated_at. The table is dropped and recreated since it carries no data yet.
func (migration *recreateUserDashboardPreference) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	sqls := migration.sqlschema.Operator().DropTable(&sqlschema.Table{Name: "user_dashboard_preference"})

	sqls = append(sqls, migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "user_dashboard_preference",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "user_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "dashboard_id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "is_pinned", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "false"},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
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
	})...)

	sqls = append(sqls, migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "user_dashboard_preference",
		ColumnNames: []sqlschema.ColumnName{"user_id", "dashboard_id"},
	})...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *recreateUserDashboardPreference) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
