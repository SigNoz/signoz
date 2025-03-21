package utils

import (
	"context"
	"os"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/query-service/app/dashboards"
	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlmigrator"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	_ "github.com/mattn/go-sqlite3"
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
			sqlmigration.NewModifyDatetimeFactory(),
			sqlmigration.NewModifyOrgDomainFactory(),
			sqlmigration.NewUpdateOrganizationFactory(sqlStore),
			sqlmigration.NewUpdateDashboardAndSavedViewsFactory(sqlStore),
			sqlmigration.NewUpdatePatAndOrgDomainsFactory(sqlStore),
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

	err := dao.InitDao(sqlStore)
	if err != nil {
		t.Fatalf("could not initialize dao: %v", err)
	}
	_ = dashboards.InitDB(sqlStore.BunDB())

	return sqlStore
}
