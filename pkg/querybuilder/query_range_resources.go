package querybuilder

import (
	"context"
	"encoding/json"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/tidwall/gjson"
)

var TelemetrySelector coretypes.SelectorFunc = func(_ context.Context, resource coretypes.Resource, id string, _ valuer.UUID) ([]coretypes.Selector, error) {
	values := make([]string, 0)
	if id != "" {
		if err := json.Unmarshal([]byte(id), &values); err != nil {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid telemetry resource id %q", id)
		}
	}

	values = append(values, coretypes.WildCardSelectorString)

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
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "composite query has no queries")
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
	raw := gjson.GetBytes(body, "variables")
	if !raw.Exists() {
		return nil, nil
	}

	variables := make(map[string]qbtypes.VariableItem)
	if err := json.Unmarshal([]byte(raw.Raw), &variables); err != nil {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid variables in query range request")
	}

	return variables, nil
}

func resourcesForQuery(query gjson.Result, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	queryType := query.Get("type").String()

	switch queryType {
	case "builder_query", "builder_sub_query":
		return resourcesForBuilderQuery(query.Get("spec"), variables)
	case "builder_trace_operator":
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces}}, nil
	case "promql":
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceMetrics}}, nil
	case "clickhouse_sql":
		return []coretypes.ResourceWithID{
			{Resource: coretypes.ResourceTelemetryResourceLogs},
			{Resource: coretypes.ResourceTelemetryResourceTraces},
			{Resource: coretypes.ResourceTelemetryResourceMetrics},
		}, nil
	case "builder_formula", "builder_join":
		return nil, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type %q", queryType)
	}
}

func resourcesForBuilderQuery(spec gjson.Result, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	resource, err := builderQueryResource(spec)
	if err != nil {
		return nil, err
	}

	ids, err := serviceResourceIDs(spec.Get("filter.expression").String(), variables)
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

func serviceResourceIDs(expression string, variables map[string]qbtypes.VariableItem) ([]string, error) {
	if strings.TrimSpace(expression) == "" {
		return []string{""}, nil
	}

	normalized, err := NormalizeWhereClause(expression, variables)
	if err != nil {
		return nil, err
	}

	anyOf := make([]string, 0)
	ids := make([]string, 0)
	for _, condition := range normalized.Conditions {
		if !condition.TopLevel || !isServiceNameKey(condition.Key) {
			continue
		}

		switch condition.Operator {
		case "=":
			anyOf = append(anyOf, condition.Values[0])
		case "IN":
			for _, value := range condition.Values {
				id, err := serviceResourceID([]string{value})
				if err != nil {
					return nil, err
				}
				ids = append(ids, id)
			}
		}
	}

	if len(anyOf) > 0 {
		id, err := serviceResourceID(anyOf)
		if err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	if len(ids) == 0 {
		return []string{""}, nil
	}

	return ids, nil
}

func serviceResourceID(values []string) (string, error) {
	sort.Strings(values)
	deduped := values[:0]
	for index, value := range values {
		if index > 0 && value == values[index-1] {
			continue
		}
		deduped = append(deduped, value)
	}

	encoded, err := json.Marshal(deduped)
	if err != nil {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "failed to encode telemetry resource id")
	}

	return string(encoded), nil
}

func isServiceNameKey(keyText string) bool {
	fieldKey := telemetrytypes.GetFieldKeyFromKeyText(keyText)
	if fieldKey.Name != "service.name" {
		return false
	}

	return fieldKey.FieldContext == telemetrytypes.FieldContextUnspecified || fieldKey.FieldContext == telemetrytypes.FieldContextResource
}
