// Package implsavedviewtest provides a sqlmock-backed savedviewtypes.Store,
// mirroring rulestore/rulestoretest and nfroutingstore/nfroutingstoretest:
// it delegates to the real implsavedview store so tests assert against
// genuinely-generated SQL, rather than a hand-rolled fake.
package implsavedviewtest

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"regexp"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var savedViewColumns = []string{"id", "created_at", "updated_at", "created_by", "updated_by", "org_id", "name", "source_page", "data"}

type MockSavedViewStore struct {
	store savedviewtypes.Store
	mock  sqlmock.Sqlmock
}

func NewMockSavedViewStore() *MockSavedViewStore {
	sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	store := implsavedview.NewStore(sqlStore)

	return &MockSavedViewStore{
		store: store,
		mock:  sqlStore.Mock(),
	}
}

func (m *MockSavedViewStore) Mock() sqlmock.Sqlmock {
	return m.mock
}

func (m *MockSavedViewStore) Create(ctx context.Context, view *savedviewtypes.SavedView) error {
	return m.store.Create(ctx, view)
}

func (m *MockSavedViewStore) Get(ctx context.Context, orgID string, id valuer.UUID) (*savedviewtypes.SavedView, error) {
	return m.store.Get(ctx, orgID, id)
}

func (m *MockSavedViewStore) Update(ctx context.Context, view *savedviewtypes.SavedView) error {
	return m.store.Update(ctx, view)
}

func (m *MockSavedViewStore) Delete(ctx context.Context, orgID string, id valuer.UUID) error {
	return m.store.Delete(ctx, orgID, id)
}

func (m *MockSavedViewStore) List(ctx context.Context, orgID string, sourcePage savedviewtypes.SourcePage, name string) ([]*savedviewtypes.SavedView, error) {
	return m.store.List(ctx, orgID, sourcePage, name)
}

func savedViewRow(view *savedviewtypes.SavedView) []driver.Value {
	data, _ := json.Marshal(view.Data)
	return []driver.Value{
		view.ID.StringValue(),
		view.CreatedAt,
		view.UpdatedAt,
		view.CreatedBy,
		view.UpdatedBy,
		view.OrgID,
		view.Name,
		view.SourcePage.StringValue(),
		string(data),
	}
}

// ExpectCreate sets up the SQL expectation for a Create call.
func (m *MockSavedViewStore) ExpectCreate() {
	m.mock.ExpectExec(`INSERT INTO "saved_view"`).WillReturnResult(sqlmock.NewResult(1, 1))
}

// ExpectGet sets up the SQL expectation for a Get call. Pass view = nil to
// simulate a not-found row.
func (m *MockSavedViewStore) ExpectGet(orgID string, id valuer.UUID, view *savedviewtypes.SavedView) {
	rows := sqlmock.NewRows(savedViewColumns)
	if view != nil {
		rows.AddRow(savedViewRow(view)...)
	}

	m.mock.ExpectQuery(`SELECT (.+) FROM "saved_view".+WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `' AND id = '` + regexp.QuoteMeta(id.StringValue()) + `'\)`).
		WillReturnRows(rows)
}

// ExpectUpdate sets up the SQL expectation for an Update call scoped to
// orgID/id. rowsAffected = 0 simulates a not-found target row.
func (m *MockSavedViewStore) ExpectUpdate(orgID string, id valuer.UUID, rowsAffected int64) {
	m.mock.ExpectExec(`UPDATE "saved_view".+WHERE \(id = '` + regexp.QuoteMeta(id.StringValue()) + `'\) AND \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).
		WillReturnResult(sqlmock.NewResult(0, rowsAffected))
}

// ExpectDelete sets up the SQL expectation for a Delete call scoped to
// orgID/id. rowsAffected = 0 simulates a not-found target row.
func (m *MockSavedViewStore) ExpectDelete(orgID string, id valuer.UUID, rowsAffected int64) {
	m.mock.ExpectExec(`DELETE FROM "saved_view".+WHERE \(id = '` + regexp.QuoteMeta(id.StringValue()) + `'\) AND \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).
		WillReturnResult(sqlmock.NewResult(0, rowsAffected))
}

// ExpectList sets up the SQL expectation for a List call scoped to orgID.
func (m *MockSavedViewStore) ExpectList(orgID string, views []*savedviewtypes.SavedView) {
	rows := sqlmock.NewRows(savedViewColumns)
	for _, view := range views {
		rows.AddRow(savedViewRow(view)...)
	}

	m.mock.ExpectQuery(`SELECT (.+) FROM "saved_view".+WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\)`).WillReturnRows(rows)
}

func (m *MockSavedViewStore) AssertExpectations() error {
	return m.mock.ExpectationsWereMet()
}
