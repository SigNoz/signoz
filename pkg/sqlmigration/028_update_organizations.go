package sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateOrganizations struct {
	store sqlstore.SQLStore
}

func NewUpdateOrganizationsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_organizations"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateOrganizations(ctx, ps, c, sqlstore)
	})
}

func newUpdateOrganizations(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateOrganizations{store: store}, nil
}

func (migration *updateOrganizations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrganizations) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	err = migration.
		store.
		Dialect().
		DropColumn(ctx, tx, "organizations", "is_anonymous")
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		DropColumn(ctx, tx, "organizations", "has_opted_updates")
	if err != nil {
		return err
	}

	_, err = migration.
		store.
		Dialect().
		RenameColumn(ctx, tx, "organizations", "name", "display_name")
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		AddColumn(ctx, tx, "organizations", "name", "TEXT")
	if err != nil {
		return err
	}

	_, err = tx.
		NewCreateIndex().
		Unique().
		IfNotExists().
		Index("idx_unique_name").
		Table("organizations").
		Column("name").
		Exec(ctx)
	if err != nil {
		return err
	}

	err = migration.
		store.
		Dialect().
		AddColumn(ctx, tx, "organizations", "alias", "TEXT")
	if err != nil {
		return err
	}
	_, err = tx.
		NewCreateIndex().
		Unique().
		IfNotExists().
		Index("idx_unique_alias").
		Table("organizations").
		Column("alias").
		Exec(ctx)
	if err != nil {
		return err
	}

	err = tx.Commit()
	if err != nil {
		return err
	}

	return nil
}

func (migration *updateOrganizations) Down(context.Context, *bun.DB) error {
	return nil
}
