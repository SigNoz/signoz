package dashboardtypes

import (
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	statKeyDashboardCount    = "dashboard.count"
	statKeyPanelCount        = "dashboard.panels.count"
	statKeyPanelTracesCount  = "dashboard.panels.traces.count"
	statKeyPanelMetricsCount = "dashboard.panels.metrics.count"
	statKeyPanelLogsCount    = "dashboard.panels.logs.count"
	statKeyPanelAICount      = "dashboard.panels.ai.count"
)

// panelSignalStatKeys maps a builder query's signal to the stat it contributes
// to. Signal-less queries (promql, clickhouse sql, formulas) count towards the
// panel total only.
var panelSignalStatKeys = map[telemetrytypes.Signal]string{
	telemetrytypes.SignalTraces:  statKeyPanelTracesCount,
	telemetrytypes.SignalMetrics: statKeyPanelMetricsCount,
	telemetrytypes.SignalLogs:    statKeyPanelLogsCount,
}

// NewStatsFromStorableDashboards reports the stats of stored dashboards. Rows that
// do not decode as v2 contribute to dashboard.count only. System dashboards are
// provisioned into every org, so they are left out of every count.
func NewStatsFromStorableDashboards(dashboards []*StorableDashboard) map[string]any {
	stats := newStats()

	for _, dashboard := range dashboards {
		if dashboard == nil || dashboard.Source == SourceSystem {
			continue
		}
		incrementStat(stats, statKeyDashboardCount)

		dashboardV2, err := dashboard.ToDashboardV2(nil)
		if err != nil {
			continue
		}
		addPanelStats(&dashboardV2.Spec, stats)
	}

	return stats
}

// NewStatsFromPostableDashboardV2 reports the stats of a dashboard as it is
// created, straight off the postable spec — the create path has no reason to make
// a storable round-trip just to be counted.
func NewStatsFromPostableDashboardV2(postable PostableDashboardV2) map[string]any {
	stats := newStats()
	stats[statKeyDashboardCount] = int64(1)
	addPanelStats(&postable.Spec, stats)

	return stats
}

func newStats() map[string]any {
	return map[string]any{
		statKeyDashboardCount:    int64(0),
		statKeyPanelCount:        int64(0),
		statKeyPanelTracesCount:  int64(0),
		statKeyPanelMetricsCount: int64(0),
		statKeyPanelLogsCount:    int64(0),
		statKeyPanelAICount:      int64(0),
	}
}

// addPanelStats counts the panels of a v2 spec, and each panel's queries against
// the signal they read. AI queries count only towards the AI stat.
func addPanelStats(spec *DashboardSpec, stats map[string]any) {
	for _, panel := range spec.Panels {
		if panel == nil {
			continue
		}
		incrementStat(stats, statKeyPanelCount)

		for _, query := range panel.Spec.Queries {
			composite, err := query.Spec.Plugin.buildV5CompositeQueryFromPlugin()
			if err != nil {
				continue
			}
			for _, envelope := range composite.Queries {
				if envelope.Type == qb.QueryTypeBuilderAI {
					incrementStat(stats, statKeyPanelAICount)
					continue
				}
				if key, ok := panelSignalStatKeys[envelope.GetSignal()]; ok {
					incrementStat(stats, key)
				}
			}
		}
	}
}

func incrementStat(stats map[string]any, key string) {
	count, _ := stats[key].(int64)
	stats[key] = count + 1
}
