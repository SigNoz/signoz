package migrations

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/sqlstore"
)

type addDataMigrations struct {
	config sqlstore.MigrationConfig
}

func NewAddDataMigrationsMigrationFactory() sqlstore.MigrationFactory {
	return sqlstore.NewMigrationFactory(newAddDataMigrations)
}

func newAddDataMigrations(config sqlstore.MigrationConfig) sqlstore.Migration {
	return &addDataMigrations{config: config}
}

func (migration *addDataMigrations) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}
	return nil
}

func (migration *addDataMigrations) Up(ctx context.Context, db *bun.DB) error {
	// CREATE TABLE IF NOT EXISTS data_migrations (
	// 	id SERIAL PRIMARY KEY,
	// 	version VARCHAR(255) NOT NULL UNIQUE,
	// 	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	// 	succeeded BOOLEAN NOT NULL DEFAULT FALSE
	// );
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS data_migrations (
		id SERIAL PRIMARY KEY,
		version VARCHAR(255) NOT NULL UNIQUE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		succeeded BOOLEAN NOT NULL DEFAULT FALSE
	);`); err != nil {
		return err
	}

	return nil
}

func (migration *addDataMigrations) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
