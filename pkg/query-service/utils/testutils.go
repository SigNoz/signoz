package utils

import (
	"os"
	"testing"

	"github.com/jmoiron/sqlx"
	"go.signoz.io/signoz/pkg/query-service/app/dashboards"
	"go.signoz.io/signoz/pkg/query-service/dao"
)

func NewQueryServiceDBForTests(t *testing.T) *sqlx.DB {
	testDBFile, err := os.CreateTemp("", "test-signoz-db-*")
	if err != nil {
		t.Fatalf("could not create temp file for test db: %v", err)
	}
	testDBFilePath := testDBFile.Name()
	t.Cleanup(func() { os.Remove(testDBFilePath) })
	testDBFile.Close()

	testDB, err := sqlx.Open("sqlite3", testDBFilePath)
	if err != nil {
		t.Fatalf("could not open test db sqlite file: %v", err)
	}

	// TODO(Raj): This should not require passing in the DB file path
	dao.InitDao("sqlite", testDBFilePath)
	dashboards.InitDB(testDBFilePath)

	return testDB
}
