package utils

import (
	"context"
	"os"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/factory/factorytest"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlitesqlstore"
)

func NewTestSqliteDB(t *testing.T) (sqlStore sqlstore.SQLStore, testDBFilePath string) {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath = testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	sqlStore, err = sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{Provider: "sqlite", Sqlite: sqlstore.SqliteConfig{Path: testDBFilePath}})
	if err != nil {
		t.Fatalf("could not create test db sqlite store: %v", err)
	}

	sqlmigrations, err := sqlmigration.New(
		context.Background(),
		factorytest.NewSettings(),
		sqlmigration.Config{},
		factory.MustNewNamedMap(
			sqlmigration.NewAddDataMigrationsFactory(),
			sqlmigration.NewAddOrganizationFactory(),
			sqlmigration.NewAddPreferencesFactory(),
			sqlmigration.NewAddDashboardsFactory(),
			sqlmigration.NewAddSavedViewsFactory(),
			sqlmigration.NewAddAgentsFactory(),
			sqlmigration.NewAddPipelinesFactory(),
			sqlmigration.NewAddIntegrationsFactory(),
			sqlmigration.NewAddLicensesFactory(),
			sqlmigration.NewAddPatsFactory(),
		),
	)
	if err != nil {
		t.Fatalf("could not create test db sql migrations: %v", err)
	}

	err = sqlmigrator.New(context.Background(), factorytest.NewSettings(), sqlStore, sqlmigrations, sqlmigrator.Config{}).Migrate(context.Background())
	if err != nil {
		t.Fatalf("could not migrate test db sql migrations: %v", err)
	}

	return sqlStore, testDBFilePath
}

func NewQueryServiceDBForTests(t *testing.T) sqlstore.SQLStore {
	sqlStore, _ := NewTestSqliteDB(t)

	dao.InitDao(sqlStore)
	dashboards.InitDB(sqlStore.SQLxDB())

	return sqlStore
}
