package implsavedview_test

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedviewtest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
				SelectedFields: []telemetrytypes.TelemetryFieldKey{},
			},
		},
	}
}

func testSavedView(orgID string, id valuer.UUID, updatedBy string, view savedviewtypes.PostableSavedView) *savedviewtypes.SavedView {
	savedView := savedviewtypes.NewSavedView(orgID, "creator@signoz.io", updatedBy, view)
	savedView.ID = id
	return savedView
}

func contextWithClaims(orgID, email string) context.Context {
	return authtypes.NewContextWithClaims(context.Background(), authtypes.Claims{
		OrgID: orgID,
		Email: email,
	})
}

func TestModule_CreateAndGetView(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")
	view := testPostableSavedView("my view", savedviewtypes.SourcePageLogs)

	store.ExpectCreate()
	id, err := m.CreateView(ctx, orgID, view)
	require.NoError(t, err)
	require.False(t, id.IsZero())

	stored := testSavedView(orgID, id, "creator@signoz.io", view)
	store.ExpectGet(orgID, id, stored)
	got, err := m.GetView(ctx, orgID, id)
	require.NoError(t, err)
	assert.Equal(t, id, got.ID)
	assert.Equal(t, "my view", got.Name)
	assert.Equal(t, savedviewtypes.SourcePageLogs, got.SourcePage)
	assert.Equal(t, "creator@signoz.io", got.CreatedBy)
	assert.Equal(t, "creator@signoz.io", got.UpdatedBy)
	assert.Equal(t, savedviewtypes.PanelTypeGraph, got.Spec.PanelType)

	require.NoError(t, store.AssertExpectations())
}

func TestModule_GetView_NotFound(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	store.ExpectGet(orgID, id, nil)
	_, err := m.GetView(contextWithClaims(orgID, "someone@signoz.io"), orgID, id)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, store.AssertExpectations())
}

func TestModule_GetView_ScopedToOrg(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgB := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	// The mock only has an expectation for orgB's WHERE clause; a lookup
	// scoped to org A's real id must not accidentally match it.
	store.ExpectGet(orgB, id, nil)
	_, err := m.GetView(contextWithClaims(orgB, "b@signoz.io"), orgB, id)
	require.Error(t, err, "a view created under org A must not be visible to org B")
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, store.AssertExpectations())
}

func TestModule_UpdateView(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	updated := testPostableSavedView("renamed", savedviewtypes.SourcePageTraces)
	updated.Spec.PanelType = savedviewtypes.PanelTypeTable

	store.ExpectUpdate(orgID, id, 1)
	require.NoError(t, m.UpdateView(contextWithClaims(orgID, "updater@signoz.io"), orgID, id, updated))

	stored := testSavedView(orgID, id, "updater@signoz.io", updated)
	store.ExpectGet(orgID, id, stored)
	got, err := m.GetView(contextWithClaims(orgID, "creator@signoz.io"), orgID, id)
	require.NoError(t, err)
	assert.Equal(t, "renamed", got.Name)
	assert.Equal(t, savedviewtypes.SourcePageTraces, got.SourcePage)
	assert.Equal(t, savedviewtypes.PanelTypeTable, got.Spec.PanelType)
	assert.Equal(t, "updater@signoz.io", got.UpdatedBy)

	require.NoError(t, store.AssertExpectations())
}

func TestModule_UpdateView_NotFound(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "someone@signoz.io")
	id := valuer.GenerateUUID()

	store.ExpectUpdate(orgID, id, 0)
	err := m.UpdateView(ctx, orgID, id, testPostableSavedView("does not exist", savedviewtypes.SourcePageLogs))
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, store.AssertExpectations())
}

func TestModule_UpdateView_ScopedToOrg(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgB := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	// Only an update scoped to orgB's WHERE clause is registered; updating
	// org A's view while authenticated as org B must not match it.
	store.ExpectUpdate(orgB, id, 0)
	err := m.UpdateView(contextWithClaims(orgB, "b@signoz.io"), orgB, id, testPostableSavedView("hijacked", savedviewtypes.SourcePageLogs))
	require.Error(t, err, "org B must not be able to update org A's view")
	assert.True(t, errors.Ast(err, errors.TypeNotFound))

	require.NoError(t, store.AssertExpectations())
}

func TestModule_DeleteView(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")
	id := valuer.GenerateUUID()

	store.ExpectDelete(orgID, id, 1)
	require.NoError(t, m.DeleteView(ctx, orgID, id))

	require.NoError(t, store.AssertExpectations())
}

func TestModule_DeleteView_NotFound(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "someone@signoz.io")
	id := valuer.GenerateUUID()

	store.ExpectDelete(orgID, id, 0)
	err := m.DeleteView(ctx, orgID, id)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, store.AssertExpectations())
}

func TestModule_DeleteView_ScopedToOrg(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgB := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	store.ExpectDelete(orgB, id, 0)
	err := m.DeleteView(contextWithClaims(orgB, "b@signoz.io"), orgB, id)
	require.Error(t, err, "org B must not be able to delete org A's view")
	assert.True(t, errors.Ast(err, errors.TypeNotFound))

	require.NoError(t, store.AssertExpectations())
}

func TestModule_GetViewsForFilters(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	logsOverview := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs overview", savedviewtypes.SourcePageLogs))
	logsErrors := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs errors", savedviewtypes.SourcePageLogs))
	tracesOverview := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("traces overview", savedviewtypes.SourcePageTraces))

	t.Run("filters by source page", func(t *testing.T) {
		store.ExpectList(orgID, []*savedviewtypes.SavedView{logsOverview, logsErrors})
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourcePageLogs, "")
		require.NoError(t, err)
		assert.Len(t, views, 2)
	})

	t.Run("filters by name substring", func(t *testing.T) {
		store.ExpectList(orgID, []*savedviewtypes.SavedView{logsErrors})
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourcePageLogs, "errors")
		require.NoError(t, err)
		require.Len(t, views, 1)
		assert.Equal(t, "logs errors", views[0].Name)
	})

	t.Run("omitted source page returns everything, not nothing", func(t *testing.T) {
		// Fixes a bug: source_page used to be an unconditional exact-match
		// clause, so a zero-value sourcePage matched zero rows -- even though
		// ListSavedViewsParams.Validate() treats a zero SourcePage as valid
		// ("no filter"). Store.List now only applies the source_page clause
		// when it's non-zero.
		store.ExpectList(orgID, []*savedviewtypes.SavedView{logsOverview, logsErrors, tracesOverview})
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourcePage{}, "")
		require.NoError(t, err)
		assert.Len(t, views, 3)
	})

	t.Run("scoped to org", func(t *testing.T) {
		otherOrgID := valuer.GenerateUUID().StringValue()
		store.ExpectList(otherOrgID, nil)
		views, err := m.GetViewsForFilters(ctx, otherOrgID, savedviewtypes.SourcePageLogs, "")
		require.NoError(t, err)
		assert.Empty(t, views)
	})

	require.NoError(t, store.AssertExpectations())
}

func TestModule_Collect(t *testing.T) {
	store := implsavedviewtest.NewMockSavedViewStore()
	m := implsavedview.NewModule(store)

	orgID := valuer.GenerateUUID()

	logsA := testSavedView(orgID.StringValue(), valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs a", savedviewtypes.SourcePageLogs))
	logsB := testSavedView(orgID.StringValue(), valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs b", savedviewtypes.SourcePageLogs))
	tracesA := testSavedView(orgID.StringValue(), valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("traces a", savedviewtypes.SourcePageTraces))

	store.ExpectList(orgID.StringValue(), []*savedviewtypes.SavedView{logsA, logsB, tracesA})
	stats, err := m.Collect(context.Background(), orgID)
	require.NoError(t, err)
	assert.Equal(t, int64(3), stats["savedview.count"])
	assert.Equal(t, int64(2), stats["savedview.source.logs.count"])
	assert.Equal(t, int64(1), stats["savedview.source.traces.count"])

	require.NoError(t, store.AssertExpectations())
}
