package implspanpercentile

import (
	"fmt"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/querybuilder/resourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/spanpercentiletypes"
	"github.com/huandu/go-sqlbuilder"
	"strings"
)

func buildSpanPercentileQuery(req *spanpercentiletypes.SpanPercentileRequest) (*qbtypes.QueryRangeRequest, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	builder := &spanPercentileCTEBuilder{
		start:   querybuilder.ToNanoSecs(req.Start),
		end:     querybuilder.ToNanoSecs(req.End),
		spanID:  req.SpanID,
		filter:  req.Filter,
		request: req,
	}

	stmt := builder.build()

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

type cteNode struct {
	name string
	sql  string
	args []any
}

type spanPercentileCTEBuilder struct {
	start   uint64
	end     uint64
	spanID  string
	filter  *qbtypes.Filter
	request *spanpercentiletypes.SpanPercentileRequest
	ctes    []cteNode
}

func (b *spanPercentileCTEBuilder) build() *qbtypes.Statement {
	b.buildResourceFilterCTE()
	b.buildBaseSpansCTE()
	b.buildTargetSpanCTE()

	mainSQL, mainArgs := b.buildMainQuery()

	var cteFragments []string
	var cteArgs [][]any

	for _, cte := range b.ctes {
		cteFragments = append(cteFragments, fmt.Sprintf("%s AS (%s)", cte.name, cte.sql))
		cteArgs = append(cteArgs, cte.args)
	}

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	interpolatedSQL := b.interpolateArgs(finalSQL, finalArgs)

	return &qbtypes.Statement{
		Query: interpolatedSQL,
		Args:  nil,
	}
}

func (b *spanPercentileCTEBuilder) buildResourceFilterCTE() {
	if b.filter == nil || b.filter.Expression == "" {
		return
	}

	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("fingerprint")
	sb.From(fmt.Sprintf("%s.%s", resourcefilter.TracesDBName, resourcefilter.TraceResourceV3TableName))
	sb.Where(
		sb.GE("seen_at_ts_bucket_start", fmt.Sprintf("%d", startBucket)),
		sb.LE("seen_at_ts_bucket_start", fmt.Sprintf("%d", endBucket)),
	)
	sb.Where(fmt.Sprintf("(%s)", b.filter.Expression))

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE("__resource_filter", sql, args)
}

func (b *spanPercentileCTEBuilder) buildBaseSpansCTE() {
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("*")
	sb.SelectMore(sqlbuilder.Escape("resource_string_service$$name") + " AS `service.name`")
	sb.From(fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))
	sb.Where(
		sb.GE("timestamp", fmt.Sprintf("%d", b.start)),
		sb.L("timestamp", fmt.Sprintf("%d", b.end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	)

	if b.filter != nil && b.filter.Expression != "" {
		sb.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE("base_spans", sql, args)
}

func (b *spanPercentileCTEBuilder) buildTargetSpanCTE() {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		"duration_nano",
		"name",
		"`service.name` as service_name",
		"resources_string['deployment.environment'] as deployment_environment",
	)
	sb.From("base_spans")
	sb.Where(fmt.Sprintf("span_id = '%s'", b.spanID))
	sb.SQL("LIMIT 1")

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE("target_span", sql, args)
}

func (b *spanPercentileCTEBuilder) buildMainQuery() (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select(
		fmt.Sprintf("'%s' as span_id", b.spanID),
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

	sb.SQL("FROM target_span t")
	sb.SQL("CROSS JOIN base_spans s")
	sb.Where(
		"s.name = t.name",
		"s.`service.name` = t.service_name",
		"s.resources_string['deployment.environment'] = t.deployment_environment",
	)

	sb.GroupBy(
		"t.duration_nano",
		"t.name",
		"t.service_name",
		"t.deployment_environment",
	)

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args
}

func (b *spanPercentileCTEBuilder) addCTE(name, sql string, args []any) {
	b.ctes = append(b.ctes, cteNode{
		name: name,
		sql:  sql,
		args: args,
	})
}

func (b *spanPercentileCTEBuilder) interpolateArgs(sql string, args []any) string {
	result := sql
	for _, arg := range args {
		switch v := arg.(type) {
		case string:
			result = strings.Replace(result, "?", fmt.Sprintf("'%s'", v), 1)
		case int, int64, uint64, float64:
			result = strings.Replace(result, "?", fmt.Sprintf("%v", v), 1)
		default:
			result = strings.Replace(result, "?", fmt.Sprintf("%v", v), 1)
		}
	}
	return result
}
