package querier

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"slices"
	"strings"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
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
			if bindErr := q.explainBindCheck(ctx, stmt.Query, stmt.Args); bindErr != nil {
				if errors.Ast(bindErr, errors.TypeInvalidInput) {
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
						ps.Statements = append(ps.Statements, qbtypes.PreviewStatement{Query: s.Query, Args: orEmpty(s.Args), Estimate: []qbtypes.EstimateEntry{}})
					}
				}
			}
		} else {
			ps.Statements = []qbtypes.PreviewStatement{{Query: stmt.Query, Args: orEmpty(stmt.Args), Estimate: []qbtypes.EstimateEntry{}}}
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
		granules *qbtypes.Granules
		estimate []qbtypes.EstimateEntry
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
			if granules, ok, scErr := q.computeGranuleStats(ctx, t.Query, t.Args); scErr != nil {
				out.warnings = append(out.warnings, "could not compute granule stats: "+scErr.Error())
			} else if ok {
				out.granules = &granules
			}
			if estimate, eErr := q.runExplainEstimate(ctx, t.Query, t.Args); eErr != nil {
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

func (q *querier) runExplainEstimate(ctx context.Context, stmt string, args []any) ([]qbtypes.EstimateEntry, error) {
	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, "EXPLAIN ESTIMATE "+stmt, args...)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to run EXPLAIN ESTIMATE")
	}
	defer rows.Close()

	colTypes := rows.ColumnTypes()
	var entries []qbtypes.EstimateEntry
	for rows.Next() {
		dest := make([]any, len(colTypes))
		for i, ct := range colTypes {
			dest[i] = reflect.New(ct.ScanType()).Interface()
		}
		if err := rows.Scan(dest...); err != nil {
			return nil, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan EXPLAIN ESTIMATE row")
		}
		var entry qbtypes.EstimateEntry
		for i, ct := range colTypes {
			val := reflect.ValueOf(dest[i]).Elem().Interface()
			switch strings.ToLower(ct.Name()) {
			case "database":
				entry.Database = fmt.Sprintf("%v", val)
			case "table":
				entry.Table = fmt.Sprintf("%v", val)
			case "parts":
				entry.Parts = toInt64(val)
			case "rows":
				entry.Rows = toInt64(val)
			case "marks":
				entry.Marks = toInt64(val)
			}
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "EXPLAIN ESTIMATE row iteration failed")
	}
	return entries, nil
}

// toInt64 coerces a driver-scanned numeric value to int64 (0 if non-numeric).
func toInt64(v any) int64 {
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return rv.Int()
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return int64(rv.Uint())
	case reflect.Float32, reflect.Float64:
		return int64(rv.Float())
	default:
		return 0
	}
}

func (q *querier) explainBindCheck(ctx context.Context, stmt string, args []any) error {
	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, "EXPLAIN PLAN "+stmt, args...)
	if err != nil {
		return err
	}
	rows.Close()
	return nil
}

func (q *querier) computeGranuleStats(ctx context.Context, stmt string, args []any) (qbtypes.Granules, bool, error) {
	rows, err := q.telemetryStore.ClickhouseDB().Query(ctx, "EXPLAIN json = 1, indexes = 1 "+stmt, args...)
	if err != nil {
		return qbtypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "failed to run EXPLAIN for granule stats")
	}
	defer rows.Close()

	// json=1 emits one JSON document; join rows in case the driver splits it.
	var sb strings.Builder
	for rows.Next() {
		var line string
		if err := rows.Scan(&line); err != nil {
			return qbtypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "failed to scan EXPLAIN json row")
		}
		sb.WriteString(line)
		sb.WriteByte('\n')
	}
	if err := rows.Err(); err != nil {
		return qbtypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "EXPLAIN json row iteration failed")
	}

	var plans []struct {
		Plan qbtypes.ExplainPlanNode `json:"Plan"`
	}
	if err := json.Unmarshal([]byte(sb.String()), &plans); err != nil {
		return qbtypes.Granules{}, false, errors.WrapInternalf(err, errors.CodeInternal, "failed to parse EXPLAIN json")
	}

	var totalInitial, totalSelected int64
	reads := []qbtypes.MergeTreeRead{}
	for i := range plans {
		collectMergeTreeReads(&plans[i].Plan, &reads, &totalInitial, &totalSelected)
	}
	if totalInitial <= 0 {
		// No MergeTree index analysis — nothing to report.
		return qbtypes.Granules{}, false, nil
	}
	if totalSelected < 0 {
		totalSelected = 0
	}
	skippedGranules := totalInitial - totalSelected
	if skippedGranules < 0 {
		skippedGranules = 0
	}
	return qbtypes.Granules{
		Initial:  totalInitial,
		Selected: totalSelected,
		Skipped:  skippedGranules,
		Reads:    reads,
	}, true, nil
}

func derefInt64(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}

func collectMergeTreeReads(node *qbtypes.ExplainPlanNode, reads *[]qbtypes.MergeTreeRead, totalInitial, totalSelected *int64) {
	if node.NodeType == "ReadFromMergeTree" && len(node.Indexes) > 0 {
		steps := make([]qbtypes.IndexStep, 0, len(node.Indexes))
		var initial, selected *int64
		for i := range node.Indexes {
			idx := node.Indexes[i]
			if idx.InitialGranules != nil && initial == nil {
				initial = idx.InitialGranules
			}
			if idx.SelectedGranules != nil {
				selected = idx.SelectedGranules
			}
			steps = append(steps, qbtypes.IndexStep{
				Type:             idx.Type,
				Name:             idx.Name,
				Keys:             orEmpty(idx.Keys),
				Condition:        idx.Condition,
				InitialParts:     derefInt64(idx.InitialParts),
				SelectedParts:    derefInt64(idx.SelectedParts),
				InitialGranules:  derefInt64(idx.InitialGranules),
				SelectedGranules: derefInt64(idx.SelectedGranules),
			})
		}
		if initial != nil && selected != nil {
			*totalInitial += *initial
			*totalSelected += *selected
		}
		*reads = append(*reads, qbtypes.MergeTreeRead{Table: node.Description, Steps: steps})
	}
	for i := range node.Plans {
		collectMergeTreeReads(&node.Plans[i], reads, totalInitial, totalSelected)
	}
}

// orEmpty returns s, or a non-nil empty slice when s is nil.
func orEmpty[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
