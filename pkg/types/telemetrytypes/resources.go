package telemetrytypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/tidwall/gjson"
)

func QueryRangeResources(ec coretypes.ExtractorContext) ([]coretypes.ResourceWithID, error) {
	queries := gjson.GetBytes(ec.RequestBody, "compositeQuery.queries")
	if !queries.IsArray() || len(queries.Array()) == 0 {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "composite query has no queries")
	}

	refs := make([]coretypes.ResourceWithID, 0, len(queries.Array()))
	seen := make(map[string]struct{})
	for _, query := range queries.Array() {
		queryRefs, err := resourcesForQuery(query)
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

func resourcesForQuery(query gjson.Result) ([]coretypes.ResourceWithID, error) {
	queryType := query.Get("type").String()

	switch queryType {
	case "builder_query", "builder_sub_query":
		return resourcesForBuilderQuery(queryType, query.Get("spec"))
	case "builder_trace_operator":
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces, ID: queryType}}, nil
	case "promql":
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: queryType}}, nil
	case "clickhouse_sql":
		return []coretypes.ResourceWithID{
			{Resource: coretypes.ResourceTelemetryResourceLogs, ID: queryType},
			{Resource: coretypes.ResourceTelemetryResourceTraces, ID: queryType},
			{Resource: coretypes.ResourceTelemetryResourceMetrics, ID: queryType},
		}, nil
	case "builder_formula", "builder_join":
		return nil, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported query type %q", queryType)
	}
}

func resourcesForBuilderQuery(queryType string, spec gjson.Result) ([]coretypes.ResourceWithID, error) {
	whereSegment := selectorSegment(spec.Get("filter.expression").String())
	source := spec.Get("source").String()

	switch spec.Get("signal").String() {
	case SignalTraces.StringValue():
		return []coretypes.ResourceWithID{{Resource: coretypes.ResourceTelemetryResourceTraces, ID: queryType + "/" + whereSegment}}, nil
	case SignalLogs.StringValue():
		resource := coretypes.ResourceTelemetryResourceLogs
		if source == SourceAudit.StringValue() {
			resource = coretypes.ResourceTelemetryResourceAuditLogs
		}
		return []coretypes.ResourceWithID{{Resource: resource, ID: queryType + "/" + whereSegment}}, nil
	case SignalMetrics.StringValue():
		resource := coretypes.ResourceTelemetryResourceMetrics
		if source == SourceMeter.StringValue() {
			resource = coretypes.ResourceTelemetryResourceMeterMetrics
		}

		refs := make([]coretypes.ResourceWithID, 0, 1)
		for _, aggregation := range spec.Get("aggregations").Array() {
			refs = append(refs, coretypes.ResourceWithID{
				Resource: resource,
				ID:       queryType + "/" + selectorSegment(aggregation.Get("metricName").String()) + "/" + whereSegment,
			})
		}
		if len(refs) == 0 {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "metrics query has no aggregations")
		}

		return refs, nil
	default:
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported signal %q", spec.Get("signal").String())
	}
}
