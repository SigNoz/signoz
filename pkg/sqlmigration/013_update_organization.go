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

	// add org id
	if _, err := tx.NewAddColumn().Table("groups").ColumnExpr("org_id text").IfNotExists().Exec(ctx); err != nil {
		return err
	}

	// organization, users table already have created_at column
	for _, table := range []string{"groups", "ingestion_keys"} {
		if _, err := tx.NewAddColumn().Table(table).ColumnExpr("created_at text").IfNotExists().Exec(ctx); err != nil {
			return err
		}
	}

	// add created_by, updated_at and updated_by to organizations, users, groups, ingestion_keys table
	for _, table := range []string{"organizations", "users", "groups", "ingestion_keys"} {
		if _, err := tx.NewAddColumn().Table(table).ColumnExpr("created_by text").IfNotExists().Exec(ctx); err != nil {
			return err
		}

		if _, err := tx.NewAddColumn().Table(table).ColumnExpr("updated_at timestamp").IfNotExists().Exec(ctx); err != nil {
			return err
		}

		if _, err := tx.NewAddColumn().Table(table).ColumnExpr("updated_by text").IfNotExists().Exec(ctx); err != nil {
			return err
		}
	}

	// since organizations, users has created_at as integer instead of timestamp
	for _, table := range []string{"organizations", "users", "invites"} {
		if err := migrateIntToTimestamp(ctx, tx, table, "created_at"); err != nil {
			return err
		}
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

func getColumnType(ctx context.Context, tx bun.Tx, table string, column string) (string, error) {
	var columnType string
	query := `SELECT data_type FROM information_schema.columns WHERE table_name = '` + table + `' AND column_name = '` + column + `'`
	err := tx.QueryRowContext(ctx, query).Scan(&columnType)
	if err != nil {
		return "", err
	}

	return columnType, nil
}

func migrateIntToTimestamp(ctx context.Context, tx bun.Tx, table string, column string) error {
	columnType, err := getColumnType(ctx, tx, table, column)
	if err != nil {
		return err
	}

	if columnType != "bigint" {
		return nil
	}

	// if the columns is integer then do this
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
		return err
	}

	// add new timestamp column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN `+column+` TIMESTAMP`); err != nil {
		return err
	}

	// copy data from old column to new column, converting from int (unix timestamp) to timestamp
	if _, err := tx.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = to_timestamp(cast(`+column+`_old as INTEGER))`); err != nil {
		return err
	}

	// drop old column
	if _, err := tx.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
		return err
	}

	return nil
}

func migrateIntToBoolean(ctx context.Context, tx bun.Tx, table string, column string) error {
	columnType, err := getColumnType(ctx, tx, table, column)
	if err != nil {
		return err
	}

	if columnType != "bigint" {
		return nil
	}

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
