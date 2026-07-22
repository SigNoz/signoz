package impldashboard

import (
	"context"
	"log/slog"
	"slices"

	"github.com/SigNoz/signoz/pkg/analytics"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/modules/dashboard"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/tag"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/queryparser"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type module struct {
	store       dashboardtypes.Store
	settings    factory.ScopedProviderSettings
	analytics   analytics.Analytics
	orgGetter   organization.Getter
	queryParser queryparser.QueryParser
	tagModule   tag.Module
}

func NewModule(store dashboardtypes.Store, settings factory.ProviderSettings, analytics analytics.Analytics, orgGetter organization.Getter, queryParser queryparser.QueryParser, tagModule tag.Module) dashboard.Module {
	scopedProviderSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/modules/dashboard/impldashboard")
	return &module{
		store:       store,
		settings:    scopedProviderSettings,
		analytics:   analytics,
		orgGetter:   orgGetter,
		queryParser: queryParser,
		tagModule:   tagModule,
	}
}

func (module *module) Create(ctx context.Context, orgID valuer.UUID, createdBy string, creator valuer.UUID, source dashboardtypes.Source, postableDashboard dashboardtypes.PostableDashboard) (*dashboardtypes.Dashboard, error) {
	dashboard, err := dashboardtypes.NewDashboard(orgID, createdBy, source, postableDashboard)
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

	// system dashboards are hidden from the listing endpoint but still gettable by id.
	filtered := make([]*dashboardtypes.StorableDashboard, 0, len(storableDashboards))
	for _, storable := range storableDashboards {
		if storable.Source == dashboardtypes.SourceSystem {
			continue
		}
		filtered = append(filtered, storable)
	}

	return dashboardtypes.NewDashboardsFromStorableDashboards(filtered), nil
}

func (module *module) Update(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, updatableDashboard dashboardtypes.UpdatableDashboard, diff int) (*dashboardtypes.Dashboard, error) {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return nil, err
	}

	if err := dashboard.ErrIfNotMutable(); err != nil {
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

func (module *module) LockUnlock(ctx context.Context, orgID valuer.UUID, id valuer.UUID, updatedBy string, isAdmin bool, lock bool) error {
	dashboard, err := module.Get(ctx, orgID, id)
	if err != nil {
		return err
	}

	if err := dashboard.ErrIfNotLockable(); err != nil {
		return err
	}

	err = dashboard.LockUnlock(lock, isAdmin, updatedBy)
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

	if err := dashboard.ErrIfNotDeletable(); err != nil {
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

func (module *module) DeleteUnsafe(ctx context.Context, orgID valuer.UUID, id valuer.UUID) error {
	return module.store.Delete(ctx, orgID, id)
}

func (module *module) GetByMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]dashboardtypes.DashboardPanelRef, error) {
	dashboards, err := module.List(ctx, orgID)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]dashboardtypes.DashboardPanelRef)

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

			// Track which metrics were found in this widget, along with the
			// group-by and filter labels referenced for each metric. CH/PromQL
			// paths are presence-only and leave the label sets empty.
			foundMetrics := make(map[string]bool)
			groupByByMetric := make(map[string][]string)
			filterByByMetric := make(map[string][]string)

			// Check all three query types
			module.checkBuilderQueriesForMetricNames(query, metricNames, foundMetrics, groupByByMetric, filterByByMetric)
			module.checkClickHouseQueriesForMetricNames(ctx, query, metricNames, foundMetrics)
			module.checkPromQLQueriesForMetricNames(ctx, query, metricNames, foundMetrics)

			// Add widget to results for all found metrics
			for metricName := range foundMetrics {
				result[metricName] = append(result[metricName], dashboardtypes.DashboardPanelRef{
					DashboardID:   dashboard.ID,
					DashboardName: dashTitle,
					PanelID:       widgetID,
					PanelName:     widgetTitle,
					GroupBy:       groupByByMetric[metricName],
					FilterBy:      filterByByMetric[metricName],
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

// CreatePublic is not supported.
func (module *module) CreatePublic(ctx context.Context, orgID valuer.UUID, publicDashboard *dashboardtypes.PublicDashboard) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublic(_ context.Context, _, _ valuer.UUID) (*dashboardtypes.PublicDashboard, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetDashboardByPublicID(_ context.Context, _ valuer.UUID) (*dashboardtypes.Dashboard, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicWidgetQueryRange(context.Context, valuer.UUID, uint64, uint64, uint64) (*qbtypes.QueryRangeResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetDashboardByPublicIDV2(_ context.Context, _ valuer.UUID) (*dashboardtypes.DashboardV2, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicWidgetQueryRangeV2(context.Context, valuer.UUID, string, string, string) (*qbtypes.QueryRangeResponse, error) {
	return nil, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) GetPublicDashboardSelectorsAndOrg(_ context.Context, _ valuer.UUID, _ []*types.Organization) ([]coretypes.Selector, valuer.UUID, error) {
	return nil, valuer.UUID{}, errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) UpdatePublic(_ context.Context, _ valuer.UUID, _ *dashboardtypes.PublicDashboard) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

func (module *module) DeletePublic(_ context.Context, _ valuer.UUID, _ valuer.UUID) error {
	return errors.Newf(errors.TypeUnsupported, dashboardtypes.ErrCodePublicDashboardUnsupported, "not implemented")
}

// checkBuilderQueriesForMetricNames checks builder.queryData[] for aggregations[].metricName.
// For each queryData entry whose dataSource is "metrics" and that references a
// target metric, it accumulates (deduped) the group-by and filter labels used
// by that entry into groupByByMetric/filterByByMetric, keyed by metric name.
func (module *module) checkBuilderQueriesForMetricNames(query map[string]interface{}, metricNames []string, foundMetrics map[string]bool, groupByByMetric, filterByByMetric map[string][]string) {
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

		entryMetrics := make([]string, 0, len(aggregations))
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
				entryMetrics = append(entryMetrics, metricName)
			}
		}

		if len(entryMetrics) == 0 {
			continue
		}

		groupBy := extractBuilderGroupByLabels(data)
		filterBy := extractBuilderFilterLabels(data)
		for _, metricName := range entryMetrics {
			groupByByMetric[metricName] = appendDedup(groupByByMetric[metricName], groupBy...)
			filterByByMetric[metricName] = appendDedup(filterByByMetric[metricName], filterBy...)
		}
	}
}

func extractBuilderGroupByLabels(data map[string]interface{}) []string {
	gb, ok := data["groupBy"].([]interface{})
	if !ok {
		return nil
	}

	out := make([]string, 0, len(gb))
	for _, g := range gb {
		gm, ok := g.(map[string]interface{})
		if !ok {
			continue
		}
		if name, ok := gm["name"].(string); ok && name != "" {
			out = append(out, name)
			continue
		}
		// v3: groupBy[].key may be a plain string ...
		if key, ok := gm["key"].(string); ok && key != "" {
			out = append(out, key)
			continue
		}
		// ... or a nested object {key: "<name>"}.
		if km, ok := gm["key"].(map[string]interface{}); ok {
			if key, ok := km["key"].(string); ok && key != "" {
				out = append(out, key)
			}
		}
	}
	return out
}

func extractBuilderFilterLabels(data map[string]interface{}) []string {
	out := []string{}

	// v5: filter.expression
	if f, ok := data["filter"].(map[string]interface{}); ok {
		if expr, ok := f["expression"].(string); ok && expr != "" {
			for _, sel := range querybuilder.QueryStringToKeysSelectors(expr) {
				if sel != nil && sel.Name != "" {
					out = append(out, sel.Name)
				}
			}
		}
	}

	// v3: filters.items[].key.key
	if f, ok := data["filters"].(map[string]interface{}); ok {
		if items, ok := f["items"].([]interface{}); ok {
			for _, it := range items {
				im, ok := it.(map[string]interface{})
				if !ok {
					continue
				}
				km, ok := im["key"].(map[string]interface{})
				if !ok {
					continue
				}
				if key, ok := km["key"].(string); ok && key != "" {
					out = append(out, key)
				}
			}
		}
	}

	return out
}

func appendDedup(dst []string, values ...string) []string {
	for _, v := range values {
		if v == "" || slices.Contains(dst, v) {
			continue
		}
		dst = append(dst, v)
	}
	return dst
}

// checkClickHouseQueriesForMetricNames checks clickhouse_sql[] array for metric names in query strings.
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
			module.settings.Logger().WarnContext(ctx, "failed to parse ClickHouse query", slog.String("query", queryStr), errors.Attr(err))
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

// checkPromQLQueriesForMetricNames checks promql[] array for metric names in query strings.
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
			module.settings.Logger().WarnContext(ctx, "failed to parse PromQL query", slog.String("query", queryStr), errors.Attr(err))
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
