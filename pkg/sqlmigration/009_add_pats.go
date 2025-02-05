package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addPats struct{}

func NewAddPatsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_pats"), newAddPats)
}

func newAddPats(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addPats{}, nil
}

func (migration *addPats) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addPats) Up(ctx context.Context, db *bun.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS org_domains(
		id TEXT PRIMARY KEY,
		org_id TEXT NOT NULL,
		name VARCHAR(50) NOT NULL UNIQUE,
		created_at INTEGER NOT NULL,
		updated_at INTEGER,
		data TEXT  NOT NULL,
		FOREIGN KEY(org_id) REFERENCES organizations(id)
	);`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS personal_access_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		role TEXT NOT NULL,
		user_id TEXT NOT NULL,
		token TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		expires_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		last_used INTEGER NOT NULL,
		revoked BOOLEAN NOT NULL,
		updated_by_user_id TEXT NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id)
	);`); err != nil {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table("personal_access_tokens").
		ColumnExpr("role TEXT NOT NULL DEFAULT 'ADMIN'").
		Apply(WrapIfNotExists(ctx, db, "personal_access_tokens", "role")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table("personal_access_tokens").
		ColumnExpr("updated_at INTEGER NOT NULL DEFAULT 0").
		Apply(WrapIfNotExists(ctx, db, "personal_access_tokens", "updated_at")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table("personal_access_tokens").
		ColumnExpr("last_used INTEGER NOT NULL DEFAULT 0").
		Apply(WrapIfNotExists(ctx, db, "personal_access_tokens", "last_used")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table("personal_access_tokens").
		ColumnExpr("revoked BOOLEAN NOT NULL DEFAULT FALSE").
		Apply(WrapIfNotExists(ctx, db, "personal_access_tokens", "revoked")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	if _, err := db.
		NewAddColumn().
		Table("personal_access_tokens").
		ColumnExpr("updated_by_user_id TEXT NOT NULL DEFAULT ''").
		Apply(WrapIfNotExists(ctx, db, "personal_access_tokens", "updated_by_user_id")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	return nil
}

func (migration *addPats) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
