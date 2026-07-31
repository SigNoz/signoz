package implsavedview

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory/factorytest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlitesqlstore"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore(t *testing.T) sqlstore.SQLStore {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := sqlitesqlstore.New(context.Background(), factorytest.NewSettings(), sqlstore.Config{
		Provider: "sqlite",
		Connection: sqlstore.ConnectionConfig{
			MaxOpenConns:    1,
			MaxConnLifetime: 0,
		},
		Sqlite: sqlstore.SqliteConfig{
			Path:            dbPath,
			Mode:            "wal",
			BusyTimeout:     5 * time.Second,
			TransactionMode: "deferred",
		},
	})
	require.NoError(t, err)

	_, err = store.BunDB().NewCreateTable().
		Model((*savedviewtypes.SavedView)(nil)).
		IfNotExists().
		Exec(context.Background())
	require.NoError(t, err)

	return store
}

func testPostableSavedView(name string, sourcePage savedviewtypes.SourcePage) savedviewtypes.PostableSavedView {
	return savedviewtypes.PostableSavedView{
		Name:       name,
		SourcePage: sourcePage,
		SavedViewData: savedviewtypes.SavedViewData{
			SchemaVersion: savedviewtypes.SavedViewSchemaVersion,
			Spec: savedviewtypes.SavedViewSpec{
				PanelType: savedviewtypes.PanelTypeGraph,
				Queries: []qbtypes.QueryEnvelope{
					{
						Type: qbtypes.QueryTypeBuilder,
						Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
							Signal:       telemetrytypes.SignalLogs,
							Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
						},
					},
				},
			},
		},
	}
}

func contextWithClaims(orgID, email string) context.Context {
	return authtypes.NewContextWithClaims(context.Background(), authtypes.Claims{
		OrgID: orgID,
		Email: email,
	})
}

func TestModule_CreateAndGetView(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	id, err := m.CreateView(ctx, orgID, testPostableSavedView("my view", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)
	require.False(t, id.IsZero())

	got, err := m.GetView(ctx, orgID, id)
	require.NoError(t, err)
	assert.Equal(t, id, got.ID)
	assert.Equal(t, "my view", got.Name)
	assert.Equal(t, savedviewtypes.SourcePageLogs, got.SourcePage)
	assert.Equal(t, "creator@signoz.io", got.CreatedBy)
	assert.Equal(t, "creator@signoz.io", got.UpdatedBy)
	assert.Equal(t, savedviewtypes.PanelTypeGraph, got.Spec.PanelType)
}

func TestModule_GetView_ScopedToOrg(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgA := valuer.GenerateUUID().StringValue()
	orgB := valuer.GenerateUUID().StringValue()

	id, err := m.CreateView(contextWithClaims(orgA, "a@signoz.io"), orgA, testPostableSavedView("org a's view", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)

	_, err = m.GetView(contextWithClaims(orgB, "b@signoz.io"), orgB, id)
	require.Error(t, err, "a view created under org A must not be visible to org B")
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)
}

func TestModule_UpdateView(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	id, err := m.CreateView(ctx, orgID, testPostableSavedView("original", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)

	updated := testPostableSavedView("renamed", savedviewtypes.SourcePageTraces)
	updated.Spec.PanelType = savedviewtypes.PanelTypeTable

	updateCtx := contextWithClaims(orgID, "updater@signoz.io")
	require.NoError(t, m.UpdateView(updateCtx, orgID, id, updated))

	got, err := m.GetView(ctx, orgID, id)
	require.NoError(t, err)
	assert.Equal(t, "renamed", got.Name)
	assert.Equal(t, savedviewtypes.SourcePageTraces, got.SourcePage)
	assert.Equal(t, savedviewtypes.PanelTypeTable, got.Spec.PanelType)
	assert.Equal(t, "updater@signoz.io", got.UpdatedBy)
	assert.Equal(t, "creator@signoz.io", got.CreatedBy, "creator is untouched by an update")
}

func TestModule_UpdateView_NotFound(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "someone@signoz.io")

	err := m.UpdateView(ctx, orgID, valuer.GenerateUUID(), testPostableSavedView("does not exist", savedviewtypes.SourcePageLogs))
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)
}

func TestModule_UpdateView_ScopedToOrg(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgA := valuer.GenerateUUID().StringValue()
	orgB := valuer.GenerateUUID().StringValue()

	id, err := m.CreateView(contextWithClaims(orgA, "a@signoz.io"), orgA, testPostableSavedView("org a's view", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)

	err = m.UpdateView(contextWithClaims(orgB, "b@signoz.io"), orgB, id, testPostableSavedView("hijacked", savedviewtypes.SourcePageLogs))
	require.Error(t, err, "org B must not be able to update org A's view")
}

func TestModule_DeleteView(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	id, err := m.CreateView(ctx, orgID, testPostableSavedView("my view", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)

	require.NoError(t, m.DeleteView(ctx, orgID, id))

	_, err = m.GetView(ctx, orgID, id)
	require.Error(t, err, "deleted view should no longer be gettable")
}

func TestModule_DeleteView_NotFound(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "someone@signoz.io")

	err := m.DeleteView(ctx, orgID, valuer.GenerateUUID())
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)
}

func TestModule_DeleteView_ScopedToOrg(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgA := valuer.GenerateUUID().StringValue()
	orgB := valuer.GenerateUUID().StringValue()

	id, err := m.CreateView(contextWithClaims(orgA, "a@signoz.io"), orgA, testPostableSavedView("org a's view", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)

	err = m.DeleteView(contextWithClaims(orgB, "b@signoz.io"), orgB, id)
	require.Error(t, err, "org B must not be able to delete org A's view")
	assert.True(t, errors.Ast(err, errors.TypeNotFound))
}

func TestModule_GetViewsForFilters(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	_, err := m.CreateView(ctx, orgID, testPostableSavedView("logs overview", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)
	_, err = m.CreateView(ctx, orgID, testPostableSavedView("logs errors", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)
	_, err = m.CreateView(ctx, orgID, testPostableSavedView("traces overview", savedviewtypes.SourcePageTraces))
	require.NoError(t, err)

	t.Run("filters by source page", func(t *testing.T) {
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourcePageLogs, "")
		require.NoError(t, err)
		assert.Len(t, views, 2)
	})

	t.Run("filters by name substring", func(t *testing.T) {
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourcePageLogs, "errors")
		require.NoError(t, err)
		require.Len(t, views, 1)
		assert.Equal(t, "logs errors", views[0].Name)
	})

	t.Run("source page filter is an exact match, not a wildcard", func(t *testing.T) {
		// source_page is matched with =, not LIKE, so a zero-value
		// SourcePage doesn't mean "any" -- it matches nothing.
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourcePage{}, "")
		require.NoError(t, err)
		assert.Empty(t, views)
	})

	t.Run("scoped to org", func(t *testing.T) {
		otherOrgID := valuer.GenerateUUID().StringValue()
		views, err := m.GetViewsForFilters(ctx, otherOrgID, savedviewtypes.SourcePageLogs, "")
		require.NoError(t, err)
		assert.Empty(t, views)
	})
}

func TestModule_Collect(t *testing.T) {
	store := newTestStore(t)
	m := NewModule(store)

	orgID := valuer.GenerateUUID()
	ctx := contextWithClaims(orgID.StringValue(), "creator@signoz.io")

	_, err := m.CreateView(ctx, orgID.StringValue(), testPostableSavedView("logs a", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)
	_, err = m.CreateView(ctx, orgID.StringValue(), testPostableSavedView("logs b", savedviewtypes.SourcePageLogs))
	require.NoError(t, err)
	_, err = m.CreateView(ctx, orgID.StringValue(), testPostableSavedView("traces a", savedviewtypes.SourcePageTraces))
	require.NoError(t, err)

	stats, err := m.Collect(context.Background(), orgID)
	require.NoError(t, err)
	assert.Equal(t, int64(3), stats["savedview.count"])
	assert.Equal(t, int64(2), stats["savedview.source.logs.count"])
	assert.Equal(t, int64(1), stats["savedview.source.traces.count"])
}
