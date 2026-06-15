package dashboardtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	qb "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/tagtypes"
)

// GettablePublicDashboardDataV2 is the anonymous-facing payload of a v2 dashboard.
type GettablePublicDashboardDataV2 struct {
	Dashboard       *GettableDashboardV2      `json:"dashboard"`
	PublicDashboard *GettablePublicDasbhboard `json:"publicDashboard"`
}

// NewPublicDashboardDataFromDashboardV2 builds the anonymous v2 payload: panel queries
// are redacted, and only the body fields v1 exposed (name, metadata, tags, spec) are set.
func NewPublicDashboardDataFromDashboardV2(dashboard *DashboardV2, publicDashboard *PublicDashboard) *GettablePublicDashboardDataV2 {
	spec := dashboard.Spec
	redactPanelQueries(&spec)

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

// redactPanelQueries rebuilds the panel map with each query redacted, leaving the
// source spec untouched.
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
			query.Spec.Plugin.Spec = redactQueryPluginSpec(query.Spec.Plugin.Kind, query.Spec.Plugin.Spec)
			queries[i] = query
		}
		redacted.Spec.Queries = queries
		panels[key] = &redacted
	}
	spec.Panels = panels
}

// redactQueryPluginSpec redacts a single panel query plugin spec. Composite specs
// hold their sub-queries as values; promql/clickhouse/formula/trace specs are pointers.
func redactQueryPluginSpec(kind QueryPluginKind, spec any) any {
	switch kind {
	case QueryKindComposite:
		composite, ok := spec.(*qb.CompositeQuery)
		if !ok || composite == nil {
			return spec
		}
		queries := make([]qb.QueryEnvelope, len(composite.Queries))
		for i, envelope := range composite.Queries {
			envelope.Spec = redactQuery(envelope.Spec)
			queries[i] = envelope
		}
		return &qb.CompositeQuery{Queries: queries}
	case QueryKindBuilder:
		builder, ok := spec.(*BuilderQuerySpec)
		if !ok || builder == nil {
			return spec
		}
		return &BuilderQuerySpec{Spec: redactQuery(builder.Spec)}
	case QueryKindPromQL:
		if s, ok := spec.(*qb.PromQuery); ok {
			redacted := redactQuery(*s).(qb.PromQuery)
			return &redacted
		}
	case QueryKindClickHouseSQL:
		if s, ok := spec.(*qb.ClickHouseQuery); ok {
			redacted := redactQuery(*s).(qb.ClickHouseQuery)
			return &redacted
		}
	case QueryKindFormula:
		if s, ok := spec.(*qb.QueryBuilderFormula); ok {
			redacted := redactQuery(*s).(qb.QueryBuilderFormula)
			return &redacted
		}
	case QueryKindTraceOperator:
		if s, ok := spec.(*qb.QueryBuilderTraceOperator); ok {
			redacted := redactQuery(*s).(qb.QueryBuilderTraceOperator)
			return &redacted
		}
	}
	return spec
}

// redactQuery returns a copy of a query value carrying only public-safe fields.
// Building up an allowlist (rather than clearing fields) fails closed: any new
// field is excluded until explicitly added here.
func redactQuery(spec any) any {
	switch s := spec.(type) {
	case qb.QueryBuilderQuery[qb.LogAggregation]:
		return redactBuilderQuery(s)
	case qb.QueryBuilderQuery[qb.MetricAggregation]:
		return redactBuilderQuery(s)
	case qb.QueryBuilderQuery[qb.TraceAggregation]:
		return redactBuilderQuery(s)
	case qb.PromQuery:
		return qb.PromQuery{Name: s.Name, Step: s.Step, Disabled: s.Disabled, Legend: s.Legend}
	case qb.ClickHouseQuery:
		return qb.ClickHouseQuery{Name: s.Name, Disabled: s.Disabled, Legend: s.Legend}
	case qb.QueryBuilderFormula:
		return qb.QueryBuilderFormula{Name: s.Name, Expression: s.Expression, Disabled: s.Disabled, Legend: s.Legend}
	case qb.QueryBuilderTraceOperator:
		return qb.QueryBuilderTraceOperator{
			Name:         s.Name,
			Expression:   s.Expression,
			Aggregations: s.Aggregations,
			GroupBy:      s.GroupBy,
			StepInterval: s.StepInterval,
			Disabled:     s.Disabled,
			Legend:       s.Legend,
		}
	}
	return spec
}

// redactBuilderQuery keeps only display-relevant fields, dropping filter, having,
// order, limit, and any other query internals.
func redactBuilderQuery[T any](q qb.QueryBuilderQuery[T]) qb.QueryBuilderQuery[T] {
	return qb.QueryBuilderQuery[T]{
		Name:         q.Name,
		Signal:       q.Signal,
		Source:       q.Source,
		Aggregations: q.Aggregations,
		GroupBy:      q.GroupBy,
		StepInterval: q.StepInterval,
		Disabled:     q.Disabled,
		Legend:       q.Legend,
	}
}

// GetPanelQuery builds a v5 QueryRangeRequest for the given panel. v2 panel queries
// are already native v5 shapes, so the request is assembled directly: a composite is
// used as-is, every other kind becomes a single-envelope composite.
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
	composite, err := compositeQueryFromPlugin(query.Spec.Plugin)
	if err != nil {
		return nil, err
	}

	return &qb.QueryRangeRequest{
		SchemaVersion:  "v1",
		Start:          startTime,
		End:            endTime,
		RequestType:    query.Kind,
		CompositeQuery: composite,
		FormatOptions: &qb.FormatOptions{
			FormatTableResultForUI: panel.Spec.Plugin.Kind == PanelKindTable,
		},
	}, nil
}

// compositeQueryFromPlugin turns a panel's single query plugin into a v5 composite
// query. The plugin spec is already a typed v5 value, so no JSON round-trip is needed.
func compositeQueryFromPlugin(plugin QueryPlugin) (qb.CompositeQuery, error) {
	switch spec := plugin.Spec.(type) {
	case *qb.CompositeQuery:
		if spec == nil {
			return qb.CompositeQuery{}, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidWidgetQuery, "composite query is empty")
		}
		return *spec, nil
	case *BuilderQuerySpec:
		if spec == nil {
			return qb.CompositeQuery{}, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidWidgetQuery, "builder query is empty")
		}
		return wrapEnvelope(qb.QueryTypeBuilder, spec.Spec), nil
	case *qb.PromQuery:
		return wrapEnvelope(qb.QueryTypePromQL, *spec), nil
	case *qb.ClickHouseQuery:
		return wrapEnvelope(qb.QueryTypeClickHouseSQL, *spec), nil
	case *qb.QueryBuilderFormula:
		return wrapEnvelope(qb.QueryTypeFormula, *spec), nil
	case *qb.QueryBuilderTraceOperator:
		return wrapEnvelope(qb.QueryTypeTraceOperator, *spec), nil
	}
	return qb.CompositeQuery{}, errors.Newf(errors.TypeInvalidInput, ErrCodeDashboardInvalidWidgetQuery, "unsupported query kind %q", plugin.Kind)
}

func wrapEnvelope(queryType qb.QueryType, spec any) qb.CompositeQuery {
	return qb.CompositeQuery{Queries: []qb.QueryEnvelope{{Type: queryType, Spec: spec}}}
}
