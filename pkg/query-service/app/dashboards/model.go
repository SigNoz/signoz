package dashboards

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types"

	"go.signoz.io/signoz/pkg/query-service/telemetry"
	"go.uber.org/zap"
)

// This time the global variable is unexported.
var db *bun.DB

// User for mapping job,instance from grafana
var (
	instanceEQRE = regexp.MustCompile("instance(?s)=(?s)\\\"{{.instance}}\\\"")
	nodeEQRE     = regexp.MustCompile("instance(?s)=(?s)\\\"{{.node}}\\\"")
	jobEQRE      = regexp.MustCompile("job(?s)=(?s)\\\"{{.job}}\\\"")
	instanceRERE = regexp.MustCompile("instance(?s)=~(?s)\\\"{{.instance}}\\\"")
	nodeRERE     = regexp.MustCompile("instance(?s)=~(?s)\\\"{{.node}}\\\"")
	jobRERE      = regexp.MustCompile("job(?s)=~(?s)\\\"{{.job}}\\\"")
)

// InitDB sets up setting up the connection pool global variable.
func InitDB(inputDB *bun.DB) error {
	db = inputDB
	telemetry.GetInstance().SetDashboardsInfoCallback(GetDashboardsInfo)

	return nil
}

// CreateDashboard creates a new dashboard
func CreateDashboard(ctx context.Context, orgID string, email string, data map[string]interface{}, fm interfaces.FeatureLookup) (*types.Dashboard, *model.ApiError) {
	dash := &types.Dashboard{
		Data: data,
	}

	dash.OrgID = orgID
	dash.CreatedAt = time.Now()
	dash.CreatedBy = email
	dash.UpdatedAt = time.Now()
	dash.UpdatedBy = email
	dash.UpdateSlug()
	dash.UUID = uuid.New().String()
	if data["uuid"] != nil {
		dash.UUID = data["uuid"].(string)
	}

	err := db.NewInsert().Model(dash).Returning("id").Scan(ctx, &dash.ID)
	if err != nil {
		zap.L().Error("Error in inserting dashboard data: ", zap.Any("dashboard", dash), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return dash, nil
}

func GetDashboards(ctx context.Context, orgID string) ([]types.Dashboard, *model.ApiError) {
	dashboards := []types.Dashboard{}

	err := db.NewSelect().Model(&dashboards).Where("org_id = ?", orgID).Scan(ctx)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return dashboards, nil
}

func DeleteDashboard(ctx context.Context, orgID, uuid string, fm interfaces.FeatureLookup) *model.ApiError {

	dashboard, dErr := GetDashboard(ctx, orgID, uuid)
	if dErr != nil {
		zap.L().Error("Error in getting dashboard: ", zap.String("uuid", uuid), zap.Any("error", dErr))
		return dErr
	}

	if dashboard.Locked != nil && *dashboard.Locked == 1 {
		return model.BadRequest(fmt.Errorf("dashboard is locked, please unlock the dashboard to be able to delete it"))
	}

	result, err := db.NewDelete().Model(&types.Dashboard{}).Where("org_id = ?", orgID).Where("uuid = ?", uuid).Exec(ctx)
	if err != nil {
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if affectedRows == 0 {
		return &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no dashboard found with uuid: %s", uuid)}
	}

	return nil
}

func GetDashboard(ctx context.Context, orgID, uuid string) (*types.Dashboard, *model.ApiError) {

	dashboard := types.Dashboard{}
	err := db.NewSelect().Model(&dashboard).Where("org_id = ?", orgID).Where("uuid = ?", uuid).Scan(ctx)
	if err != nil {
		return nil, &model.ApiError{Typ: model.ErrorNotFound, Err: fmt.Errorf("no dashboard found with uuid: %s", uuid)}
	}

	return &dashboard, nil
}

func UpdateDashboard(ctx context.Context, orgID, userEmail, uuid string, data map[string]interface{}, fm interfaces.FeatureLookup) (*types.Dashboard, *model.ApiError) {

	mapData, err := json.Marshal(data)
	if err != nil {
		zap.L().Error("Error in marshalling data field in dashboard: ", zap.Any("data", data), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	}

	dashboard, apiErr := GetDashboard(ctx, orgID, uuid)
	if apiErr != nil {
		return nil, apiErr
	}

	if dashboard.Locked != nil && *dashboard.Locked == 1 {
		return nil, model.BadRequest(fmt.Errorf("dashboard is locked, please unlock the dashboard to be able to edit it"))
	}

	// if the total count of panels has reduced by more than 1,
	// return error
	existingIds := getWidgetIds(dashboard.Data)
	newIds := getWidgetIds(data)

	differenceIds := getIdDifference(existingIds, newIds)

	if len(differenceIds) > 1 {
		return nil, model.BadRequest(fmt.Errorf("deleting more than one panel is not supported"))
	}

	dashboard.UpdatedAt = time.Now()
	dashboard.UpdatedBy = userEmail
	dashboard.Data = data

	_, err = db.NewUpdate().Model(dashboard).Set("updated_at = ?", dashboard.UpdatedAt).Set("updated_by = ?", userEmail).Set("data = ?", mapData).Where("uuid = ?", dashboard.UUID).Exec(ctx)

	if err != nil {
		zap.L().Error("Error in inserting dashboard data", zap.Any("data", data), zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	return dashboard, nil
}

func LockUnlockDashboard(ctx context.Context, orgID, uuid string, lock bool) *model.ApiError {
	dashboard, apiErr := GetDashboard(ctx, orgID, uuid)
	if apiErr != nil {
		return apiErr
	}

	var lockValue int
	if lock {
		lockValue = 1
	} else {
		lockValue = 0
	}

	_, err := db.NewUpdate().Model(dashboard).Set("locked = ?", lockValue).Where("org_id = ?", orgID).Where("uuid = ?", uuid).Exec(ctx)
	if err != nil {
		zap.L().Error("Error in updating dashboard", zap.String("uuid", uuid), zap.Error(err))
		return &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	return nil
}

func IsPostDataSane(data *map[string]interface{}) error {
	val, ok := (*data)["title"]
	if !ok || val == nil {
		return fmt.Errorf("title not found in post data")
	}

	return nil
}

func getWidgetIds(data map[string]interface{}) []string {
	widgetIds := []string{}
	if data != nil && data["widgets"] != nil {
		widgets, ok := data["widgets"]
		if ok {
			data, ok := widgets.([]interface{})
			if ok {
				for _, widget := range data {
					sData, ok := widget.(map[string]interface{})
					if ok && sData["query"] != nil && sData["id"] != nil {
						id, ok := sData["id"].(string)

						if ok {
							widgetIds = append(widgetIds, id)
						}

					}
				}
			}
		}
	}
	return widgetIds
}

func getIdDifference(existingIds []string, newIds []string) []string {
	// Convert newIds array to a map for faster lookups
	newIdsMap := make(map[string]bool)
	for _, id := range newIds {
		newIdsMap[id] = true
	}

	// Initialize a map to keep track of elements in the difference array
	differenceMap := make(map[string]bool)

	// Initialize the difference array
	difference := []string{}

	// Iterate through existingIds
	for _, id := range existingIds {
		// If the id is not found in newIds, and it's not already in the difference array
		if _, found := newIdsMap[id]; !found && !differenceMap[id] {
			difference = append(difference, id)
			differenceMap[id] = true // Mark the id as seen in the difference array
		}
	}

	return difference
}

// GetDashboardsInfo returns analytics data for dashboards
func GetDashboardsInfo(ctx context.Context) (*model.DashboardsInfo, error) {
	dashboardsInfo := model.DashboardsInfo{}
	// fetch dashboards from dashboard db
	dashboards := []types.Dashboard{}
	err := db.NewSelect().Model(&dashboards).Scan(ctx)
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

func GetDashboardsWithMetricNames(ctx context.Context, orgID string, metricNames []string) (map[string][]map[string]string, *model.ApiError) {
	dashboards := []types.Dashboard{}
	err := db.NewSelect().Model(&dashboards).Where("org_id = ?", orgID).Scan(ctx)
	if err != nil {
		zap.L().Error("Error in getting dashboards", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}
	if err != nil {
		zap.L().Error("Error in getting dashboards", zap.Error(err))
		return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	}

	// Initialize result map for each metric
	result := make(map[string][]map[string]string)

	// Process the JSON data in Go
	for _, dashboard := range dashboards {
		var dashData = dashboard.Data

		dashTitle, _ := dashData["title"].(string)
		widgets, ok := dashData["widgets"].([]interface{})
		if !ok {
			continue
		}

		for _, w := range widgets {
			widget, ok := w.(map[string]interface{})
			if !ok {
				continue
			}

			widgetTitle, _ := widget["title"].(string)
			widgetID, _ := widget["id"].(string)

			query, ok := widget["query"].(map[string]interface{})
			if !ok {
				continue
			}

			builder, ok := query["builder"].(map[string]interface{})
			if !ok {
				continue
			}

			queryData, ok := builder["queryData"].([]interface{})
			if !ok {
				continue
			}

			for _, qd := range queryData {
				data, ok := qd.(map[string]interface{})
				if !ok {
					continue
				}

				if dataSource, ok := data["dataSource"].(string); !ok || dataSource != "metrics" {
					continue
				}

				aggregateAttr, ok := data["aggregateAttribute"].(map[string]interface{})
				if !ok {
					continue
				}

				if key, ok := aggregateAttr["key"].(string); ok {
					// Check if this metric is in our list of interest
					for _, metricName := range metricNames {
						if strings.TrimSpace(key) == metricName {
							result[metricName] = append(result[metricName], map[string]string{
								"dashboard_id":    dashboard.UUID,
								"widget_title":    widgetTitle,
								"widget_id":       widgetID,
								"dashboard_title": dashTitle,
							})
						}
					}
				}
			}
		}
	}

	return result, nil
}
