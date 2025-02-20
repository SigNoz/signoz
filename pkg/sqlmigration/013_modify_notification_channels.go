package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type modifyNotificationChannels struct{}

func NewModifyNotificationChannelsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("modify_notification_channels"), newModifyNotificationChannels)
}

func newModifyNotificationChannels(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &modifyNotificationChannels{}, nil
}

func (migration *modifyNotificationChannels) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *modifyNotificationChannels) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.
		NewAddColumn().
		Table("notification_channels").
		ColumnExpr("org_id TEXT").
		Exec(ctx); err != nil {
		return err
	}

	var orgID string

	err = tx.
		NewSelect().
		ColumnExpr("id").
		Table("organizations").
		Limit(1).
		Scan(ctx, &orgID)
	if err != nil {
		if err != sql.ErrNoRows {
			return err
		}
	}

	if err == nil {
		err = migration.populateOrgID(ctx, tx, orgID)
		if err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *modifyNotificationChannels) populateOrgID(ctx context.Context, tx bun.Tx, orgID string) error {
	if _, err := tx.
		NewUpdate().
		Table("notification_channels").
		Set("org_id = ?", orgID).
		Where("org_id IS NULL").
		Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *modifyNotificationChannels) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
