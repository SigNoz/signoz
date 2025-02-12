package utils

import (
	"context"
	"os"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/factory/providertest"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/sqlmigration"
	"go.signoz.io/signoz/pkg/sqlmigrator"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/sqlitesqlstore"
)

func NewTestSqliteDB(t *testing.T) (testDB *sqlx.DB, testDBFilePath string) {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath = testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	sqlstore, err := sqlitesqlstore.New(context.Background(), providertest.NewSettings(), sqlstore.Config{Provider: "sqlite", Sqlite: sqlstore.SqliteConfig{Path: testDBFilePath}})
	if err != nil {
		t.Fatalf("could not create test db sqlite store: %v", err)
	}

	sqlmigrations, err := sqlmigration.New(
		context.Background(),
		providertest.NewSettings(),
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

	err = sqlmigrator.New(context.Background(), providertest.NewSettings(), sqlstore, sqlmigrations, sqlmigrator.Config{}).Migrate(context.Background())
	if err != nil {
		t.Fatalf("could not migrate test db sql migrations: %v", err)
	}

	testDB = sqlstore.SQLxDB()

	return testDB, testDBFilePath
}

func NewQueryServiceDBForTests(t *testing.T) *sqlx.DB {
	testDB, _ := NewTestSqliteDB(t)

	// TODO(Raj): This should not require passing in the DB file path
	dao.InitDao(testDB)
	dashboards.InitDB(testDB)

	return testDB
}
