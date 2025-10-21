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

	// SELECT clause with literal values
	sb.Select(
		fmt.Sprintf("%d AS duration_nano", req.DurationNano),
		fmt.Sprintf("'%s' AS span_name", escapeSQLString(req.Name)),
		fmt.Sprintf("'%s' AS service_name", escapeSQLString(req.ServiceName)),
	)

	// Add resource attributes to SELECT in sorted order for consistency
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

	// Add percentile aggregations in nanoseconds
	sb.SelectMore(
		"quantile(0.5)(s.duration_nano) AS p50_duration_nano",
		"quantile(0.9)(s.duration_nano) AS p90_duration_nano",
		"quantile(0.99)(s.duration_nano) AS p99_duration_nano",
		fmt.Sprintf("round((100.0 * countIf(s.duration_nano <= %d)) / count(), 2) AS percentile_position", req.DurationNano),
	)

	// FROM clause
	sb.From(fmt.Sprintf("%s.%s AS s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))

	// WHERE clause
	sb.Where(
		sb.GE("s.timestamp", fmt.Sprintf("%d", start)),
		sb.L("s.timestamp", fmt.Sprintf("%d", end)),
		sb.GE("s.ts_bucket_start", startBucket),
		sb.LE("s.ts_bucket_start", endBucket),
	)

	// Filter by name
	sb.Where(sb.Equal("s.name", req.Name))

	// Filter by service name using materialized column directly
	// We use the materialized column resource_string_service$name for better performance
	sb.Where(sb.Equal("s.resource_string_service$$name", req.ServiceName))

	// Filter by additional resource attributes using field mapper
	ctx := context.Background()
	fieldMapper := telemetrytraces.NewFieldMapper()

	for _, key := range attrKeys {
		value := req.ResourceAttributes[key]
		resourceKey := &telemetrytypes.TelemetryFieldKey{
			Name:          key,
			FieldContext:  telemetrytypes.FieldContextResource,
			FieldDataType: telemetrytypes.FieldDataTypeString,
			Materialized:  false, // Most resource attributes are not materialized
		}
		fieldName, err := fieldMapper.FieldFor(ctx, resourceKey)
		if err != nil {
			// Fallback to map access if field mapper doesn't find it
			fieldName = fmt.Sprintf("s.resources_string['%s']", key)
		}
		// fieldName already contains the full expression, no need to add 's.' prefix
		sb.Where(sb.Equal(fieldName, value))
	}

	// Settings
	sb.SQL("SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	// Interpolate args to get final query
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
	// Escape single quotes by doubling them
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
