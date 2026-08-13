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

// Row is a saved view as stored. Data overrides the data column derived from
// View, so tests can inject stored data that no longer decodes.
type Row struct {
	View *savedviewtypes.SavedView
	Data string
}

func savedViewRow(row Row) []driver.Value {
	view := row.View
	data := row.Data
	if data == "" {
		marshalled, _ := json.Marshal(savedviewtypes.NewStorableSavedView(view).Data)
		data = string(marshalled)
	}

	return []driver.Value{
		view.ID.StringValue(),
		view.CreatedAt,
		view.UpdatedAt,
		view.CreatedBy,
		view.UpdatedBy,
		view.OrgID,
		view.Name,
		view.Source.StringValue(),
		data,
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
	if view == nil {
		t.ExpectGetRows(orgID, id)
		return
	}

	t.ExpectGetRows(orgID, id, Row{View: view})
}

// ExpectGetRows is ExpectGet with control over the stored data column.
func (t *StoreTest) ExpectGetRows(orgID string, id valuer.UUID, returned ...Row) {
	rows := sqlmock.NewRows(savedViewColumns)
	for _, row := range returned {
		rows.AddRow(savedViewRow(row)...)
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
	returned := make([]Row, len(views))
	for idx, view := range views {
		returned[idx] = Row{View: view}
	}

	t.ExpectListRows(orgID, returned...)
}

// ExpectListRows is ExpectList with control over each row's stored data column.
func (t *StoreTest) ExpectListRows(orgID string, returned ...Row) {
	rows := sqlmock.NewRows(savedViewColumns)
	for _, row := range returned {
		rows.AddRow(savedViewRow(row)...)
	}

	t.mock.ExpectQuery(`SELECT (.+) FROM "saved_view".+WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).WillReturnRows(rows)
}

func (t *StoreTest) AssertExpectations() error {
	return t.mock.ExpectationsWereMet()
}
