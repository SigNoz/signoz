package implspanpercentile

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

func buildSpanPercentileQuery(req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	start := querybuilder.ToNanoSecs(req.Start)
	end := querybuilder.ToNanoSecs(req.End)
	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(
		fmt.Sprintf("%d AS duration_nano", req.DurationNano),
		fmt.Sprintf("'%s' AS span_name", escapeSQLString(req.Name)),
		fmt.Sprintf("'%s' AS service_name", escapeSQLString(req.ServiceName)),
	)

	var attrKeys []string
	for key := range req.ResourceAttributes {
		attrKeys = append(attrKeys, key)
	}
	sort.Strings(attrKeys)

	for _, key := range attrKeys {
		value := req.ResourceAttributes[key]
		escapedKey := escapeResourceAttr(key)
		sb.SelectMore(fmt.Sprintf("'%s' AS %s", escapeSQLString(value), escapedKey))
	}

	sb.SelectMore(
		"quantile(0.5)(s.duration_nano) AS p50_duration_nano",
		"quantile(0.9)(s.duration_nano) AS p90_duration_nano",
		"quantile(0.99)(s.duration_nano) AS p99_duration_nano",
		fmt.Sprintf("round((100.0 * countIf(s.duration_nano <= %d)) / count(), 2) AS percentile_position", req.DurationNano),
	)

	sb.From(fmt.Sprintf("%s.%s AS s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))

	sb.Where(
		sb.GE("s.timestamp", fmt.Sprintf("%d", start)),
		sb.L("s.timestamp", fmt.Sprintf("%d", end)),
		sb.GE("s.ts_bucket_start", startBucket),
		sb.LE("s.ts_bucket_start", endBucket),
	)

	sb.Where(sb.Equal("s.name", req.Name))
	sb.Where(sb.Equal("s.resource_string_service$$name", req.ServiceName))

	ctx := context.Background()
	fieldMapper := telemetrytraces.NewFieldMapper()

	for _, key := range attrKeys {
		value := req.ResourceAttributes[key]
		resourceKey := &telemetrytypes.TelemetryFieldKey{
			Name:          key,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  false,
		}
		fieldName, err := fieldMapper.FieldFor(ctx, resourceKey)
		if err != nil {
			fieldName = fmt.Sprintf("s.resources_string['%s']", key)
		}
		sb.Where(sb.Equal(fieldName, value))
	}

	sb.SQL("SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000, max_execution_time=10")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	interpolatedQuery := interpolateArgs(query, args)

	queryEnvelope := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeClickHouseSQL,
		Spec: qbtypes.ClickHouseQuery{
			Name:  "span_percentile",
			Query: interpolatedQuery,
		},
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

func escapeResourceAttr(attr string) string {
	return strings.ReplaceAll(attr, ".", "_")
}

func escapeSQLString(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func interpolateArgs(sql string, args []any) string {
	result := sql
	for _, arg := range args {
		switch v := arg.(type) {
		case string:
			result = strings.Replace(result, "?", fmt.Sprintf("'%s'", escapeSQLString(v)), 1)
		case int, int64, uint64, float64:
			result = strings.Replace(result, "?", fmt.Sprintf("%v", v), 1)
		default:
			result = strings.Replace(result, "?", fmt.Sprintf("%v", v), 1)
		}
	}
	return result
}
