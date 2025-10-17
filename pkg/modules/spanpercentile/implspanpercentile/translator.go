package implspanpercentile

import (
	"fmt"
	"github.com/SigNoz/signoz/pkg/querybuilder"
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
		start:                   querybuilder.ToNanoSecs(req.Start),
		end:                     querybuilder.ToNanoSecs(req.End),
		spanID:                  req.SpanID,
		additionalResourceAttrs: req.AdditionalResourceAttrs,
		request:                 req,
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
	start                   uint64
	end                     uint64
	spanID                  string
	additionalResourceAttrs []string
	request                 *spanpercentiletypes.SpanPercentileRequest
	ctes                    []cteNode
}

func (b *spanPercentileCTEBuilder) build() *qbtypes.Statement {
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

func (b *spanPercentileCTEBuilder) buildTargetSpanCTE() {
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(
		"span_id",
		"duration_nano",
		"name",
		sqlbuilder.Escape("resource_string_service$$name")+" AS service_name",
	)

	for _, attr := range b.additionalResourceAttrs {
		column := fmt.Sprintf("resources_string['%s'] AS %s", attr, b.escapeResourceAttr(attr))
		sb.SelectMore(column)
	}

	sb.From(fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))
	sb.Where(
		sb.Equal("span_id", b.spanID),
		sb.GE("timestamp", fmt.Sprintf("%d", b.start)),
		sb.L("timestamp", fmt.Sprintf("%d", b.end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	)
	sb.SQL("LIMIT 1")

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	b.addCTE("target", sql, args)
}

func (b *spanPercentileCTEBuilder) buildMainQuery() (string, []any) {
	startBucket := b.start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := b.end / querybuilder.NsToSeconds

	sb := sqlbuilder.NewSelectBuilder()

	sb.Select(
		"(SELECT span_id FROM target) AS span_id",
		"(SELECT duration_nano FROM target) AS duration_nano",
		"(SELECT duration_nano FROM target) / 1000000.0 AS duration_ms",
		"(SELECT name FROM target) AS span_name",
		"(SELECT service_name FROM target) AS service_name",
	)

	for _, attr := range b.additionalResourceAttrs {
		escapedAttr := b.escapeResourceAttr(attr)
		sb.SelectMore(fmt.Sprintf("(SELECT %s FROM target) AS %s", escapedAttr, escapedAttr))
	}

	sb.SelectMore(
		"quantile(0.5)(s.duration_nano) / 1000000.0 AS p50_duration_ms",
		"quantile(0.9)(s.duration_nano) / 1000000.0 AS p90_duration_ms",
		"quantile(0.99)(s.duration_nano) / 1000000.0 AS p99_duration_ms",
		"round((100.0 * countIf(s.duration_nano <= (SELECT duration_nano FROM target))) / count(), 2) AS percentile_position",
	)

	sb.From(fmt.Sprintf("%s.%s AS s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName))

	sb.Where(
		sb.GE("s.timestamp", fmt.Sprintf("%d", b.start)),
		sb.L("s.timestamp", fmt.Sprintf("%d", b.end)),
		sb.GE("s.ts_bucket_start", startBucket),
		sb.LE("s.ts_bucket_start", endBucket),
	)

	sb.Where("s.name = (SELECT name FROM target)")
	sb.Where(sqlbuilder.Escape("s.resource_string_service$$name")+" = (SELECT service_name FROM target)")

	for _, attr := range b.additionalResourceAttrs {
		escapedAttr := b.escapeResourceAttr(attr)
		condition := fmt.Sprintf("s.resources_string['%s'] = (SELECT %s FROM target)", attr, escapedAttr)
		sb.Where(condition)
	}

	sb.SQL("SETTINGS max_threads = 12, min_bytes_to_use_direct_io = 1, use_query_cache = 0, enable_filesystem_cache = 0, use_query_condition_cache = 0")

	query, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return query, args
}

func (b *spanPercentileCTEBuilder) escapeResourceAttr(attr string) string {
	return strings.ReplaceAll(attr, ".", "_")
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
