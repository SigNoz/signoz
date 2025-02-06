package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addDashboards struct{}

func NewAddDashboardsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_dashboards"), newAddDashboards)
}

func newAddDashboards(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addDashboards{}, nil
}

func (migration *addDashboards) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addDashboards) Up(ctx context.Context, db *bun.DB) error {
	// table:dashboards
	if _, err := db.NewCreateTable().
		Model((*models.Dashboard)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:rules
	if _, err := db.NewCreateTable().
		Model((*models.Rule)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:notification_channels
	if _, err := db.NewCreateTable().
		Model((*models.NotificationChannel)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:planned_maintenance
	if _, err := db.NewCreateTable().
		Model((*models.PlannedMaintenance)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:ttl_status
	if _, err := db.NewCreateTable().
		Model((*models.TTLStatus)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addDashboards) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
