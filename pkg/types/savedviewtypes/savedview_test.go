package savedviewtypes

import (
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/util/validation"
)

func validPostableSavedView() PostableSavedView {
	return PostableSavedView{
		Name:          "my-view",
		Source:        SourceLogs,
		SchemaVersion: SavedViewSchemaVersion,
		Spec:          SavedViewSpec{DisplayName: "My View", PanelType: PanelTypeGraph, Queries: validQueries()},
	}
}

func validUpdatableSavedView() UpdatableSavedView {
	return UpdatableSavedView{
		Source:        SourceLogs,
		SchemaVersion: SavedViewSchemaVersion,
		Spec:          SavedViewSpec{DisplayName: "My View", PanelType: PanelTypeGraph, Queries: validQueries()},
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
		view.SchemaVersion = SchemaVersion{valuer.NewString("v1")}
		assert.Error(t, view.Validate())
	})

	t.Run("invalid name is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.Name = "My View"
		assert.Error(t, view.Validate())
	})

	t.Run("empty name without generateName is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.Name = ""
		assert.ErrorContains(t, view.Validate(), "name is required")
	})

	t.Run("generateName true with empty name is allowed -- generated at ToSavedView time", func(t *testing.T) {
		view := validPostableSavedView()
		view.Name = ""
		view.GenerateName = true
		assert.NoError(t, view.Validate())
	})

	t.Run("generateName true with a non-empty name is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.GenerateName = true
		assert.ErrorContains(t, view.Validate(), "name must be empty when generateName is true")
	})

	t.Run("empty displayName is rejected", func(t *testing.T) {
		view := validPostableSavedView()
		view.Spec.DisplayName = ""
		assert.ErrorContains(t, view.Validate(), "displayName is required")
	})
}

func TestUpdatableSavedViewValidate(t *testing.T) {
	t.Run("valid view", func(t *testing.T) {
		view := validUpdatableSavedView()
		assert.NoError(t, view.Validate())
	})

	t.Run("invalid source is rejected", func(t *testing.T) {
		view := validUpdatableSavedView()
		view.Source = Source{valuer.NewString("bogus")}
		assert.Error(t, view.Validate())
	})

	t.Run("empty displayName is rejected", func(t *testing.T) {
		view := validUpdatableSavedView()
		view.Spec.DisplayName = ""
		assert.ErrorContains(t, view.Validate(), "displayName is required")
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

	savedView := view.ToSavedView(orgID, "creator@signoz.io")

	assert.False(t, savedView.ID.IsZero())
	assert.Equal(t, orgID, savedView.OrgID)
	assert.Equal(t, "creator@signoz.io", savedView.CreatedBy)
	assert.Equal(t, "creator@signoz.io", savedView.UpdatedBy)
	assert.Equal(t, view.Name, savedView.Name)
	assert.Equal(t, view.Source, savedView.Source)
	assert.Equal(t, view.SchemaVersion, savedView.SchemaVersion)
	assert.Equal(t, view.Spec, savedView.Spec)
	assert.False(t, savedView.CreatedAt.IsZero())
	assert.Equal(t, savedView.CreatedAt, savedView.UpdatedAt)
}

func TestNewSavedView_GeneratesNameWhenEmpty(t *testing.T) {
	orgID := valuer.GenerateUUID().StringValue()
	view := validPostableSavedView()
	view.Name = ""
	view.GenerateName = true
	view.Spec.DisplayName = "My View!"

	savedView := view.ToSavedView(orgID, "creator@signoz.io")

	assert.NotEmpty(t, savedView.Name)
	assert.Empty(t, validation.IsDNS1123Label(savedView.Name), "generated name must be a valid DNS-1123 label")
	assert.True(t, strings.HasPrefix(savedView.Name, "my-view-"))
	assert.Equal(t, "My View!", savedView.Spec.DisplayName)
}

func TestGenerateSavedViewName(t *testing.T) {
	tests := []struct {
		scenario   string
		input      string
		wantPrefix string
	}{
		{scenario: "simple words with spaces", input: "My View", wantPrefix: "my-view"},
		{scenario: "punctuation collapses", input: "Hello, World!", wantPrefix: "hello-world"},
		{scenario: "leading and trailing whitespace", input: "  hello  ", wantPrefix: "hello"},
		{scenario: "leading and trailing hyphens", input: "---abc---", wantPrefix: "abc"},
		{scenario: "consecutive non-alphanumerics collapse", input: "a___b...c", wantPrefix: "a-b-c"},
		{scenario: "digits are preserved", input: "Region us-east-1", wantPrefix: "region-us-east-1"},
		{scenario: "no alphanumerics drops prefix and returns suffix only", input: "!!! ???", wantPrefix: ""},
	}

	for _, tt := range tests {
		t.Run(tt.scenario, func(t *testing.T) {
			got := generateSavedViewName(tt.input)
			assert.NotEmpty(t, got)
			assert.LessOrEqual(t, len(got), 63)
			assert.Empty(t, validation.IsDNS1123Label(got), "result must be a valid DNS-1123 label")

			if tt.wantPrefix == "" {
				assert.Len(t, got, savedViewNameSuffixLen, "expected the bare random suffix")
				return
			}
			expectedPrefix := tt.wantPrefix + "-"
			assert.True(t, strings.HasPrefix(got, expectedPrefix), "expected prefix %q, got %q", expectedPrefix, got)
			assert.Len(t, got, len(expectedPrefix)+savedViewNameSuffixLen)
		})
	}

	t.Run("suffix differs across calls", func(t *testing.T) {
		first := generateSavedViewName("collision-test")
		second := generateSavedViewName("collision-test")
		assert.NotEqual(t, first, second, "expected the random suffix to differ across calls")
	})
}

func TestStorableSavedView_ToSavedView(t *testing.T) {
	t.Run("round trip preserves populated fields", func(t *testing.T) {
		view := &SavedView{
			Name:          "my-view",
			Source:        SourceLogs,
			SchemaVersion: SavedViewSchemaVersion,
			Spec: SavedViewSpec{
				DisplayName:    "My View",
				PanelType:      PanelTypeGraph,
				Queries:        validQueries(),
				SelectedFields: []telemetrytypes.TelemetryFieldKey{{Name: "service.name"}},
			},
		}
		view.OrgID = valuer.GenerateUUID().StringValue()

		roundTripped := NewStorableSavedView(view).ToSavedView()

		assert.Equal(t, view.OrgID, roundTripped.OrgID)
		assert.Equal(t, view.Name, roundTripped.Name)
		assert.Equal(t, view.Source, roundTripped.Source)
		assert.Equal(t, view.SchemaVersion, roundTripped.SchemaVersion)
		assert.Equal(t, view.Spec, roundTripped.Spec)
	})

	t.Run("nil selectedFields normalizes to an empty slice, not nil", func(t *testing.T) {
		storable := &StorableSavedView{
			Data: SavedViewData{
				SchemaVersion: SavedViewSchemaVersion.StringValue(),
				Spec: SavedViewSpec{
					DisplayName:    "My View",
					PanelType:      PanelTypeGraph,
					Queries:        validQueries(),
					SelectedFields: nil,
				},
			},
		}

		view := storable.ToSavedView()

		assert.NotNil(t, view.Spec.SelectedFields)
		assert.Empty(t, view.Spec.SelectedFields)
	})

	t.Run("nil queries normalizes to an empty slice, not nil", func(t *testing.T) {
		storable := &StorableSavedView{
			Data: SavedViewData{
				SchemaVersion: SavedViewSchemaVersion.StringValue(),
				Spec: SavedViewSpec{
					DisplayName: "My View",
					PanelType:   PanelTypeGraph,
					Queries:     nil,
				},
			},
		}

		view := storable.ToSavedView()

		assert.NotNil(t, view.Spec.Queries)
		assert.Empty(t, view.Spec.Queries)
	})
}

func TestNewStatsFromStorableSavedViews(t *testing.T) {
	storables := []*StorableSavedView{
		{Source: SourceLogs},
		{Source: SourceLogs},
		{Source: SourceTraces},
	}

	stats := NewStatsFromStorableSavedViews(storables)

	assert.Equal(t, int64(3), stats["savedview.count"])
	assert.Equal(t, int64(2), stats["savedview.source.logs.count"])
	assert.Equal(t, int64(1), stats["savedview.source.traces.count"])
	assert.NotContains(t, stats, "savedview.source.metrics.count")
}

func TestNewSavedViewsFromStorableSavedViews(t *testing.T) {
	storables := []*StorableSavedView{
		{Name: "a", Source: SourceLogs, Data: SavedViewData{SchemaVersion: SavedViewSchemaVersion.StringValue(), Spec: SavedViewSpec{DisplayName: "a", PanelType: PanelTypeGraph, Queries: validQueries()}}},
		{Name: "b", Source: SourceTraces, Data: SavedViewData{SchemaVersion: SavedViewSchemaVersion.StringValue(), Spec: SavedViewSpec{DisplayName: "b", PanelType: PanelTypeTable, Queries: validQueries()}}},
	}

	views := NewSavedViewsFromStorableSavedViews(storables)

	require.Len(t, views, 2)
	assert.Equal(t, "a", views[0].Name)
	assert.Equal(t, SourceLogs, views[0].Source)
	assert.Equal(t, "b", views[1].Name)
	assert.Equal(t, SourceTraces, views[1].Source)
}
