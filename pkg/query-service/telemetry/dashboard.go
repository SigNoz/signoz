package telemetry

import (
	"context"
	"encoding/json"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"go.uber.org/zap"
)

// GetDashboardsInfo returns analytics data for dashboards
func GetDashboardsInfo(ctx context.Context, sqlstore sqlstore.SQLStore) (*model.DashboardsInfo, error) {
	dashboardsInfo := model.DashboardsInfo{}
	// fetch dashboards from dashboard db
	dashboards := []dashboardtypes.StorableDashboard{}
	err := sqlstore.BunDB().NewSelect().Model(&dashboards).Scan(ctx)
	if err != nil {
		zap.L().Error("Error in processing sql query", zap.Error(err))
		return &dashboardsInfo, err
	}
	totalDashboardsWithPanelAndName := 0
	var dashboardNames []string
	count := 0
	queriesWithTagAttrs := 0
	for _, dashboard := range dashboards {
		if isDashboardWithPanelAndName(dashboard.Data) {
			totalDashboardsWithPanelAndName = totalDashboardsWithPanelAndName + 1
		}
		dashboardName := extractDashboardName(dashboard.Data)
		if dashboardName != "" {
			dashboardNames = append(dashboardNames, dashboardName)
		}
		dashboardInfo := countPanelsInDashboard(dashboard.Data)
		dashboardsInfo.LogsBasedPanels += dashboardInfo.LogsBasedPanels
		dashboardsInfo.TracesBasedPanels += dashboardInfo.TracesBasedPanels
		dashboardsInfo.MetricBasedPanels += dashboardInfo.MetricBasedPanels
		dashboardsInfo.LogsPanelsWithAttrContainsOp += dashboardInfo.LogsPanelsWithAttrContainsOp
		dashboardsInfo.DashboardsWithLogsChQuery += dashboardInfo.DashboardsWithLogsChQuery
		dashboardsInfo.DashboardsWithTraceChQuery += dashboardInfo.DashboardsWithTraceChQuery
		if isDashboardWithTSV2(dashboard.Data) {
			count = count + 1
		}

		if isDashboardWithTagAttrs(dashboard.Data) {
			queriesWithTagAttrs += 1
		}

		if dashboardInfo.DashboardsWithTraceChQuery > 0 {
			dashboardsInfo.DashboardNamesWithTraceChQuery = append(dashboardsInfo.DashboardNamesWithTraceChQuery, dashboardName)
		}

		// check if dashboard is a has a log operator with contains
	}

	dashboardsInfo.DashboardNames = dashboardNames
	dashboardsInfo.TotalDashboards = len(dashboards)
	dashboardsInfo.TotalDashboardsWithPanelAndName = totalDashboardsWithPanelAndName
	dashboardsInfo.QueriesWithTSV2 = count
	dashboardsInfo.QueriesWithTagAttrs = queriesWithTagAttrs
	return &dashboardsInfo, nil
}

func isDashboardWithTSV2(data map[string]interface{}) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return false
	}
	return strings.Contains(string(jsonData), "time_series_v2")
}

func isDashboardWithTagAttrs(data map[string]interface{}) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return false
	}
	return strings.Contains(string(jsonData), "span_attributes") ||
		strings.Contains(string(jsonData), "tag_attributes")
}

func isDashboardWithLogsClickhouseQuery(data map[string]interface{}) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return false
	}
	result := strings.Contains(string(jsonData), "signoz_logs.distributed_logs") ||
		strings.Contains(string(jsonData), "signoz_logs.logs")
	return result
}

func isDashboardWithTracesClickhouseQuery(data map[string]interface{}) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return false
	}

	// also check if the query is actually active
	str := string(jsonData)
	result := strings.Contains(str, "signoz_traces.distributed_signoz_index_v2") ||
		strings.Contains(str, "signoz_traces.distributed_signoz_spans") ||
		strings.Contains(str, "signoz_traces.distributed_signoz_error_index_v2")
	return result
}

func isDashboardWithPanelAndName(data map[string]interface{}) bool {
	isDashboardName := false
	isDashboardWithPanelAndName := false
	if data != nil && data["title"] != nil && data["widgets"] != nil {
		title, ok := data["title"].(string)
		if ok && title != "Sample Title" {
			isDashboardName = true
		}
		widgets, ok := data["widgets"]
		if ok && isDashboardName {
			data, ok := widgets.([]interface{})
			if ok && len(data) > 0 {
				isDashboardWithPanelAndName = true
			}
		}
	}

	return isDashboardWithPanelAndName
}

func extractDashboardName(data map[string]interface{}) string {

	if data != nil && data["title"] != nil {
		title, ok := data["title"].(string)
		if ok {
			return title
		}
	}

	return ""
}

func checkLogPanelAttrContains(data map[string]interface{}) int {
	var logsPanelsWithAttrContains int
	filters, ok := data["filters"].(map[string]interface{})
	if ok && filters["items"] != nil {
		items, ok := filters["items"].([]interface{})
		if ok {
			for _, item := range items {
				itemMap, ok := item.(map[string]interface{})
				if ok {
					opStr, ok := itemMap["op"].(string)
					if ok {
						if slices.Contains([]string{"contains", "ncontains", "like", "nlike"}, opStr) {
							// check if it's not body
							key, ok := itemMap["key"].(map[string]string)
							if ok && key["key"] != "body" {
								logsPanelsWithAttrContains++
							}
						}
					}
				}
			}
		}
	}
	return logsPanelsWithAttrContains
}

func countPanelsInDashboard(inputData map[string]interface{}) model.DashboardsInfo {
	var logsPanelCount, tracesPanelCount, metricsPanelCount, logsPanelsWithAttrContains int
	traceChQueryCount := 0
	logChQueryCount := 0

	// totalPanels := 0
	if inputData != nil && inputData["widgets"] != nil {
		widgets, ok := inputData["widgets"]
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					sData, ok := widget.(map[string]interface{})
					if ok && sData["query"] != nil {
						// totalPanels++
						query, ok := sData["query"].(map[string]interface{})
						if ok && query["queryType"] == "builder" && query["builder"] != nil {
							builderData, ok := query["builder"].(map[string]interface{})
							if ok && builderData["queryData"] != nil {
								builderQueryData, ok := builderData["queryData"].([]interface{})
								if ok {
									for _, queryData := range builderQueryData {
										data, ok := queryData.(map[string]interface{})
										if ok {
											if data["dataSource"] == "traces" {
												tracesPanelCount++
											} else if data["dataSource"] == "metrics" {
												metricsPanelCount++
											} else if data["dataSource"] == "logs" {
												logsPanelCount++
												logsPanelsWithAttrContains += checkLogPanelAttrContains(data)
											}
										}
									}
								}
							}
						} else if ok && query["queryType"] == "clickhouse_sql" && query["clickhouse_sql"] != nil {
							if isDashboardWithLogsClickhouseQuery(inputData) {
								logChQueryCount = 1
							}
							if isDashboardWithTracesClickhouseQuery(inputData) {
								traceChQueryCount = 1
							}
						}
					}
				}
			}
		}
	}

	return model.DashboardsInfo{
		LogsBasedPanels:   logsPanelCount,
		TracesBasedPanels: tracesPanelCount,
		MetricBasedPanels: metricsPanelCount,

		DashboardsWithLogsChQuery:    logChQueryCount,
		DashboardsWithTraceChQuery:   traceChQueryCount,
		LogsPanelsWithAttrContainsOp: logsPanelsWithAttrContains,
	}
}
