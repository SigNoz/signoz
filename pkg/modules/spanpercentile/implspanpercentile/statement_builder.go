package implspanpercentile

import (
	"context"
	"fmt"
	"sort"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

func buildSpanPercentileQuery(
	_ context.Context,
	req *spanpercentiletypes.SpanPercentileRequest,
) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	var attrKeys []string
	for key := range req.ResourceAttributes {
		attrKeys = append(attrKeys, key)
	}
	sort.Strings(attrKeys)

	filterConditions := []string{
		fmt.Sprintf("service.name = '%s'", strings.ReplaceAll(req.ServiceName, "'", `\'`)),
		fmt.Sprintf("name = '%s'", strings.ReplaceAll(req.Name, "'", `\'`)),
	}

	for _, key := range attrKeys {
		value := req.ResourceAttributes[key]
		filterConditions = append(filterConditions,
			fmt.Sprintf("%s = '%s'", key, strings.ReplaceAll(value, "'", `\'`)))
	}

	filterExpr := strings.Join(filterConditions, " AND ")

	groupByKeys := []qbtypes.GroupByKey{
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          "service.name",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
		{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          "name",
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextSpan,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		},
	}

	for _, key := range attrKeys {
		groupByKeys = append(groupByKeys, qbtypes.GroupByKey{
			TelemetryFieldKey: telemetrytypes.TelemetryFieldKey{
				Name:          key,
				Signal:        telemetrytypes.SignalTraces,
				FieldContext:  telemetrytypes.FieldContextResource,
				FieldDataType: telemetrytypes.FieldDataTypeString,
			},
		})
	}

	query := qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]{
		Name:   "span_percentile",
		Signal: telemetrytypes.SignalTraces,
		Aggregations: []qbtypes.TraceAggregation{
			{
				Expression: "p50(duration_nano)",
				Alias:      "p50_duration_nano",
			},
			{
				Expression: "p90(duration_nano)",
				Alias:      "p90_duration_nano",
			},
			{
				Expression: "p99(duration_nano)",
				Alias:      "p99_duration_nano",
			},
			{
				Expression: fmt.Sprintf(
					"(100.0 * countIf(duration_nano <= %d)) / count()",
					req.DurationNano,
				),
				Alias: "percentile_position",
			},
		},
		GroupBy: groupByKeys,
		Filter: &qbtypes.Filter{
			Expression: filterExpr,
		},
	}

	queryEnvelope := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeBuilder,
		Spec: query,
	}

	return &qbtypes.QueryRangeRequest{
		SchemaVersion: "v5",
		Start:         req.Start,
		End:           req.End,
		RequestType:   qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{queryEnvelope},
		},
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}, nil
}
