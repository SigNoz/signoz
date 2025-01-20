package sqlmigration

import (
	"context"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.signoz.io/signoz/pkg/factory"
)

type addDashboards struct{}

func NewAddDashboardsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("add_dashboards"), newAddDashboards)
}

func newAddDashboards(_ context.Context, _ factory.ProviderSettings, _ Config) (SQLMigration, error) {
	return &addDashboards{}, nil
}

func (migration *addDashboards) Register(migrations *migrate.Migrations) error {
	if err := migrations.Register(migration.Up, migration.Down); err != nil {
		return err
	}

	return nil
}

func (migration *addDashboards) Up(ctx context.Context, db *bun.DB) error {
	// table:dashboards
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS dashboards (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uuid TEXT NOT NULL UNIQUE,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		data TEXT NOT NULL
	);`); err != nil {
		return err
	}

	// table:rules
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS rules (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		updated_at datetime NOT NULL,
		deleted INTEGER DEFAULT 0,
		data TEXT NOT NULL
	);`); err != nil {
		return err
	}

	// table:notification_channels
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS notification_channels (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		name TEXT NOT NULL UNIQUE,
		type TEXT NOT NULL,
		deleted INTEGER DEFAULT 0,
		data TEXT NOT NULL
	);`); err != nil {
		return err
	}

	// table:planned_maintenance
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS planned_maintenance (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT,
		alert_ids TEXT,
		schedule TEXT NOT NULL,
		created_at datetime NOT NULL,
		created_by TEXT NOT NULL,
		updated_at datetime NOT NULL,
		updated_by TEXT NOT NULL
	);`); err != nil {
		return err
	}

	// table:ttl_status
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS ttl_status (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		transaction_id TEXT NOT NULL,
		created_at datetime NOT NULL,
		updated_at datetime NOT NULL,
		table_name TEXT NOT NULL,
		ttl INTEGER DEFAULT 0,
		cold_storage_ttl INTEGER DEFAULT 0,
		status TEXT NOT NULL
	);`); err != nil {
		return err
	}

	// table:rules op:add column created_at
	if _, err := db.
		NewAddColumn().
		Table("rules").
		ColumnExpr("created_at datetime").
		Apply(WrapIfNotExists(ctx, db, "rules", "created_at")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	// table:rules op:add column created_by
	if _, err := db.
		NewAddColumn().
		Table("rules").
		ColumnExpr("created_by TEXT").
		Apply(WrapIfNotExists(ctx, db, "rules", "created_by")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	// table:rules op:add column updated_by
	if _, err := db.
		NewAddColumn().
		Table("rules").
		ColumnExpr("updated_by TEXT").
		Apply(WrapIfNotExists(ctx, db, "rules", "updated_by")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	// table:dashboards op:add column created_by
	if _, err := db.
		NewAddColumn().
		Table("dashboards").
		ColumnExpr("created_by TEXT").
		Apply(WrapIfNotExists(ctx, db, "dashboards", "created_by")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	// table:dashboards op:add column updated_by
	if _, err := db.
		NewAddColumn().
		Table("dashboards").
		ColumnExpr("updated_by TEXT").
		Apply(WrapIfNotExists(ctx, db, "dashboards", "updated_by")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	// table:dashboards op:add column locked
	if _, err := db.
		NewAddColumn().
		Table("dashboards").
		ColumnExpr("locked INTEGER DEFAULT 0").
		Apply(WrapIfNotExists(ctx, db, "dashboards", "locked")).
		Exec(ctx); err != nil && err != ErrNoExecute {
		return err
	}

	return nil
}

func (migration *addDashboards) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
