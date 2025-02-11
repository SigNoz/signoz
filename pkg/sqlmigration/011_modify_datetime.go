package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type modifyDatetime struct{}

func NewModifyDatetimeFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("modify_datetime"), newModifyDatetime)
}

func newModifyDatetime(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &modifyDatetime{}, nil
}

func (migration *modifyDatetime) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *modifyDatetime) Up(ctx context.Context, db *bun.DB) error {
	// only run this for old sqlite db
	if db.Dialect().Name().String() != "sqlite" {
		return nil
	}

	// begin transaction
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	tables := []string{"dashboards", "rules", "planned_maintenance", "ttl_status"}
	columns := []string{"created_at", "updated_at"}
	for _, table := range tables {
		for _, column := range columns {
			// rename old column
			if _, err := db.ExecContext(ctx, `ALTER TABLE `+table+` RENAME COLUMN `+column+` TO `+column+`_old`); err != nil {
				return err
			}
			// create a new column
			if _, err := db.ExecContext(ctx, `ALTER TABLE `+table+` ADD COLUMN `+column+` TIMESTAMP NOT NULL`); err != nil {
				return err
			}
			// update the new column with the value of the old column
			if _, err := db.ExecContext(ctx, `UPDATE `+table+` SET `+column+` = `+column+`_old`); err != nil {
				return err
			}
			// drop the old column
			if _, err := db.ExecContext(ctx, `ALTER TABLE `+table+` DROP COLUMN `+column+`_old`); err != nil {
				return err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (migration *modifyDatetime) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
