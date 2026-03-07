package nfroutingstoretest

import (
	"context"
	"regexp"
	"strings"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/alertmanager/nfmanager/nfroutingstore/sqlroutingstore"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
)

type MockSQLRouteStore struct {
	routeStore alertmanagertypes.RouteStore
	mock       sqlmock.Sqlmock
}

func NewMockSQLRouteStore() *MockSQLRouteStore {
	sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	routeStore := sqlroutingstore.NewStore(sqlStore)

	return &MockSQLRouteStore{
		routeStore: routeStore,
		mock:       sqlStore.Mock(),
	}
}

func (m *MockSQLRouteStore) Mock() sqlmock.Sqlmock {
	return m.mock
}

func (m *MockSQLRouteStore) GetByID(ctx context.Context, orgId string, id string) (*alertmanagertypes.RoutePolicy, error) {
	return m.routeStore.GetByID(ctx, orgId, id)
}

func (m *MockSQLRouteStore) Create(ctx context.Context, route *alertmanagertypes.RoutePolicy) error {
	return m.routeStore.Create(ctx, route)
}

func (m *MockSQLRouteStore) CreateBatch(ctx context.Context, routes []*alertmanagertypes.RoutePolicy) error {
	return m.routeStore.CreateBatch(ctx, routes)
}

func (m *MockSQLRouteStore) Delete(ctx context.Context, orgId string, id string) error {
	return m.routeStore.Delete(ctx, orgId, id)
}

func (m *MockSQLRouteStore) GetAllByKind(ctx context.Context, orgID string, kind alertmanagertypes.ExpressionKind) ([]*alertmanagertypes.RoutePolicy, error) {
	return m.routeStore.GetAllByKind(ctx, orgID, kind)
}

func (m *MockSQLRouteStore) GetAllByName(ctx context.Context, orgID string, name string) ([]*alertmanagertypes.RoutePolicy, error) {
	return m.routeStore.GetAllByName(ctx, orgID, name)
}

func (m *MockSQLRouteStore) DeleteRouteByName(ctx context.Context, orgID string, name string) error {
	return m.routeStore.DeleteRouteByName(ctx, orgID, name)
}

func (m *MockSQLRouteStore) ExpectGetByID(orgID, id string, route *alertmanagertypes.RoutePolicy) {
	rows := sqlmock.NewRows([]string{"id", "org_id", "name", "expression", "kind", "description", "enabled", "tags", "channels", "created_at", "updated_at", "created_by", "updated_by"})

	if route != nil {
		rows.AddRow(
			route.ID.StringValue(),
			route.OrgID,
			route.Name,
			route.Expression,
			route.ExpressionKind.StringValue(),
			route.Description,
			route.Enabled,
			"[]", // tags as JSON
			`["`+strings.Join(route.Channels, `","`)+`"]`, // channels as JSON
			"0001-01-01T00:00:00Z",                        // created_at
			"0001-01-01T00:00:00Z",                        // updated_at
			"",                                            // created_by
			"",                                            // updated_by
		)
	}

	m.mock.ExpectQuery(`SELECT (.+) FROM "route_policy" WHERE \(id = \$1\) AND \(org_id = \$2\)`).
		WithArgs(id, orgID).
		WillReturnRows(rows)
}

func (m *MockSQLRouteStore) ExpectCreate(route *alertmanagertypes.RoutePolicy) {
	expectedPattern := `INSERT INTO "route_policy" \(.+\) VALUES .+`
	m.mock.ExpectExec(expectedPattern).
		WillReturnResult(sqlmock.NewResult(1, 1))
}

func (m *MockSQLRouteStore) ExpectCreateBatch(routes []*alertmanagertypes.RoutePolicy) {
	if len(routes) == 0 {
		return
	}

	// Simplified pattern that should match any INSERT into route_policy
	expectedPattern := `INSERT INTO "route_policy" \(.+\) VALUES .+`

	m.mock.ExpectExec(expectedPattern).
		WillReturnResult(sqlmock.NewResult(1, int64(len(routes))))
}

func (m *MockSQLRouteStore) ExpectDelete(orgID, id string) {
	m.mock.ExpectExec(`DELETE FROM "route_policy" AS "route_policy" WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\) AND \(id = '` + regexp.QuoteMeta(id) + `'\)`).
		WillReturnResult(sqlmock.NewResult(0, 1))
}

func (m *MockSQLRouteStore) ExpectGetAllByKindAndOrgID(orgID string, kind alertmanagertypes.ExpressionKind, routes []*alertmanagertypes.RoutePolicy) {
	rows := sqlmock.NewRows([]string{"id", "org_id", "name", "expression", "kind", "description", "enabled", "tags", "channels", "created_at", "updated_at", "created_by", "updated_by"})

	for _, route := range routes {
		if route.OrgID == orgID && route.ExpressionKind == kind {
			rows.AddRow(
				route.ID.StringValue(),
				route.OrgID,
				route.Name,
				route.Expression,
				route.ExpressionKind.StringValue(),
				route.Description,
				route.Enabled,
				"[]", // tags as JSON
				`["`+strings.Join(route.Channels, `","`)+`"]`, // channels as JSON
				"0001-01-01T00:00:00Z",                        // created_at
				"0001-01-01T00:00:00Z",                        // updated_at
				"",                                            // created_by
				"",                                            // updated_by
			)
		}
	}

	m.mock.ExpectQuery(`SELECT (.+) FROM "route_policy" WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\) AND \(kind = '` + regexp.QuoteMeta(kind.StringValue()) + `'\)`).
		WillReturnRows(rows)
}

func (m *MockSQLRouteStore) ExpectGetAllByName(orgID, name string, routes []*alertmanagertypes.RoutePolicy) {
	rows := sqlmock.NewRows([]string{"id", "org_id", "name", "expression", "kind", "description", "enabled", "tags", "channels", "created_at", "updated_at", "created_by", "updated_by"})

	for _, route := range routes {
		if route.OrgID == orgID && route.Name == name {
			rows.AddRow(
				route.ID.StringValue(),
				route.OrgID,
				route.Name,
				route.Expression,
				route.ExpressionKind.StringValue(),
				route.Description,
				route.Enabled,
				"[]", // tags as JSON
				`["`+strings.Join(route.Channels, `","`)+`"]`, // channels as JSON
				"0001-01-01T00:00:00Z",                        // created_at
				"0001-01-01T00:00:00Z",                        // updated_at
				"",                                            // created_by
				"",                                            // updated_by
			)
		}
	}

	m.mock.ExpectQuery(`SELECT (.+) FROM "route_policy" WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\) AND \(name = '` + regexp.QuoteMeta(name) + `'\)`).
		WillReturnRows(rows)
}

func (m *MockSQLRouteStore) ExpectDeleteRouteByName(orgID, name string) {
	m.mock.ExpectExec(`DELETE FROM "route_policy" AS "route_policy" WHERE \(org_id = '` + regexp.QuoteMeta(orgID) + `'\) AND \(name = '` + regexp.QuoteMeta(name) + `'\)`).
		WillReturnResult(sqlmock.NewResult(0, 1))
}

func (m *MockSQLRouteStore) ExpectationsWereMet() error {
	return m.mock.ExpectationsWereMet()
}

func (m *MockSQLRouteStore) MatchExpectationsInOrder(match bool) {
	m.mock.MatchExpectationsInOrder(match)
}
