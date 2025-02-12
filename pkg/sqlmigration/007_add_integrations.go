package sqlmigration

import (
	"context"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addIntegrations struct{}

func NewAddIntegrationsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_integrations"), newAddIntegrations)
}

func newAddIntegrations(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addIntegrations{}, nil
}

func (migration *addIntegrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addIntegrations) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:integrations_installed"`

			IntegrationID string    `bun:"integration_id,pk,type:text"`
			ConfigJSON    string    `bun:"config_json,type:text"`
			InstalledAt   time.Time `bun:"installed_at,default:current_timestamp"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel       `bun:"table:cloud_integrations_accounts"`
			CloudProvider       string    `bun:"cloud_provider,type:text,unique:cloud_provider_id"`
			ID                  string    `bun:"id,type:text,notnull,unique:cloud_provider_id"`
			ConfigJSON          string    `bun:"config_json,type:text"`
			CloudAccountID      string    `bun:"cloud_account_id,type:text"`
			LastAgentReportJSON string    `bun:"last_agent_report_json,type:text"`
			CreatedAt           time.Time `bun:"created_at,notnull,default:current_timestamp"`
			RemovedAt           time.Time `bun:"removed_at,type:timestamp"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := db.NewCreateTable().
		Model(&struct {
			bun.BaseModel  `bun:"table:cloud_integrations_service_configs"`
			CloudProvider  string    `bun:"cloud_provider,type:text,notnull,unique:service_cloud_provider_account"`
			CloudAccountID string    `bun:"cloud_account_id,type:text,notnull,unique:service_cloud_provider_account"`
			ServiceID      string    `bun:"service_id,type:text,notnull,unique:service_cloud_provider_account"`
			ConfigJSON     string    `bun:"config_json,type:text"`
			CreatedAt      time.Time `bun:"created_at,default:current_timestamp"`
		}{}).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addIntegrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
