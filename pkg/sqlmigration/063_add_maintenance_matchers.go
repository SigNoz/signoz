package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type createPlannedMaintenanceV2 struct {
	sqlstore sqlstore.SQLStore
}

func NewCreatePlannedMaintenanceV2Factory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("create_planned_maintenance_v2"), func(ctx context.Context, providerSettings factory.ProviderSettings, config Config) (SQLMigration, error) {
		return &createPlannedMaintenanceV2{sqlstore: sqlstore}, nil
	})
}

func (migration *createPlannedMaintenanceV2) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *createPlannedMaintenanceV2) Up(ctx context.Context, db *bun.DB) error {
	_, err := db.NewCreateTable().
		Model((*alertmanagertypes.StorablePlannedMaintenance)(nil)).
		IfNotExists().
		Exec(ctx)
	return err
}

func (migration *createPlannedMaintenanceV2) Down(ctx context.Context, db *bun.DB) error {
	_, err := db.NewDropTable().
		Model((*alertmanagertypes.StorablePlannedMaintenance)(nil)).
		IfExists().
		Exec(ctx)
	return err
}
