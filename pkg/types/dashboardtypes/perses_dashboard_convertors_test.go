package dashboardtypes

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestDashboardV2(t *testing.T, orgID valuer.UUID, source Source) *DashboardV2 {
	t.Helper()
	createdAt := time.Date(2026, time.January, 1, 12, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, time.January, 2, 12, 0, 0, 0, time.UTC)

	spec := DashboardSpec{
		Panels: map[string]*Panel{
			"p1": {
				Kind: "Panel",
				Spec: PanelSpec{
					Plugin: PanelPlugin{
						Kind: PanelKindTimeSeries,
						Spec: &TimeSeriesPanelSpec{
							Visualization: TimeSeriesVisualization{
								BasicVisualization: BasicVisualization{TimePreference: TimePreferenceGlobalTime},
							},
							Formatting: PanelFormatting{DecimalPrecision: PrecisionOption2},
							ChartAppearance: TimeSeriesChartAppearance{
								LineInterpolation: LineInterpolationSpline,
								LineStyle:         LineStyleSolid,
								FillMode:          FillModeSolid,
								SpanGaps:          SpanGaps{FillLessThan: valuer.MustParseTextDuration("60s")},
							},
							Legend: Legend{Position: LegendPositionBottom},
						},
					},
					Queries: []Query{
						{
							Kind: qb.RequestTypeTimeSeries,
							Spec: QuerySpec{
								Plugin: QueryPlugin{
									Kind: QueryKindPromQL,
									Spec: &PromQLQuerySpec{Name: "A", Query: "up"},
								},
							},
						},
					},
				},
			},
		},
		Layouts: []Layout{},
	}

	return &DashboardV2{
		Identifiable:  types.Identifiable{ID: valuer.GenerateUUID()},
		TimeAuditable: types.TimeAuditable{CreatedAt: createdAt, UpdatedAt: updatedAt},
		UserAuditable: types.UserAuditable{CreatedBy: "alice", UpdatedBy: "bob"},
		OrgID:         orgID,
		Locked:        true,
		Source:        source,
		DashboardV2MetadataBase: DashboardV2MetadataBase{
			SchemaVersion: SchemaVersion,
			Image:         "data:image/png;base64,abc",
		},
		Name: "production-overview",
		Tags: []*tagtypes.Tag{
			tagtypes.NewTag(orgID, coretypes.KindDashboard, "team", "platform"),
			tagtypes.NewTag(orgID, coretypes.KindDashboard, "env", "prod"),
		},
		Spec: spec,
	}
}

func TestPostableDashboardV2NewDashboardV2(t *testing.T) {
	orgID := valuer.GenerateUUID()

	cases := []struct {
		scenario       string
		source         Source
		expectedLocked bool
	}{
		{
			scenario:       "user source is not locked",
			source:         SourceUser,
			expectedLocked: false,
		},
		{
			scenario:       "system source is not locked",
			source:         SourceSystem,
			expectedLocked: false,
		},
		{
			scenario:       "integration source is locked",
			source:         SourceIntegration,
			expectedLocked: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.scenario, func(t *testing.T) {
			postable := PostableDashboardV2{
				DashboardV2MetadataBase: DashboardV2MetadataBase{
					SchemaVersion: SchemaVersion,
					Image:         "img",
				},
				Name: "my-dashboard",
				Tags: []tagtypes.PostableTag{
					{Key: "team", Value: "platform"},
					{Key: "env", Value: "prod"},
				},
				Spec: DashboardSpec{},
			}

			before := time.Now()
			dashboard := postable.NewDashboardV2(orgID, "alice", tc.source)
			after := time.Now()

			require.NotNil(t, dashboard)
			assert.False(t, dashboard.ID.IsZero(), "expected a freshly generated UUID")
			assert.Equal(t, orgID, dashboard.OrgID)
			assert.Equal(t, tc.source, dashboard.Source)
			assert.Equal(t, tc.expectedLocked, dashboard.Locked)
			assert.Equal(t, postable.DashboardV2MetadataBase, dashboard.DashboardV2MetadataBase)
			assert.Equal(t, postable.Name, dashboard.Name)
			assert.Equal(t, postable.Spec, dashboard.Spec)

			assert.Equal(t, "alice", dashboard.CreatedBy)
			assert.Equal(t, "alice", dashboard.UpdatedBy)
			assert.True(t, dashboard.CreatedAt.Equal(dashboard.UpdatedAt), "createdAt should equal updatedAt on creation")
			assert.False(t, dashboard.CreatedAt.Before(before), "createdAt should be >= before")
			assert.False(t, dashboard.CreatedAt.After(after), "createdAt should be <= after")

			require.Len(t, dashboard.Tags, 2, "expected 2 tags")
			for i, expectedTag := range postable.Tags {
				assert.Equal(t, expectedTag.Key, dashboard.Tags[i].Key)
				assert.Equal(t, expectedTag.Value, dashboard.Tags[i].Value)
				assert.Equal(t, orgID, dashboard.Tags[i].OrgID)
				assert.Equal(t, coretypes.KindDashboard, dashboard.Tags[i].Kind)
				assert.False(t, dashboard.Tags[i].ID.IsZero(), "tag should have a UUID")
			}
		})
	}

	t.Run("each invocation mints a distinct ID", func(t *testing.T) {
		postable := PostableDashboardV2{
			DashboardV2MetadataBase: DashboardV2MetadataBase{SchemaVersion: SchemaVersion},
			Name:                    "x",
			Spec:                    DashboardSpec{},
		}

		first := postable.NewDashboardV2(orgID, "alice", SourceUser)
		second := postable.NewDashboardV2(orgID, "alice", SourceUser)
		assert.NotEqual(t, first.ID, second.ID, "expected distinct UUIDs across invocations")
	})

	t.Run("generateName derives name from display.name with a random suffix", func(t *testing.T) {
		postable := PostableDashboardV2{
			DashboardV2MetadataBase: DashboardV2MetadataBase{SchemaVersion: SchemaVersion},
			GenerateName:            true,
			Spec: DashboardSpec{
				Display: Display{Name: "My Dashboard!"},
			},
		}

		dashboard := postable.NewDashboardV2(orgID, "alice", SourceUser)
		assert.True(t, strings.HasPrefix(dashboard.Name, "my-dashboard-"), "expected slug prefix, got %q", dashboard.Name)
		assert.Len(t, dashboard.Name, len("my-dashboard-")+dashboardNameSuffixLen)
	})
}

func TestDashboardV2ToGettableDashboardV2(t *testing.T) {
	orgID := valuer.GenerateUUID()

	t.Run("copies all scalar fields and converts tags", func(t *testing.T) {
		dashboard := newTestDashboardV2(t, orgID, SourceUser)

		gettable := dashboard.ToGettableDashboardV2()

		assert.Equal(t, dashboard.Identifiable, gettable.Identifiable)
		assert.Equal(t, dashboard.TimeAuditable, gettable.TimeAuditable)
		assert.Equal(t, dashboard.UserAuditable, gettable.UserAuditable)
		assert.Equal(t, dashboard.OrgID, gettable.OrgID)
		assert.Equal(t, dashboard.Locked, gettable.Locked)
		assert.Equal(t, dashboard.Source, gettable.Source)
		assert.Equal(t, dashboard.DashboardV2MetadataBase, gettable.DashboardV2MetadataBase)
		assert.Equal(t, dashboard.Name, gettable.Name)
		assert.Equal(t, dashboard.Spec, gettable.Spec)

		require.Len(t, gettable.Tags, len(dashboard.Tags))
		for i, sourceTag := range dashboard.Tags {
			require.NotNil(t, gettable.Tags[i])
			assert.Equal(t, sourceTag.Key, gettable.Tags[i].Key)
			assert.Equal(t, sourceTag.Value, gettable.Tags[i].Value)
		}
	})
}

func TestDashboardV2ToPostableForCloning(t *testing.T) {
	orgID := valuer.GenerateUUID()
	dashboard := newTestDashboardV2(t, orgID, SourceUser)

	postable := dashboard.ToPostableForCloning()

	assert.True(t, postable.GenerateName, "internal name must be regenerated, not copied")
	assert.Empty(t, postable.Name, "name must be empty so generateName can derive it")
	assert.Equal(t, dashboard.DashboardV2MetadataBase, postable.DashboardV2MetadataBase, "schema version and image are carried over")
	assert.Equal(t, dashboard.Spec, postable.Spec, "spec (incl. display name) is preserved verbatim")

	require.Len(t, postable.Tags, len(dashboard.Tags))
	for i, sourceTag := range dashboard.Tags {
		assert.Equal(t, sourceTag.Key, postable.Tags[i].Key)
		assert.Equal(t, sourceTag.Value, postable.Tags[i].Value)
	}
}

func TestDashboardV2StorableRoundTrip(t *testing.T) {
	orgID := valuer.GenerateUUID()
	original := newTestDashboardV2(t, orgID, SourceIntegration)

	storable, err := original.ToStorableDashboard()
	require.NoError(t, err)
	require.NotNil(t, storable)

	// Simulate the DB hop on the text `data` column.
	raw, err := json.Marshal(storable.Data)
	require.NoError(t, err)
	var reloadedData StorableDashboardData
	require.NoError(t, json.Unmarshal(raw, &reloadedData))
	storable.Data = reloadedData

	restored, err := storable.ToDashboardV2(original.Tags)
	require.NoError(t, err)
	require.NotNil(t, restored)

	assert.Equal(t, original, restored)
}
