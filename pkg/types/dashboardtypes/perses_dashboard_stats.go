package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

const (
	statKeyDashboardCount    = "dashboard.count"
	statKeyPanelCount        = "dashboard.panels.count"
	statKeyPanelTracesCount  = "dashboard.panels.traces.count"
	statKeyPanelMetricsCount = "dashboard.panels.metrics.count"
	statKeyPanelLogsCount    = "dashboard.panels.logs.count"
)

// panelSignalStatKeys maps a builder query's signal to the stat it contributes
// to. Signal-less queries (promql, clickhouse sql, formulas) count towards the
// panel total only.
var panelSignalStatKeys = map[telemetrytypes.Signal]string{
	telemetrytypes.SignalTraces:  statKeyPanelTracesCount,
	telemetrytypes.SignalMetrics: statKeyPanelMetricsCount,
	telemetrytypes.SignalLogs:    statKeyPanelLogsCount,
}

func NewStatsFromStorableDashboards(dashboards []*StorableDashboard) map[string]any {
	stats := map[string]any{
		statKeyPanelCount:        int64(0),
		statKeyPanelTracesCount:  int64(0),
		statKeyPanelMetricsCount: int64(0),
		statKeyPanelLogsCount:    int64(0),
	}
	for _, dashboard := range dashboards {
		addStatsFromStorableDashboard(dashboard, stats)
	}

	stats[statKeyDashboardCount] = int64(len(dashboards))
	return stats
}

// addStatsFromStorableDashboard counts the panels and per-signal queries of a v2
// dashboard. Rows that do not decode as v2 contribute to dashboard.count only.
func addStatsFromStorableDashboard(dashboard *StorableDashboard, stats map[string]any) {
	if dashboard == nil {
		return
	}

	dashboardV2, err := dashboard.ToDashboardV2(nil)
	if err != nil {
		return
	}

	for _, panel := range dashboardV2.Spec.Panels {
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
