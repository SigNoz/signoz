package impldashboard

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/google/uuid"
)

type module struct {
	sqlstore sqlstore.SQLStore
}

func NewModule(sqlstore sqlstore.SQLStore) dashboard.Module {
	return &module{
		sqlstore: sqlstore,
	}
}

// CreateDashboard creates a new dashboard
func (module *module) Create(ctx context.Context, orgID string, email string, data map[string]interface{}) (*types.Dashboard, error) {
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

	err := module.
		sqlstore.
		BunDB().
		NewInsert().
		Model(dash).
		Returning("id").
		Scan(ctx, &dash.ID)
	if err != nil {
		return nil, module.sqlstore.WrapAlreadyExistsErrf(err, errors.CodeAlreadyExists, "dashboard with uuid %s already exists", dash.UUID)
	}

	return dash, nil
}

func (module *module) List(ctx context.Context, orgID string) ([]*types.Dashboard, error) {
	dashboards := []*types.Dashboard{}

	err := module.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&dashboards).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return dashboards, nil
}

func (module *module) Delete(ctx context.Context, orgID, uuid string) error {
	dashboard, err := module.Get(ctx, orgID, uuid)
	if err != nil {
		return err
	}

	if dashboard.Locked != nil && *dashboard.Locked == 1 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be able to delete it")
	}

	result, err := module.
		sqlstore.
		BunDB().
		NewDelete().
		Model(&types.Dashboard{}).
		Where("org_id = ?", orgID).
		Where("uuid = ?", uuid).
		Exec(ctx)
	if err != nil {
		return err
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if affectedRows == 0 {
		return errors.Newf(errors.TypeNotFound, errors.CodeNotFound, "no dashboard found with uuid: %s", uuid)
	}

	return nil
}

func (module *module) Get(ctx context.Context, orgID, uuid string) (*types.Dashboard, error) {
	dashboard := types.Dashboard{}
	err := module.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&dashboard).
		Where("org_id = ?", orgID).
		Where("uuid = ?", uuid).
		Scan(ctx)
	if err != nil {
		return nil, module.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "dashboard with uuid %s not found", uuid)
	}

	return &dashboard, nil
}

func (module *module) Update(ctx context.Context, orgID, userEmail, uuid string, data map[string]interface{}) (*types.Dashboard, error) {
	mapData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	dashboard, err := module.Get(ctx, orgID, uuid)
	if err != nil {
		return nil, err
	}

	if dashboard.Locked != nil && *dashboard.Locked == 1 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be able to edit it")
	}

	// if the total count of panels has reduced by more than 1,
	// return error
	existingIds := getWidgetIds(dashboard.Data)
	newIds := getWidgetIds(data)

	differenceIds := getIdDifference(existingIds, newIds)

	if len(differenceIds) > 1 {
		return nil, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "deleting more than one panel is not supported")
	}

	dashboard.UpdatedAt = time.Now()
	dashboard.UpdatedBy = userEmail
	dashboard.Data = data

	_, err = module.sqlstore.
		BunDB().
		NewUpdate().
		Model(dashboard).
		Set("updated_at = ?", dashboard.UpdatedAt).
		Set("updated_by = ?", userEmail).
		Set("data = ?", mapData).
		Where("uuid = ?", dashboard.UUID).Exec(ctx)
	if err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (module *module) LockUnlock(ctx context.Context, orgID, uuid string, lock bool) error {
	dashboard, err := module.Get(ctx, orgID, uuid)
	if err != nil {
		return err
	}

	var lockValue int
	if lock {
		lockValue = 1
	} else {
		lockValue = 0
	}

	_, err = module.
		sqlstore.
		BunDB().
		NewUpdate().
		Model(dashboard).
		Set("locked = ?", lockValue).
		Where("org_id = ?", orgID).
		Where("uuid = ?", uuid).
		Exec(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) GetByMetricNames(ctx context.Context, orgID string, metricNames []string) (map[string][]map[string]string, error) {
	dashboards := []types.Dashboard{}
	err := module.
		sqlstore.
		BunDB().
		NewSelect().
		Model(&dashboards).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return nil, err
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
								"dashboard_id":   dashboard.UUID,
								"widget_name":    widgetTitle,
								"widget_id":      widgetID,
								"dashboard_name": dashTitle,
							})
						}
					}
				}
			}
		}
	}

	return result, nil
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
