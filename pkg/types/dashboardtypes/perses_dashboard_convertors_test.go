package dashboardtypes

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

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
		Display: Display{Name: "Test Dashboard"},
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
								SpanGaps:          SpanGaps{FillLessThan: "60s"},
							},
							Legend: Legend{Position: LegendPositionBottom, Mode: LegendModeList},
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
	assert.Equal(t, "Test Dashboard - Copy", postable.Spec.Display.Name, "clone appends a Copy suffix to the display name")

	// The rest of the spec is carried over unchanged.
	expectedSpec := dashboard.Spec
	expectedSpec.Display.Name = "Test Dashboard - Copy"
	assert.Equal(t, expectedSpec, postable.Spec)
	assert.Equal(t, "Test Dashboard", dashboard.Spec.Display.Name, "the source dashboard's display name is not mutated")

	require.Len(t, postable.Tags, len(dashboard.Tags))
	for i, sourceTag := range dashboard.Tags {
		assert.Equal(t, sourceTag.Key, postable.Tags[i].Key)
		assert.Equal(t, sourceTag.Value, postable.Tags[i].Value)
	}
}

// nextCloneDisplayName appends " - Copy", bumps an existing " - Copy (n)"
// counter, and truncates an over-long base back to MaxDisplayNameLen while
// keeping the suffix whole. The long cases are real-ish titles already at the
// limit so the truncated output is legible; their literal expectations assume
// the 128-character limit.
func TestNextCloneDisplayName(t *testing.T) {
	require.Equal(t, 128, MaxDisplayNameLen, "the literal expectations below are sized for a 128-character limit")

	testCases := []struct {
		scenario string
		input    string
		expected string
	}{
		{
			scenario: "plain name gets a Copy suffix",
			input:    "My Dashboard",
			expected: "My Dashboard - Copy",
		},
		{
			scenario: "Copy suffix bumps to (2)",
			input:    "My Dashboard - Copy",
			expected: "My Dashboard - Copy (2)",
		},
		{
			scenario: "numbered suffix increments",
			input:    "My Dashboard - Copy (2)",
			expected: "My Dashboard - Copy (3)",
		},
		{
			scenario: "multi-digit suffix increments",
			input:    "svc - Copy (41)",
			expected: "svc - Copy (42)",
		},
		{
			scenario: "a name that merely contains Copy is not a suffix",
			input:    "Copy of things",
			expected: "Copy of things - Copy",
		},
		{
			scenario: "only the trailing Copy marker is stripped",
			input:    "Prod - Copy - Copy",
			expected: "Prod - Copy - Copy (2)",
		},
		{
			scenario: "empty name",
			input:    "",
			expected: " - Copy",
		},
		{
			scenario: "first copy at the limit truncates the base, keeps the suffix",
			input:    "Production Kubernetes Cluster Health: CPU, Memory, Disk I/O, and Network Saturation Across Every Namespace and Availability Zone",
			expected: "Production Kubernetes Cluster Health: CPU, Memory, Disk I/O, and Network Saturation Across Every Namespace and Availabili - Copy",
		},
		{
			scenario: "numbered copy at the limit increments then truncates",
			input:    "API Gateway SLOs: p99 Latency, Error Budget Burn Rate, and Requests per Second by Route, Region, and Upstream Service - Copy (9)",
			expected: "API Gateway SLOs: p99 Latency, Error Budget Burn Rate, and Requests per Second by Route, Region, and Upstream Servic - Copy (10)",
		},
		{
			scenario: "truncation counts runes, not bytes (é and — are one rune each)",
			input:    "Café Latency — p99 Response Times, Error Rates, and Saturation Across the Ordering, Kitchen, and Delivery Microservices Fleet",
			expected: "Café Latency — p99 Response Times, Error Rates, and Saturation Across the Ordering, Kitchen, and Delivery Microservices F - Copy",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.scenario, func(t *testing.T) {
			require.LessOrEqual(t, utf8.RuneCountInString(testCase.input), MaxDisplayNameLen, "a saved source name never exceeds the limit")

			result := nextCloneDisplayName(testCase.input)

			assert.Equal(t, testCase.expected, result)
			assert.LessOrEqual(t, utf8.RuneCountInString(result), MaxDisplayNameLen, "a clone name must fit the limit")
		})
	}
}

func TestNewLegacyListedDashboardV2(t *testing.T) {
	orgID := valuer.GenerateUUID()
	dashboardID := valuer.GenerateUUID()
	createdAt := time.Date(2026, time.January, 1, 12, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, time.January, 2, 12, 0, 0, 0, time.UTC)

	t.Run("extracts display fields from a well-formed v1 blob", func(t *testing.T) {
		storable := &StorableDashboard{
			Identifiable:  types.Identifiable{ID: dashboardID},
			TimeAuditable: types.TimeAuditable{CreatedAt: createdAt, UpdatedAt: updatedAt},
			UserAuditable: types.UserAuditable{CreatedBy: "alice", UpdatedBy: "bob"},
			OrgID:         orgID,
			Locked:        true,
			Source:        SourceUser,
			Name:          "legacy-dashboard",
			Data: StorableDashboardData{
				"title":       "Legacy Title",
				"description": "an old v1 dashboard",
				"image":       "data:image/png;base64,xyz",
				"version":     "v5",
				"widgets":     []any{},
			},
		}
		listed := newLegacyListedDashboardV2(storable, nil)

		assert.True(t, listed.Legacy, "a non-v2 dashboard must be flagged legacy")
		assert.Equal(t, storable.Identifiable, listed.Identifiable)
		assert.Equal(t, storable.TimeAuditable, listed.TimeAuditable)
		assert.Equal(t, storable.UserAuditable, listed.UserAuditable)
		assert.Equal(t, orgID, listed.OrgID)
		assert.True(t, listed.Locked)
		assert.Equal(t, SourceUser, listed.Source)
		assert.Equal(t, "legacy-dashboard", listed.Name, "name comes off the column, not the blob")
		assert.Equal(t, "v5", listed.SchemaVersion)
		assert.Equal(t, "data:image/png;base64,xyz", listed.Image)
		assert.Equal(t, "Legacy Title", listed.Spec.Display.Name)
		assert.Equal(t, "an old v1 dashboard", listed.Spec.Display.Description)
		assert.Empty(t, listed.Tags, "v1 dashboards predate tags; nil converts to an empty, non-nil slice")
	})

	t.Run("yields zero values for absent or wrongly-typed fields", func(t *testing.T) {
		storable := &StorableDashboard{
			OrgID:  orgID,
			Source: SourceUser,
			Data: StorableDashboardData{
				"title":   42,          // wrong type
				"version": []any{"v5"}, // wrong type
				"image":   nil,         // null
			},
		}

		listed := newLegacyListedDashboardV2(storable, nil)

		assert.True(t, listed.Legacy)
		assert.Empty(t, listed.Spec.Display.Name)
		assert.Empty(t, listed.SchemaVersion)
		assert.Empty(t, listed.Image)
		assert.Empty(t, listed.Tags, "nil tags convert to an empty, non-nil slice")
	})

	t.Run("tolerates entirely empty data", func(t *testing.T) {
		storable := &StorableDashboard{OrgID: orgID, Source: SourceUser, Name: "bare"}

		listed := newLegacyListedDashboardV2(storable, nil)

		assert.True(t, listed.Legacy)
		assert.Equal(t, "bare", listed.Name)
		assert.Empty(t, listed.Spec.Display.Name)
	})
}

func TestNewListableDashboardV2MixedSchemas(t *testing.T) {
	orgID := valuer.GenerateUUID()

	v2Dashboard := newTestDashboardV2(t, orgID, SourceUser)
	v2Storable, err := v2Dashboard.ToStorableDashboard()
	require.NoError(t, err)

	v1Storable := &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        orgID,
		Source:       SourceUser,
		Name:         "legacy-dashboard",
		Data: StorableDashboardData{
			"title":   "Legacy Title",
			"version": "v5",
			"widgets": []any{},
		},
	}

	tagsByEntity := map[valuer.UUID][]*tagtypes.Tag{
		v2Storable.ID: v2Dashboard.Tags,
	}

	listable := NewListableDashboardV2([]*StorableDashboard{v2Storable, v1Storable}, 2, tagsByEntity, nil)

	require.Len(t, listable.Dashboards, 2, "a single legacy dashboard must not drop rows from the list")
	assert.Equal(t, int64(2), listable.Total)

	v2Row := listable.Dashboards[0]
	assert.False(t, v2Row.Legacy, "a v2 dashboard is not legacy")
	assert.Equal(t, SchemaVersion, v2Row.SchemaVersion)
	assert.Equal(t, "Test Dashboard", v2Row.Spec.Display.Name)

	v1Row := listable.Dashboards[1]
	assert.True(t, v1Row.Legacy, "a v1 dashboard is flagged legacy")
	assert.Equal(t, "v5", v1Row.SchemaVersion)
	assert.Equal(t, "Legacy Title", v1Row.Spec.Display.Name)
	assert.Equal(t, "legacy-dashboard", v1Row.Name)
}

func TestNewListableDashboardForUserV2MixedSchemas(t *testing.T) {
	orgID := valuer.GenerateUUID()

	v2Dashboard := newTestDashboardV2(t, orgID, SourceUser)
	v2Storable, err := v2Dashboard.ToStorableDashboard()
	require.NoError(t, err)

	v1Storable := &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        orgID,
		Source:       SourceUser,
		Name:         "legacy-dashboard",
		Data:         StorableDashboardData{"title": "Legacy Title", "version": "v5"},
	}

	rows := []*StorableDashboardWithPinInfo{
		{Dashboard: v2Storable, Pinned: true},
		{Dashboard: v1Storable, Pinned: false},
	}

	listable := NewListableDashboardForUserV2(rows, 2, nil, nil)

	require.Len(t, listable.Dashboards, 2)
	assert.False(t, listable.Dashboards[0].Legacy)
	assert.True(t, listable.Dashboards[0].Pinned)
	assert.True(t, listable.Dashboards[1].Legacy)
	assert.False(t, listable.Dashboards[1].Pinned)
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
