package querier

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/metrictypes"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// statementProvider is implemented by query types that can render the
// underlying SQL/PromQL statement without executing it.
type statementProvider interface {
	Statement(ctx context.Context) (*qbtypes.Statement, error)
}

// clickhouseExplainClause maps a variant to the EXPLAIN clause understood
// by ClickHouse (i.e. what comes between EXPLAIN and the SELECT).
func clickhouseExplainClause(v qbtypes.ExplainVariant) (string, bool) {
	switch v {
	case qbtypes.ExplainVariantPlan:
		return "PLAN", true
	case qbtypes.ExplainVariantAST:
		return "AST", true
	case qbtypes.ExplainVariantSyntax:
		return "SYNTAX", true
	case qbtypes.ExplainVariantPipeline:
		return "PIPELINE", true
	case qbtypes.ExplainVariantEstimate:
		return "ESTIMATE", true
	case qbtypes.ExplainVariantQueryTree:
		return "QUERY TREE", true
	default:
		return "", false
	}
}

// ParseExplainVariant parses the ?explain= query parameter. An empty value
// (or "false") returns ExplainVariantNone. The literal "true" maps to PLAN
// for back-compat with simple ?explain=true. Otherwise the value must
// match one of the named variants.
func ParseExplainVariant(value string) (qbtypes.ExplainVariant, error) {
	token := strings.ToLower(strings.TrimSpace(value))
	switch token {
	case "", "false":
		return qbtypes.ExplainVariantNone, nil
	case "true":
		return qbtypes.ExplainVariantPlan, nil
	}
	v := qbtypes.ExplainVariant(token)
	if _, ok := clickhouseExplainClause(v); !ok {
		return qbtypes.ExplainVariantNone, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported explain variant %q (allowed: plan, ast, syntax, pipeline, estimate, query_tree)", token)
	}
	return v, nil
}

// QueryRangePreview validates the request and renders the underlying SQL
// (or PromQL) for each query in the composite query without executing it.
// When opts.Explain is non-empty, EXPLAIN <variant> is run against the
// telemetry store for each rendered SQL statement and attached to the
// response.
func (q *querier) QueryRangePreview(
	ctx context.Context,
	_ valuer.UUID,
	req *qbtypes.QueryRangeRequest,
	opts qbtypes.QueryRangePreviewOptions,
) (*qbtypes.QueryRangePreviewResponse, error) {
	tmplVars := req.Variables
	if tmplVars == nil {
		tmplVars = make(map[string]qbtypes.VariableItem)
	}

	dependencyQueries := make(map[string]bool)
	for _, query := range req.CompositeQuery.Queries {
		if query.Type == qbtypes.QueryTypeTraceOperator {
			if spec, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator); ok {
				if err := spec.ParseExpression(); err != nil {
					return nil, err
				}
				for _, dep := range spec.CollectReferencedQueries(spec.ParsedExpression) {
					dependencyQueries[dep] = true
				}
			}
		}
	}

	// First pass: normalize step intervals and collect metric names that
	// need temporality/type lookup.
	metricNames := make([]string, 0)
	for idx, query := range req.CompositeQuery.Queries {
		switch query.Type {
		case qbtypes.QueryTypeBuilder:
			if spec, ok := query.Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]); ok {
				for _, agg := range spec.Aggregations {
					if agg.MetricName != "" {
						metricNames = append(metricNames, agg.MetricName)
					}
				}
			}
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				if spec.StepInterval.Seconds() == 0 {
					spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.RecommendedStepInterval(req.Start, req.End))}
				}
				if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepInterval(req.Start, req.End)) {
					spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.MinAllowedStepInterval(req.Start, req.End))}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				if spec.StepInterval.Seconds() == 0 {
					spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.RecommendedStepInterval(req.Start, req.End))}
				}
				if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepInterval(req.Start, req.End)) {
					spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.MinAllowedStepInterval(req.Start, req.End))}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				if spec.Source == telemetrytypes.SourceMeter {
					if spec.StepInterval.Seconds() == 0 {
						spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.RecommendedStepIntervalForMeter(req.Start, req.End))}
					}
					if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepIntervalForMeter(req.Start, req.End)) {
						spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.MinAllowedStepIntervalForMeter(req.Start, req.End))}
					}
				} else {
					if spec.StepInterval.Seconds() == 0 {
						spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.RecommendedStepIntervalForMetric(req.Start, req.End))}
					}
					if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepIntervalForMetric(req.Start, req.End)) {
						spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.MinAllowedStepIntervalForMetric(req.Start, req.End))}
					}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			}
		case qbtypes.QueryTypePromQL:
			if spec, ok := query.Spec.(qbtypes.PromQuery); ok {
				if spec.Step.Seconds() == 0 {
					spec.Step = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.RecommendedStepIntervalForMetric(req.Start, req.End))}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			}
		case qbtypes.QueryTypeTraceOperator:
			if spec, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator); ok {
				if spec.StepInterval.Seconds() == 0 {
					spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.RecommendedStepInterval(req.Start, req.End))}
				}
				if spec.StepInterval.Seconds() < float64(querybuilder.MinAllowedStepInterval(req.Start, req.End)) {
					spec.StepInterval = qbtypes.Step{Duration: time.Second * time.Duration(querybuilder.MinAllowedStepInterval(req.Start, req.End))}
				}
				req.CompositeQuery.Queries[idx].Spec = spec
			}
		}
	}

	// Fetch metric temporality/type for any builder metric queries.
	var metricTemporality map[string]metrictypes.Temporality
	var metricTypes map[string]metrictypes.Type
	if len(metricNames) > 0 {
		var err error
		metricTemporality, metricTypes, err = q.metadataStore.FetchTemporalityAndTypeMulti(ctx, req.Start, req.End, metricNames...)
		if err != nil {
			q.logger.WarnContext(ctx, "failed to fetch metric temporality during preview", errors.Attr(err), slog.Any("metrics", metricNames))
			return nil, errors.NewInternalf(errors.CodeInternal, "failed to fetch metrics temporality")
		}
	}

	type queryEntry struct {
		name      string
		queryType qbtypes.QueryType
		query     qbtypes.Query
	}
	entries := make([]queryEntry, 0, len(req.CompositeQuery.Queries))

	for _, query := range req.CompositeQuery.Queries {
		var queryName string
		isTraceOperator := query.Type == qbtypes.QueryTypeTraceOperator

		switch query.Type {
		case qbtypes.QueryTypeTraceOperator:
			if spec, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator); ok {
				queryName = spec.Name
			}
		case qbtypes.QueryTypePromQL:
			if spec, ok := query.Spec.(qbtypes.PromQuery); ok {
				queryName = spec.Name
			}
		case qbtypes.QueryTypeClickHouseSQL:
			if spec, ok := query.Spec.(qbtypes.ClickHouseQuery); ok {
				queryName = spec.Name
			}
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				queryName = spec.Name
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				queryName = spec.Name
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				queryName = spec.Name
			}
		}

		if !isTraceOperator && dependencyQueries[queryName] {
			continue
		}

		switch query.Type {
		case qbtypes.QueryTypePromQL:
			promQuery, ok := query.Spec.(qbtypes.PromQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query spec %T", query.Spec)
			}
			pq := newPromqlQuery(q.logger, q.promEngine, promQuery, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, tmplVars)
			entries = append(entries, queryEntry{name: promQuery.Name, queryType: query.Type, query: pq})
		case qbtypes.QueryTypeClickHouseSQL:
			chQuery, ok := query.Spec.(qbtypes.ClickHouseQuery)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid clickhouse query spec %T", query.Spec)
			}
			cq := newchSQLQuery(q.logger, q.telemetryStore, chQuery, nil, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType, tmplVars)
			entries = append(entries, queryEntry{name: chQuery.Name, queryType: query.Type, query: cq})
		case qbtypes.QueryTypeTraceOperator:
			traceOpQuery, ok := query.Spec.(qbtypes.QueryBuilderTraceOperator)
			if !ok {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid trace operator query spec %T", query.Spec)
			}
			toq := &traceOperatorQuery{
				telemetryStore: q.telemetryStore,
				stmtBuilder:    q.traceOperatorStmtBuilder,
				spec:           traceOpQuery,
				compositeQuery: &req.CompositeQuery,
				fromMS:         uint64(req.Start),
				toMS:           uint64(req.End),
				kind:           req.RequestType,
			}
			entries = append(entries, queryEntry{name: traceOpQuery.Name, queryType: query.Type, query: toq})
		case qbtypes.QueryTypeBuilder:
			switch spec := query.Spec.(type) {
			case qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				bq := newBuilderQuery(q.logger, q.telemetryStore, q.traceStmtBuilder, spec, timeRange, req.RequestType, tmplVars)
				entries = append(entries, queryEntry{name: spec.Name, queryType: query.Type, query: bq})
			case qbtypes.QueryBuilderQuery[qbtypes.LogAggregation]:
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				stmtBuilder := q.logStmtBuilder
				if spec.Source == telemetrytypes.SourceAudit {
					stmtBuilder = q.auditStmtBuilder
				}
				bq := newBuilderQuery(q.logger, q.telemetryStore, stmtBuilder, spec, timeRange, req.RequestType, tmplVars)
				entries = append(entries, queryEntry{name: spec.Name, queryType: query.Type, query: bq})
			case qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation]:
				presentAggregations := []qbtypes.MetricAggregation{}
				for i := range spec.Aggregations {
					if spec.Aggregations[i].MetricName != "" && spec.Aggregations[i].Temporality == metrictypes.Unknown {
						if temp, ok := metricTemporality[spec.Aggregations[i].MetricName]; ok && temp != metrictypes.Unknown {
							spec.Aggregations[i].Temporality = temp
						}
					}
					if spec.Aggregations[i].MetricName != "" && spec.Aggregations[i].Type == metrictypes.UnspecifiedType {
						if foundMetricType, ok := metricTypes[spec.Aggregations[i].MetricName]; ok && foundMetricType != metrictypes.UnspecifiedType {
							spec.Aggregations[i].Type = foundMetricType
						}
					}
					if spec.Aggregations[i].Type == metrictypes.UnspecifiedType {
						continue
					}
					presentAggregations = append(presentAggregations, spec.Aggregations[i])
				}
				if len(presentAggregations) == 0 {
					// nothing renderable for this query — skip
					continue
				}
				spec.Aggregations = presentAggregations
				spec.ShiftBy = extractShiftFromBuilderQuery(spec)
				timeRange := adjustTimeRangeForShift(spec, qbtypes.TimeRange{From: req.Start, To: req.End}, req.RequestType)
				var bq *builderQuery[qbtypes.MetricAggregation]
				if spec.Source == telemetrytypes.SourceMeter {
					bq = newBuilderQuery(q.logger, q.telemetryStore, q.meterStmtBuilder, spec, timeRange, req.RequestType, tmplVars)
				} else {
					bq = newBuilderQuery(q.logger, q.telemetryStore, q.metricStmtBuilder, spec, timeRange, req.RequestType, tmplVars)
				}
				entries = append(entries, queryEntry{name: spec.Name, queryType: query.Type, query: bq})
			default:
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported builder spec type %T", query.Spec)
			}
		}
	}

	statements := make([]*qbtypes.PreviewStatement, 0, len(entries))
	for _, entry := range entries {
		provider, ok := entry.query.(statementProvider)
		if !ok {
			return nil, errors.NewInternalf(errors.CodeInternal, "query %s does not support preview", entry.name)
		}
		stmt, err := provider.Statement(ctx)
		if err != nil {
			return nil, err
		}

		ps := &qbtypes.PreviewStatement{
			QueryName: entry.name,
			QueryType: entry.queryType.StringValue(),
			Query:     stmt.Query,
			Args:      stmt.Args,
			Warnings:  stmt.Warnings,
		}

		if opts.Explain != qbtypes.ExplainVariantNone && entry.queryType != qbtypes.QueryTypePromQL {
			out, err := q.runExplain(ctx, opts.Explain, stmt.Query, stmt.Args)
			if err != nil {
				return nil, err
			}
			ps.ExplainVariant = string(opts.Explain)
			ps.Explain = out
		}

		statements = append(statements, ps)
	}

	return &qbtypes.QueryRangePreviewResponse{
		Type:       req.RequestType,
		Statements: statements,
	}, nil
}

// runExplain runs `EXPLAIN <variant> <stmt>` against the telemetry store
// and returns the formatted output as a single string with one row per
// line.
func (q *querier) runExplain(ctx context.Context, variant qbtypes.ExplainVariant, stmt string, args []any) (string, error) {
	clause, ok := clickhouseExplainClause(variant)
	if !ok {
		return "", errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported explain variant %q", string(variant))
	}
	explainQuery := "EXPLAIN " + clause + " " + stmt
	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, explainQuery, args...)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "failed to run EXPLAIN %s", clause)
	}
	defer rows.Close()

	var lines []string
	for rows.Next() {
		var line string
		if err := rows.Scan(&line); err != nil {
			return "", errors.WrapInternalf(err, errors.CodeInternal, "failed to scan EXPLAIN row")
		}
		lines = append(lines, line)
	}
	if err := rows.Err(); err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "EXPLAIN row iteration failed")
	}
	return strings.Join(lines, "\n"), nil
}
