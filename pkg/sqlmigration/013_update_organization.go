package sqlmigration

import (
	"context"
	"database/sql"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
)

type updateOrganization struct {
	store sqlstore.SQLStore
}

func NewUpdateOrganizationFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("update_organization"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return newUpdateOrganization(ctx, ps, c, sqlstore)
	})
}

func newUpdateOrganization(_ context.Context, _ factory.ProviderSettings, _ Config, store sqlstore.SQLStore) (SQLMigration, error) {
	return &updateOrganization{
		store: store,
	}, nil
}

func (migration *updateOrganization) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrganization) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	// update apdex settings table
	if err := updateApdexSettings(ctx, tx); err != nil {
		return err
	}

	// drop user_flags table
	if _, err := tx.NewDropTable().IfExists().Table("user_flags").Exec(ctx); err != nil {
		return err
	}

	// add org id to groups table
	if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, "groups", "org_id"); err != nil {
		return err
	} else if !exists {
		if _, err := tx.NewAddColumn().Table("groups").ColumnExpr("org_id TEXT").Exec(ctx); err != nil {
			return err
		}
	}

	// add created_at to groups table
	for _, table := range []string{"groups"} {
		if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, table, "created_at"); err != nil {
			return err
		} else if !exists {
			if _, err := tx.NewAddColumn().Table(table).ColumnExpr("created_at TIMESTAMP").Exec(ctx); err != nil {
				return err
			}
		}
	}

	// add updated_at to organizations, users, groups table
	for _, table := range []string{"organizations", "users", "groups"} {
		if exists, err := migration.store.Dialect().ColumnExists(ctx, tx, table, "updated_at"); err != nil {
			return err
		} else if !exists {
			if _, err := tx.NewAddColumn().Table(table).ColumnExpr("updated_at TIMESTAMP").Exec(ctx); err != nil {
				return err
			}
		}
	}

	// since organizations, users has created_at as integer instead of timestamp
	for _, table := range []string{"organizations", "users", "invites"} {
		if err := migration.store.Dialect().IntToTimestamp(ctx, tx, table, "created_at"); err != nil {
			return err
		}
	}

	// migrate is_anonymous and has_opted_updates to boolean from int
	for _, column := range []string{"is_anonymous", "has_opted_updates"} {
		if err := migration.store.Dialect().IntToBoolean(ctx, tx, "organizations", column); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *updateOrganization) Down(ctx context.Context, db *bun.DB) error {
	return nil
}

func updateApdexSettings(ctx context.Context, tx bun.Tx) error {
	if _, err := tx.NewCreateTable().
		Model(&struct {
			bun.BaseModel      `bun:"table:apdex_settings_new"`
			OrgID              string  `bun:"org_id,pk,type:text"`
			ServiceName        string  `bun:"service_name,pk,type:text"`
			Threshold          float64 `bun:"threshold,type:float,notnull"`
			ExcludeStatusCodes string  `bun:"exclude_status_codes,type:text,notnull"`
		}{}).
		ForeignKey(`("org_id") REFERENCES "organizations" ("id")`).
		IfNotExists().
		Exec(ctx); err != nil {
		return err
	}

	// get org id from organizations table
	var orgID string
	if err := tx.QueryRowContext(ctx, `SELECT id FROM organizations LIMIT 1`).Scan(&orgID); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	if orgID != "" {
		// copy old data
		if _, err := tx.ExecContext(ctx, `INSERT INTO apdex_settings_new (org_id, service_name, threshold, exclude_status_codes) SELECT ?, service_name, threshold, exclude_status_codes FROM apdex_settings`, orgID); err != nil {
			return err
		}
	}

	// drop old table
	if _, err := tx.NewDropTable().IfExists().Table("apdex_settings").Exec(ctx); err != nil {
		return err
	}

	// rename new table to old table
	if _, err := tx.ExecContext(ctx, `ALTER TABLE apdex_settings_new RENAME TO apdex_settings`); err != nil {
		return err
	}

	return nil
}
