package utils

import (
	"context"
	"os"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"go.signoz.io/signoz/pkg/factory"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/migrations"
	"go.signoz.io/signoz/pkg/sqlstore/provider/sqlite"
)

func NewQueryServiceDBForTests(t *testing.T) (testDB *sqlx.DB) {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath := testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	sqlStoreProvider, err := factory.NewFromFactory(context.Background(), factory.ProviderSettings{}, sqlstore.Config{
		Provider: "sqlite",
		Sqlite: sqlstore.SqliteConfig{
			Path: testDBFilePath,
		},
	}, factory.MustNewNamedMap(sqlite.NewFactory()), "sqlite")
	if err != nil {
		t.Fatalf("could not create sqlite provider: %v", err)
	}

	migrations, err := migrations.New(context.Background(), factory.ProviderSettings{}, sqlstore.Config{
		Provider: "sqlite",
		Sqlite: sqlstore.SqliteConfig{
			Path: testDBFilePath,
		},
	}, factory.MustNewNamedMap(
		migrations.NewAddDataMigrationsFactory(),
		migrations.NewAddOrganizationFactory(),
		migrations.NewAddPreferencesFactory(),
		migrations.NewAddDashboardsFactory(),
		migrations.NewAddSavedViewsFactory(),
		migrations.NewAddAgentsFactory(),
		migrations.NewAddPipelinesFactory(),
		migrations.NewAddIntegrationsFactory(),
	))
	if err != nil {
		t.Fatalf("could not create migrations: %v", err)
	}

	sqlStore := sqlstore.NewSQLStore(sqlStoreProvider, migrations)
	err = sqlStore.Migrate(context.Background())
	if err != nil {
		t.Fatalf("could not run migrations: %v", err)
	}

	err = dao.InitDao(sqlStore.SQLxDB())
	if err != nil {
		t.Fatalf("could not init dao: %v", err)
	}

	dashboards.InitDB(sqlStore.SQLxDB())

	return sqlStore.SQLxDB()
}
