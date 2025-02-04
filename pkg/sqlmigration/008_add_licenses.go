package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addLicenses struct{}

func NewAddLicensesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_licenses"), newAddLicenses)
}

func newAddLicenses(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addLicenses{}, nil
}

func (migration *addLicenses) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addLicenses) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS licenses(
		key TEXT PRIMARY KEY,
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
		planDetails TEXT,
		activationId TEXT,
		validationMessage TEXT,
		lastValidated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS sites(
		uuid TEXT PRIMARY KEY,
		alias VARCHAR(180) DEFAULT 'PROD',
		url VARCHAR(300),
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS feature_status (
		name TEXT PRIMARY KEY,
		active bool,
		usage INTEGER DEFAULT 0,
		usage_limit INTEGER DEFAULT 0,
		route TEXT
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS licenses_v3 (
		id TEXT PRIMARY KEY,
		key TEXT NOT NULL UNIQUE,
		data TEXT
	);`); err != nil {
		return err
	}

	return nil
}

func (migration *addLicenses) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
