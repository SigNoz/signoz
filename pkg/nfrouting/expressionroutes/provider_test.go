package expressionroutes

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/types/nfroutingtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockRouteStore implements nfroutingtypes.RouteStore for testing
type mockRouteStore struct {
	routes map[string][]nfroutingtypes.ExpressionRoute
}

func newMockRouteStore() *mockRouteStore {
	return &mockRouteStore{
		routes: make(map[string][]nfroutingtypes.ExpressionRoute),
	}
}

func (m *mockRouteStore) GetByID(ctx context.Context, id valuer.UUID) (*nfroutingtypes.ExpressionRoute, error) {
	for _, orgRoutes := range m.routes {
		for _, route := range orgRoutes {
			if route.ID.StringValue() == id.StringValue() {
				return &route, nil
			}
		}
	}
	return nil, nil
}

func (m *mockRouteStore) Create(ctx context.Context, route *nfroutingtypes.ExpressionRoute) (valuer.UUID, error) {
	if m.routes[route.OrgID] == nil {
		m.routes[route.OrgID] = make([]nfroutingtypes.ExpressionRoute, 0)
	}
	m.routes[route.OrgID] = append(m.routes[route.OrgID], *route)
	return route.ID, nil
}

func (m *mockRouteStore) Update(ctx context.Context, route *nfroutingtypes.ExpressionRoute) error {
	for orgID, orgRoutes := range m.routes {
		if orgID == route.OrgID {
			for i, existingRoute := range orgRoutes {
				if existingRoute.ID.StringValue() == route.ID.StringValue() {
					m.routes[orgID][i] = *route
					return nil
				}
			}
		}
	}
	return nil
}

func (m *mockRouteStore) Delete(ctx context.Context, id string) error {
	for orgID, orgRoutes := range m.routes {
		for i, route := range orgRoutes {
			if route.ID.StringValue() == id {
				m.routes[orgID] = append(orgRoutes[:i], orgRoutes[i+1:]...)
				return nil
			}
		}
	}
	return nil
}

func (m *mockRouteStore) GetAllByOrgID(ctx context.Context, orgID string) ([]nfroutingtypes.ExpressionRoute, error) {
	routes, exists := m.routes[orgID]
	if !exists {
		return []nfroutingtypes.ExpressionRoute{}, nil
	}
	return routes, nil
}

func TestNew(t *testing.T) {
	ctx := context.Background()
	mockStore := newMockRouteStore()
	settings := factorytest.NewSettings()

	provider, err := New(ctx, settings, mockStore)
	require.NoError(t, err)
	require.NotNil(t, provider)

	// Test that it implements the statsreporter.StatsCollector interface
	stats, err := provider.Collect(ctx, valuer.GenerateUUID())
	require.NoError(t, err)
	assert.Nil(t, stats) // Current implementation returns nil
}

func TestNewFactory(t *testing.T) {
	mockStore := newMockRouteStore()
	factory := NewFactory(mockStore)

	require.NotNil(t, factory)
	assert.Equal(t, "expression", factory.Name().String())
}

func TestProvider_Collect(t *testing.T) {
	ctx := context.Background()
	mockStore := newMockRouteStore()
	settings := factorytest.NewSettings()

	provider, err := New(ctx, settings, mockStore)
	require.NoError(t, err)

	// Test Collect method
	uuid := valuer.GenerateUUID()
	stats, err := provider.Collect(ctx, uuid)
	require.NoError(t, err)
	assert.Nil(t, stats) // Current implementation returns nil stats
}

func TestRouteStore_CRUD_Operations(t *testing.T) {
	ctx := context.Background()
	mockStore := newMockRouteStore()

	// Test Create
	route := &nfroutingtypes.ExpressionRoute{
		Expression: `labels["severity"] == "critical"`,
		Channels:   []string{"slack-alerts"},
		Priority:   "high",
		Name:       "Critical Alert Route",
		OrgID:      "test-org-1",
	}
	route.ID = valuer.GenerateUUID()

	_, err := mockStore.Create(ctx, route)
	require.NoError(t, err)

	// Test GetByID
	retrieved, err := mockStore.GetByID(ctx, route.ID)
	require.NoError(t, err)
	require.NotNil(t, retrieved)
	assert.Equal(t, route.Expression, retrieved.Expression)
	assert.Equal(t, route.Channels, retrieved.Channels)
	assert.Equal(t, route.OrgID, retrieved.OrgID)

	// Test GetAllByOrgID
	routes, err := mockStore.GetAllByOrgID(ctx, "test-org-1")
	require.NoError(t, err)
	assert.Len(t, routes, 1)
	assert.Equal(t, route.Expression, routes[0].Expression)

	// Test Update
	route.Expression = `labels["severity"] == "warning"`
	err = mockStore.Update(ctx, route)
	require.NoError(t, err)

	updated, err := mockStore.GetByID(ctx, route.ID)
	require.NoError(t, err)
	assert.Equal(t, `labels["severity"] == "warning"`, updated.Expression)

	// Test Delete
	err = mockStore.Delete(ctx, route.ID.StringValue())
	require.NoError(t, err)

	deleted, err := mockStore.GetByID(ctx, route.ID)
	require.NoError(t, err)
	assert.Nil(t, deleted)

	// Test GetAllByOrgID after delete
	routes, err = mockStore.GetAllByOrgID(ctx, "test-org-1")
	require.NoError(t, err)
	assert.Len(t, routes, 0)
}

func TestRouteStore_MultipleOrganizations(t *testing.T) {
	ctx := context.Background()
	mockStore := newMockRouteStore()

	// Create routes for different organizations
	route1 := &nfroutingtypes.ExpressionRoute{
		Expression: `labels["service"] == "auth"`,
		Channels:   []string{"auth-team"},
		OrgID:      "org-1",
	}
	route1.ID = valuer.GenerateUUID()

	route2 := &nfroutingtypes.ExpressionRoute{
		Expression: `labels["service"] == "payment"`,
		Channels:   []string{"payment-team"},
		OrgID:      "org-2",
	}
	route2.ID = valuer.GenerateUUID()

	_, err := mockStore.Create(ctx, route1)
	require.NoError(t, err)

	_, err = mockStore.Create(ctx, route2)
	require.NoError(t, err)

	// Test isolation between organizations
	org1Routes, err := mockStore.GetAllByOrgID(ctx, "org-1")
	require.NoError(t, err)
	assert.Len(t, org1Routes, 1)
	assert.Equal(t, "auth-team", org1Routes[0].Channels[0])

	org2Routes, err := mockStore.GetAllByOrgID(ctx, "org-2")
	require.NoError(t, err)
	assert.Len(t, org2Routes, 1)
	assert.Equal(t, "payment-team", org2Routes[0].Channels[0])

	// Test nonexistent organization
	emptyRoutes, err := mockStore.GetAllByOrgID(ctx, "nonexistent-org")
	require.NoError(t, err)
	assert.Len(t, emptyRoutes, 0)
}
