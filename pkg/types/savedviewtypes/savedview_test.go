package savedviewtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func validPostableSavedView() PostableSavedView {
	return PostableSavedView{
		Name:   "my view",
		Source: SourceLogs,
		Data: SavedViewData{
			SchemaVersion: SavedViewSchemaVersion,
			Spec:          SavedViewSpec{PanelType: PanelTypeGraph, Queries: validQueries()},
		},
	}
}

func TestSourceValidate(t *testing.T) {
	cases := []struct {
		name        string
		source      Source
		expectError bool
	}{
		{name: "traces", source: SourceTraces},
		{name: "logs", source: SourceLogs},
		{name: "metrics", source: SourceMetrics},
		{name: "meter", source: SourceMeter},
		{name: "unknown is rejected", source: Source{valuer.NewString("bogus")}, expectError: true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.source.Validate()
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

	t.Run("invalid source is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.Source = Source{valuer.NewString("bogus")}
		assert.Error(t, view.Validate())
	})

	t.Run("invalid saved view data is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.Data.SchemaVersion = "v1"
		assert.Error(t, view.Validate())
	})
}

func TestListSavedViewsParamsValidate(t *testing.T) {
	t.Run("zero source is allowed", func(t *testing.T) {
		params := ListSavedViewsParams{}
		assert.NoError(t, params.Validate())
	})

	t.Run("valid source is allowed", func(t *testing.T) {
		params := ListSavedViewsParams{Source: SourceLogs}
		assert.NoError(t, params.Validate())
	})

	t.Run("invalid source is rejected", func(t *testing.T) {
		params := ListSavedViewsParams{Source: Source{valuer.NewString("bogus")}}
		assert.Error(t, params.Validate())
	})
}

func TestNewSavedView(t *testing.T) {
	orgID := valuer.GenerateUUID().StringValue()
	view := validPostableSavedView()

	savedView := NewSavedView(orgID, "creator@signoz.io", "updater@signoz.io", view)

	assert.False(t, savedView.ID.IsZero())
	assert.Equal(t, orgID, savedView.OrgID)
	assert.Equal(t, "creator@signoz.io", savedView.CreatedBy)
	assert.Equal(t, "updater@signoz.io", savedView.UpdatedBy)
	assert.Equal(t, view.Name, savedView.Name)
	assert.Equal(t, view.Source, savedView.Source)
	assert.Equal(t, view.Data, savedView.Data)
	assert.False(t, savedView.CreatedAt.IsZero())
	assert.Equal(t, savedView.CreatedAt, savedView.UpdatedAt)
}

func TestNewStatsFromSavedViews(t *testing.T) {
	views := []*SavedView{
		{Source: SourceLogs},
		{Source: SourceLogs},
		{Source: SourceTraces},
	}

	stats := NewStatsFromSavedViews(views)

	assert.Equal(t, int64(3), stats["savedview.count"])
	assert.Equal(t, int64(2), stats["savedview.source.logs.count"])
	assert.Equal(t, int64(1), stats["savedview.source.traces.count"])
	assert.NotContains(t, stats, "savedview.source.metrics.count")
}
