package querier

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"sort"
	"strings"
	"sync"
	"text/template"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"

	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
	"github.com/prometheus/prometheus/promql/parser"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/prometheus/clickhouseprometheusv2"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
	"github.com/SigNoz/signoz/pkg/types/instrumentationtypes"
	qbv5 "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
)

// unquotedDottedNamePattern matches unquoted identifiers containing dots
// that appear in metric or label name positions. This helps detect queries
// using the old syntax that needs migration to UTF-8 quoted syntax.
// Examples it matches: k8s.pod.name, deployment.environment, http.status_code.
var unquotedDottedNamePattern = regexp.MustCompile(`(?:^|[{,(\s])([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+)(?:[}\s,=!~)\[]|$)`)

// quotedMetricOutsideBracesPattern matches the incorrect syntax where a quoted
// metric name appears outside of braces followed by a selector block.
// Example: "kube_pod_status_ready_time"{"condition"="true"}
// This is a common mistake when migrating to UTF-8 syntax.
var quotedMetricOutsideBracesPattern = regexp.MustCompile(`"([^"]+)"\s*\{`)

// tryEnhancePromQLExecError attempts to convert a PromQL execution error into
// a properly typed error. Returns nil if the error is not a recognized execution error.
func tryEnhancePromQLExecError(execErr error) error {
	// A storage may fail a query with an already-typed error (e.g. the
	// clickhousev2 series/sample budgets); surface it as-is instead of
	// flattening it into an internal error.
	if typed := typedStorageError(execErr); typed != nil {
		return typed
	}

	var eqc promql.ErrQueryCanceled
	var eqt promql.ErrQueryTimeout
	var es promql.ErrStorage
	switch {
	case errors.As(execErr, &eqc):
		return errors.Newf(errors.TypeCanceled, errors.CodeCanceled, "query canceled").WithAdditional(eqc.Error())
	case errors.As(execErr, &eqt):
		return errors.Newf(errors.TypeTimeout, errors.CodeTimeout, "query timed out").WithAdditional(eqt.Error())
	case errors.Is(execErr, context.DeadlineExceeded):
		return errors.Newf(errors.TypeTimeout, errors.CodeTimeout, "query timed out")
	case errors.Is(execErr, context.Canceled):
		return errors.Newf(errors.TypeCanceled, errors.CodeCanceled, "query canceled")
	case errors.As(execErr, &es):
		return errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", execErr)
	default:
		return nil
	}
}

// typedStorageError walks an engine execution error chain looking for a
// SigNoz-typed invalid-input error raised by the storage layer (the budget
// refusals). Every wrapper level is stepped through by hand: Ast is a bare
// type cast, not an unwrap — it misses a typed error behind the engine's
// "expanding series: %w" — and promql.ErrStorage has no Unwrap method at
// all, so a plain unwrap loop would stop at it.
func typedStorageError(execErr error) error {
	for e := execErr; e != nil; {
		if errors.Ast(e, errors.TypeInvalidInput) {
			return e
		}
		if es, ok := e.(promql.ErrStorage); ok {
			e = es.Err
			continue
		}
		u, ok := e.(interface{ Unwrap() error })
		if !ok {
			return nil
		}
		e = u.Unwrap()
	}
	return nil
}

// enhancePromQLError adds helpful context to PromQL parse errors,
// particularly for UTF-8 syntax migration issues where metric and label
// names containing dots need to be quoted.
func enhancePromQLError(query string, parseErr error) error {
	errMsg := parseErr.Error()

	if matches := quotedMetricOutsideBracesPattern.FindStringSubmatch(query); len(matches) > 1 {
		metricName := matches[1]
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid promql query: %s. Hint: The metric name should be inside the braces. Use {\"__name__\"=\"%s\", ...} or {\"%s\", ...} instead of \"%s\"{...}",
			errMsg,
			metricName,
			metricName,
			metricName,
		)
	}

	if matches := unquotedDottedNamePattern.FindStringSubmatch(query); len(matches) > 1 {
		dottedName := matches[1]
		return errors.NewInvalidInputf(
			errors.CodeInvalidInput,
			"invalid promql query: %s. Hint: Metric and label names containing dots require quoted notation in the new UTF-8 syntax, e.g., use \"%s\" instead of %s",
			errMsg,
			dottedName,
			dottedName,
		)
	}

	return errors.NewInvalidInputf(errors.CodeInvalidInput, "invalid promql query: %s", errMsg)
}

type promqlQuery struct {
	logger      *slog.Logger
	promEngine  prometheus.Prometheus
	parser      parser.Parser
	query       qbv5.PromQuery
	tr          qbv5.TimeRange
	requestType qbv5.RequestType
	vars        map[string]qbv5.VariableItem
	opts        promqlOptions
}

// promqlOptions is how a PromQL query relates to the clickhousev2 provider
// (see querier.promqlOptions for where the fields come from and why they are
// flag-gated). Both providers are nil for a plain request, so a plain
// request costs nothing extra.
type promqlOptions struct {
	// shadow, when set, runs the query on this provider after serving and
	// logs any result difference; the response is never affected.
	shadow *clickhouseprometheusv2.Provider
	// shadowSlots is the querier-wide admission for shadow runs, shared by
	// every query so the bound holds per process.
	shadowSlots chan struct{}
	// serve, when set, serves the response from this provider instead of the
	// default path. Comparison callers fetch the default and the pinned
	// result as two API calls and diff them.
	serve *clickhouseprometheusv2.Provider
}

var _ qbv5.Query = (*promqlQuery)(nil)
var _ qbv5.StatementProvider = (*promqlQuery)(nil)

func newPromqlQuery(
	logger *slog.Logger,
	promEngine prometheus.Prometheus,
	query qbv5.PromQuery,
	tr qbv5.TimeRange,
	requestType qbv5.RequestType,
	variables map[string]qbv5.VariableItem,
	opts promqlOptions,
) *promqlQuery {
	return &promqlQuery{
		logger:      logger,
		promEngine:  promEngine,
		parser:      promEngine.Parser(),
		query:       query,
		tr:          tr,
		requestType: requestType,
		vars:        variables,
		opts:        opts,
	}
}

func (q *promqlQuery) Fingerprint() string {
	// A pinned request must not share cache entries with default serving: a
	// cached default result would satisfy the pin without running the pinned
	// provider, and a pinned result would poison normal serving. No
	// fingerprint means no caching at all — the pin exists to observe a
	// provider, so a cache in front of it defeats the point.
	if q.opts.serve != nil {
		return ""
	}

	query, err := q.renderVars(q.query.Query, q.vars, q.tr.From, q.tr.To)
	if err != nil {
		q.logger.ErrorContext(context.TODO(), "failed render template variables", slog.String("query", q.query.Query))
		return ""
	}
	parts := []string{
		"promql",
		query,
		q.query.Step.String(),
	}

	return strings.Join(parts, "&")
}

func (q *promqlQuery) Window() (uint64, uint64) {
	return q.tr.From, q.tr.To
}

// removeAllVarMatchers removes label matchers from a PromQL query that reference variables with __all__ value.
// This method parses the query, walks the AST to remove matching matchers, and returns the modified query string.
// If parsing or walking fails, it returns an error.
func (q *promqlQuery) removeAllVarMatchers(query string, vars map[string]qbv5.VariableItem) (string, error) {
	// Find all variables that have __all__ value
	allVars := make(map[string]bool)
	for k, v := range vars {
		if v.Type == qbv5.DynamicVariableType {
			if allVal, ok := v.Value.(string); ok && allVal == "__all__" {
				allVars[k] = true
			}
		}
	}

	// If no variables have __all__ value, return the query unchanged
	if len(allVars) == 0 {
		return query, nil
	}

	expr, err := q.parser.ParseExpr(query)
	if err != nil {
		return "", enhancePromQLError(query, err)
	}

	// Create visitor and walk the AST
	visitor := &allVarRemover{allVars: allVars}
	if err := parser.Walk(visitor, expr, nil); err != nil {
		q.logger.ErrorContext(context.TODO(), "unexpected error while removing __all__ variable matchers", errors.Attr(err), slog.String("query", query))
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while removing __all__ variable matchers")
	}

	// Convert the modified AST back to a string
	return expr.String(), nil
}

// TODO(srikanthccv): cleanup the templating logic.
func (q *promqlQuery) renderVars(query string, vars map[string]qbv5.VariableItem, start, end uint64) (string, error) {
	// First, remove label matchers that use variables with __all__ value.
	// This must happen before variable substitution so we can detect variable references
	// in their original form ($var, {{var}}, [[var]]).
	query, err := q.removeAllVarMatchers(query, vars)
	if err != nil {
		return "", err
	}
	varsData := map[string]any{}
	for k, v := range vars {
		varsData[k] = formatValueForProm(v.Value)
	}

	querybuilder.AssignReservedVars(varsData, start, end)

	keys := make([]string, 0, len(varsData))
	for k := range varsData {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return len(keys[i]) > len(keys[j])
	})

	for _, k := range keys {
		query = strings.ReplaceAll(query, fmt.Sprintf("{{%s}}", k), fmt.Sprint(varsData[k]))
		query = strings.ReplaceAll(query, fmt.Sprintf("[[%s]]", k), fmt.Sprint(varsData[k]))
		query = strings.ReplaceAll(query, fmt.Sprintf("$%s", k), fmt.Sprint(varsData[k]))
	}

	tmpl := template.New("promql-query")
	tmpl, err = tmpl.Parse(query)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	var newQuery bytes.Buffer

	// replace go template variables
	err = tmpl.Execute(&newQuery, varsData)
	if err != nil {
		return "", errors.WrapInternalf(err, errors.CodeInternal, "error while replacing template variables")
	}
	return newQuery.String(), nil
}

// Statement renders the PromQL string (no SQL args) without executing it, for
// the preview path.
func (q *promqlQuery) Statement(_ context.Context) (*qbv5.Statement, error) {
	rendered, err := q.renderVars(q.query.Query, q.vars, q.tr.From, q.tr.To)
	if err != nil {
		return nil, err
	}
	return &qbv5.Statement{Query: rendered}, nil
}

// PreviewStatements returns the ClickHouse statement(s) this PromQL query would
// run, captured by driving the engine with a Storage that records each selector's
// SQL and returns no data. Returns nil if capture is unsupported.
func (q *promqlQuery) PreviewStatements(ctx context.Context) ([]prometheus.CapturedStatement, error) {
	storer, ok := q.promEngine.(prometheus.StatementCapturer)
	if !ok {
		return nil, nil
	}

	rendered, err := q.renderVars(q.query.Query, q.vars, q.tr.From, q.tr.To)
	if err != nil {
		return nil, err
	}

	start := int64(querybuilder.ToNanoSecs(q.tr.From))
	end := int64(querybuilder.ToNanoSecs(q.tr.To))

	// Attach the same query traits as Execute so the captured statements
	// match what the live path would run.
	if expr, parseErr := q.parser.ParseExpr(rendered); parseErr == nil {
		ctx = prometheus.NewContextWithQueryTraits(ctx, prometheus.DetectQueryTraits(expr))
	}

	capStorage, recorder := storer.CapturingStorage()
	if capStorage == nil {
		return nil, nil
	}
	qry, err := q.promEngine.Engine().NewRangeQuery(
		ctx,
		capStorage,
		nil,
		rendered,
		time.Unix(0, start),
		time.Unix(0, end),
		q.query.Step.Duration,
	)
	if err != nil {
		if e := tryEnhancePromQLExecError(err); e != nil {
			return nil, e
		}
		return nil, enhancePromQLError(rendered, err)
	}
	defer qry.Close()

	// Exec drives a Select per selector (recording SQL) but reads no data.
	if res := qry.Exec(ctx); res.Err != nil {
		if e := tryEnhancePromQLExecError(res.Err); e != nil {
			return nil, e
		}
		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", res.Err)
	}

	return recorder.Statements(), nil
}

func (q *promqlQuery) Execute(ctx context.Context) (*qbv5.Result, error) {

	ctx = ctxtypes.NewContextWithCommentVals(ctx, map[string]string{
		instrumentationtypes.TelemetrySignal: telemetrytypes.SignalMetrics.StringValue(),
		instrumentationtypes.QueryDuration:   instrumentationtypes.DurationBucket(q.tr.From, q.tr.To),
	})

	start := int64(querybuilder.ToNanoSecs(q.tr.From))
	end := int64(querybuilder.ToNanoSecs(q.tr.To))

	query, err := q.renderVars(q.query.Query, q.vars, q.tr.From, q.tr.To)
	if err != nil {
		return nil, err
	}

	// Attach query traits so the storage can prove step-aligned optimizations
	// safe (see prometheus.QueryTraits). A parse failure surfaces below via
	// the engine with the enhanced error message.
	if expr, parseErr := q.parser.ParseExpr(query); parseErr == nil {
		ctx = prometheus.NewContextWithQueryTraits(ctx, prometheus.DetectQueryTraits(expr))
	}

	// Accumulate ClickHouse-side scan stats across every storage query this
	// evaluation issues (engine selectors or the compiled executor): progress
	// options propagate to each ClickHouse query through the context.
	var statsMu sync.Mutex
	var rowsScanned, bytesScanned uint64
	ctx = clickhouse.Context(ctx, clickhouse.WithProgress(func(p *clickhouse.Progress) {
		statsMu.Lock()
		rowsScanned += p.Rows
		bytesScanned += p.Bytes
		statsMu.Unlock()
	}))

	began := time.Now()

	// A pinned provider serves directly from it: comparison callers fetch
	// the default result and the pinned result as two API calls and diff
	// them.
	if q.opts.serve != nil {
		matrix, err := q.serveFromProvider(ctx, query, start, end)
		if err != nil {
			if enhanced := tryEnhancePromQLExecError(err); enhanced != nil {
				return nil, enhanced
			}
			return nil, err
		}
		return q.toResult(matrix, nil, began, &statsMu, &rowsScanned, &bytesScanned), nil
	}

	// When the serving provider itself is clickhousev2
	// (prometheus::provider: clickhousev2), serve the way the provider is
	// designed to serve: transpiled when the shape allows. Without this the
	// override would silently run the engine path only.
	if prov, ok := q.promEngine.(*clickhouseprometheusv2.Provider); ok {
		matrix, served, err := prov.TryExecuteRange(ctx, query, time.Unix(0, start), time.Unix(0, end), q.query.Step.Duration)
		if err != nil {
			if enhanced := tryEnhancePromQLExecError(err); enhanced != nil {
				return nil, enhanced
			}
			return nil, err
		}
		if served {
			return q.toResult(matrix, nil, began, &statsMu, &rowsScanned, &bytesScanned), nil
		}
	}

	qry, err := q.promEngine.Engine().NewRangeQuery(
		ctx,
		q.promEngine.Storage(),
		nil,
		query,
		time.Unix(0, start),
		time.Unix(0, end),
		q.query.Step.Duration,
	)
	if err != nil {
		// NewRangeQuery can fail with execution errors (e.g. context deadline exceeded)
		// during the query queue/scheduling stage, not just parse errors.
		if err := tryEnhancePromQLExecError(err); err != nil {
			return nil, err
		}

		return nil, enhancePromQLError(query, err)
	}

	res := qry.Exec(ctx)
	if res.Err != nil {
		if err := tryEnhancePromQLExecError(res.Err); err != nil {
			return nil, err
		}

		return nil, errors.Newf(errors.TypeInternal, errors.CodeInternal, "query execution error: %v", res.Err)
	}

	defer qry.Close()

	matrix, promErr := res.Matrix()
	if promErr != nil {
		return nil, errors.WrapInternalf(promErr, errors.CodeInternal, "error getting matrix from promql query %q", query)
	}

	if q.opts.shadow != nil {
		// Shadows detach from the request, so without admission a dashboard
		// burst would stack unbounded ClickHouse work for up to the shadow
		// timeout — the concurrency pattern behind the original outages.
		// Non-blocking: at the cap the comparison is skipped, not queued;
		// a sampled shadow stream is exactly as useful for rollout evidence.
		select {
		case q.opts.shadowSlots <- struct{}{}:
			// The engine pools the result's sample slices on Close; the
			// shadow comparison needs a stable copy of what was served.
			served := copyMatrix(matrix)
			servedIn := time.Since(began)
			go func() {
				defer func() { <-q.opts.shadowSlots }()
				q.runShadowCompare(context.WithoutCancel(ctx), query, start, end, served, servedIn)
			}()
		default:
			q.logger.DebugContext(ctx, "promql shadow skipped: at concurrency cap", slog.String("query", query))
		}
	}

	warnings, _ := res.Warnings.AsStrings(query, 10, 0)
	return q.toResult(matrix, warnings, began, &statsMu, &rowsScanned, &bytesScanned), nil
}

// toResult converts an evaluated matrix into the v5 result shape, attaching
// the ClickHouse scan stats accumulated during evaluation.
func (q *promqlQuery) toResult(matrix promql.Matrix, warnings []string, began time.Time, statsMu *sync.Mutex, rowsScanned, bytesScanned *uint64) *qbv5.Result {
	excludeLabel := func(labelName string) bool {
		if labelName == "__name__" {
			return false
		}
		return strings.HasPrefix(labelName, "__") || labelName == "fingerprint"
	}

	var series []*qbv5.TimeSeries
	for _, v := range matrix {
		var s qbv5.TimeSeries
		lbls := make([]*qbv5.Label, 0, v.Metric.Len())
		v.Metric.Range(func(l labels.Label) {
			if excludeLabel(l.Name) {
				return
			}
			lbls = append(lbls, &qbv5.Label{
				Key:   telemetrytypes.TelemetryFieldKey{Name: l.Name},
				Value: l.Value,
			})
		})
		s.Labels = lbls

		for idx := range v.Floats {
			p := v.Floats[idx]
			s.Values = append(s.Values, &qbv5.TimeSeriesValue{
				Timestamp: p.T,
				Value:     p.F,
			})
		}
		series = append(series, &s)
	}

	statsMu.Lock()
	stats := qbv5.ExecStats{
		RowsScanned:  *rowsScanned,
		BytesScanned: *bytesScanned,
		DurationMS:   uint64(time.Since(began).Milliseconds()),
	}
	statsMu.Unlock()

	return &qbv5.Result{
		Type: q.requestType,
		Value: &qbv5.TimeSeriesData{
			QueryName: q.query.Name,
			Aggregations: []*qbv5.AggregationBucket{
				{
					Series: series,
				},
			},
		},
		Warnings: warnings,
		Stats:    stats,
	}
}
