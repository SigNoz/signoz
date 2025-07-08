package impldashboard

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store     dashboardtypes.Store
	settings  factory.ScopedProviderSettings
	analytics analytics.Analytics
}

func NewModule(sqlstore sqlstore.SQLStore, settings factory.ProviderSettings, analytics analytics.Analytics) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/impldashboard")
	return &module{
		store:     NewStore(sqlstore),
		settings:  scopedProviderSettings,
		analytics: analytics,
	}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, postableDashboard dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error) {
	dashboard, err := dashboardtypes.NewDashboard(orgID, createdBy, postableDashboard)
	if err != nil {
		return nil, err
	}

	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return nil, err
	}

	err = module.store.Create(ctx, storableDashboard)
	if err != nil {
		return nil, err
	}

	module.analytics.TrackUser(ctx, orgID.String(), creator.String(), "Dashboard Created", dashboardtypes.NewStatsFromStorableDashboards([]*dashboardtypes.StorableDashboard{storableDashboard}))
	return dashboard, nil
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

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	storableDashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	dashboards, err := dashboardtypes.NewDashboardsFromStorableDashboards(storableDashboards)
	if err != nil {
		return nil, err
	}

	return dashboards, nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatableDashboard dashboardtypes.UpdatableDashboard) (*dashboardtypes.Dashboard, error) {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	err = dashboard.Update(updatableDashboard, updatedBy)
	if err != nil {
		return nil, err
	}

	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return nil, err
	}

	err = module.store.Update(ctx, orgID, storableDashboard)
	if err != nil {
		return nil, err
	}

	return dashboard, nil
}

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, lock bool) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = dashboard.LockUnlock(ctx, lock, updatedBy)
	if err != nil {
		return err
	}
	storableDashboard, err := dashboardtypes.NewStorableDashboardFromDashboard(dashboard)
	if err != nil {
		return err
	}

	err = module.store.Update(ctx, orgID, storableDashboard)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if dashboard.Locked {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be delete it")
	}

	return module.store.Delete(ctx, orgID, id)
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

func (module *module) Collect(ctx context.Context, orgID valuer.UUID) (map[string]any, error) {
	dashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewStatsFromStorableDashboards(dashboards), nil
}
