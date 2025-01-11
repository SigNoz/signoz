package utils

import (
	"context"
	"os"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/sqlstore"
	"go.signoz.io/signoz/pkg/sqlstore/migrations"
	sqlstoreprovider "go.signoz.io/signoz/pkg/sqlstore/provider"
	"go.uber.org/zap"
)

func NewQueryServiceDBForTests(t *testing.T) (testDB *sqlx.DB) {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath := testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	sqlStoreProvider, err := sqlstoreprovider.New(sqlstore.Config{
		Provider: "sqlite",
		Sqlite: sqlstore.SqliteConfig{
			Path: testDBFilePath,
		},
	}, sqlstore.ProviderConfig{Logger: zap.NewNop()})
	if err != nil {
		t.Fatalf("could not create sqlite provider: %v", err)
	}

	migrations, err := migrations.New(sqlstore.MigrationConfig{Logger: zap.L()})
	if err != nil {
		t.Fatalf("could not create migrations: %v", err)
	}

	sqlStore := sqlstore.NewSqlStore(sqlStoreProvider, migrations)
	err = sqlStore.Migrate(context.Background())
	if err != nil {
		t.Fatalf("could not run migrations: %v", err)
	}

	err = dao.InitDao(sqlStore.Provider().SqlxDB())
	if err != nil {
		t.Fatalf("could not init dao: %v", err)
	}

	dashboards.InitDB(sqlStore.Provider().SqlxDB())

	return sqlStore.Provider().SqlxDB()
}
