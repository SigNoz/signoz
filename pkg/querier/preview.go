package querier

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrystoretypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// QueryRangePreview validates and renders each query without executing it.
// When opts.Verbose, it also attaches each statement's EXPLAIN ESTIMATE and
// granule analysis.
func (q *querier) QueryRangePreview(
	ctx context.Context,
	orgID valuer.UUID,
	req *qbtypes.QueryRangeRequest,
	opts qbtypes.QueryRangePreviewOptions,
) (*qbtypes.QueryRangePreviewResponse, error) {

	validationOpts, err := req.ValidateRequestScope()
	if err != nil {
		return nil, err
	}

	dependencyQueries, err := q.constructTraceOperatorDependencyMap(req.CompositeQuery.Queries)
	if err != nil {
		return nil, err
	}

	results := make(map[string]qbtypes.QueryPreview, len(req.CompositeQuery.Queries))

	prepared := make(map[string]qbtypes.QueryPreview, len(req.CompositeQuery.Queries))
	missingMetricQuerySet := make(map[string]bool)
	for idx := range req.CompositeQuery.Queries {
		name := req.CompositeQuery.Queries[idx].GetQueryName()
		ps := qbtypes.QueryPreview{Warnings: []string{}, Statements: []qbtypes.PreviewStatement{}}

		if vErr := req.CompositeQuery.Queries[idx].Validate(validationOpts...); vErr != nil {
			ps.Error = vErr
			prepared[name] = ps
			continue
		}

		env := []qbtypes.QueryEnvelope{req.CompositeQuery.Queries[idx]}
		ps.Warnings = append(ps.Warnings, q.adjustStepInterval(env, req.Start, req.End)...)

		missingMetricQueries, metricWarnings, mErr := q.resolveMetricMetadata(ctx, orgID, env, req.Start, req.End)
		if mErr != nil {
			// Report this query's error but keep previewing the rest.
			ps.Error = mErr
		} else {
			ps.Warnings = append(ps.Warnings, metricWarnings...)
			if len(missingMetricQueries) > 0 {
				missingMetricQuerySet[name] = true
				if len(metricWarnings) == 0 {
					if metricNames := missingMetricNames(env[0]); len(metricNames) > 0 {
						ps.Warnings = append(ps.Warnings, fmt.Sprintf(
							"query %q references metric(s) %s with no data available; it will return an empty result",
							name, strings.Join(metricNames, ", ")))
					}
				}
			}
		}

		req.CompositeQuery.Queries[idx] = env[0]
		prepared[name] = ps
	}

	skip := make(map[string]bool, len(prepared))
	for name, ps := range prepared {
		if ps.Error != nil || missingMetricQuerySet[name] {
			skip[name] = true
		}
	}
	providers, buildErrs := q.buildPreviewProviders(req, dependencyQueries, missingMetricQuerySet, skip)

	// Render each executing query's statement and collect the ClickHouse-bound
	// analysis work to run concurrently.
	var previewTasks []qbtypes.PreviewTask
	for _, query := range req.CompositeQuery.Queries {
		name := query.GetQueryName()
		ps := prepared[name]

		if ps.Error != nil {
			results[name] = ps
			continue
		}
		if missingMetricQuerySet[name] {
			results[name] = ps
			continue
		}
		if bErr := buildErrs[name]; bErr != nil {
			ps.Error = bErr
			results[name] = ps
			continue
		}

		provider, ok := providers[name]
		if !ok {
			if !rendersStandaloneStatement(query.Type) {
				ps.Warnings = append(ps.Warnings, fmt.Sprintf(
					"query type %q has no standalone statement to preview; it is evaluated from the queries it references", query.Type.StringValue()))
				results[name] = ps
				continue
			}
			ps.Error = errors.NewInternalf(errors.CodeInternal, "query produced no provider")
			results[name] = ps
			continue
		}

		stmtProvider, ok := provider.(qbtypes.StatementProvider)
		if !ok {
			ps.Error = errors.NewInternalf(errors.CodeInternal, "query does not support preview")
			results[name] = ps
			continue
		}

		stmt, sErr := stmtProvider.Statement(ctx)
		if sErr != nil {
			ps.Error = sErr
			results[name] = ps
			continue
		}

		ps.Warnings = append(ps.Warnings, stmt.Warnings...)

		if query.Type == qbtypes.QueryTypeClickHouseSQL {
			if bindErr := q.telemetryStore.Plan(ctx, stmt.Query, stmt.Args...); bindErr != nil {
				if errors.Ast(bindErr, errors.TypeInvalidInput) || errors.Ast(bindErr, errors.TypeNotFound) {
					ps.Error = bindErr
					results[name] = ps
					continue
				}
				ps.Warnings = append(ps.Warnings, "could not validate ClickHouse SQL: "+bindErr.Error())
			}
		}

		if !opts.Verbose {
			results[name] = ps
			continue
		}

		if query.Type == qbtypes.QueryTypePromQL {
			if pq, ok := provider.(*promqlQuery); ok {
				sqlStmts, pErr := pq.PreviewStatements(ctx)
				if pErr != nil {
					ps.Warnings = append(ps.Warnings, "could not render underlying ClickHouse SQL: "+pErr.Error())
				} else {
					for _, s := range sqlStmts {
						ps.Statements = append(ps.Statements, qbtypes.PreviewStatement{Query: s.Query, Args: orEmpty(s.Args), Estimate: []telemetrystoretypes.EstimateEntry{}})
					}
				}
			}
		} else {
			ps.Statements = []qbtypes.PreviewStatement{{Query: stmt.Query, Args: orEmpty(stmt.Args), Estimate: []telemetrystoretypes.EstimateEntry{}}}
		}

		results[name] = ps

		for j := range ps.Statements {
			previewTasks = append(previewTasks, qbtypes.PreviewTask{Name: name, StmtIdx: j, Query: ps.Statements[j].Query, Args: ps.Statements[j].Args})
		}
	}

	q.runPreviewTasks(ctx, previewTasks, results)

	return &qbtypes.QueryRangePreviewResponse{
		CompositeQuery: results,
	}, nil
}

// missingMetricNames returns the distinct metric names referenced by a metric
// builder query, or nil for a non-metric query.
func missingMetricNames(env qbtypes.QueryEnvelope) []string {
	spec, ok := env.Spec.(qbtypes.QueryBuilderQuery[qbtypes.MetricAggregation])
	if !ok {
		return nil
	}
	names := make([]string, 0, len(spec.Aggregations))
	for _, agg := range spec.Aggregations {
		if agg.MetricName != "" && !slices.Contains(names, agg.MetricName) {
			names = append(names, agg.MetricName)
		}
	}
	return names
}

func (q *querier) buildPreviewProviders(
	req *qbtypes.QueryRangeRequest,
	dependencyQueries map[string]bool,
	missingMetricQuerySet map[string]bool,
	skip map[string]bool,
) (providers map[string]qbtypes.Query, errs map[string]error) {
	providers = make(map[string]qbtypes.Query)
	errs = make(map[string]error)

	event := &qbtypes.QBEvent{} // preview emits no analytics

	for _, query := range req.CompositeQuery.Queries {
		name := query.GetQueryName()
		if skip[name] {
			continue
		}

		sub := *req // shallow copy: only CompositeQuery and RequestType are swapped

		// deps is the set buildQueries skips: empty for a standalone query, the
		// operator's referenced siblings for a trace operator.
		var deps map[string]bool

		switch {
		case query.GetType() == qbtypes.QueryTypeTraceOperator:
			refs, rErr := q.traceOperatorPreviewComposite(req, query)
			if rErr != nil {
				errs[name] = rErr
				continue
			}
			sub.CompositeQuery = qbtypes.CompositeQuery{Queries: refs}
			deps = dependencyQueries
		case dependencyQueries[name]:
			sub.RequestType = qbtypes.RequestTypeRaw
			sub.CompositeQuery = qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{query}}
		default:
			sub.CompositeQuery = qbtypes.CompositeQuery{Queries: []qbtypes.QueryEnvelope{query}}
		}

		built, _, bErr := q.buildQueries(&sub, deps, missingMetricQuerySet, event)
		if bErr != nil {
			errs[name] = bErr
			continue
		}

		if provider, ok := built[name]; ok {
			providers[name] = provider
		}
	}
	return providers, errs
}

// rendersStandaloneStatement reports whether a query type renders its own
// statement. Formula/join/sub-query don't — they reference other queries.
func rendersStandaloneStatement(t qbtypes.QueryType) bool {
	switch t {
	case qbtypes.QueryTypeBuilder,
		qbtypes.QueryTypePromQL,
		qbtypes.QueryTypeClickHouseSQL,
		qbtypes.QueryTypeTraceOperator:
		return true
	default:
		return false
	}
}

func (q *querier) traceOperatorPreviewComposite(req *qbtypes.QueryRangeRequest, operator qbtypes.QueryEnvelope) ([]qbtypes.QueryEnvelope, error) {
	spec, ok := operator.Spec.(qbtypes.QueryBuilderTraceOperator)
	if !ok {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid trace operator query spec %T", operator.Spec)
	}
	if err := spec.ParseExpression(); err != nil {
		return nil, err
	}

	referenced := make(map[string]bool)
	for _, name := range spec.CollectReferencedQueries(spec.ParsedExpression) {
		referenced[name] = true
	}

	queries := make([]qbtypes.QueryEnvelope, 0, len(referenced)+1)
	for _, qe := range req.CompositeQuery.Queries {
		if referenced[qe.GetQueryName()] {
			queries = append(queries, qe)
		}
	}
	return append(queries, operator), nil
}

func (q *querier) runPreviewTasks(ctx context.Context, tasks []qbtypes.PreviewTask, previews map[string]qbtypes.QueryPreview) {
	if len(tasks) == 0 {
		return
	}

	type outcome struct {
		granules *telemetrystoretypes.Granules
		estimate []telemetrystoretypes.EstimateEntry
		warnings []string
	}
	outcomes := make([]outcome, len(tasks))

	var wg sync.WaitGroup
	for i := range tasks {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			t := tasks[i]
			var out outcome
			if granules, ok, scErr := q.telemetryStore.Indexes(ctx, t.Query, t.Args...); scErr != nil {
				out.warnings = append(out.warnings, "could not compute granule stats: "+scErr.Error())
			} else if ok {
				out.granules = &granules
			}
			if estimate, eErr := q.telemetryStore.Estimate(ctx, t.Query, t.Args...); eErr != nil {
				out.warnings = append(out.warnings, "could not run EXPLAIN ESTIMATE: "+eErr.Error())
			} else {
				out.estimate = estimate
			}
			outcomes[i] = out
		}(i)
	}
	wg.Wait()

	for i := range tasks {
		ps := previews[tasks[i].Name]
		if idx := tasks[i].StmtIdx; idx >= 0 && idx < len(ps.Statements) {
			if outcomes[i].granules != nil {
				ps.Statements[idx].Granules = outcomes[i].granules
			}
			if len(outcomes[i].estimate) > 0 {
				ps.Statements[idx].Estimate = outcomes[i].estimate
			}
		}
		ps.Warnings = append(ps.Warnings, outcomes[i].warnings...)
		previews[tasks[i].Name] = ps
	}
}

// orEmpty returns s, or a non-nil empty slice when s is nil.
func orEmpty[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
