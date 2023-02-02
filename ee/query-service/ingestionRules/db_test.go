package ingestionRules

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
	basemodel "go.signoz.io/signoz/pkg/query-service/model"
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

	p1 := PostableIngestionRule{
		Name:        "p1",
		Source:      model.IngestionSourceMetrics,
		RuleType:    model.IngestionRuleTypeDrop,
		RuleSubType: model.IngestionRuleSubTypeAO,
		Config: &model.IngestionRuleConfig{
			DropConfig: DropConfig{
				FilterSet: basemodel.FilterSet{
					Operator: "AND",
					Items: []basemodel.FilterItem{
						{
							Key:      "name",
							KeyType:  "metric_name",
							Operator: "==",
							Value:    "signoz_calls_total",
						},
						{
							Key:      "http_status_code",
							KeyType:  "label",
							Operator: "==",
							Value:    "401",
						}},
				},
			},
		},
	}

	inserted, err := repo.InsertRule(context.Background(), &p1)
	if err != nil {
		t.Fatal(err)
	}

	selected, errs := repo.GetRule(context.Background(), inserted.Id)
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

	repo.DeleteRule(context.Background(), inserted.Id)
}
