package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addOrganization struct{}

func NewAddOrganizationFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_organization"), newAddOrganization)
}

func newAddOrganization(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addOrganization{}, nil
}

func (migration *addOrganization) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addOrganization) Up(ctx context.Context, db *bun.DB) error {
	// table:invites
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS invites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		token TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		role TEXT NOT NULL,
		org_id TEXT NOT NULL,
		FOREIGN KEY(org_id) REFERENCES organizations(id)
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:organizations
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS organizations (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		is_anonymous INTEGER NOT NULL DEFAULT 0 CHECK(is_anonymous IN (0,1)),
		has_opted_updates INTEGER NOT NULL DEFAULT 1 CHECK(has_opted_updates IN (0,1))
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:users
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		profile_picture_url TEXT,
		group_id TEXT NOT NULL,
		org_id TEXT NOT NULL,
		FOREIGN KEY(group_id) REFERENCES groups(id),
		FOREIGN KEY(org_id) REFERENCES organizations(id)
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:groups
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS groups (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:reset_password_request
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS reset_password_request (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		token TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:user_flags
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS user_flags (
		user_id TEXT PRIMARY KEY,
		flags TEXT,
		FOREIGN KEY(user_id) REFERENCES users(id)
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:apdex_settings
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS apdex_settings (
		service_name TEXT PRIMARY KEY,
		threshold FLOAT NOT NULL,
		exclude_status_codes TEXT NOT NULL
	)`).Exec(ctx); err != nil {
		return err
	}

	// table:ingestion_keys
	if _, err := db.NewRaw(`CREATE TABLE IF NOT EXISTS ingestion_keys (
		key_id TEXT PRIMARY KEY,
		name TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		ingestion_key TEXT NOT NULL,
		ingestion_url TEXT NOT NULL,
		data_region TEXT NOT NULL
	)`).Exec(ctx); err != nil {
		return err
	}

	return nil
}

func (migration *addOrganization) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
