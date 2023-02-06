package pipelines

import (
	"context"
	"fmt"
	"math/rand"
	"reflect"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"

	_ "github.com/mattn/go-sqlite3"

	"go.signoz.io/signoz/ee/query-service/ingestionRules/sqlite"
	"go.signoz.io/signoz/ee/query-service/model"
)

var TestDBPath string
var TestDBConn *sqlx.DB

func init() {
	rand.Seed(time.Now().UnixNano())
	TestDBPath = fmt.Sprintf("/var/tmp/%d.db", rand.Int())
}

func GetTestDB() (*sqlx.DB, error) {
	if TestDBConn != nil {
		return TestDBConn, nil
	}
	db, err := sqlx.Open("sqlite3", TestDBPath)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(3)

	if err := sqlite.InitDB(db); err != nil {
		return nil, err
	}

	TestDBConn = db
	return db, nil
}

func TestInsertRule(t *testing.T) {
	db, err := GetTestDB()

	if err != nil {
		t.Fatal(err)
	}

	repo := NewRepo(db)

	p1 := PostablePipeline{
		Name: "firstpipeline",
		Config: []model.PipelineOperatos{
			{
				Type:    "grok",
				Pattern: "%{COMMONAPACHELOG}",
				ParseTo: "attributes",
			},
			{
				Type: "move",
				From: "attributes.abcd",
				To:   "attributes.xyz",
			},
		},
	}

	inserted, err := repo.insertPipeline(context.Background(), &p1)
	if err != nil {
		t.Fatal(err)
	}

	selected, errs := repo.GetPipeline(context.Background(), inserted.Id)
	if !errs.IsNil() {
		t.Fatal(err)
	}

	if selected.Id != inserted.Id {
		t.Logf("failed to insert rule")
		t.Fail()
	}

	if !reflect.DeepEqual(selected.Config, inserted.Config) {
		t.Logf("failed to insert rule config correctly")
		t.Fail()
	}

	repo.DeletePipeline(context.Background(), inserted.Id)
}
