package savedviewtypestest

import (
	"database/sql/driver"
	"encoding/json"
	"regexp"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var savedViewColumns = []string{"id", "created_at", "updated_at", "created_by", "updated_by", "org_id", "name", "source", "data"}

type StoreTest struct {
	store savedviewtypes.Store
	mock  sqlmock.Sqlmock
}

func New(store savedviewtypes.Store, mock sqlmock.Sqlmock) *StoreTest {
	return &StoreTest{store: store, mock: mock}
}

// Store returns the savedviewtypes.Store for calling methods under test.
func (t *StoreTest) Store() savedviewtypes.Store { return t.store }

// Mock returns the sqlmock handle for setting query expectations.
func (t *StoreTest) Mock() sqlmock.Sqlmock { return t.mock }

func savedViewRow(view *savedviewtypes.SavedView) []driver.Value {
	data, _ := json.Marshal(savedviewtypes.NewStorableSavedView(view).Data)
	return []driver.Value{
		view.ID.StringValue(),
		view.CreatedAt,
		view.UpdatedAt,
		view.CreatedBy,
		view.UpdatedBy,
		view.OrgID,
		view.Name,
		view.Source.StringValue(),
		string(data),
	}
}

// ExpectCreate sets up the SQL expectation for a Create call.
func (t *StoreTest) ExpectCreate() {
	t.mock.ExpectExec(`INSERT INTO "saved_view"`).WillReturnResult(sqlmock.NewResult(1, 1))
}

// ExpectCreateError sets up the SQL expectation for a Create call whose insert
// fails, e.g. on a UNIQUE(org_id, name) violation.
func (t *StoreTest) ExpectCreateError(err error) {
	t.mock.ExpectExec(`INSERT INTO "saved_view"`).WillReturnError(err)
}

// ExpectGet sets up the SQL expectation for a Get call. Pass view = nil to
// simulate a not-found row.
func (t *StoreTest) ExpectGet(orgID string, id valuer.UUID, view *savedviewtypes.SavedView) {
	rows := sqlmock.NewRows(savedViewColumns)
	if view != nil {
		rows.AddRow(savedViewRow(view)...)
	}

	t.mock.ExpectQuery(`SELECT (.+) FROM "saved_view".+WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `' AND id = '` + regexp.QuoteMeta(id.StringValue()) + `'\)`).
		WillReturnRows(rows)
}

// ExpectUpdate sets up the SQL expectation for an Update call scoped to
// orgID/id. rowsAffected = 0 simulates a not-found target row.
func (t *StoreTest) ExpectUpdate(orgID string, id valuer.UUID, rowsAffected int64) {
	t.mock.ExpectExec(`UPDATE "saved_view".+WHERE \(id = '` + regexp.QuoteMeta(id.StringValue()) + `'\) AND \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).
		WillReturnResult(sqlmock.NewResult(0, rowsAffected))
}

// ExpectDelete sets up the SQL expectation for a Delete call scoped to
// orgID/id. rowsAffected = 0 simulates a not-found target row.
func (t *StoreTest) ExpectDelete(orgID string, id valuer.UUID, rowsAffected int64) {
	t.mock.ExpectExec(`DELETE FROM "saved_view".+WHERE \(id = '` + regexp.QuoteMeta(id.StringValue()) + `'\) AND \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).
		WillReturnResult(sqlmock.NewResult(0, rowsAffected))
}

// ExpectList sets up the SQL expectation for a List call scoped to orgID.
func (t *StoreTest) ExpectList(orgID string, views []*savedviewtypes.SavedView) {
	rows := sqlmock.NewRows(savedViewColumns)
	for _, view := range views {
		rows.AddRow(savedViewRow(view)...)
	}

	t.mock.ExpectQuery(`SELECT (.+) FROM "saved_view".+WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).WillReturnRows(rows)
}

func (t *StoreTest) AssertExpectations() error {
	return t.mock.ExpectationsWereMet()
}
