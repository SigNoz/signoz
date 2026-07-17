package querybuilder

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/tidwall/gjson"
)

var telemetryGrantKeys = map[string]struct{}{
	"service.name": {},
}

const telemetryValueSafeBytes = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-"

func EscapeTelemetryValue(value string) string {
	var escaped strings.Builder
	for _, character := range []byte(value) {
		if strings.IndexByte(telemetryValueSafeBytes, character) >= 0 {
			escaped.WriteByte(character)
			continue
		}
		escaped.WriteString(fmt.Sprintf("%%%02X", character))
	}

	return escaped.String()
}

func TelemetrySelector(_ context.Context, resource coretypes.Resource, id string, _ valuer.UUID) ([]coretypes.Selector, error) {
	values := []string{id}
	segments := strings.Split(id, "/")
	for level := len(segments) - 1; level >= 1; level-- {
		value := strings.Join(segments[:level], "/") + "/" + coretypes.WildCardSelectorString
		if value == id {
			continue
		}
		values = append(values, value)
	}
	if id != coretypes.WildCardSelectorString {
		values = append(values, coretypes.WildCardSelectorString)
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

func resourcesForQuery(query gjson.Result, variables map[string]qbtypes.VariableItem) ([]coretypes.ResourceWithID, error) {
	queryType := query.Get("type").String()
	typeWildcard := queryType + "/" + coretypes.WildCardSelectorString

	switch queryType {
	case qbtypes.QueryTypeBuilder.StringValue(), qbtypes.QueryTypeSubQuery.StringValue():
		return resourcesForBuilderQuery(queryType, query.Get("spec"), variables)
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

	ids, err := builderQuerySelectors(queryType, spec.Get("filter.expression").String(), variables)
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

	ids := make([]string, 0)
	for _, condition := range normalized.Conditions {
		if !condition.TopLevel {
			continue
		}

		key, ok := canonicalTelemetryGrantKey(condition.Key)
		if !ok {
			continue
		}

		if condition.Operator == "=" || condition.Operator == "IN" {
			for _, value := range condition.Values {
				ids = append(ids, queryType+"/"+key+"/"+EscapeTelemetryValue(value))
			}
		}
	}

	if len(ids) == 0 {
		return []string{typeWildcard}, nil
	}

	return ids, nil
}

func canonicalTelemetryGrantKey(keyText string) (string, bool) {
	fieldKey := telemetrytypes.GetFieldKeyFromKeyText(keyText)
	if fieldKey.FieldContext != telemetrytypes.FieldContextUnspecified && fieldKey.FieldContext != telemetrytypes.FieldContextResource {
		return "", false
	}

	if _, ok := telemetryGrantKeys[fieldKey.Name]; !ok {
		return "", false
	}

	return fieldKey.Name, true
}
