package telemetryscopedtraces

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/flagger"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryresourcefilter"
	"github.com/SigNoz/signoz/pkg/telemetrystore"
	"github.com/SigNoz/signoz/pkg/telemetrytraces"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

var (
	ErrUnsupportedRequestType = errors.NewInvalidInputf(errors.CodeInvalidInput, "unsupported request type for the scoped trace builder")
)

// scopedTraceStatementBuilder builds a trace list scoped to one span category
// (e.g. gen_ai spans). The query shape is fixed; BaseConditionProvider decides which
// spans are in scope and ColumnProvider decides the per-trace columns, so a new
// category only needs a new pair of providers.
type scopedTraceStatementBuilder struct {
	logger                         *slog.Logger
	metadataStore                  telemetrytypes.MetadataStore
	fm                             qbtypes.FieldMapper
	cb                             qbtypes.ConditionBuilder
	baseCond                       BaseConditionProvider
	columnProvider                 ColumnProvider
	traceStmtBuilder               qbtypes.StatementBuilder[qbtypes.TraceAggregation]
	resourceFilterResolver         *telemetryresourcefilter.ResourceFingerprintResolver[qbtypes.TraceAggregation]
	skipResourceFingerprintEnabled bool
}

var _ qbtypes.StatementBuilder[qbtypes.TraceAggregation] = (*scopedTraceStatementBuilder)(nil)

// NewScopedTraceStatementBuilder wires the generic trace-list builder. The field
// mapper / condition builder are built here, not injected — the list always scans the
// telemetrytraces span index. traceStmtBuilder (the delegate for the span-list path)
// is injected because the provider already has the canonical instance.
func NewScopedTraceStatementBuilder(
	settings factory.ProviderSettings,
	metadataStore telemetrytypes.MetadataStore,
	baseCond BaseConditionProvider,
	columnProvider ColumnProvider,
	traceStmtBuilder qbtypes.StatementBuilder[qbtypes.TraceAggregation],
	telemetryStore telemetrystore.TelemetryStore,
	fl flagger.Flagger,
	skipResourceFingerprintEnable bool,
	skipResourceFingerprintThreshold uint64,
) qbtypes.StatementBuilder[qbtypes.TraceAggregation] {
	scopedSettings := factory.NewScopedProviderSettings(settings, "github.com/SigNoz/signoz/pkg/telemetryscopedtraces")

	fieldMapper := telemetrytraces.NewFieldMapper()
	conditionBuilder := telemetrytraces.NewConditionBuilder(fieldMapper)

	// Same resource-fingerprint prune as the standard trace builder — the list scans
	// the same span index.
	resourceFilterResolver := telemetryresourcefilter.NewResolver[qbtypes.TraceAggregation](
		settings,
		telemetrytraces.DBName,
		telemetrytraces.TracesResourceV3TableName,
		telemetrytypes.SignalTraces,
		telemetrytypes.SourceUnspecified,
		metadataStore,
		nil,
		fl,
		telemetryStore,
		skipResourceFingerprintThreshold,
	)

	return &scopedTraceStatementBuilder{
		logger:                         scopedSettings.Logger(),
		metadataStore:                  metadataStore,
		fm:                             fieldMapper,
		cb:                             conditionBuilder,
		baseCond:                       baseCond,
		columnProvider:                 columnProvider,
		traceStmtBuilder:               traceStmtBuilder,
		resourceFilterResolver:         resourceFilterResolver,
		skipResourceFingerprintEnabled: skipResourceFingerprintEnable,
	}
}

func (b *scopedTraceStatementBuilder) Build(
	ctx context.Context,
	start uint64,
	end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	switch requestType {
	case qbtypes.RequestTypeTrace:
		return b.buildTraceListQuery(ctx, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), query, variables)
	case qbtypes.RequestTypeRaw:
		if err := b.validateGroupByAndOrder(requestType, query); err != nil {
			return nil, err
		}
		return b.buildDelegated(ctx, start, end, requestType, query, variables)
	case qbtypes.RequestTypeScalar, qbtypes.RequestTypeTimeSeries:
		return b.buildAggregation(ctx, start, end, requestType, query, variables)
	default:
		return nil, ErrUnsupportedRequestType
	}
}

// traceScopedStatementBuilder is the delegate's optional capability of constraining a
// query to a set of trace ids (implemented by the telemetrytraces builder).
type traceScopedStatementBuilder interface {
	BuildTraceScoped(ctx context.Context, start, end uint64, requestType qbtypes.RequestType, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], variables map[string]qbtypes.VariableItem, traceScope *qbtypes.Statement) (*qbtypes.Statement, error)
}

// splitUserFilter partitions query.Filter into a span-level expression (re-parsed by
// the delegate / span predicate resolution) and the resolved trace-level part (nil
// when there is none, or when every trace-level condition was skipped).
func (b *scopedTraceStatementBuilder) splitUserFilter(ctx context.Context, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], variables map[string]qbtypes.VariableItem) (string, *traceHaving, error) {
	if query.Filter == nil || strings.TrimSpace(query.Filter.Expression) == "" {
		return "", nil, nil
	}
	spanExpr, traceExpr, err := querybuilder.SplitFilterForAggregates(query.Filter.Expression, b.aggregateAliasSet())
	if err != nil {
		return "", nil, err
	}
	having, err := b.resolveTraceHaving(ctx, traceExpr, variables)
	if err != nil {
		return "", nil, err
	}
	return spanExpr, having, nil
}

// buildDelegated splits the user filter, ANDs the base gate into its span-level part,
// and delegates to the standard trace builder. A trace-level part (trace.output_tokens
// > 1000) becomes a window-clipped qualification the delegate constrains trace_id by.
// Serves the span list (raw) and span-level scalar/time-series.
func (b *scopedTraceStatementBuilder) buildDelegated(
	ctx context.Context,
	start, end uint64,
	requestType qbtypes.RequestType,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	spanExpr, having, err := b.splitUserFilter(ctx, query, variables)
	if err != nil {
		return nil, err
	}

	gate := b.baseCond.FilterExpression()
	expr := gate
	if strings.TrimSpace(spanExpr) != "" {
		expr = fmt.Sprintf("(%s) AND (%s)", gate, spanExpr)
	}

	// shallow copy; only Filter is replaced, caller's query untouched
	gated := query
	gated.Filter = &qbtypes.Filter{Expression: expr}

	if having == nil {
		return b.traceStmtBuilder.Build(ctx, start, end, requestType, gated, variables)
	}

	scoped, ok := b.traceStmtBuilder.(traceScopedStatementBuilder)
	if !ok {
		return nil, errors.NewInternalf(errors.CodeInternal, "trace statement builder does not support trace-scoped queries")
	}
	scope, err := b.buildQualifiedStatement(ctx, querybuilder.ToNanoSecs(start), querybuilder.ToNanoSecs(end), having, query, variables)
	if err != nil {
		return nil, err
	}
	return scoped.BuildTraceScoped(ctx, start, end, requestType, gated, variables, scope)
}

// buildTraceListQuery wires the CTE pipeline (benchmarked, see ai-qb-handoff.md): one
// windowed pass picks the top-N traces, then a bucket-pruned pass enriches only those.
// Helpers appear in this file in the order they run. start/end are nanoseconds.
//
//	RESOLVE (keys/columns → SQL via the field mapper)
//	  fetchKeys         metadata for every key we reference
//	  resolveMask       the "span is in scope" predicate (OR of EXISTS)
//	  resolveColumns    per-trace column SQL
//	  resolveListOrders which columns to ORDER BY
//	  splitFilter       span-level predicate + trace-level HAVING
//
//	BUILD
//	  matched    one windowed, mask-pruned GROUP BY trace_id scan fusing gate + span
//	     │       filter + HAVING + ORDER BY + LIMIT/OFFSET → the top-N trace_ids
//	     ▼
//	  ranked     [start,end] bounds of those traces, from the small summary table
//	     ▼
//	  buckets    the ts_bucket_start values they touch, to prune the next scan
//	     ▼
//	  enrichment every per-trace column for those traces over their full extent
//	             (not window-clipped), scanning only their buckets
//
// Only Orderable columns are computable in the mask-pruned matched pass, so only they
// can be ordered or filtered on; all-span columns (span_count, …) are output-only.
func (b *scopedTraceStatementBuilder) buildTraceListQuery(
	ctx context.Context,
	start, end uint64,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {

	startBucket := start/querybuilder.NsToSeconds - querybuilder.BucketAdjustment
	endBucket := end / querybuilder.NsToSeconds

	limit := query.Limit
	if limit <= 0 {
		limit = 100
	}

	// Resolve keys and columns once; all attribute access goes through the field mapper.
	keys, err := b.fetchKeys(ctx)
	if err != nil {
		return nil, err
	}
	maskExpr, maskArgs, err := b.resolveMask(ctx, start, end, keys)
	if err != nil {
		return nil, err
	}
	resolved, err := b.resolveColumns(ctx, start, end, keys, maskExpr, maskArgs)
	if err != nil {
		return nil, err
	}
	orders, err := b.resolveListOrders(query.Order, resolved)
	if err != nil {
		return nil, err
	}

	// If the filter references resource attributes, add a __resource_filter CTE and
	// narrow the matched scan by resource_fingerprint; skipResourceFilter then drops
	// those keys from the span predicate so they aren't applied twice.
	resourceFrag, resourceArgs, resourcePred, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, query, start, end, variables)
	if err != nil {
		return nil, err
	}

	// Split the user filter: span-level predicate + trace-level HAVING expression.
	fp, err := b.splitFilter(ctx, query, b.aggregateAliasSet(), start, end, skipResourceFilter, variables)
	if err != nil {
		return nil, err
	}

	// matched → ranked → buckets → enrichment
	matchedFrag, matchedArgs, err := b.buildMatchedCTE(start, end, startBucket, endBucket, resolved, orders, maskExpr, maskArgs, fp, resourcePred, limit, query.Offset)
	if err != nil {
		return nil, err
	}
	rankedFrag, rankedArgs := b.buildRankedCTE(start, end)
	bucketsFrag := buildBucketsCTE()
	mainSQL, mainArgs := b.buildEnrichmentSelect(resolved, orders)

	cteFragments := []string{matchedFrag, rankedFrag, bucketsFrag}
	cteArgs := [][]any{matchedArgs, rankedArgs, nil}

	// __resource_filter must precede `matched`, which references it.
	if resourceFrag != "" {
		cteFragments = append([]string{resourceFrag}, cteFragments...)
		cteArgs = append([][]any{resourceArgs}, cteArgs...)
	}

	finalSQL := querybuilder.CombineCTEs(cteFragments) + mainSQL + " SETTINGS distributed_product_mode='allow', max_memory_usage=10000000000"
	finalArgs := querybuilder.PrependArgs(cteArgs, mainArgs)

	return &qbtypes.Statement{
		Query:          finalSQL,
		Args:           finalArgs,
		Warnings:       fp.warnings,
		WarningsDocURL: fp.warningsURL,
	}, nil
}

// maybeAttachResourceFilter builds the __resource_filter CTE (fingerprints matching
// the filter's resource conditions) and the predicate narrowing the span scan by
// resource_fingerprint, mirroring the standard trace builder. With no resolver or no
// resource conditions it returns empty fragments and the resource keys stay in the
// span predicate (skipResourceFilter=false).
func (b *scopedTraceStatementBuilder) maybeAttachResourceFilter(
	ctx context.Context,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (cteFrag string, cteArgs []any, fingerprintPred string, skipResourceFilter bool, err error) {
	stmt, skipResourceFilter, err := b.resolveResourceFilterStmt(ctx, query, start, end, variables)
	if err != nil || stmt == nil {
		return "", nil, "", skipResourceFilter, err
	}
	return fmt.Sprintf("__resource_filter AS (%s)", stmt.Query), stmt.Args,
		"resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)", skipResourceFilter, nil
}

// resolveResourceFilterStmt resolves the fingerprint statement for the resource
// attributes in the query's filter; nil when there are none (or the skip decision
// applies). skipResourceFilter follows the same contract as maybeAttachResourceFilter.
func (b *scopedTraceStatementBuilder) resolveResourceFilterStmt(
	ctx context.Context,
	query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation],
	start, end uint64,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, bool, error) {
	if b.resourceFilterResolver == nil {
		return nil, false, nil
	}

	if b.skipResourceFingerprintEnabled {
		decision, err := b.resourceFilterResolver.Resolve(ctx, query, start, end, variables)
		if err != nil {
			return nil, true, err
		}
		switch decision {
		case qbtypes.ResourceFilterResolveKindNoOp:
			return nil, true, nil
		case qbtypes.ResourceFilterResolveKindFallback:
			return nil, false, nil
		}
	}

	stmt, err := b.resourceFilterResolver.StatementBuilder().Build(
		ctx, start, end, qbtypes.RequestTypeRaw, query, variables,
	)
	if err != nil {
		return nil, true, err
	}
	if stmt == nil {
		return nil, true, nil
	}
	return stmt, true, nil
}

// ---------------------------------------------------------------------------
// RESOLVE — turn keys/columns into field-mapper-aware SQL
// ---------------------------------------------------------------------------

func (b *scopedTraceStatementBuilder) fetchKeys(ctx context.Context) (map[string][]*telemetrytypes.TelemetryFieldKey, error) {
	fields := b.resolverFieldKeys()
	selectors := make([]*telemetrytypes.FieldKeySelector, 0, len(fields))
	for _, k := range fields {
		selectors = append(selectors, &telemetrytypes.FieldKeySelector{
			Name:         k.Name,
			Signal:       k.Signal,
			FieldContext: k.FieldContext,
		})
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, selectors)
	return keys, err
}

func (b *scopedTraceStatementBuilder) resolverFieldKeys() []*telemetrytypes.TelemetryFieldKey {
	seen := make(map[string]struct{})
	var out []*telemetrytypes.TelemetryFieldKey
	add := func(k *telemetrytypes.TelemetryFieldKey) {
		if k == nil {
			return
		}
		if _, dup := seen[k.Name]; dup {
			return
		}
		seen[k.Name] = struct{}{}
		out = append(out, k)
	}
	for _, k := range b.baseCond.FieldKeys() {
		add(k)
	}
	for _, c := range b.columnProvider.Columns() {
		for _, k := range c.Expr.keys {
			add(k)
		}
	}
	return out
}

// resolveMask builds the per-span in-scope mask: OR of resolved EXISTS predicates
// over the base condition's field keys.
func (b *scopedTraceStatementBuilder) resolveMask(ctx context.Context, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey) (string, []any, error) {
	fieldKeys := b.baseCond.FieldKeys()
	parts := make([]string, 0, len(fieldKeys))
	var args []any
	for _, key := range fieldKeys {
		e, a, err := b.existsExpr(ctx, start, end, keys, key)
		if err != nil {
			return "", nil, err
		}
		parts = append(parts, e)
		args = append(args, a...)
	}
	return "(" + strings.Join(parts, " OR ") + ")", args, nil
}

// existsExpr resolves an EXISTS predicate for key via the field mapper (materialized
// column when present, else map access). Escaped once so it can be embedded in an
// outer builder.
func (b *scopedTraceStatementBuilder) existsExpr(ctx context.Context, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey, key *telemetrytypes.TelemetryFieldKey) (string, []any, error) {
	resolvedKey := key
	cands := keys[key.Name]
	if len(cands) == 0 {
		cands = []*telemetrytypes.TelemetryFieldKey{key}
	} else {
		resolvedKey = cands[0]
	}
	sb := sqlbuilder.NewSelectBuilder()
	conds, _, err := b.cb.ConditionFor(ctx, start, end, resolvedKey, cands, qbtypes.FilterOperatorExists, nil, sb)
	if err != nil {
		return "", nil, err
	}
	// One condition per candidate variant (a key can be ingested under several data
	// types); OR them all, like the visitor does for EXISTS.
	if len(conds) == 1 {
		sb.Where(conds[0])
	} else {
		sb.Where(sb.Or(conds...))
	}
	expr, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	expr = strings.TrimPrefix(expr, "WHERE ")
	return sqlbuilder.Escape(expr), args, nil
}

// resolvedColumn is a column resolved to SQL via the field mapper; expr is escaped
// once, ready to embed in an outer SELECT.
type resolvedColumn struct {
	alias     string
	expr      string
	args      []any
	orderable bool
}

// resolveColumns turns the declarative columns into SQL, resolving all
// attribute access through the field mapper.
func (b *scopedTraceStatementBuilder) resolveColumns(ctx context.Context, start, end uint64, keys map[string][]*telemetrytypes.TelemetryFieldKey, maskExpr string, maskArgs []any) ([]resolvedColumn, error) {
	r := aggResolver{
		exists: func(key *telemetrytypes.TelemetryFieldKey) (string, []any, error) {
			return b.existsExpr(ctx, start, end, keys, key)
		},
		value: func(key *telemetrytypes.TelemetryFieldKey, dt telemetrytypes.FieldDataType) (string, []any, error) {
			// Use the metadata variant, which carries Materialized — a provider's static
			// definition never does, so a promoted attribute would otherwise fall back
			// to map access. Mirrors existsExpr.
			if cands := keys[key.Name]; len(cands) > 0 {
				key = cands[0]
			}
			return querybuilder.CollisionHandledFinalExpr(ctx, start, end, key, b.fm, b.cb, keys, dt, nil, false)
		},
		maskExpr: maskExpr,
		maskArgs: maskArgs,
	}

	cols := b.columnProvider.Columns()
	out := make([]resolvedColumn, 0, len(cols))
	for _, c := range cols {
		expr, args, err := c.Expr.render(r)
		if err != nil {
			return nil, err
		}
		out = append(out, resolvedColumn{alias: c.Alias, expr: expr, args: args, orderable: c.Orderable})
	}
	return out, nil
}

// listOrder is a sort key resolved to a column alias + direction; both the matched
// CTE and the enrichment ORDER BY it.
type listOrder struct {
	alias     string
	direction string
}

// resolveListOrders maps order keys to the resolved orderable columns; non-orderable
// columns are rejected. Defaults to the column provider's default order.
func (b *scopedTraceStatementBuilder) resolveListOrders(order []qbtypes.OrderBy, resolved []resolvedColumn) ([]listOrder, error) {
	byAlias := make(map[string]resolvedColumn, len(resolved))
	orderable := make([]string, 0, len(resolved))
	for _, rc := range resolved {
		byAlias[rc.alias] = rc
		if rc.orderable {
			orderable = append(orderable, rc.alias)
		}
	}

	if len(order) == 0 {
		return []listOrder{{alias: b.columnProvider.DefaultOrderAlias(), direction: "DESC"}}, nil
	}

	orders := make([]listOrder, 0, len(order))
	for _, o := range order {
		direction := "DESC"
		if o.Direction == qbtypes.OrderDirectionAsc {
			direction = "ASC"
		}
		rc, ok := byAlias[o.Key.Name]
		if !ok || !rc.orderable {
			return nil, errors.NewInvalidInputf(errors.CodeInvalidInput,
				"unsupported order key %q for the trace list; orderable keys: %s", o.Key.Name, strings.Join(orderable, ", "))
		}
		orders = append(orders, listOrder{alias: rc.alias, direction: direction})
	}
	return orders, nil
}

// filterParts is the user filter split into a span-level predicate (widens the
// matched WHERE prune and becomes a countIf existence check in HAVING) and the
// resolved trace-level HAVING (nil when there is none).
type filterParts struct {
	spanPred      string
	spanArgs      []any
	hasSpanFilter bool
	having        *traceHaving
	warnings      []string
	warningsURL   string
}

// splitFilter splits query.Filter into a span-level predicate and a trace-level
// HAVING; an explicit query.Having is ANDed onto the latter before resolution.
func (b *scopedTraceStatementBuilder) splitFilter(ctx context.Context, query qbtypes.QueryBuilderQuery[qbtypes.TraceAggregation], classifySet map[string]struct{}, start, end uint64, skipResourceFilter bool, variables map[string]qbtypes.VariableItem) (filterParts, error) {
	var fp filterParts
	havingExpr := ""
	if query.Filter != nil && strings.TrimSpace(query.Filter.Expression) != "" {
		spanExpr, traceExpr, err := querybuilder.SplitFilterForAggregates(query.Filter.Expression, classifySet)
		if err != nil {
			return fp, err
		}
		havingExpr = traceExpr
		if strings.TrimSpace(spanExpr) != "" {
			pred, args, warnings, url, err := b.resolveSpanPredicate(ctx, start, end, spanExpr, skipResourceFilter, variables)
			if err != nil {
				return fp, err
			}
			// pred is empty when the span-level keys were all resource attributes
			// already handled by the __resource_filter CTE.
			if strings.TrimSpace(pred) != "" {
				fp.spanPred, fp.spanArgs, fp.hasSpanFilter = pred, args, true
			}
			fp.warnings, fp.warningsURL = warnings, url
		}
	}
	if query.Having != nil && strings.TrimSpace(query.Having.Expression) != "" {
		if havingExpr != "" {
			havingExpr = fmt.Sprintf("(%s) AND (%s)", havingExpr, query.Having.Expression)
		} else {
			havingExpr = query.Having.Expression
		}
	}
	having, err := b.resolveTraceHaving(ctx, havingExpr, variables)
	if err != nil {
		return fp, err
	}
	fp.having = having
	return fp, nil
}

// resolveSpanPredicate resolves a span-level filter expression to a bare boolean
// SQL predicate + args via the field mapper.
func (b *scopedTraceStatementBuilder) resolveSpanPredicate(ctx context.Context, start, end uint64, expr string, skipResourceFilter bool, variables map[string]qbtypes.VariableItem) (string, []any, []string, string, error) {
	selectors := querybuilder.QueryStringToKeysSelectors(expr)
	for i := range selectors {
		selectors[i].Signal = telemetrytypes.SignalTraces
	}
	keys, _, err := b.metadataStore.GetKeysMulti(ctx, selectors)
	if err != nil {
		return "", nil, nil, "", err
	}
	prepared, err := querybuilder.PrepareWhereClause(expr, querybuilder.FilterExprVisitorOpts{
		Context:            ctx,
		Logger:             b.logger,
		FieldMapper:        b.fm,
		ConditionBuilder:   b.cb,
		FieldKeys:          keys,
		SkipResourceFilter: skipResourceFilter,
		Variables:          variables,
		StartNs:            start,
		EndNs:              end,
	})
	if err != nil {
		return "", nil, nil, "", err
	}
	if prepared.IsEmpty() {
		return "", nil, nil, "", nil
	}
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("1")
	sb.AddWhereClause(prepared.WhereClause)
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	pred := sql[strings.Index(sql, "WHERE ")+len("WHERE "):]
	return sqlbuilder.Escape(pred), args, prepared.Warnings, prepared.WarningsDocURL, nil
}

// buildMatchedCTE builds `matched`: the single windowed GROUP BY trace_id scan that
// fuses gate + span filter + HAVING + ORDER BY + LIMIT/OFFSET, selecting only the
// aliases the ORDER BY / HAVING reference.
func (b *scopedTraceStatementBuilder) buildMatchedCTE(start, end, startBucket, endBucket uint64, resolved []resolvedColumn, orders []listOrder, maskExpr string, maskArgs []any, fp filterParts, resourcePred string, limit, offset int) (string, []any, error) {
	sb := sqlbuilder.NewSelectBuilder()

	// SELECT trace_id + only the aggregates ORDER BY / HAVING reference (as aliases).
	needed := neededMatchedAliases(orders, fp.having)
	selects := []string{"trace_id"}
	for _, rc := range resolved {
		if _, ok := needed[rc.alias]; !ok {
			continue
		}
		colExpr, err := embedExpr(sb, rc.expr, rc.args)
		if err != nil {
			return "", nil, err
		}
		selects = append(selects, colExpr+" AS "+quoteAlias(rc.alias))
	}
	sb.Select(selects...)
	sb.From(spanTable())

	// WHERE: window + prune to in-scope spans, widened by the span filter so its
	// spans survive for the countIf existence check below.
	win := windowWhere(sb, start, end, startBucket, endBucket)
	mask, err := embedExpr(sb, maskExpr, maskArgs)
	if err != nil {
		return "", nil, err
	}
	prune := "(" + mask
	if fp.hasSpanFilter {
		spanPred, err := embedExpr(sb, fp.spanPred, fp.spanArgs)
		if err != nil {
			return "", nil, err
		}
		prune += " OR " + spanPred
	}
	prune += ")"
	where := append(win, prune)
	if resourcePred != "" {
		where = append(where, resourcePred)
	}
	sb.Where(where...)
	sb.GroupBy("trace_id")

	// HAVING: the gate/span existence checks are only needed when the WHERE was
	// widened by a span filter; otherwise the mask alone already enforces the gate.
	var having []string
	if fp.hasSpanFilter {
		havingMask, err := embedExpr(sb, maskExpr, maskArgs)
		if err != nil {
			return "", nil, err
		}
		havingPred, err := embedExpr(sb, fp.spanPred, fp.spanArgs)
		if err != nil {
			return "", nil, err
		}
		having = append(having, "countIf("+havingMask+") > 0")
		having = append(having, "countIf("+havingPred+") > 0")
	}
	if fp.having != nil {
		hv, err := embedExpr(sb, fp.having.pred, fp.having.args)
		if err != nil {
			return "", nil, err
		}
		having = append(having, hv)
	}
	if len(having) > 0 {
		sb.Having(strings.Join(having, " AND "))
	}

	sb.OrderBy(orderClause(orders)...)
	sb.Limit(limit)
	if offset > 0 {
		sb.Offset(offset)
	}

	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("matched AS (%s)", sql), args, nil
}

// buildRankedCTE builds `ranked`: [start,end] bounds per matched trace, read from the
// small trace-summary table.
func (b *scopedTraceStatementBuilder) buildRankedCTE(start, end uint64) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	sb.Select("trace_id", "min(start) AS t_start", "max(end) AS t_end")
	sb.From(summaryTable())
	sb.Where(
		"trace_id GLOBAL IN (SELECT trace_id FROM matched)",
		"end >= fromUnixTimestamp64Nano("+sb.Var(start)+")",
		"start < fromUnixTimestamp64Nano("+sb.Var(end)+")",
	)
	sb.GroupBy("trace_id")
	sql, args := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return fmt.Sprintf("ranked AS (%s)", sql), args
}

// buildBucketsCTE builds `buckets`: the ts_bucket_start values the matched traces
// span, so the enrichment scan is primary-key pruned. No args.
func buildBucketsCTE() string {
	adj := querybuilder.BucketAdjustment // 30-min bucket width in seconds
	return fmt.Sprintf("buckets AS (SELECT DISTINCT b AS ts_bucket FROM ranked "+
		"ARRAY JOIN range("+
		"toUInt64(intDiv(toUnixTimestamp(t_start), %d) * %d - %d), "+
		"toUInt64(intDiv(toUnixTimestamp(t_end), %d) * %d + %d), "+
		"%d) AS b)", adj, adj, adj, adj, adj, adj, adj)
}

// buildEnrichmentSelect builds the final SELECT: every per-trace column for the
// matched traces over their full extent, scanning only their buckets.
//
// Accepted discrepancy: matched ranks/paginates on window-clipped values, this pass
// recomputes and ORDER BYs full-trace values, so a trace with activity outside the
// window can sort differently than it ranked. Page membership is unaffected
// (LIMIT/OFFSET runs only in matched); rows still sort by the values the user sees.
// Ordering by matched's values instead would re-run the matched scan (ClickHouse
// re-executes a CTE per reference) without fixing the visible cross-page artifact.
func (b *scopedTraceStatementBuilder) buildEnrichmentSelect(resolved []resolvedColumn, orders []listOrder) (string, []any) {
	sb := sqlbuilder.NewSelectBuilder()
	selects, selectArgs := selectAllColumns(resolved)
	sb.Select(selects...)
	sb.From(spanTable())
	sb.Where(
		"ts_bucket_start GLOBAL IN (SELECT ts_bucket FROM buckets)",
		"trace_id GLOBAL IN (SELECT trace_id FROM ranked)",
	)
	sb.GroupBy("trace_id")
	sb.OrderBy(orderClause(orders)...)
	sql, builtArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)
	return sql, append(append([]any{}, selectArgs...), builtArgs...)
}

// ---------------------------------------------------------------------------
// Small shared SQL-builder utilities
// ---------------------------------------------------------------------------

// spanTable is the fully-qualified span index table.
func spanTable() string {
	return fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.SpanIndexV3TableName)
}

// summaryTable is the fully-qualified trace-summary table.
func summaryTable() string {
	return fmt.Sprintf("%s.%s", telemetrytraces.DBName, telemetrytraces.TraceSummaryTableName)
}

// aggregateAliasSet is every trace-level column alias, used to classify filter keys
// as trace-level vs span-level.
func (b *scopedTraceStatementBuilder) aggregateAliasSet() map[string]struct{} {
	set := make(map[string]struct{}, len(b.columnProvider.AggregateAliases()))
	for _, a := range b.columnProvider.AggregateAliases() {
		set[a] = struct{}{}
	}
	return set
}

// neededMatchedAliases is the minimal alias set the matched pass must select: those
// in ORDER BY plus those the resolved trace-level HAVING touches. Everything else is
// left to the enrichment scan.
func neededMatchedAliases(orders []listOrder, having *traceHaving) map[string]struct{} {
	needed := make(map[string]struct{})
	for _, o := range orders {
		needed[o.alias] = struct{}{}
	}
	if having != nil {
		for a := range having.used {
			needed[a] = struct{}{}
		}
	}
	return needed
}

// validateAggregateFilter rejects a trace-level filter referencing an aggregate not
// computable in the matched pass (e.g. span_count, duration_nano) with a targeted
// top-level error — the same check inside the where-clause visitor would surface only
// as a detail of a combined error. Key positions only: `x > $threshold` references x.
func validateAggregateFilter(havingExpr string, orderableSet map[string]struct{}) error {
	if strings.TrimSpace(havingExpr) == "" {
		return nil
	}
	for _, key := range querybuilder.ExprKeys(havingExpr) {
		name := strings.TrimPrefix(strings.TrimPrefix(key.Name, "trace."), "tracefield.")
		if _, ok := orderableSet[name]; !ok {
			return errors.NewInvalidInputf(errors.CodeInvalidInput,
				"aggregate %q cannot be used in the trace-list filter; filterable aggregates: %s", name, strings.Join(sortedAliases(orderableSet), ", "))
		}
	}
	return nil
}

// embedExpr inlines a resolved expr into sb, replacing each `?` placeholder with a
// builder Var so the args are tracked in appearance order. Resolved exprs carry
// values only as bound args, so every `?` is a placeholder; a count mismatch would
// silently shift args into the wrong slots — error out instead.
func embedExpr(sb *sqlbuilder.SelectBuilder, expr string, args []any) (string, error) {
	if n := strings.Count(expr, "?"); n != len(args) {
		return "", errors.NewInternalf(errors.CodeInternal,
			"scoped trace builder: %d placeholders != %d args embedding %q", n, len(args), expr)
	}
	var out strings.Builder
	ai := 0
	for i := 0; i < len(expr); i++ {
		if expr[i] == '?' {
			out.WriteString(sb.Var(args[ai]))
			ai++
			continue
		}
		out.WriteByte(expr[i])
	}
	return out.String(), nil
}

// windowWhere binds the time-window predicates to sb and returns them so the caller
// can add its own predicates in the same Where call.
func windowWhere(sb *sqlbuilder.SelectBuilder, start, end, startBucket, endBucket uint64) []string {
	return []string{
		sb.GE("timestamp", fmt.Sprintf("%d", start)),
		sb.L("timestamp", fmt.Sprintf("%d", end)),
		sb.GE("ts_bucket_start", startBucket),
		sb.LE("ts_bucket_start", endBucket),
	}
}

// orderClause renders the ORDER BY terms plus the trace_id tiebreak.
func orderClause(orders []listOrder) []string {
	out := make([]string, 0, len(orders)+1)
	for _, o := range orders {
		out = append(out, fmt.Sprintf("%s %s", quoteAlias(o.alias), o.direction))
	}
	return append(out, "trace_id DESC")
}

// selectAllColumns renders `expr AS alias` for every resolved column, args in select
// order.
func selectAllColumns(resolved []resolvedColumn) ([]string, []any) {
	selects := []string{"trace_id"}
	var args []any
	for _, rc := range resolved {
		selects = append(selects, rc.expr+" AS "+quoteAlias(rc.alias))
		args = append(args, rc.args...)
	}
	return selects, args
}

// quoteAlias backticks an alias containing characters special to the SQL builder.
func quoteAlias(alias string) string {
	if strings.ContainsAny(alias, ".$`") {
		return "`" + alias + "`"
	}
	return alias
}
