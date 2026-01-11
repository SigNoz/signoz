package impldashboard

import (
	"context"
	"slices"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	"github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store       dashboardtypes.Store
	settings    factory.ScopedProviderSettings
	analytics   analytics.Analytics
	orgGetter   organization.Getter
	queryParser queryparser.QueryParser
}

func NewModule(store dashboardtypes.Store, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, queryParser queryparser.QueryParser) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard")
	return &module{
		store:       store,
		settings:    scopedProviderSettings,
		analytics:   analytics,
		orgGetter:   orgGetter,
		queryParser: queryParser,
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

	return dashboardtypes.NewDashboardFromStorableDashboard(storableDashboard), nil
}

func (module *module) List(ctx context.Context, orgID valuer.UUID) ([]*dashboardtypes.Dashboard, error) {
	storableDashboards, err := module.store.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	return dashboardtypes.NewDashboardsFromStorableDashboards(storableDashboards), nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatableDashboard dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error) {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	err = dashboard.Update(ctx, updatableDashboard, updatedBy, diff)
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

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, role types.Role, lock bool) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	err = dashboard.LockUnlock(lock, role, updatedBy)
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

	err = module.store.Delete(ctx, orgID, id)
	if err != nil {
		return err
	}

	return nil
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]map[string]string, error) {
	dashboards, err := module.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]map[string]string)

	for _, dashboard := range dashboards {
		dashData := dashboard.Data
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

			// Track which metrics were found in this widget
			foundMetrics := make(map[string]bool)

			// Check all three query types
			module.checkBuilderQueriesForMetricNames(query, metricNames, foundMetrics)
			module.checkClickHouseQueriesForMetricNames(ctx, query, metricNames, foundMetrics)
			module.checkPromQLQueriesForMetricNames(ctx, query, metricNames, foundMetrics)

			// Add widget to results for all found metrics
			for metricName := range foundMetrics {
				result[metricName] = append(result[metricName], map[string]string{
					"dashboard_id":   dashboard.ID,
					"widget_name":    widgetTitle,
					"widget_id":      widgetID,
					"dashboard_name": dashTitle,
				})
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

func (module *module) MustGetTypeables() []authtypes.Typeable {
	return []authtypes.Typeable{dashboardtypes.TypeableMetaResourceDashboard, dashboardtypes.TypeableMetaResourcesDashboards}
}

// not supported
func (module *module) CreatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublic(_ context.Context, _, _ valuer.UUID) (*dashboardtypes.PublicDashboard, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetDashboardByPublicID(_ context.Context, _ valuer.UUID) (*dashboardtypes.Dashboard, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicWidgetQueryRange(context.Context, valuer.UUID, uint64, uint64, uint64) (*querybuildertypesv5.QueryRangeResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicDashboardSelectorsAndOrg(_ context.Context, _ valuer.UUID, _ []*types.Organization) ([]authtypes.Selector, valuer.UUID, error) {
	return nil, valuer.UUID{}, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) UpdatePublic(_ context.Context, _ valuer.UUID, _ *dashboardtypes.PublicDashboard) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) DeletePublic(_ context.Context, _ valuer.UUID, _ valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

// checkBuilderQueriesForMetricNames checks builder.queryData[] for aggregations[].metricName
func (module *module) checkBuilderQueriesForMetricNames(query map[string]interface{}, metricNames []string, foundMetrics map[string]bool) {
	builder, ok := query["builder"].(map[string]interface{})
	if !ok {
		return
	}

	queryData, ok := builder["queryData"].([]interface{})
	if !ok {
		return
	}

	for _, qd := range queryData {
		data, ok := qd.(map[string]interface{})
		if !ok {
			continue
		}

		// Check dataSource is metrics
		if dataSource, ok := data["dataSource"].(string); !ok || dataSource != "metrics" {
			continue
		}

		// Check aggregations[].metricName
		aggregations, ok := data["aggregations"].([]interface{})
		if !ok {
			continue
		}

		for _, agg := range aggregations {
			aggMap, ok := agg.(map[string]interface{})
			if !ok {
				continue
			}

			metricName, ok := aggMap["metricName"].(string)
			if !ok || metricName == "" {
				continue
			}

			if slices.Contains(metricNames, metricName) {
				foundMetrics[metricName] = true
			}
		}
	}
}

// checkClickHouseQueriesForMetricNames checks clickhouse_sql[] array for metric names in query strings
func (module *module) checkClickHouseQueriesForMetricNames(ctx context.Context, query map[string]interface{}, metricNames []string, foundMetrics map[string]bool) {
	clickhouseSQL, ok := query["clickhouse_sql"].([]interface{})
	if !ok {
		return
	}

	for _, chQuery := range clickhouseSQL {
		chQueryMap, ok := chQuery.(map[string]interface{})
		if !ok {
			continue
		}

		queryStr, ok := chQueryMap["query"].(string)
		if !ok || queryStr == "" {
			continue
		}

		// Parse query to extract metric names
		result, err := module.queryParser.AnalyzeQueryFilter(ctx, qbtypes.QueryTypeClickHouseSQL, queryStr)
		if err != nil {
			// Log warning and continue - parsing errors shouldn't break the search
			module.settings.Logger().WarnContext(ctx, "failed to parse ClickHouse query", "query", queryStr, "error", err)
			continue
		}

		// Check if any of the search metric names are in the extracted metric names
		for _, metricName := range metricNames {
			if slices.Contains(result.MetricNames, metricName) {
				foundMetrics[metricName] = true
			}
		}
	}
}

// checkPromQLQueriesForMetricNames checks promql[] array for metric names in query strings
func (module *module) checkPromQLQueriesForMetricNames(ctx context.Context, query map[string]interface{}, metricNames []string, foundMetrics map[string]bool) {
	promQL, ok := query["promql"].([]interface{})
	if !ok {
		return
	}

	for _, promQuery := range promQL {
		promQueryMap, ok := promQuery.(map[string]interface{})
		if !ok {
			continue
		}

		queryStr, ok := promQueryMap["query"].(string)
		if !ok || queryStr == "" {
			continue
		}

		// Parse query to extract metric names
		result, err := module.queryParser.AnalyzeQueryFilter(ctx, qbtypes.QueryTypePromQL, queryStr)
		if err != nil {
			// Log warning and continue - parsing errors shouldn't break the search
			module.settings.Logger().WarnContext(ctx, "failed to parse PromQL query", "query", queryStr, "error", err)
			continue
		}

		// Check if any of the search metric names are in the extracted metric names
		for _, metricName := range metricNames {
			if slices.Contains(result.MetricNames, metricName) {
				foundMetrics[metricName] = true
			}
		}
	}
}
