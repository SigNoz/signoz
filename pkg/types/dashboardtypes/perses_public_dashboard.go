package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
)

// ════════════════════════════════════════════════════════════════════════
// Gettable
// ════════════════════════════════════════════════════════════════════════

// PublicWidgetQueryRangeParams are the query params of the public panel query-range endpoint.
type PublicWidgetQueryRangeParams struct {
	StartTime string `query:"startTime" required:"false"`
	EndTime   string `query:"endTime" required:"false"`
}

// GettablePublicDashboardDataV2 is the anonymous-facing payload of a v2 dashboard.
type GettablePublicDashboardDataV2 struct {
	Dashboard       *GettableDashboardV2      `json:"dashboard"`
	PublicDashboard *GettablePublicDasbhboard `json:"publicDashboard"`
}

// NewPublicDashboardDataFromDashboardV2 builds the anonymous v2 payload: panel queries
// and query-variable queries are redacted, and only the body fields v1 exposed (name,
// metadata, tags, spec) are set.
func NewPublicDashboardDataFromDashboardV2(dashboard *DashboardV2, publicDashboard *PublicDashboard) *GettablePublicDashboardDataV2 {
	spec := dashboard.Spec
	redactPanelQueries(&spec)
	redactVariableQueries(&spec)

	return &GettablePublicDashboardDataV2{
		Dashboard: &GettableDashboardV2{
			DashboardV2MetadataBase: dashboard.DashboardV2MetadataBase,
			Name:                    dashboard.Name,
			Tags:                    tagtypes.NewGettableTagsFromTags(dashboard.Tags),
			Spec:                    spec,
		},
		PublicDashboard: &GettablePublicDasbhboard{
			TimeRangeEnabled: publicDashboard.TimeRangeEnabled,
			DefaultTimeRange: publicDashboard.DefaultTimeRange,
			PublicPath:       publicDashboard.PublicPath(),
		},
	}
}

// ════════════════════════════════════════════════════════════════════════
// Redaction
// ════════════════════════════════════════════════════════════════════════

func redactPanelQueries(spec *DashboardSpec) {
	panels := make(map[string]*Panel, len(spec.Panels))
	for key, panel := range spec.Panels {
		if panel == nil {
			panels[key] = nil
			continue
		}
		redacted := *panel
		queries := make([]Query, len(redacted.Spec.Queries))
		for i, query := range redacted.Spec.Queries {
			query.Spec.Plugin.Spec = redactQuery(query.Spec.Plugin.Spec)
			queries[i] = query
		}
		redacted.Spec.Queries = queries
		panels[key] = &redacted
	}
	spec.Panels = panels
}

// redactVariableQueries strips the raw query from query-kind list variables. The
// query is the same class of secret as a panel query, and the anonymous viewer
// never runs variable queries. Rebuilds the slice rather than mutating in place:
// spec shares its Variables backing array with the stored dashboard.
func redactVariableQueries(spec *DashboardSpec) {
	variables := make([]Variable, len(spec.Variables))
	copy(variables, spec.Variables)
	for i := range variables {
		list, ok := variables[i].Spec.(*ListVariableSpec)
		if !ok || list.Plugin.Kind != VariableKindQuery {
			continue
		}
		if _, ok := list.Plugin.Spec.(*QueryVariableSpec); ok {
			redacted := *list
			redacted.Plugin.Spec = &QueryVariableSpec{}
			variables[i].Spec = &redacted
		}
	}
	spec.Variables = variables
}

func redactQuery(spec any) any {
	switch s := spec.(type) {
	case *qb.CompositeQuery:
		if s == nil {
			return spec
		}
		queries := make([]qb.QueryEnvelope, len(s.Queries))
		for i, envelope := range s.Queries {
			envelope.Spec = redactLeafQuery(envelope.Spec)
			queries[i] = envelope
		}
		return &qb.CompositeQuery{Queries: queries}
	case *BuilderQuerySpec:
		if s == nil {
			return spec
		}
		return &BuilderQuerySpec{Spec: redactLeafQuery(s.Spec)}
	case *qb.PromQuery:
		return redactQueryPtr(s)
	case *qb.ClickHouseQuery:
		return redactQueryPtr(s)
	case *qb.QueryBuilderFormula:
		return redactQueryPtr(s)
	case *qb.QueryBuilderTraceOperator:
		return redactQueryPtr(s)
	}
	return spec
}

func redactQueryPtr[T any](s *T) any {
	if s == nil {
		return s
	}
	redacted := redactLeafQuery(*s).(T)
	return &redacted
}

func redactLeafQuery(spec any) any {
	switch s := spec.(type) {
	case qb.QueryBuilderQuery[qb.LogAggregation]:
		return redactBuilderQuery(s)
	case qb.QueryBuilderQuery[qb.MetricAggregation]:
		return redactBuilderQuery(s)
	case qb.QueryBuilderQuery[qb.TraceAggregation]:
		return redactBuilderQuery(s)
	case qb.PromQuery:
		return qb.PromQuery{Name: s.Name, Legend: s.Legend}
	case qb.ClickHouseQuery:
		return qb.ClickHouseQuery{Name: s.Name, Legend: s.Legend}
	case qb.QueryBuilderFormula:
		return qb.QueryBuilderFormula{Name: s.Name, Expression: s.Expression, Legend: s.Legend}
	case qb.QueryBuilderTraceOperator:
		return qb.QueryBuilderTraceOperator{
			Name:         s.Name,
			Expression:   s.Expression,
			Aggregations: s.Aggregations,
			GroupBy:      s.GroupBy,
			Legend:       s.Legend,
		}
	}
	return spec
}

func redactBuilderQuery[T any](q qb.QueryBuilderQuery[T]) qb.QueryBuilderQuery[T] {
	return qb.QueryBuilderQuery[T]{
		Name:         q.Name,
		Signal:       q.Signal,
		Source:       q.Source,
		Aggregations: q.Aggregations,
		GroupBy:      q.GroupBy,
		Legend:       q.Legend,
	}
}

// ════════════════════════════════════════════════════════════════════════
// Panel query
// ════════════════════════════════════════════════════════════════════════

func (d *DashboardV2) GetPanelQuery(startTime, endTime uint64, panelKey string) (*qb.QueryRangeRequest, error) {
	panel, ok := d.Spec.Panels[panelKey]
	if !ok || panel == nil {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidInput, "panel with key %q doesn't exist", panelKey)
	}
	// Validator guarantees exactly one query per panel.
	if len(panel.Spec.Queries) != 1 {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidWidgetQuery, "panel %q must have exactly one query", panelKey)
	}

	query := panel.Spec.Queries[0]
	composite, err := query.Spec.Plugin.buildV5CompositeQueryFromPlugin()
	if err != nil {
		return nil, err
	}

	// fillGaps lives on the panel visualization; only timeseries and bar chart carry it.
	fillGaps := false
	switch panelSpec := panel.Spec.Plugin.Spec.(type) {
	case *TimeSeriesPanelSpec:
		if panelSpec != nil {
			fillGaps = panelSpec.Visualization.FillSpans
		}
	case *BarChartPanelSpec:
		if panelSpec != nil {
			fillGaps = panelSpec.Visualization.FillSpans
		}
	}

	return &qb.QueryRangeRequest{
		SchemaVersion:  "v1",
		Start:          startTime,
		End:            endTime,
		RequestType:    query.Kind,
		CompositeQuery: composite,
		FormatOptions: &qb.FormatOptions{
			FillGaps:               fillGaps,
			FormatTableResultForUI: panel.Spec.Plugin.Kind == PanelKindTable,
		},
	}, nil
}
