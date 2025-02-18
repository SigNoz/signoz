package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type updateOrganization struct{}

func NewUpdateOrganizationFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_organization"), newUpdateOrganization)
}

func newUpdateOrganization(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &updateOrganization{}, nil
}

func (migration *updateOrganization) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrganization) Up(ctx context.Context, db *bun.DB) error {

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// add columns created_by, updated_at and updated_by to organizations table
	if _, err := tx.NewAddColumn().Table("organizations").ColumnExpr("created_by text").IfNotExists().Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.NewAddColumn().Table("organizations").ColumnExpr("updated_at timestamp").IfNotExists().Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.NewAddColumn().Table("organizations").ColumnExpr("updated_by text").IfNotExists().Exec(ctx); err != nil {
		return err
	}

	if err := migrateIntToTimestamp(ctx, tx, "organizations", "created_at"); err != nil {
		return err
	}

	if err := migrateIntToBoolean(ctx, tx, "organizations", "is_anonymous"); err != nil {
		return err
	}

	if err := migrateIntToBoolean(ctx, tx, "organizations", "has_opted_updates"); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrganization) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func migrateIntToTimestamp(ctx context.Context, tx bun.Tx, table string, column string) error {
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new timestamp column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN `+column+` TIMESTAMP`); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int (unix timestamp) to timestamp
	if _, err := tx.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = to_timestamp(`+column+`_old)`); err != nil {
		return err
	}

	// drop old column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
		return err
	}

	return nil
}

func migrateIntToBoolean(ctx context.Context, tx bun.Tx, table string, column string) error {
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new boolean column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN `+column+` BOOLEAN`); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int (unix timestamp) to timestamp
	if _, err := tx.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = CASE WHEN `+column+`_old = 1 THEN true ELSE false END`); err != nil {
		return err
	}

	// drop old column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
		return err
	}

	return nil
}
