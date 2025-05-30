package impldashboard

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store                       dashboardtypes.Store
	settings                    factory.ScopedProviderSettings
	integrationsController      *integrations.Controller
	cloudIntegrationsController *cloudintegrations.Controller
}

func NewModule(sqlstore sqlstore.SQLStore, settings factory.ProviderSettings, integrationsController *integrations.Controller, cloudIntegrationsController *cloudintegrations.Controller) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/impldashboard")
	return &module{
		store:                       NewStore(sqlstore),
		settings:                    scopedProviderSettings,
		integrationsController:      integrationsController,
		cloudIntegrationsController: cloudIntegrationsController,
	}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, createdBy string, postableDashboard dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error) {
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

	return dashboard, nil
}

func (module *module) Get(ctx context.Context, orgID valuer.UUID, id string) (*dashboardtypes.Dashboard, error) {
	dashboardID, err := valuer.NewUUID(id)
	if err != nil {
		if module.cloudIntegrationsController.IsCloudIntegrationDashboardUuid(id) {
			dashboard, apiErr := module.cloudIntegrationsController.GetDashboardById(ctx, orgID, id)
			if apiErr != nil {
				return nil, apiErr
			}
			return dashboard, nil
		} else if module.integrationsController.IsInstalledIntegrationDashboardID(id) {
			dashboard, apiErr := module.integrationsController.GetInstalledIntegrationDashboardById(ctx, orgID, id)
			if apiErr != nil {
				return nil, apiErr
			}
			return dashboard, nil
		}

		return nil, err
	}

	storableDashboard, err := module.store.Get(ctx, orgID, dashboardID)
	if err != nil {
		return nil, err
	}

	dashboard, err := dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard)
	if err != nil {
		return nil, err
	}
	return dashboard, nil
}

func (module *module) GetAll(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	dashboards := make([]*dashboardtypes.Dashboard, 0)

	installedIntegrationDashboards, apiErr := module.integrationsController.GetDashboardsForInstalledIntegrations(ctx, orgID)
	if apiErr != nil {
		module.settings.Logger().ErrorContext(ctx, "failed to get dashboards for installed integrations", "error", apiErr)
	} else {
		dashboards = append(dashboards, installedIntegrationDashboards...)
	}

	cloudIntegrationDashboards, apiErr := module.cloudIntegrationsController.AvailableDashboards(ctx, orgID)
	if apiErr != nil {
		module.settings.Logger().ErrorContext(ctx, "failed to get cloud dashboards", "error", apiErr)
	} else {
		dashboards = append(dashboards, cloudIntegrationDashboards...)
	}

	storableDashboards, err := module.store.GetAll(ctx, orgID)
	if err != nil && !errors.Ast(err, errors.TypeNotFound) {
		return nil, err
	}

	if err == nil {
		sqlDashboards, err := dashboardtypes.NewDashboardsFromStorableDashboards(storableDashboards)
		if err != nil {
			return nil, errors.Wrapf(err, errors.TypeInternal, errors.CodeInternal, "failed to list dashboards")
		}
		dashboards = append(dashboards, sqlDashboards...)
	}

	return dashboards, nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id string, updatedBy string, updatableDashboard dashboardtypes.UpdatableDashboard) (*dashboardtypes.Dashboard, error) {
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

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id string, updatedBy string, lock bool) error {
	if module.cloudIntegrationsController.IsCloudIntegrationDashboardUuid(id) || module.integrationsController.IsInstalledIntegrationDashboardID(id) {
		return errors.New(errors.TypeForbidden, errors.CodeForbidden, "cannot unlock the integrations dashboards")
	}

	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = dashboard.LockUnlock(lock, updatedBy)
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

func (module *module) Delete(ctx context.Context, orgID valuer.UUID, id string) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if dashboard.Locked {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboard is locked, please unlock the dashboard to be delete it")
	}

	dashboardID, err := valuer.NewUUID(id)
	if err != nil {
		return err
	}

	return module.store.Delete(ctx, orgID, dashboardID)
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error) {
	dashboards, err := module.GetAll(ctx, orgID)
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
