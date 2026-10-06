package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type addPlannedMaintenanceOrigin struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddPlannedMaintenanceOriginFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(
		factory.MustNewName("add_planned_maintenance_origin"),
		func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
			return &addPlannedMaintenanceOrigin{
				sqlstore:  sqlstore,
				sqlschema: sqlschema,
			}, nil
		},
	)
}

func (migration *addPlannedMaintenanceOrigin) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addPlannedMaintenanceOrigin) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, sqlschema.TableName("planned_maintenance"))
	if err != nil {
		return err
	}

	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("origin"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, column, "maintenance")
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (migration *addPlannedMaintenanceOrigin) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
