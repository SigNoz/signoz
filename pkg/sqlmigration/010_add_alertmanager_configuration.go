package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addAlertmanagerConfiguration struct{}

func NewAddAlertmanagerConfigurationFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_alertmanager_configuration"), newAddAlertmanagerConfiguration)
}

func newAddAlertmanagerConfiguration(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addAlertmanagerConfiguration{}, nil
}

func (migration *addAlertmanagerConfiguration) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanagerConfiguration) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.
		NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:alertmanager_config"`
			ID            uint64    `bun:"id"`
			Config        string    `bun:"config"`
			SilencesState string    `bun:"silences_state"`
			NFLogState    string    `bun:"nflog_state"`
			CreatedAt     time.Time `bun:"created_at"`
			UpdatedAt     time.Time `bun:"updated_at"`
			OrgID         string    `bun:"org_id,unique"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id") ON DELETE CASCADE`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table("notification_channels").
		ColumnExpr("org_id TEXT").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanagerConfiguration) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
