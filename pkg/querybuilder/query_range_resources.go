package querybuilder

import (
	"context"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

func TelemetrySelector(_ context.Context, resource coretypes.Resource, id string, _ valuer.UUID) ([]coretypes.Selector, error) {
	values := telemetrytypes.NewTelemetryGrantSelectors(id)

	selectors := make([]coretypes.Selector, 0, len(values))
	for _, value := range values {
		selector, err := resource.Type().Selector(value)
		if err != nil {
			return nil, err
		}
		selectors = append(selectors, selector)
	}

	return selectors, nil
}

func QueryRangeResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	req, err := coretypes.BodyAs[qbtypes.QueryRangeRequest](ec)
	if err != nil {
		return nil, err
	}

	if len(req.CompositeQuery.Queries) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "atleast one query is required")
	}

	refs := make([]coretypes.ResourceWithID, 0, len(req.CompositeQuery.Queries))
	seen := make(map[string]struct{})
	for _, query := range req.CompositeQuery.Queries {
		queryRefs, err := resourcesForQuery(query, req.Variables)
		if err != nil {
			return nil, err
		}

		for _, ref := range queryRefs {
			key := ref.Resource.Kind().String() + ":" + ref.ID
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			refs = append(refs, ref)
		}
	}

	return refs, nil
}

// PromQLResources is the resource set of a bare PromQL query: metrics on
// the promql wildcard, the same ID resourcesForQuery assigns to a PromQL
// query inside a composite — one grant covers both entry points.
func PromQLResources(coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	return []coretypes.ResourceWithID{{
		Resource: coretypes.ResourceTelemetryResourceMetrics,
		ID:       qbtypes.QueryTypePromQL.StringValue() + "/" + coretypes.WildCardSelectorString,
	}}, nil
}

func resourcesForQuery(query qbtypes.QueryEnvelope, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	queryType := query.Type.StringValue()
	typeWildcard := queryType + "/" + coretypes.WildCardSelectorString

	switch query.Type {
	case qbtypes.QueryTypeBuilder, qbtypes.QueryTypeSubQuery:
		return resourcesForBuilderQuery(queryType, query.Spec, variables)
	case qbtypes.QueryTypeBuilderAI:
		// always a traces query; the signal may be absent from the payload
		_, _, expression, err := builderQuerySpec(query.Spec)
		if err != nil {
			return nil, err
		}

		return builderQueryResourceRefs(queryType, coretypes.ResourceTelemetryResourceTraces, expression, variables)
	case qbtypes.QueryTypePromQL:
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: typeWildcard}}, nil
	case qbtypes.QueryTypeClickHouseSQL:
		return []coretypes.ResourceWithID{
			{Resource: coretypes.ResourceTelemetryResourceLogs, ID: typeWildcard},
			{Resource: coretypes.ResourceTelemetryResourceTraces, ID: typeWildcard},
			{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: typeWildcard},
			{Resource: coretypes.ResourceTelemetryResourceMeterMetrics, ID: typeWildcard},
		}, nil
	case qbtypes.QueryTypeFormula, qbtypes.QueryTypeJoin, qbtypes.QueryTypeTraceOperator:
		return nil, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type %q", queryType)
	}
}

func resourcesForBuilderQuery(queryType string, spec any, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	signal, source, expression, err := builderQuerySpec(spec)
	if err != nil {
		return nil, err
	}

	resource, err := builderQueryResource(signal, source)
	if err != nil {
		return nil, err
	}

	return builderQueryResourceRefs(queryType, resource, expression, variables)
}

func builderQueryResourceRefs(queryType string, resource coretypes.Resource, expression string, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	ids, err := builderQuerySelectors(queryType, expression, variables)
	if err != nil {
		return nil, err
	}

	refs := make([]coretypes.ResourceWithID, 0, len(ids))
	for _, id := range ids {
		refs = append(refs, coretypes.ResourceWithID{Resource: resource, ID: id})
	}

	return refs, nil
}

func builderQueryResource(signal telemetrytypes.Signal, source telemetrytypes.Source) (coretypes.Resource, error) {
	switch signal {
	case telemetrytypes.SignalTraces:
		return coretypes.ResourceTelemetryResourceTraces, nil
	case telemetrytypes.SignalLogs:
		if source == telemetrytypes.SourceAudit {
			return coretypes.ResourceTelemetryResourceAuditLogs, nil
		}
		return coretypes.ResourceTelemetryResourceLogs, nil
	case telemetrytypes.SignalMetrics:
		if source == telemetrytypes.SourceMeter {
			return coretypes.ResourceTelemetryResourceMeterMetrics, nil
		}
		return coretypes.ResourceTelemetryResourceMetrics, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal %q", signal.StringValue())
	}
}

func builderQuerySpec(spec any) (telemetrytypes.Signal, telemetrytypes.Source, string, error) {
	switch typed := spec.(type) {
	case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
		return typed.Signal, typed.Source, filterExpression(typed.Filter), nil
	case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
		return typed.Signal, typed.Source, filterExpression(typed.Filter), nil
	case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
		return typed.Signal, typed.Source, filterExpression(typed.Filter), nil
	default:
		return telemetrytypes.Signal{}, telemetrytypes.Source{}, "", errors.Newf(errors.TypeInternal, errors.CodeInternal, "unexpected builder query spec %T", spec)
	}
}

func filterExpression(filter *qbtypes.Filter) string {
	if filter == nil {
		return ""
	}

	return filter.Expression
}

func builderQuerySelectors(queryType, expression string, variables map[string]qbtypes.VariableItem) ([]string, error) {
	typeWildcard := queryType + "/" + coretypes.WildCardSelectorString

	if strings.TrimSpace(expression) == "" {
		return []string{typeWildcard}, nil
	}

	normalized, err := NormalizeWhereClause(expression, variables)
	if err != nil {
		return nil, err
	}

	ids := make([]string, 0)
	for _, condition := range normalized.Conditions {
		if !condition.TopLevel {
			continue
		}

		key, ok := telemetrytypes.NewTelemetryGrantKey(condition.Key)
		if !ok {
			continue
		}

		if condition.Operator == "=" || condition.Operator == "IN" {
			for _, value := range condition.Values {
				ids = append(ids, queryType+"/"+key+"/"+value)
			}
		}
	}

	if len(ids) == 0 {
		return []string{typeWildcard}, nil
	}

	return ids, nil
}
