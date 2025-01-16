package sqlstoremigrator

import (
	"context"
	"database/sql/driver"
	"fmt"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/instrumentation/instrumentationtest"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlstoretest"
	"go.signoz.io/signoz/pkg/sqlstoremigrator/migrations/migrationstest"
)

func TestMigratorWithSqliteAndNoopMigration(t *testing.T) {
	ctx := context.Background()
	config := sqlstore.Config{Provider: "sqlite", Migration: sqlstore.MigrationConfig{LockTimeout: 10 * time.Second, LockInterval: 1 * time.Second}}
	providerSettings := instrumentationtest.New().ToProviderSettings()
	sqlStore := sqlstoretest.New(config, sqlmock.QueryMatcherEqual)
	migrationFactories := factory.MustNewNamedMap(migrationstest.NoopMigrationFactory())
	migrations, err := NewMigrations(ctx, providerSettings, config, migrationFactories)
	require.NoError(t, err)

	migrator := New(ctx, instrumentationtest.New().ToProviderSettings(), sqlStore, migrations, config)

	sqlStore.Mock().ExpectExec(
		fmt.Sprintf("CREATE TABLE IF NOT EXISTS migration (%q INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, %q VARCHAR, %q INTEGER, %q TIMESTAMP NOT NULL DEFAULT current_timestamp)", "id", "name", "group_id", "migrated_at"),
	).WillReturnResult(driver.ResultNoRows)

	sqlStore.Mock().ExpectExec(
		fmt.Sprintf("CREATE TABLE IF NOT EXISTS migration_lock (%q INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, %q VARCHAR, UNIQUE (%q))", "id", "table_name", "table_name"),
	).WillReturnResult(driver.ResultNoRows)

	sqlStore.Mock().ExpectQuery(`INSERT INTO migration_lock ("table_name") VALUES ('migration') RETURNING "id"`).
		WillReturnRows(sqlStore.Mock().NewRows([]string{"id"}).AddRow(1))

	sqlStore.Mock().ExpectQuery(`SELECT * FROM migration`).
		WillReturnRows(sqlStore.Mock().NewRows([]string{"id"}).AddRow(1))

	sqlStore.Mock().ExpectQuery(`INSERT INTO migration ("name", "group_id") VALUES ('000', 1) RETURNING "id", "migrated_at"`).
		WillReturnRows(sqlStore.Mock().NewRows([]string{"id", "migrated_at"}).AddRow(1, time.Now()))

	err = migrator.Migrate(ctx)
	require.NoError(t, err)
}
