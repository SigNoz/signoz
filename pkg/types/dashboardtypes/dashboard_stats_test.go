package dashboardtypes

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newStatsStorableV2 builds a stored v2 row from a panels JSON fragment, going
// through the untyped data blob the way a row read off the DB does.
func newStatsStorableV2(t *testing.T, panelsJSON string) *StorableDashboard {
	t.Helper()

	raw := `{
		"metadata": {"schemaVersion": "` + SchemaVersion + `"},
		"spec": {
			"display": {"name": "Stats Dashboard"},
			"variables": [],
			"panels": {` + panelsJSON + `},
			"layouts": [],
			"links": []
		}
	}`

	var data StorableDashboardData
	require.NoError(t, json.Unmarshal([]byte(raw), &data))

	return &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        valuer.GenerateUUID(),
		Source:       SourceUser,
		Name:         "stats-dashboard",
		Data:         data,
	}
}

func statsPanel(queriesJSON string) string {
	return `{
		"kind": "Panel",
		"spec": {
			"links": [],
			"plugin": {"kind": "signoz/TimeSeriesPanel", "spec": {}},
			"queries": [` + queriesJSON + `]
		}
	}`
}

// A panel holds a single query, so its name never matters to the assertions.
func statsBuilderQuery(signal string) string {
	return `{
		"kind": "time_series",
		"spec": {"plugin": {"kind": "signoz/BuilderQuery", "spec": ` + statsBuilderQuerySpec("A", signal) + `}}
	}`
}

func statsBuilderQuerySpec(name, signal string) string {
	aggregations := `[{"expression": "count()"}]`
	if signal == "metrics" {
		aggregations = `[{"metricName": "m", "timeAggregation": "rate", "spaceAggregation": "sum"}]`
	}
	return `{"name": "` + name + `", "signal": "` + signal + `", "aggregations": ` + aggregations + `}`
}

func TestNewStatsFromStorableDashboardsCountsV2Panels(t *testing.T) {
	dashboard := newStatsStorableV2(t, `
		"p1": `+statsPanel(statsBuilderQuery("logs"))+`,
		"p2": `+statsPanel(statsBuilderQuery("metrics"))+`,
		"p3": `+statsPanel(statsBuilderQuery("traces"))+`
	`)

	stats := NewStatsFromStorableDashboards([]*StorableDashboard{dashboard})

	assert.Equal(t, int64(1), stats[statKeyDashboardCount])
	assert.Equal(t, int64(3), stats[statKeyPanelCount])
	assert.Equal(t, int64(1), stats[statKeyPanelLogsCount])
	assert.Equal(t, int64(1), stats[statKeyPanelMetricsCount])
	assert.Equal(t, int64(1), stats[statKeyPanelTracesCount])
}

// A panel carries exactly one query envelope, so multi-signal panels arrive as a
// composite: the panel counts once and every builder sub-query counts its signal.
func TestNewStatsFromStorableDashboardsCountsCompositeSubQueries(t *testing.T) {
	composite := `{
		"kind": "time_series",
		"spec": {"plugin": {"kind": "signoz/CompositeQuery", "spec": {"queries": [
			{"type": "builder_query", "spec": ` + statsBuilderQuerySpec("A", "traces") + `},
			{"type": "builder_query", "spec": ` + statsBuilderQuerySpec("B", "logs") + `}
		]}}}
	}`
	dashboard := newStatsStorableV2(t, `"p1": `+statsPanel(composite))

	stats := NewStatsFromStorableDashboards([]*StorableDashboard{dashboard})

	assert.Equal(t, int64(1), stats[statKeyPanelCount])
	assert.Equal(t, int64(1), stats[statKeyPanelTracesCount])
	assert.Equal(t, int64(1), stats[statKeyPanelLogsCount])
}

// promql and clickhouse queries carry no signal, so they land in the panel total
// and nowhere else.
func TestNewStatsFromStorableDashboardsIgnoresSignallessQueries(t *testing.T) {
	promql := `{
		"kind": "time_series",
		"spec": {"plugin": {"kind": "signoz/PromQLQuery", "spec": {"name": "A", "query": "up"}}}
	}`
	dashboard := newStatsStorableV2(t, `"p1": `+statsPanel(promql))

	stats := NewStatsFromStorableDashboards([]*StorableDashboard{dashboard})

	assert.Equal(t, int64(1), stats[statKeyPanelCount])
	assert.Equal(t, int64(0), stats[statKeyPanelTracesCount])
	assert.Equal(t, int64(0), stats[statKeyPanelMetricsCount])
	assert.Equal(t, int64(0), stats[statKeyPanelLogsCount])
}

func TestNewStatsFromStorableDashboardsAggregatesAcrossDashboards(t *testing.T) {
	first := newStatsStorableV2(t, `"p1": `+statsPanel(statsBuilderQuery("logs")))
	second := newStatsStorableV2(t, `
		"p1": `+statsPanel(statsBuilderQuery("logs"))+`,
		"p2": `+statsPanel(statsBuilderQuery("traces"))+`
	`)

	stats := NewStatsFromStorableDashboards([]*StorableDashboard{first, second})

	assert.Equal(t, int64(2), stats[statKeyDashboardCount])
	assert.Equal(t, int64(3), stats[statKeyPanelCount])
	assert.Equal(t, int64(2), stats[statKeyPanelLogsCount])
	assert.Equal(t, int64(1), stats[statKeyPanelTracesCount])
}

// v1 rows are counted as dashboards but contribute no panel stats — the counters
// read the v2 spec only.
func TestNewStatsFromStorableDashboardsSkipsNonV2Rows(t *testing.T) {
	v1 := &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        valuer.GenerateUUID(),
		Source:       SourceUser,
		Name:         "legacy-dashboard",
		Data: StorableDashboardData{
			"title":   "Legacy Title",
			"version": "v5",
			"widgets": []any{
				map[string]any{"query": map[string]any{
					"queryType": "builder",
					"builder": map[string]any{
						"queryData": []any{map[string]any{"dataSource": "logs"}},
					},
				}},
			},
		},
	}
	empty := &StorableDashboard{
		Identifiable: types.Identifiable{ID: valuer.GenerateUUID()},
		OrgID:        valuer.GenerateUUID(),
		Source:       SourceUser,
		Name:         "bare",
	}

	stats := NewStatsFromStorableDashboards([]*StorableDashboard{v1, empty})

	assert.Equal(t, int64(2), stats[statKeyDashboardCount])
	assert.Equal(t, int64(0), stats[statKeyPanelCount])
	assert.Equal(t, int64(0), stats[statKeyPanelLogsCount])
}

func TestNewStatsFromStorableDashboardsWithNoDashboards(t *testing.T) {
	stats := NewStatsFromStorableDashboards(nil)

	assert.Equal(t, int64(0), stats[statKeyDashboardCount])
	assert.Equal(t, int64(0), stats[statKeyPanelCount])
	assert.Equal(t, int64(0), stats[statKeyPanelTracesCount])
	assert.Equal(t, int64(0), stats[statKeyPanelMetricsCount])
	assert.Equal(t, int64(0), stats[statKeyPanelLogsCount])
}
