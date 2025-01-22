package utils

import (
	"os"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/dao"
)

func NewTestSqliteDB(t *testing.T) (testDB *sqlx.DB, testDBFilePath string) {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath = testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	testDB, err = sqlx.Open("sqlite3", testDBFilePath)
	if err != nil {
		t.Fatalf("could not open test db sqlite file: %v", err)
	}

	return testDB, testDBFilePath
}

func NewQueryServiceDBForTests(t *testing.T) *sqlx.DB {
	testDB, _ := NewTestSqliteDB(t)

	// TODO(Raj): This should not require passing in the DB file path
	dao.InitDao(testDB)
	dashboards.InitDB(testDB)

	return testDB
}
