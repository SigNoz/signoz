package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addPublicDashboards struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddPublicDashboardsFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_public_dashboards"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newAddPublicDashboards(ctx, ps, c, sqlstore, sqlschema)
	})
}

func newAddPublicDashboards(_ context.Context, _ factory.ProviderSettings, _ Config, sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) (SQLMigration, error) {
	return &addPublicDashboards{sqlstore: sqlstore, sqlschema: sqlschema}, nil
}

func (migration *addPublicDashboards) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addPublicDashboards) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	sqls := [][]byte{}
	tableSQL := migration.sqlschema.Operator().CreateTable(&sqlschema.Table{
		Name: "public_dashboard",
		Columns: []*sqlschema.Column{
			{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "time_range_enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false},
			{Name: "default_time_range", DataType: sqlschema.DataTypeText, Nullable: false},
			{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			{Name: "dashboard_id", DataType: sqlschema.DataTypeText, Nullable: false},
		},
		PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
		ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
			{ReferencingColumnName: sqlschema.ColumnName("dashboard_id"), ReferencedTableName: sqlschema.TableName("dashboard"), ReferencedColumnName: sqlschema.ColumnName("id")},
		},
	})
	sqls = append(sqls, tableSQL...)

	indexSQL := migration.sqlschema.Operator().CreateIndex(&sqlschema.UniqueIndex{
		TableName:   "public_dashboard",
		ColumnNames: []sqlschema.ColumnName{"dashboard_id"},
	})
	sqls = append(sqls, indexSQL...)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *addPublicDashboards) Down(_ context.Context, _ *bun.DB) error {
	return nil
}
