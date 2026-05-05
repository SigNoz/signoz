package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type addSystemDashboard struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewAddSystemDashboardFactory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_system_dashboard"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &addSystemDashboard{sqlstore: sqlstore, sqlschema: sqlschema}, nil
	})
}

func (migration *addSystemDashboard) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addSystemDashboard) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	table, uniqueConstraints, err := migration.sqlschema.GetTable(ctx, "dashboard")
	if err != nil {
		return err
	}

	column := &sqlschema.Column{
		Name:     sqlschema.ColumnName("source"),
		DataType: sqlschema.DataTypeText,
		Nullable: false,
	}

	sqls := migration.sqlschema.Operator().AddColumn(table, uniqueConstraints, column, "")
	for _, sql := range sqls {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	// We activate this part of code once we add default value for the overview page.
	// add source column to the dashboard table.
	// do not iterate over orgs.
	// var orgIDs []string
	// if err := tx.NewSelect().Model((*types.Organization)(nil)).Column("id").Scan(ctx, &orgIDs); err != nil {
	// 	return err
	// }
	//
	// for _, rawOrgID := range orgIDs {
	// 	orgID, err := valuer.NewUUID(rawOrgID)
	// 	if err != nil {
	// 		return err
	// 	}
	//
	// 	for _, source := range dashboardtypes.SystemSources {
	// 		count, err := tx.NewSelect().
	// 			Model((*dashboardtypes.StorableDashboard)(nil)).
	// 			Where("org_id = ?", orgID).
	// 			Where("source = ?", string(source)).
	// 			Count(ctx)
	// 		if err != nil {
	// 			return err
	// 		}
	// 		if count > 0 {
	// 			continue
	// 		}
	//
	// 		dashboard, err := dashboardtypes.NewDefaultSystemDashboard(orgID, source)
	// 		if err != nil {
	// 			return err
	// 		}
	//
	// 		storable, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	// 		if err != nil {
	// 			return err
	// 		}
	//
	// 		if _, err := tx.NewInsert().Model(storable).Exec(ctx); err != nil {
	// 			return err
	// 		}
	// 	}
	// }

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addSystemDashboard) Down(context.Context, *bun.DB) error {
	return nil
}
