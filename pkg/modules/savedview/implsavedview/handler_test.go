package implsavedview

import (
	"encoding/json"
	"testing"
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/savedviewtypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testQueries() []qbtypes.QueryEnvelope {
	return []qbtypes.QueryEnvelope{
		{
			Type: qbtypes.QueryTypeBuilder,
			Spec: qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]{
				Signal:       telemetrytypes.SignalLogs,
				Aggregations: []qbtypes.LogAggregation{{Expression: "count()"}},
			},
		},
	}
}

func TestNewPostableSavedViewFromLegacyView(t *testing.T) {
	t.Run("all fields carried over", func(t *testing.T) {
		legacy := &v3.SavedView{
			Name:       "my view",
			SourcePage: "logs",
			CompositeQuery: &v3.CompositeQuery{
				PanelType: v3.PanelTypeGraph,
				Queries:   testQueries(),
			},
			ExtraData: `{"color":"blue","selectColumns":[{"name":"service.name"}],"format":"table","maxLines":10,"fontSize":"large"}`,
		}

		postable := newPostableSavedViewFromLegacyView(legacy)

		assert.Equal(t, "my view", postable.Name)
		assert.Equal(t, savedviewtypes.SourcePageLogs, postable.SourcePage)
		assert.Equal(t, savedviewtypes.SavedViewSchemaVersion, postable.Data.SchemaVersion)
		assert.Equal(t, savedviewtypes.PanelTypeGraph, postable.Data.Spec.PanelType)
		assert.Equal(t, legacy.CompositeQuery.Queries, postable.Data.Spec.Queries)
		assert.Equal(t, []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}}, postable.Data.Spec.SelectedFields)
		assert.Equal(t, savedviewtypes.Display{MaxLines: 10, FontSize: "large", Format: "table", Color: "blue"}, postable.Data.Spec.Display)
	})

	t.Run("empty extra data leaves display and selected fields zero-valued", func(t *testing.T) {
		legacy := &v3.SavedView{
			Name:       "no extra data",
			SourcePage: "traces",
			CompositeQuery: &v3.CompositeQuery{
				PanelType: v3.PanelTypeTable,
				Queries:   testQueries(),
			},
			ExtraData: "",
		}

		postable := newPostableSavedViewFromLegacyView(legacy)

		assert.Equal(t, savedviewtypes.Display{}, postable.Data.Spec.Display)
		assert.Nil(t, postable.Data.Spec.SelectedFields)
	})

	t.Run("malformed extra data is ignored, not an error", func(t *testing.T) {
		legacy := &v3.SavedView{
			Name:       "malformed extra data",
			SourcePage: "metrics",
			CompositeQuery: &v3.CompositeQuery{
				PanelType: v3.PanelTypeList,
				Queries:   testQueries(),
			},
			ExtraData: `{not valid json`,
		}

		postable := newPostableSavedViewFromLegacyView(legacy)

		assert.Equal(t, "malformed extra data", postable.Name)
		assert.Equal(t, savedviewtypes.Display{}, postable.Data.Spec.Display)
	})
}

func TestNewLegacyViewFromSavedView(t *testing.T) {
	now := time.Now()
	savedView := &savedviewtypes.SavedView{
		Name:       "my view",
		SourcePage: savedviewtypes.SourcePageLogs,
		Data: savedviewtypes.SavedViewData{
			SchemaVersion: savedviewtypes.SavedViewSchemaVersion,
			Spec: savedviewtypes.SavedViewSpec{
				PanelType:      savedviewtypes.PanelTypeGraph,
				Queries:        testQueries(),
				SelectedFields: []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}},
				Display:        savedviewtypes.Display{MaxLines: 10, FontSize: "large", Format: "table", Color: "blue"},
			},
		},
	}
	savedView.ID = valuer.GenerateUUID()
	savedView.CreatedAt = now
	savedView.UpdatedAt = now
	savedView.CreatedBy = "creator@signoz.io"
	savedView.UpdatedBy = "updater@signoz.io"

	legacy, err := newLegacyViewFromSavedView(savedView)
	require.NoError(t, err)

	assert.Equal(t, savedView.ID, legacy.ID)
	assert.Equal(t, savedView.Name, legacy.Name)
	assert.Equal(t, savedView.CreatedAt, legacy.CreatedAt)
	assert.Equal(t, savedView.CreatedBy, legacy.CreatedBy)
	assert.Equal(t, savedView.UpdatedAt, legacy.UpdatedAt)
	assert.Equal(t, savedView.UpdatedBy, legacy.UpdatedBy)
	assert.Equal(t, "logs", legacy.SourcePage)
	assert.Equal(t, v3.PanelTypeGraph, legacy.CompositeQuery.PanelType)
	assert.Equal(t, v3.QueryTypeBuilder, legacy.CompositeQuery.QueryType)
	assert.Equal(t, savedView.Data.Spec.Queries, legacy.CompositeQuery.Queries)

	var extra legacyExtraData
	require.NoError(t, json.Unmarshal([]byte(legacy.ExtraData), &extra))
	assert.Equal(t, "blue", extra.Color)
	assert.Equal(t, savedView.Data.Spec.SelectedFields, extra.SelectColumns)
	assert.Equal(t, "table", extra.Format)
	assert.Equal(t, 10, extra.MaxLines)
	assert.Equal(t, "large", extra.FontSize)
}

func TestNewLegacyViewsFromSavedViews(t *testing.T) {
	a := &savedviewtypes.SavedView{Name: "a", SourcePage: savedviewtypes.SourcePageLogs, Data: savedviewtypes.SavedViewData{Spec: savedviewtypes.SavedViewSpec{PanelType: savedviewtypes.PanelTypeGraph, Queries: testQueries()}}}
	b := &savedviewtypes.SavedView{Name: "b", SourcePage: savedviewtypes.SourcePageTraces, Data: savedviewtypes.SavedViewData{Spec: savedviewtypes.SavedViewSpec{PanelType: savedviewtypes.PanelTypeTable, Queries: testQueries()}}}

	legacyViews, err := newLegacyViewsFromSavedViews([]*savedviewtypes.SavedView{a, b})
	require.NoError(t, err)
	require.Len(t, legacyViews, 2)
	assert.Equal(t, "a", legacyViews[0].Name)
	assert.Equal(t, "b", legacyViews[1].Name)
}

// TestLegacyViewRoundTrip guards the whole v1<->v2 bridge: converting a
// SavedView to its legacy shape and back must recover the fields the legacy
// frontend round-trips through (name, sourcePage, panelType, queries,
// selectedFields, display) -- these two functions are each other's inverse
// on the API surface, so a regression in either should fail this.
func TestLegacyViewRoundTrip(t *testing.T) {
	original := &savedviewtypes.SavedView{
		Name:       "round trip",
		SourcePage: savedviewtypes.SourcePageMetrics,
		Data: savedviewtypes.SavedViewData{
			SchemaVersion: savedviewtypes.SavedViewSchemaVersion,
			Spec: savedviewtypes.SavedViewSpec{
				PanelType:      savedviewtypes.PanelTypeTable,
				Queries:        testQueries(),
				SelectedFields: []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}},
				Display:        savedviewtypes.Display{MaxLines: 5, FontSize: "small", Format: "list", Color: "red"},
			},
		},
	}

	legacy, err := newLegacyViewFromSavedView(original)
	require.NoError(t, err)

	roundTripped := newPostableSavedViewFromLegacyView(legacy)

	assert.Equal(t, original.Name, roundTripped.Name)
	assert.Equal(t, original.SourcePage, roundTripped.SourcePage)
	assert.Equal(t, original.Data.Spec.PanelType, roundTripped.Data.Spec.PanelType)
	assert.Equal(t, original.Data.Spec.Queries, roundTripped.Data.Spec.Queries)
	assert.Equal(t, original.Data.Spec.SelectedFields, roundTripped.Data.Spec.SelectedFields)
	assert.Equal(t, original.Data.Spec.Display, roundTripped.Data.Spec.Display)
}
