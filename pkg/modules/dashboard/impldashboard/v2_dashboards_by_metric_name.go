package impldashboard

import (
	"context"
	"log/slog"
	"maps"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/dashboardtypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func (m *module) GetByMetricNamesV2(ctx context.Context, orgID valuer.UUID, metricNames []string) (map[string][]dashboardtypes.DashboardPanelRef, error) {
	metricNamesMap := make(map[string]bool, len(metricNames))
	for _, name := range metricNames {
		metricNamesMap[name] = true
	}

	candidateDashboards, err := m.getCandidatesDashboardsForMetricNames(ctx, orgID, metricNames)
	if err != nil {
		return nil, err
	}

	return m.selectDashboardsFromCandidates(ctx, metricNamesMap, candidateDashboards), nil
}

func (m *module) getCandidatesDashboardsForMetricNames(ctx context.Context, orgID valuer.UUID, metricNames []string) ([]*dashboardtypes.DashboardV2, error) {
	storables, err := m.store.ListByDataContainsAny(ctx, orgID, metricNames)
	if err != nil {
		return nil, err
	}

	candidates := make([]*dashboardtypes.DashboardV2, 0, len(storables))
	for _, storable := range storables {
		if storable.Source == dashboardtypes.SourceSystem {
			continue
		}

		// tags are not required for this process so sending a nil list here.
		dashboard, err := storable.ToDashboardV2(nil)
		if err != nil {
			m.settings.Logger().WarnContext(ctx, "skipping dashboard that couldn't be parsed as v2", slog.String("dashboard_id", storable.ID.StringValue()), errors.Attr(err))
			continue
		}
		candidates = append(candidates, dashboard)
	}
	return candidates, nil
}

func (m *module) selectDashboardsFromCandidates(ctx context.Context, metricNamesMap map[string]bool, candidateDashboards []*dashboardtypes.DashboardV2) map[string][]dashboardtypes.DashboardPanelRef {
	result := make(map[string][]dashboardtypes.DashboardPanelRef)
	for _, dashboard := range candidateDashboards {
		for panelID, panel := range dashboard.Spec.Panels {
			if panel == nil {
				continue
			}
			metricsInPanel := make(map[string]bool)
			for _, query := range panel.Spec.Queries {
				maps.Copy(metricsInPanel, m.extractMetricNamesFromQuerySpec(ctx, query.Spec.Plugin.Spec))
			}
			for metricName := range metricsInPanel {
				if !metricNamesMap[metricName] {
					continue
				}
				result[metricName] = append(result[metricName], dashboardtypes.DashboardPanelRef{
					DashboardID:   dashboard.ID.StringValue(),
					DashboardName: dashboard.Spec.Display.Name,
					PanelID:       panelID,
					PanelName:     panel.Spec.Display.Name,
				})
			}
		}
	}
	return result
}

func (m *module) extractMetricNamesFromQuerySpec(ctx context.Context, spec any) map[string]bool {
	found := make(map[string]bool)
	switch s := spec.(type) {
	case *qbtypes.CompositeQuery:
		for _, envelope := range s.Queries {
			maps.Copy(found, m.extractMetricNamesFromQueryEnvelope(ctx, envelope))
		}
	case *dashboardtypes.BuilderQuerySpec:
		if builder, ok := s.Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]); ok {
			for _, aggregation := range builder.Aggregations {
				if aggregation.MetricName != "" {
					found[aggregation.MetricName] = true
				}
			}
		}
	case *qbtypes.PromQuery:
		maps.Copy(found, m.extractMetricNamesFromRawQuery(ctx, qbtypes.QueryTypePromQL, s.Query))
	case *qbtypes.ClickHouseQuery:
		maps.Copy(found, m.extractMetricNamesFromRawQuery(ctx, qbtypes.QueryTypeClickHouseSQL, s.Query))
	}
	return found
}

func (m *module) extractMetricNamesFromQueryEnvelope(ctx context.Context, envelope qbtypes.QueryEnvelope) map[string]bool {
	found := make(map[string]bool)
	switch s := envelope.Spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		for _, aggregation := range s.Aggregations {
			if aggregation.MetricName != "" {
				found[aggregation.MetricName] = true
			}
		}
	case qbtypes.PromQuery:
		maps.Copy(found, m.extractMetricNamesFromRawQuery(ctx, qbtypes.QueryTypePromQL, s.Query))
	case qbtypes.ClickHouseQuery:
		maps.Copy(found, m.extractMetricNamesFromRawQuery(ctx, qbtypes.QueryTypeClickHouseSQL, s.Query))
	}
	return found
}

func (m *module) extractMetricNamesFromRawQuery(ctx context.Context, queryType qbtypes.QueryType, query string) map[string]bool {
	found := make(map[string]bool)
	if query == "" {
		return found
	}
	result, err := m.queryParser.AnalyzeQueryFilter(ctx, queryType, query)
	if err != nil {
		m.settings.Logger().WarnContext(ctx, "failed to parse query for metric names", slog.String("query", query), errors.Attr(err))
		return found
	}
	for _, metricName := range result.MetricNames {
		found[metricName] = true
	}
	return found
}
