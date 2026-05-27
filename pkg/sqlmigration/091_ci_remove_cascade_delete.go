package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type cloudIntegrationRemoveCascadeDelete struct {
	sqlschema sqlschema.SQLSchema
}

func NewCloudIntegrationRemoveCascadeDeleteFactory(sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("ci_remove_cascade_delete"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &cloudIntegrationRemoveCascadeDelete{sqlschema: sqlschema}, nil
		},
	)
}

func (migration *cloudIntegrationRemoveCascadeDelete) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *cloudIntegrationRemoveCascadeDelete) Up(ctx context.Context, db *bun.DB) error {
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

	oldTable, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("cloud_integration_service"))
	if err != nil {
		return err
	}

	newTable := *oldTable
	newTable.ForeignKeyConstraints = []*sqlschema.ForeignKeyConstraint{
		{
			ReferencingColumnName: sqlschema.ColumnName("cloud_integration_id"),
			ReferencedTableName:   sqlschema.TableName("cloud_integration"),
			ReferencedColumnName:  sqlschema.ColumnName("id"),
		},
	}

	sqls := migration.sqlschema.Operator().AlterTable(oldTable, uniqueConstraints, &newTable)

	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return migration.sqlschema.ToggleFKEnforcement(ctx, db, true)
}

func (migration *cloudIntegrationRemoveCascadeDelete) Down(context.Context, *bun.DB) error {
	return nil
}
