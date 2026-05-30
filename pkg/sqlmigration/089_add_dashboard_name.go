package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addDashboardName struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddDashboardNameFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_dashboard_name"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addDashboardName{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (migration *addDashboardName) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addDashboardName) Up(ctx context.Context, db *bun.DB) error {
	// dashboard is referenced by public_dashboard and integration_dashboard;
	// FK enforcement must be off for the SQLite recreate-table fallback.
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

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("dashboard"))
	if err != nil {
		return err
	}

	nameColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("name"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	// Only v2 dashboards populate this column. Existing v1 rows are left with
	// the zero value (empty string) so v1 create/update paths can keep
	// inserting without a name.
	//
	// TODO: once v1 dashboards are migrated to v2 and every row has a real
	// name, a follow-up migration should add a unique index on
	// (org_id, name) to enforce per-org name uniqueness.
	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, nameColumn, nil)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
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

func (migration *addDashboardName) Down(context.Context, *bun.DB) error {
	return nil
}
