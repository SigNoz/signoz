// nolint
package transition

import (
	"context"
	"log/slog"
	"strings"
)

type dashboardMigrateV5 struct {
	migrateCommon
}

func NewDashboardMigrateV5(logger *slog.Logger, logsDuplicateKeys []string, tracesDuplicateKeys []string) *dashboardMigrateV5 {
	ambiguity := map[string][]string{
		"logs":   logsDuplicateKeys,
		"traces": tracesDuplicateKeys,
	}
	return &dashboardMigrateV5{
		migrateCommon: migrateCommon{
			ambiguity: ambiguity,
			logger:    logger,
		},
	}
}

func (m *dashboardMigrateV5) Migrate(ctx context.Context, dashboardData map[string]any) bool {
	updated := false

	var version string
	if _, ok := dashboardData["version"].(string); ok {
		version = dashboardData["version"].(string)
	}

	if version == "v5" {
		m.logger.InfoContext(ctx, "dashboard is already migrated to v5, skipping", "dashboard_name", dashboardData["title"])
		return false
	}

	m.logger.InfoContext(ctx, "migrating dashboard", "dashboard_name", dashboardData["title"])

	// if there is a white space in variable, replace it
	if variables, ok := dashboardData["variables"].(map[string]any); ok {
		for _, variable := range variables {
			if varMap, ok := variable.(map[string]any); ok {
				name, ok := varMap["name"].(string)
				if ok {
					if strings.Contains(name, " ") {
						m.logger.InfoContext(ctx, "found a variable with space in map, replacing it", "name", name)
						name = strings.ReplaceAll(name, " ", "")
						updated = true
						varMap["name"] = name
					}
				}
			}
		}
	}

	if widgets, ok := dashboardData["widgets"].([]any); ok {
		for _, widget := range widgets {
			if widgetMap, ok := widget.(map[string]any); ok {
				if m.updateWidget(ctx, widgetMap, version) {
					updated = true
				}
			}
		}
	}
	dashboardData["version"] = "v5"

	return updated
}

func (migration *dashboardMigrateV5) updateWidget(ctx context.Context, widget map[string]any, version string) bool {
	query, ok := widget["query"].(map[string]any)
	if !ok {
		return false
	}

	if qType, ok := query["queryType"]; ok {
		if qType == "promql" || qType == "clickhouse_sql" {
			migration.logger.InfoContext(ctx, "nothing to migrate for query type", "query_type", qType)
			return false
		}
	}

	builder, ok := query["builder"].(map[string]any)
	if !ok {
		return false
	}

	queryData, ok := builder["queryData"].([]any)
	if !ok {
		return false
	}

	widgetType := widget["panelTypes"].(string)

	updated := false
	for _, qd := range queryData {
		if queryDataMap, ok := qd.(map[string]any); ok {
			if migration.updateQueryData(ctx, queryDataMap, version, widgetType) {
				updated = true
			}
		}
	}

	return updated
}
