package savedviewtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func validPostableSavedView() PostableSavedView {
	return PostableSavedView{
		Name:       "my view",
		SourcePage: SourcePageLogs,
		Data: SavedViewData{
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
		view.Data.SchemaVersion = "v1"
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

func TestNewSavedView(t *testing.T) {
	orgID := valuer.GenerateUUID().StringValue()
	view := validPostableSavedView()

	savedView := NewSavedView(orgID, "creator@signoz.io", "updater@signoz.io", view)

	assert.False(t, savedView.ID.IsZero())
	assert.Equal(t, orgID, savedView.OrgID)
	assert.Equal(t, "creator@signoz.io", savedView.CreatedBy)
	assert.Equal(t, "updater@signoz.io", savedView.UpdatedBy)
	assert.Equal(t, view.Name, savedView.Name)
	assert.Equal(t, view.SourcePage, savedView.SourcePage)
	assert.Equal(t, view.Data, savedView.Data)
	assert.False(t, savedView.CreatedAt.IsZero())
	assert.Equal(t, savedView.CreatedAt, savedView.UpdatedAt)
}

func TestNewStatsFromSavedViews(t *testing.T) {
	views := []*SavedView{
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
