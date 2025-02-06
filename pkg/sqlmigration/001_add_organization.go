package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/models"
)

type addOrganization struct{}

func NewAddOrganizationFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_organization"), newAddOrganization)
}

func newAddOrganization(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addOrganization{}, nil
}

func (migration *addOrganization) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addOrganization) Up(ctx context.Context, db *bun.DB) error {

	// table:organizations
	if _, err := db.NewCreateTable().
		Model((*models.Organization)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:groups
	if _, err := db.NewCreateTable().
		Model((*models.Group)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:users
	if _, err := db.NewCreateTable().
		Model((*models.User)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:invites
	if _, err := db.NewCreateTable().
		Model((*models.Invite)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:reset_password_request
	if _, err := db.NewCreateTable().
		Model((*models.ResetPasswordRequest)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:user_flags
	if _, err := db.NewCreateTable().
		Model((*models.UserFlags)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:apdex_settings
	if _, err := db.NewCreateTable().
		Model((*models.ApdexSettings)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// table:ingestion_keys
	if _, err := db.NewCreateTable().
		Model((*models.IngestionKey)(nil)).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addOrganization) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
