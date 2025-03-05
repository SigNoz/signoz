package sqlmigration

import (
	"context"
	"database/sql"
	"time"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/alertmanager/alertmanagerserver"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/types/alertmanagertypes"
)

type addAlertmanager struct{}

func NewAddAlertmanagerFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_alertmanager"), newAddAlertmanager)
}

func newAddAlertmanager(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addAlertmanager{}, nil
}

func (migration *addAlertmanager) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanager) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.
		NewDropColumn().
		Table("notification_channels").
		ColumnExpr("deleted").
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	if _, err := tx.
		NewAddColumn().
		Table("notification_channels").
		Apply(WrapIfNotExists(ctx, db, "notification_channels", "org_id")).
		Exec(ctx); err != nil && err != ErrNoExecute {
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

	if _, err := tx.
		NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:alertmanager_config"`
			ID            uint64    `bun:"id"`
			Config        string    `bun:"config"`
			Hash          string    `bun:"hash"`
			CreatedAt     time.Time `bun:"created_at"`
			UpdatedAt     time.Time `bun:"updated_at"`
			OrgID         string    `bun:"org_id,unique"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	if _, err := tx.
		NewCreateTable().
		Model(&struct {
			bun.BaseModel `bun:"table:alertmanager_state"`
			ID            uint64    `bun:"id,pk,autoincrement"`
			Silences      string    `bun:"silences,nullzero"`
			NFLog         string    `bun:"nflog,nullzero"`
			CreatedAt     time.Time `bun:"created_at"`
			UpdatedAt     time.Time `bun:"updated_at"`
			OrgID         string    `bun:"org_id,unique"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	cfg, err := alertmanagertypes.NewDefaultConfig(alertmanagerserver.NewConfig().Global, alertmanagerserver.NewConfig().Route, orgID)
	if err != nil {
		return err
	}

	if _, err := tx.
		NewInsert().
		Model(cfg.StoreableConfig()).
		Exec(ctx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *addAlertmanager) populateOrgID(ctx context.Context, tx bun.Tx, orgID string) error {
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

func (migration *addAlertmanager) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
