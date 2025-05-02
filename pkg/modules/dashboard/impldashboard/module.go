package impldashboard

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store dashboardtypes.Store
}

func NewModule(store dashboardtypes.Store) dashboard.Module {
	return &module{store: store}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, data map[string]any, email string) error {
	storableDashboard, err := dashboardtypes.NewStorableDashboard(data, email, orgID)
	if err != nil {
		return err
	}

	return module.store.Create(ctx, storableDashboard)
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error) {
	storableDashboard, err := module.store.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard), nil
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) ([]*dashboardtypes.Dashboard, error) {
	// dashboards := []types.Dashboard{}
	// err := store.BunDB().NewSelect().Model(&dashboards).Where("org_id = ?", orgID).Scan(ctx)
	// if err != nil {
	// 	zap.L().Error("Error in getting dashboards", zap.Error(err))
	// 	return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	// }
	// if err != nil {
	// 	zap.L().Error("Error in getting dashboards", zap.Error(err))
	// 	return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	// }

	// // Initialize result map for each metric
	// result := make(map[string][]map[string]string)

	// // Process the JSON data in Go
	// for _, dashboard := range dashboards {
	// 	var dashData = dashboard.Data

	// 	dashTitle, _ := dashData["title"].(string)
	// 	widgets, ok := dashData["widgets"].([]interface{})
	// 	if !ok {
	// 		continue
	// 	}

	// 	for _, w := range widgets {
	// 		widget, ok := w.(map[string]interface{})
	// 		if !ok {
	// 			continue
	// 		}

	// 		widgetTitle, _ := widget["title"].(string)
	// 		widgetID, _ := widget["id"].(string)

	// 		query, ok := widget["query"].(map[string]interface{})
	// 		if !ok {
	// 			continue
	// 		}

	// 		builder, ok := query["builder"].(map[string]interface{})
	// 		if !ok {
	// 			continue
	// 		}

	// 		queryData, ok := builder["queryData"].([]interface{})
	// 		if !ok {
	// 			continue
	// 		}

	// 		for _, qd := range queryData {
	// 			data, ok := qd.(map[string]interface{})
	// 			if !ok {
	// 				continue
	// 			}

	// 			if dataSource, ok := data["dataSource"].(string); !ok || dataSource != "metrics" {
	// 				continue
	// 			}

	// 			aggregateAttr, ok := data["aggregateAttribute"].(map[string]interface{})
	// 			if !ok {
	// 				continue
	// 			}

	// 			if key, ok := aggregateAttr["key"].(string); ok {
	// 				// Check if this metric is in our list of interest
	// 				for _, metricName := range metricNames {
	// 					if strings.TrimSpace(key) == metricName {
	// 						result[metricName] = append(result[metricName], map[string]string{
	// 							"dashboard_id":   dashboard.UUID,
	// 							"widget_name":    widgetTitle,
	// 							"widget_id":      widgetID,
	// 							"dashboard_name": dashTitle,
	// 						})
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// }

	// return result, nil
	return nil, nil
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	storableDashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	dashboards := make([]*dashboardtypes.Dashboard, len(storableDashboards))
	for idx, storableDashboard := range storableDashboards {
		dashboards[idx] = dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard)
	}

	return dashboards, nil
}

func (module *module) Update(ctx context.Context, updatedOrganization *dashboardtypes.Dashboard) error {
	return nil
	// mapData, err := json.Marshal(data)
	// if err != nil {
	// 	zap.L().Error("Error in marshalling data field in dashboard: ", zap.Any("data", data), zap.Error(err))
	// 	return nil, &model.ApiError{Typ: model.ErrorBadData, Err: err}
	// }

	// dashboard, apiErr := GetDashboard(ctx, orgID, uuid)
	// if apiErr != nil {
	// 	return nil, apiErr
	// }

	// if dashboard.Locked != nil && *dashboard.Locked == 1 {
	// 	return nil, model.BadRequest(fmt.Errorf("dashboard is locked, please unlock the dashboard to be able to edit it"))
	// }

	// // if the total count of panels has reduced by more than 1,
	// // return error
	// existingIds := getWidgetIds(dashboard.Data)
	// newIds := getWidgetIds(data)

	// differenceIds := getIdDifference(existingIds, newIds)

	// if len(differenceIds) > 1 {
	// 	return nil, model.BadRequest(fmt.Errorf("deleting more than one panel is not supported"))
	// }

	// dashboard.UpdatedAt = time.Now()
	// dashboard.UpdatedBy = userEmail
	// dashboard.Data = data

	// _, err = store.BunDB().NewUpdate().Model(dashboard).Set("updated_at = ?", dashboard.UpdatedAt).Set("updated_by = ?", userEmail).Set("data = ?", mapData).Where("uuid = ?", dashboard.UUID).Exec(ctx)

	// if err != nil {
	// 	zap.L().Error("Error in inserting dashboard data", zap.Any("data", data), zap.Error(err))
	// 	return nil, &model.ApiError{Typ: model.ErrorExec, Err: err}
	// }
	// return dashboard, nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if dashboard.Locked {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked")
	}

	return module.store.Delete(ctx, id)
}

// func getIdDifference(existingIds []string, newIds []string) []string {
// 	// Convert newIds array to a map for faster lookups
// 	newIdsMap := make(map[string]bool)
// 	for _, id := range newIds {
// 		newIdsMap[id] = true
// 	}

// 	// Initialize a map to keep track of elements in the difference array
// 	differenceMap := make(map[string]bool)

// 	// Initialize the difference array
// 	difference := []string{}

// 	// Iterate through existingIds
// 	for _, id := range existingIds {
// 		// If the id is not found in newIds, and it's not already in the difference array
// 		if _, found := newIdsMap[id]; !found && !differenceMap[id] {
// 			difference = append(difference, id)
// 			differenceMap[id] = true // Mark the id as seen in the difference array
// 		}
// 	}

// 	return difference
// }

// func LockUnlockDashboard(ctx context.Context, orgID, uuid string, lock bool) *model.ApiError {
// 	dashboard, apiErr := GetDashboard(ctx, orgID, uuid)
// 	if apiErr != nil {
// 		return apiErr
// 	}

// 	var lockValue int
// 	if lock {
// 		lockValue = 1
// 	} else {
// 		lockValue = 0
// 	}

// 	_, err := store.BunDB().NewUpdate().Model(dashboard).Set("locked = ?", lockValue).Where("org_id = ?", orgID).Where("uuid = ?", uuid).Exec(ctx)
// 	if err != nil {
// 		zap.L().Error("Error in updating dashboard", zap.String("uuid", uuid), zap.Error(err))
// 		return &model.ApiError{Typ: model.ErrorExec, Err: err}
// 	}

// 	return nil
// }
