package spanpercentile

import (
	"fmt"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/huandu/go-sqlbuilder"
)

func BuildSpanPercentileQuery(req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	startNano := querybuilder.ToNanoSecs(req.Start)
	endNano := querybuilder.ToNanoSecs(req.End)
	startBucketSec := req.Start/1000 - querybuilder.BucketAdjustment
	endBucketSec := req.End / 1000

	targetSpanBuilder := sqlbuilder.NewSelectBuilder()
	targetSpanBuilder.Select(
		"duration_nano",
		"name",
		"resource_string_service$$name as `service_name`",
		"resources_string['deployment.environment'] as deployment_environment",
	)
	targetSpanBuilder.From(fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))
	targetSpanBuilder.Where(
		targetSpanBuilder.Equal("span_id", req.SpanID),
		targetSpanBuilder.GE("timestamp", fmt.Sprintf("%d", startNano)),
		targetSpanBuilder.L("timestamp", fmt.Sprintf("%d", endNano)),
		targetSpanBuilder.GE("ts_bucket_start", startBucketSec),
		targetSpanBuilder.LE("ts_bucket_start", endBucketSec),
	)

	if req.Filter != nil && req.Filter.Expression != "" {
		targetSpanBuilder.Where(fmt.Sprintf("(%s)", req.Filter.Expression))
	}

	targetSpanBuilder.Limit(1)
	targetSpanSQL, targetSpanArgs := targetSpanBuilder.BuildWithFlavor(sqlbuilder.ClickHouse)

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
	mainBuilder.SQL(fmt.Sprintf("CROSS JOIN %s.%s s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))

	mainBuilder.Where(
		mainBuilder.GE("s.timestamp", fmt.Sprintf("%d", startNano)),
		mainBuilder.L("s.timestamp", fmt.Sprintf("%d", endNano)),
		mainBuilder.GE("s.ts_bucket_start", startBucketSec),
		mainBuilder.LE("s.ts_bucket_start", endBucketSec),
		"s.name = t.name",
		"s.`resource_string_service$name` = t.service_name",
		"s.resources_string['deployment.environment'] = t.deployment_environment",
	)

	if req.Filter != nil && req.Filter.Expression != "" {
		mainBuilder.Where(fmt.Sprintf("(%s)", req.Filter.Expression))
	}

	mainBuilder.GroupBy(
		"t.duration_nano",
		"t.name",
		"t.service_name",
		"t.deployment_environment",
	)

	mainSQL, mainArgs := mainBuilder.BuildWithFlavor(sqlbuilder.ClickHouse)

	finalSQL := fmt.Sprintf("WITH target_span AS (%s) %s SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000",
		targetSpanSQL, mainSQL)

	finalArgs := append(targetSpanArgs, mainArgs...)

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
