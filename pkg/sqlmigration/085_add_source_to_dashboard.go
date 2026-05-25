package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addSourceToDashboard struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddSourceToDashboardFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_source_to_dashboard"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addSourceToDashboard{sqlstore: sqlstore, sqlschema: sqlschema}, nil
		},
	)
}

func (migration *addSourceToDashboard) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *addSourceToDashboard) Up(ctx context.Context, db *bun.DB) error {
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

	sourceColumn := &sqlschema.Column{
		Name:     sqlschema.ColumnName("source"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	// backfill existing rows with 'user' before the NOT NULL flip.
	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, sourceColumn, "user")

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

func (migration *addSourceToDashboard) Down(context.Context, *bun.DB) error {
	return nil
}
