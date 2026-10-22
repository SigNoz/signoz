package querybuilder

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/tidwall/gjson"
)

func TelemetrySelector(_ context.Context, resource coretypes.Resource, id string, _ valuer.UUID) ([]coretypes.Selector, error) {
	values, err := telemetrySelectorValues(id)
	if err != nil {
		return nil, err
	}

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
	queries := gjson.GetBytes(ec.RequestBody, "compositeQuery.queries")
	if !queries.IsArray() || len(queries.Array()) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "atleast one query is required")
	}

	variables, err := queryRangeVariables(ec.RequestBody)
	if err != nil {
		return nil, err
	}

	refs := make([]coretypes.ResourceWithID, 0, len(queries.Array()))
	seen := make(map[string]struct{})
	for _, query := range queries.Array() {
		queryRefs, err := resourcesForQuery(query, variables)
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

func queryRangeVariables(body []byte) (map[string]qbtypes.VariableItem, error) {
	variables := make(map[string]qbtypes.VariableItem)

	raw := gjson.GetBytes(body, "variables")
	if !raw.Exists() {
		return variables, nil
	}

	if err := json.Unmarshal([]byte(raw.Raw), &variables); err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid variables in query range request")
	}

	return variables, nil
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

func BuilderQueryWithFilterExpressionResources(resource coretypes.Resource, bodyPath string) coretypes.ResourceExtractor {
	return func(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
		return builderResources(qbtypes.QueryTypeBuilder.StringValue(), resource, gjson.GetBytes(ec.RequestBody, bodyPath).String(), nil)
	}
}

func BuilderQueryWildcardResources(resource coretypes.Resource) coretypes.ResourceExtractor {
	return func(coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
		return builderResources(qbtypes.QueryTypeBuilder.StringValue(), resource, "", nil)
	}
}

func resourcesForQuery(query gjson.Result, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	queryType := query.Get("type").String()
	typeWildcard := queryType + "/" + coretypes.WildCardSelectorString

	switch queryType {
	case qbtypes.QueryTypeBuilder.StringValue(), qbtypes.QueryTypeSubQuery.StringValue():
		return resourcesForBuilderQuery(queryType, query.Get("spec"), variables)
	case qbtypes.QueryTypeBuilderAI.StringValue():
		// always a traces query; the signal may be absent from the payload
		return builderQueryResourceRefs(queryType, coretypes.ResourceTelemetryResourceTraces, query.Get("spec"), variables)
	case qbtypes.QueryTypePromQL.StringValue():
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: typeWildcard}}, nil
	case qbtypes.QueryTypeClickHouseSQL.StringValue():
		return []coretypes.ResourceWithID{
			{Resource: coretypes.ResourceTelemetryResourceLogs, ID: typeWildcard},
			{Resource: coretypes.ResourceTelemetryResourceTraces, ID: typeWildcard},
			{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: typeWildcard},
			{Resource: coretypes.ResourceTelemetryResourceMeterMetrics, ID: typeWildcard},
		}, nil
	case qbtypes.QueryTypeFormula.StringValue(), qbtypes.QueryTypeJoin.StringValue(), qbtypes.QueryTypeTraceOperator.StringValue():
		return nil, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type %q", queryType)
	}
}

func resourcesForBuilderQuery(queryType string, spec gjson.Result, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	resource, err := builderQueryResource(spec)
	if err != nil {
		return nil, err
	}
	return builderQueryResourceRefs(queryType, resource, spec, variables)
}

func builderQueryResourceRefs(queryType string, resource coretypes.Resource, spec gjson.Result, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	return builderResources(queryType, resource, spec.Get("filter.expression").String(), variables)
}

func builderResources(queryType string, resource coretypes.Resource, expression string, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
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

func builderQueryResource(spec gjson.Result) (coretypes.Resource, error) {
	source := spec.Get("source").String()

	switch spec.Get("signal").String() {
	case telemetrytypes.SignalTraces.StringValue():
		return coretypes.ResourceTelemetryResourceTraces, nil
	case telemetrytypes.SignalLogs.StringValue():
		if source == telemetrytypes.SourceAudit.StringValue() {
			return coretypes.ResourceTelemetryResourceAuditLogs, nil
		}
		return coretypes.ResourceTelemetryResourceLogs, nil
	case telemetrytypes.SignalMetrics.StringValue():
		if source == telemetrytypes.SourceMeter.StringValue() {
			return coretypes.ResourceTelemetryResourceMeterMetrics, nil
		}
		return coretypes.ResourceTelemetryResourceMetrics, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal %q", spec.Get("signal").String())
	}
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
	if normalized.Expression == "" {
		return []string{typeWildcard}, nil
	}

	pins := make(map[string]string)
	lists := make([]WhereClauseCondition, 0)
	seenKeys := make(map[string]struct{})
	for _, condition := range normalized.Conditions {
		if !condition.TopLevel || condition.Operator != "IN" || len(condition.Values) == 0 {
			continue
		}
		if _, ok := telemetrytypes.NewTelemetryGrantKey(condition.Key); !ok {
			continue
		}
		if _, dup := seenKeys[condition.Key]; dup {
			return []string{queryType + "/" + normalized.Expression}, nil
		}
		seenKeys[condition.Key] = struct{}{}
		if len(condition.Values) == 1 {
			pins[condition.Key] = condition.Values[0]
			continue
		}
		lists = append(lists, condition)
	}

	if len(lists) != 1 {
		if len(pins) == 0 {
			return []string{queryType + "/" + normalized.Expression}, nil
		}
		pinned, err := NormalizeWhereClauseWithPins(expression, variables, pins)
		if err != nil {
			return nil, err
		}
		return []string{queryType + "/" + pinned.Expression}, nil
	}

	list := lists[0]
	ids := make([]string, 0, len(list.Values))
	for _, value := range list.Values {
		pins[list.Key] = value
		pinned, err := NormalizeWhereClauseWithPins(expression, variables, pins)
		if err != nil {
			return nil, err
		}
		ids = append(ids, queryType+"/"+pinned.Expression)
	}

	return ids, nil
}

func telemetrySelectorValues(id string) ([]string, error) {
	queryType, filter, found := strings.Cut(id, "/")
	if !found || filter == coretypes.WildCardSelectorString {
		return telemetrytypes.NewTelemetryGrantSelectors(id), nil
	}

	normalized, err := NormalizeWhereClause(filter, nil)
	if err != nil {
		return nil, err
	}

	values := make([]string, 0)
	for _, condition := range normalized.Conditions {
		if !condition.TopLevel {
			continue
		}
		key, ok := telemetrytypes.NewTelemetryGrantKey(condition.Key)
		if !ok {
			continue
		}
		switch {
		case condition.Operator == "=", condition.Operator == "IN" && len(condition.Values) == 1:
			values = append(values, queryType+"/"+key+"/"+condition.Values[0], queryType+"/"+key+"/"+coretypes.WildCardSelectorString)
		case condition.Operator == "IN":
			values = append(values, queryType+"/"+key+"/"+coretypes.WildCardSelectorString)
		}
	}
	values = append(values, queryType+"/"+coretypes.WildCardSelectorString, coretypes.WildCardSelectorString)

	seen := make(map[string]struct{}, len(values))
	unique := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		unique = append(unique, value)
	}

	return unique, nil
}
