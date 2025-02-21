package sqlmigration

import (
	"context"
	"database/sql"
	"errors"
	"strings"

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

	// update apdex settings table
	if err := updateApdexSettings(ctx, tx); err != nil {
		return err
	}

	// drop user_flags table
	if _, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS user_flags`); err != nil {
		return err
	}

	// add org id to groups table
	if _, err := tx.ExecContext(ctx, `ALTER TABLE groups ADD COLUMN org_id TEXT`); err != nil && !strings.Contains(err.Error(), "duplicate") {
		return err
	}

	// add created_at to groups table
	for _, table := range []string{"groups"} {
		query := `ALTER TABLE ` + table + ` ADD COLUMN created_at TIMESTAMP`
		if _, err := tx.ExecContext(ctx, query); err != nil && !strings.Contains(err.Error(), "duplicate") {
			return err
		}
	}

	// add updated_at to organizations, users, groups table
	for _, table := range []string{"organizations", "users", "groups"} {
		query := `ALTER TABLE ` + table + ` ADD COLUMN updated_at TIMESTAMP`
		if _, err := tx.ExecContext(ctx, query); err != nil && !strings.Contains(err.Error(), "duplicate") {
			return err
		}
	}

	// since organizations, users has created_at as integer instead of timestamp
	for _, table := range []string{"organizations", "users", "invites"} {
		if err := MigrateIntToTimestamp(ctx, tx, table, "created_at"); err != nil {
			return err
		}
	}

	// migrate is_anonymous and has_opted_updates to boolean from int
	for _, column := range []string{"is_anonymous", "has_opted_updates"} {
		if err := MigrateIntToBoolean(ctx, tx, "organizations", column); err != nil {
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
	if _, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS apdex_settings`); err != nil {
		return err
	}

	// rename new table to old table
	if _, err := tx.ExecContext(ctx, `ALTER TABLE apdex_settings_new RENAME TO apdex_settings`); err != nil {
		return err
	}

	return nil
}
