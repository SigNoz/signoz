package savedviewtypes

import (
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func validPostableSavedView() PostableSavedView {
	return PostableSavedView{
		Name:       "my view",
		SourcePage: SourcePageLogs,
		SavedViewData: SavedViewData{
			SchemaVersion: SavedViewSchemaVersion,
			Spec:          SavedViewSpec{PanelType: PanelTypeGraph, Queries: validQueries()},
		},
	}
}

func TestSourcePageValidate(t *testing.T) {
	cases := []struct {
		name        string
		sourcePage  SourcePage
		expectError bool
	}{
		{name: "traces", sourcePage: SourcePageTraces},
		{name: "logs", sourcePage: SourcePageLogs},
		{name: "metrics", sourcePage: SourcePageMetrics},
		{name: "meter", sourcePage: SourcePageMeter},
		{name: "unknown is rejected", sourcePage: SourcePage{valuer.NewString("bogus")}, expectError: true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.sourcePage.Validate()
			if c.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPostableSavedViewValidate(t *testing.T) {
	t.Run("valid view", func(t *testing.T) {
		view := validPostableSavedView()
		assert.NoError(t, view.Validate())
	})

	t.Run("invalid source page is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.SourcePage = SourcePage{valuer.NewString("bogus")}
		assert.Error(t, view.Validate())
	})

	t.Run("invalid saved view data is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.SchemaVersion = "v1"
		assert.Error(t, view.Validate())
	})
}

func TestListSavedViewsParamsValidate(t *testing.T) {
	t.Run("zero source page is allowed", func(t *testing.T) {
		params := ListSavedViewsParams{}
		assert.NoError(t, params.Validate())
	})

	t.Run("valid source page is allowed", func(t *testing.T) {
		params := ListSavedViewsParams{SourcePage: SourcePageLogs}
		assert.NoError(t, params.Validate())
	})

	t.Run("invalid source page is rejected", func(t *testing.T) {
		params := ListSavedViewsParams{SourcePage: SourcePage{valuer.NewString("bogus")}}
		assert.Error(t, params.Validate())
	})
}

func TestNewStorableSavedView(t *testing.T) {
	orgID := valuer.GenerateUUID().StringValue()
	view := validPostableSavedView()

	storable := NewStorableSavedView(orgID, "creator@signoz.io", "updater@signoz.io", view)

	assert.False(t, storable.ID.IsZero())
	assert.Equal(t, orgID, storable.OrgID)
	assert.Equal(t, "creator@signoz.io", storable.CreatedBy)
	assert.Equal(t, "updater@signoz.io", storable.UpdatedBy)
	assert.Equal(t, view.Name, storable.Name)
	assert.Equal(t, view.SourcePage, storable.SourcePage)
	assert.Equal(t, view.SavedViewData, storable.Data)
	assert.False(t, storable.CreatedAt.IsZero())
	assert.Equal(t, storable.CreatedAt, storable.UpdatedAt)
}

func TestNewGettableSavedViewFromStorable(t *testing.T) {
	t.Run("nil selected fields are normalized to an empty slice", func(t *testing.T) {
		storable := &StorableSavedView{
			Name:       "my view",
			SourcePage: SourcePageLogs,
			Data: SavedViewData{
				SchemaVersion: SavedViewSchemaVersion,
				Spec:          SavedViewSpec{PanelType: PanelTypeGraph, Queries: validQueries(), SelectedFields: nil},
			},
		}

		gettable := NewGettableSavedViewFromStorable(storable)

		require.NotNil(t, gettable.Spec.SelectedFields)
		assert.Empty(t, gettable.Spec.SelectedFields)
	})

	t.Run("existing selected fields are preserved", func(t *testing.T) {
		fields := []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}}
		storable := &StorableSavedView{
			Name:       "my view",
			SourcePage: SourcePageLogs,
			Data: SavedViewData{
				SchemaVersion: SavedViewSchemaVersion,
				Spec:          SavedViewSpec{PanelType: PanelTypeGraph, Queries: validQueries(), SelectedFields: fields},
			},
		}

		gettable := NewGettableSavedViewFromStorable(storable)

		assert.Equal(t, fields, gettable.Spec.SelectedFields)
	})

	t.Run("all fields carried over", func(t *testing.T) {
		now := time.Now()
		storable := &StorableSavedView{
			Name:       "my view",
			SourcePage: SourcePageTraces,
			Data: SavedViewData{
				SchemaVersion: SavedViewSchemaVersion,
				Spec:          SavedViewSpec{PanelType: PanelTypeTable, Queries: validQueries()},
			},
		}
		storable.ID = valuer.GenerateUUID()
		storable.CreatedAt = now
		storable.UpdatedAt = now
		storable.CreatedBy = "creator@signoz.io"
		storable.UpdatedBy = "updater@signoz.io"

		gettable := NewGettableSavedViewFromStorable(storable)

		assert.Equal(t, storable.ID, gettable.ID)
		assert.Equal(t, storable.Name, gettable.Name)
		assert.Equal(t, storable.CreatedAt, gettable.CreatedAt)
		assert.Equal(t, storable.CreatedBy, gettable.CreatedBy)
		assert.Equal(t, storable.UpdatedAt, gettable.UpdatedAt)
		assert.Equal(t, storable.UpdatedBy, gettable.UpdatedBy)
		assert.Equal(t, storable.SourcePage, gettable.SourcePage)
		assert.Equal(t, storable.Data.SchemaVersion, gettable.SchemaVersion)
		assert.Equal(t, storable.Data.Spec.PanelType, gettable.Spec.PanelType)
	})
}

func TestNewStatsFromSavedViews(t *testing.T) {
	views := []*StorableSavedView{
		{SourcePage: SourcePageLogs},
		{SourcePage: SourcePageLogs},
		{SourcePage: SourcePageTraces},
	}

	stats := NewStatsFromSavedViews(views)

	assert.Equal(t, int64(3), stats["savedview.count"])
	assert.Equal(t, int64(2), stats["savedview.source.logs.count"])
	assert.Equal(t, int64(1), stats["savedview.source.traces.count"])
	assert.NotContains(t, stats, "savedview.source.metrics.count")
}
