package impldashboard

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store dashboardtypes.Store
}

func NewModule(sqlstore sqlstore.SQLStore) dashboard.Module {
	return &module{
		store: NewStore(sqlstore),
	}
}

// CreateDashboard creates a new dashboard
func (module *module) Create(ctx context.Context, orgID valuer.UUID, dashboard *dashboardtypes.Dashboard) error {
	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return err
	}
	return module.store.Create(ctx, storableDashboard)
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	storableDashboards, err := module.store.GetAll(ctx, orgID)
	if err != nil {
		return nil, err
	}

	dashboards, err := dashboardtypes.NewDashboardsFromStorableDashboards(storableDashboards)
	if err != nil {
		return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to list dashboards")
	}

	return dashboards, nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if dashboard.Locked {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be delete it")
	}

	return module.store.Delete(ctx, orgID, id)
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id valuer.UUID) (*dashboardtypes.Dashboard, error) {
	storableDashboard, err := module.store.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	dashboard, err := dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard)
	if err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, dashboard *dashboardtypes.Dashboard) error {
	dashboardUUID, err := valuer.NewUUID(dashboard.ID)
	if err != nil {
		return errors.Wrapf(err, errors.TypeInvalidInput, errors.CodeInvalidInput, "id should be a valid uuid")
	}

	existingDashboard, err := module.Get(ctx, orgID, dashboardUUID)
	if err != nil {
		return err
	}

	if existingDashboard.Locked {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to edit it")
	}

	existingIds := dashboardtypes.GetWidgetIds(existingDashboard.Data)
	newIds := dashboardtypes.GetWidgetIds(dashboard.Data)
	differenceIds := dashboardtypes.GetIdDifference(existingIds, newIds)
	if len(differenceIds) > 1 {
		return errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "deleting more than one panel is not supported")
	}

	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return err
	}
	return module.store.Update(ctx, storableDashboard)
}

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, lock bool) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return err
	}

	// TODO[@vikrantgupta25]: update this
	return module.store.Update(ctx, storableDashboard)
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error) {
	dashboards, err := module.List(ctx, orgID)
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
								"dashboard_id":   dashboard.ID,
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
