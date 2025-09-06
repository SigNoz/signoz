package spanpercentile

import (
	"fmt"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/huandu/go-sqlbuilder"
)

func BuildSpanPercentileQuery(req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	start := querybuilder.ToNanoSecs(req.Start)
	end := querybuilder.ToNanoSecs(req.End)

	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	var cteFragments []string
	var cteArgs [][]any

	// Build resource filter CTE if filters are present
	if req.Filter != nil && req.Filter.Expression != "" {
		resourceFilterBuilder := sqlbuilder.NewSelectBuilder()
		resourceFilterBuilder.Select("fingerprint")
		resourceFilterBuilder.From(fmt.Sprintf("%s.%s", resourcefilter.TracesDBName, resourcefilter.TraceResourceV3TableName))

		// Add time filter for resource table
		resourceFilterBuilder.Where(
			fmt.Sprintf("seen_at_ts_bucket_start >= %d", startBucket),
			fmt.Sprintf("seen_at_ts_bucket_start <= %d", endBucket),
		)

		// Add filter expression conditions to resource filter
		resourceFilterBuilder.Where(fmt.Sprintf("(%s)", req.Filter.Expression))

		resourceFilterSQL, resourceFilterArgs := resourceFilterBuilder.BuildWithFlavor(sqlbuilder.ClickHouse)
		cteFragments = append(cteFragments, fmt.Sprintf("__resource_filter AS (%s)", resourceFilterSQL))
		cteArgs = append(cteArgs, resourceFilterArgs)
	}

	// Build base spans CTE
	baseSpansBuilder := sqlbuilder.NewSelectBuilder()
	baseSpansBuilder.Select("*", sqlbuilder.Escape("resource_string_service$$name as `service.name`"))
	baseSpansBuilder.From(fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))
	baseSpansBuilder.Where(
		baseSpansBuilder.GE("timestamp", fmt.Sprintf("%d", start)),
		baseSpansBuilder.L("timestamp", fmt.Sprintf("%d", end)),
		baseSpansBuilder.GE("ts_bucket_start", startBucket),
		baseSpansBuilder.LE("ts_bucket_start", endBucket),
	)

	baseSpansSQL, baseSpansArgs := baseSpansBuilder.BuildWithFlavor(sqlbuilder.ClickHouse)
	cteFragments = append(cteFragments, fmt.Sprintf("base_spans AS (%s)", baseSpansSQL))
	cteArgs = append(cteArgs, baseSpansArgs)

	// Build target span query with resource filtering if applicable
	targetSpanBuilder := sqlbuilder.NewSelectBuilder()
	targetSpanBuilder.Select(
		"duration_nano",
		"name",
		"`service.name` as service_name",
		"resources_string['deployment.environment'] as deployment_environment",
	)

	if req.Filter != nil && req.Filter.Expression != "" {
		// Use resource filtered query
		targetSpanBuilder.From("base_spans")
		targetSpanBuilder.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	} else {
		// Use base spans directly
		targetSpanBuilder.From("base_spans")
	}

	targetSpanBuilder.Where(fmt.Sprintf("span_id = '%s'", req.SpanID))
	targetSpanBuilder.SQL("LIMIT 1")

	targetSpanSQL, targetSpanArgs := targetSpanBuilder.BuildWithFlavor(sqlbuilder.ClickHouse)
	cteFragments = append(cteFragments, fmt.Sprintf("target_span AS (%s)", targetSpanSQL))
	cteArgs = append(cteArgs, targetSpanArgs)

	// Build main aggregation query
	mainBuilder := sqlbuilder.NewSelectBuilder()
	mainBuilder.Select(
		fmt.Sprintf("'%s' as span_id", req.SpanID),
		"t.duration_nano",
		"t.duration_nano as duration_ms",
		"t.name as span_name",
		"t.service_name",
		"t.deployment_environment",
		"round((sum(multiIf(s.duration_nano < t.duration_nano, 1, 0)) * 100.0) / count(*), 2) as percentile_position",
		"quantile(0.50)(s.duration_nano) as p50_duration_ms",
		"quantile(0.90)(s.duration_nano) as p90_duration_ms",
		"quantile(0.99)(s.duration_nano) as p99_duration_ms",
		"count(*) as total_spans_in_group",
	)

	mainBuilder.SQL("FROM target_span t")

	if req.Filter != nil && req.Filter.Expression != "" {
		// Join with resource filtered spans
		mainBuilder.SQL("CROSS JOIN base_spans s")
		mainBuilder.Where("s.resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	} else {
		// Join with base spans directly
		mainBuilder.SQL("CROSS JOIN base_spans s")
	}

	mainBuilder.Where(
		"s.name = t.name",
		"s.`service.name` = t.service_name",
		"s.resources_string['deployment.environment'] = t.deployment_environment",
	)

	mainBuilder.GroupBy(
		"t.duration_nano",
		"t.name",
		"t.service_name",
		"t.deployment_environment",
	)

	mainSQL, mainArgs := mainBuilder.BuildWithFlavor(sqlbuilder.ClickHouse)

	// Combine CTEs with main query
	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	stmt := &qbtypes.Statement{
		Query: finalSQL,
		Args:  finalArgs,
	}

	query := qbtypes.QueryEnvelope{
		Type: qbtypes.QueryTypeClickHouseSQL,
		Spec: qbtypes.ClickHouseQuery{
			Name:  "span_percentile",
			Query: stmt.Query,
		},
	}

	return &qbtypes.QueryRangeRequest{
		SchemaVersion: "v5",
		Start:         req.Start,
		End:           req.End,
		RequestType:   qbtypes.RequestTypeScalar,
		CompositeQuery: qbtypes.CompositeQuery{
			Queries: []qbtypes.QueryEnvelope{query},
		},
		FormatOptions: &qbtypes.FormatOptions{
			FormatTableResultForUI: true,
		},
	}, nil
}
