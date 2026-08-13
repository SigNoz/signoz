package implsavedview_test

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/savedview"
	"github.com/SigNoz/signoz/pkg/modules/savedview/implsavedview"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes/savedviewtypestest"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestStore() (savedview.Module, *savedviewtypestest.StoreTest) {
	sqlStore := sqlstoretest.New(sqlstore.Config{Provider: "sqlite"}, sqlmock.QueryMatcherRegexp)
	store := implsavedview.NewStore(sqlStore)
	return implsavedview.NewModule(store, instrumentationtest.New().ToProviderSettings()), savedviewtypestest.New(store, sqlStore.Mock())
}

func testPostableSavedView(name string, source savedviewtypes.Source) savedviewtypes.PostableSavedView {
	return savedviewtypes.PostableSavedView{
		Name:          name,
		Source:        source,
		SchemaVersion: savedviewtypes.SavedViewSchemaVersion,
		Spec: savedviewtypes.SavedViewSpec{
			DisplayName: name,
			PanelType:   savedviewtypes.PanelTypeGraph,
			RequestType: qbtypes.RequestTypeTimeSeries,
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
	}
}

func testUpdatableSavedView(displayName string, source savedviewtypes.Source) savedviewtypes.UpdatableSavedView {
	postable := testPostableSavedView(displayName, source)
	return savedviewtypes.UpdatableSavedView{
		Source:        postable.Source,
		SchemaVersion: postable.SchemaVersion,
		Spec:          postable.Spec,
	}
}

func testSavedView(orgID string, id valuer.UUID, updatedBy string, view savedviewtypes.PostableSavedView) *savedviewtypes.SavedView {
	savedView := view.ToSavedView(orgID, "creator@signoz.io")
	savedView.ID = id
	savedView.UpdatedBy = updatedBy
	return savedView
}

func contextWithClaims(orgID, email string) context.Context {
	return authtypes.NewContextWithClaims(context.Background(), authtypes.Claims{
		OrgID: orgID,
		Email: email,
	})
}

func TestModule_CreateAndGetView(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")
	view := testPostableSavedView("my view", savedviewtypes.SourceLogs)

	st.ExpectCreate()
	id, err := m.CreateView(ctx, orgID, view)
	require.NoError(t, err)
	require.False(t, id.IsZero())

	stored := testSavedView(orgID, id, "creator@signoz.io", view)
	st.ExpectGet(orgID, id, stored)
	got, err := m.GetView(ctx, orgID, id)
	require.NoError(t, err)
	assert.Equal(t, id, got.ID)
	assert.Equal(t, "my view", got.Name)
	assert.Equal(t, savedviewtypes.SourceLogs, got.Source)
	assert.Equal(t, "creator@signoz.io", got.CreatedBy)
	assert.Equal(t, "creator@signoz.io", got.UpdatedBy)
	assert.Equal(t, savedviewtypes.PanelTypeGraph, got.Spec.PanelType)

	require.NoError(t, st.AssertExpectations())
}

// A duplicate-name insert failure must surface as errors.TypeAlreadyExists, not a generic internal error.
func TestModule_CreateView_DuplicateNameIsConflict(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	st.ExpectCreateError(errors.Newf(errors.TypeInternal, errors.CodeInternal, "UNIQUE constraint failed: saved_view.org_id, saved_view.name"))
	_, err := m.CreateView(ctx, orgID, testPostableSavedView("same-name", savedviewtypes.SourceLogs))
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeAlreadyExists), "expected an already-exists error, got %v", err)

	require.NoError(t, st.AssertExpectations())
}

func TestModule_GetView_NotFound(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	st.ExpectGet(orgID, id, nil)
	_, err := m.GetView(contextWithClaims(orgID, "someone@signoz.io"), orgID, id)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, st.AssertExpectations())
}

func TestModule_GetView_ScopedToOrg(t *testing.T) {
	m, st := newTestStore()

	orgB := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	// The mock only has an expectation for orgB's WHERE clause; a lookup
	// scoped to org A's real id must not accidentally match it.
	st.ExpectGet(orgB, id, nil)
	_, err := m.GetView(contextWithClaims(orgB, "b@signoz.io"), orgB, id)
	require.Error(t, err, "a view created under org A must not be visible to org B")
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, st.AssertExpectations())
}

func TestModule_UpdateView(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	existing := testSavedView(orgID, id, "creator@signoz.io", testPostableSavedView("my-view", savedviewtypes.SourceLogs))
	existingName := existing.Name

	updated := testUpdatableSavedView("renamed", savedviewtypes.SourceTraces)
	updated.Spec.PanelType = savedviewtypes.PanelTypeTable

	st.ExpectUpdate(orgID, id, 1)
	require.NoError(t, m.UpdateView(contextWithClaims(orgID, "updater@signoz.io"), orgID, id, updated))

	stored := testSavedView(orgID, id, "updater@signoz.io", testPostableSavedView("renamed", savedviewtypes.SourceTraces))
	stored.Name = existingName
	stored.Spec.PanelType = savedviewtypes.PanelTypeTable
	st.ExpectGet(orgID, id, stored)
	got, err := m.GetView(contextWithClaims(orgID, "creator@signoz.io"), orgID, id)
	require.NoError(t, err)
	assert.Equal(t, existingName, got.Name, "name must not change on update")
	assert.Equal(t, "renamed", got.Spec.DisplayName)
	assert.Equal(t, savedviewtypes.SourceTraces, got.Source)
	assert.Equal(t, savedviewtypes.PanelTypeTable, got.Spec.PanelType)
	assert.Equal(t, "updater@signoz.io", got.UpdatedBy)

	require.NoError(t, st.AssertExpectations())
}

func TestModule_UpdateView_NotFound(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "someone@signoz.io")
	id := valuer.GenerateUUID()

	st.ExpectUpdate(orgID, id, 0)
	err := m.UpdateView(ctx, orgID, id, testUpdatableSavedView("does-not-exist", savedviewtypes.SourceLogs))
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, st.AssertExpectations())
}

func TestModule_UpdateView_ScopedToOrg(t *testing.T) {
	m, st := newTestStore()

	orgB := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	// Only an Update scoped to orgB's WHERE clause is registered; updating org
	// A's view while authenticated as org B must not match it.
	st.ExpectUpdate(orgB, id, 0)
	err := m.UpdateView(contextWithClaims(orgB, "b@signoz.io"), orgB, id, testUpdatableSavedView("hijacked", savedviewtypes.SourceLogs))
	require.Error(t, err, "org B must not be able to update org A's view")
	assert.True(t, errors.Ast(err, errors.TypeNotFound))

	require.NoError(t, st.AssertExpectations())
}

func TestModule_DeleteView(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")
	id := valuer.GenerateUUID()

	st.ExpectDelete(orgID, id, 1)
	require.NoError(t, m.DeleteView(ctx, orgID, id))

	require.NoError(t, st.AssertExpectations())
}

func TestModule_DeleteView_NotFound(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "someone@signoz.io")
	id := valuer.GenerateUUID()

	st.ExpectDelete(orgID, id, 0)
	err := m.DeleteView(ctx, orgID, id)
	require.Error(t, err)
	assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

	require.NoError(t, st.AssertExpectations())
}

func TestModule_DeleteView_ScopedToOrg(t *testing.T) {
	m, st := newTestStore()

	orgB := valuer.GenerateUUID().StringValue()
	id := valuer.GenerateUUID()

	st.ExpectDelete(orgB, id, 0)
	err := m.DeleteView(contextWithClaims(orgB, "b@signoz.io"), orgB, id)
	require.Error(t, err, "org B must not be able to delete org A's view")
	assert.True(t, errors.Ast(err, errors.TypeNotFound))

	require.NoError(t, st.AssertExpectations())
}

func TestModule_GetViewsForFilters(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	logsOverview := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs overview", savedviewtypes.SourceLogs))
	logsErrors := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs errors", savedviewtypes.SourceLogs))
	tracesOverview := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("traces overview", savedviewtypes.SourceTraces))

	t.Run("filters by source page", func(t *testing.T) {
		st.ExpectList(orgID, []*savedviewtypes.SavedView{logsOverview, logsErrors})
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourceLogs, "")
		require.NoError(t, err)
		assert.Len(t, views, 2)
	})

	t.Run("filters by name substring", func(t *testing.T) {
		st.ExpectList(orgID, []*savedviewtypes.SavedView{logsErrors})
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourceLogs, "errors")
		require.NoError(t, err)
		require.Len(t, views, 1)
		assert.Equal(t, "logs errors", views[0].Name)
	})

	t.Run("omitted source page returns everything, not nothing", func(t *testing.T) {
		// Fixes a bug: source used to be an unconditional exact-match
		// clause, so a zero-value source matched zero rows -- even though
		// ListSavedViewsParams.Validate() treats a zero Source as valid
		// ("no filter"). Store.List now only applies the source clause
		// when it's non-zero.
		st.ExpectList(orgID, []*savedviewtypes.SavedView{logsOverview, logsErrors, tracesOverview})
		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.Source{}, "")
		require.NoError(t, err)
		assert.Len(t, views, 3)
	})

	t.Run("scoped to org", func(t *testing.T) {
		otherOrgID := valuer.GenerateUUID().StringValue()
		st.ExpectList(otherOrgID, nil)
		views, err := m.GetViewsForFilters(ctx, otherOrgID, savedviewtypes.SourceLogs, "")
		require.NoError(t, err)
		assert.Empty(t, views)
	})

	require.NoError(t, st.AssertExpectations())
}

// A view whose stored data no longer decodes must not take the rest of the list
// down with it.
func TestModule_UndecodableViewIsSkippedFromList(t *testing.T) {
	orgID := valuer.GenerateUUID().StringValue()
	ctx := contextWithClaims(orgID, "creator@signoz.io")

	const undecodableData = `{"schemaVersion":"v2","spec":{"displayName":"Broken View","panelType":"list","requestType":"raw",` +
		`"queries":[{"type":"builder_query","spec":{"signal":"logs","sinceRemovedField":1}}]}}`

	broken := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("broken-view", savedviewtypes.SourceLogs))
	healthy := testSavedView(orgID, valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("healthy-view", savedviewtypes.SourceLogs))

	t.Run("list serves every view that still decodes", func(t *testing.T) {
		m, st := newTestStore()

		st.ExpectListRows(orgID,
			savedviewtypestest.Row{View: broken, Data: undecodableData},
			savedviewtypestest.Row{View: healthy},
		)

		views, err := m.GetViewsForFilters(ctx, orgID, savedviewtypes.SourceLogs, "")
		require.NoError(t, err)
		require.Len(t, views, 1)
		assert.Equal(t, "healthy-view", views[0].Name)
		assert.Len(t, views[0].Spec.Queries, 1)

		require.NoError(t, st.AssertExpectations())
	})

	// Get still decodes during the scan, so it fails for the view itself. That is
	// as far as the damage goes: nothing else in the org is affected.
	t.Run("get fails for the view itself", func(t *testing.T) {
		m, st := newTestStore()

		st.ExpectGetRows(orgID, broken.ID, savedviewtypestest.Row{View: broken, Data: undecodableData})

		_, err := m.GetView(ctx, orgID, broken.ID)
		require.Error(t, err)
		assert.True(t, errors.Ast(err, errors.TypeNotFound), "expected a not-found error, got %v", err)

		require.NoError(t, st.AssertExpectations())
	})
}

func TestModule_Collect(t *testing.T) {
	m, st := newTestStore()

	orgID := valuer.GenerateUUID()

	logsA := testSavedView(orgID.StringValue(), valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs a", savedviewtypes.SourceLogs))
	logsB := testSavedView(orgID.StringValue(), valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("logs b", savedviewtypes.SourceLogs))
	tracesA := testSavedView(orgID.StringValue(), valuer.GenerateUUID(), "creator@signoz.io", testPostableSavedView("traces a", savedviewtypes.SourceTraces))

	st.ExpectList(orgID.StringValue(), []*savedviewtypes.SavedView{logsA, logsB, tracesA})
	stats, err := m.Collect(context.Background(), orgID)
	require.NoError(t, err)
	assert.Equal(t, int64(3), stats["savedview.count"])
	assert.Equal(t, int64(2), stats["savedview.source.logs.count"])
	assert.Equal(t, int64(1), stats["savedview.source.traces.count"])

	require.NoError(t, st.AssertExpectations())
}
