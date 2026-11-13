package logsstatementbuilder

import (
	"context"
	"fmt"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/querybuilder"
	"github.com/SigNoz/signoz/pkg/telemetryschema/logstelemetryschema"
	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/huandu/go-sqlbuilder"
)

const (
	// patternsSampleTarget is about how many logs a patterns query masks: it
	// reads one in ceil(matching logs / patternsSampleTarget) of them.
	patternsSampleTarget = 100000

	// patternsDefaultLimit is how many patterns a query without a limit returns.
	patternsDefaultLimit = 50

	patternsSampleCTE = "__pattern_sample"
)

// patternsServiceKey is the key every patterns statement groups by first:
// patterns are always counted per service.
var patternsServiceKey = telemetrytypes.TelemetryFieldKey{
	Name:          "service.name",
	Signal:        telemetrytypes.SignalLogs,
	FieldContext:  telemetrytypes.FieldContextResource,
	FieldDataType: telemetrytypes.FieldDataTypeString,
}

// isServiceNameKey reports whether a group-by key names the service, which a
// patterns statement already groups by.
func isServiceNameKey(key telemetrytypes.TelemetryFieldKey) bool {
	return key.Name == patternsServiceKey.Name &&
		(key.FieldContext == telemetrytypes.FieldContextUnspecified || key.FieldContext == telemetrytypes.FieldContextResource)
}

// buildPatternsQuery counts the logs of the query by pattern, on a sample.
// A CTE counts the matching logs and picks the sample rate, so that about
// patternsSampleTarget logs are masked. The main query keeps one in that many
// logs by a hash of their ID, the same logs on every run, and groups them by
// pattern, by service and by the query's group by.
func (b *logQueryStatementBuilder) buildPatternsQuery(
	ctx context.Context,
	orgID valuer.UUID,
	sb *sqlbuilder.SelectBuilder,
	query qbtypes.QueryBuilderQuery[qbtypes.LogAggregation],
	start, end uint64,
	keys map[string][]*telemetrytypes.TelemetryFieldKey,
	variables map[string]qbtypes.VariableItem,
) (*qbtypes.Statement, error) {
	var (
		cteFragments []string
		cteArgs      [][]any
		warnings     []string
	)

	frag, args, skipResourceFilter, err := b.maybeAttachResourceFilter(ctx, orgID, sb, query, start, end, variables)
	if err != nil {
		return nil, err
	}
	if frag != "" {
		cteFragments = append(cteFragments, frag)
		cteArgs = append(cteArgs, args)
	}

	// the sample rate, from the logs the filter keeps
	countSB := sqlbuilder.NewSelectBuilder()
	countSB.Select(
		fmt.Sprintf("greatest(toUInt64(1), toUInt64(ceil(count() / %d))) AS rate", patternsSampleTarget),
		"count() AS total",
	)
	countSB.From(fmt.Sprintf("%s.%s", logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName))
	if frag != "" {
		countSB.Where("resource_fingerprint GLOBAL IN (SELECT fingerprint FROM __resource_filter)")
	}
	if _, err := b.addFilterCondition(ctx, orgID, countSB, start, end, query, keys, variables, skipResourceFilter); err != nil {
		return nil, err
	}
	countSQL, countArgs := countSB.BuildWithFlavor(sqlbuilder.ClickHouse)
	cteFragments = append(cteFragments, fmt.Sprintf("%s AS (%s)", patternsSampleCTE, countSQL))
	cteArgs = append(cteArgs, countArgs)

	info := querybuilder.NewQueryInfo(ctx, orgID, b.fl, telemetrytypes.SignalLogs, nil, start, end)
	patternExpr := logstelemetryschema.PatternExpr()
	stepNs := uint64(query.StepInterval.Seconds()) * querybuilder.NsToSeconds
	if stepNs == 0 {
		stepNs = querybuilder.RecommendedStepInterval(start, end) * querybuilder.NsToSeconds
	}

	sb.Select(
		fmt.Sprintf("%s AS %s", patternExpr, qbtypes.PatternsColumnPattern),
		fmt.Sprintf("%s AS %s", logstelemetryschema.PatternIDExpr(qbtypes.PatternsColumnPattern), qbtypes.PatternsColumnID),
	)

	// patterns are always counted per service, then per the query's own group by
	groupBy := []telemetrytypes.TelemetryFieldKey{patternsServiceKey}
	for _, gb := range query.GroupBy {
		if !isServiceNameKey(gb.TelemetryFieldKey) {
			groupBy = append(groupBy, gb.TelemetryFieldKey)
		}
	}
	groupByAliases := make([]string, 0, len(groupBy))
	for i := range groupBy {
		expr, keyWarnings, err := querybuilder.ResolveColumn(ctx, info, b.storage, columnKey(&groupBy[i]), telemetrytypes.FieldDataTypeString, keys)
		if err != nil {
			return nil, err
		}
		warnings = append(warnings, keyWarnings...)
		alias := groupByColumnAlias(i, groupBy[i].Name)
		sb.SelectMore(sqlbuilder.Escape(fmt.Sprintf("toString(%s) AS %s", expr, alias)))
		groupByAliases = append(groupByAliases, sqlbuilder.Escape(alias))
	}

	topStrings := func(expr string) string {
		return fmt.Sprintf("arrayFilter(x -> x != '', arrayMap(x -> ifNull(toString(x), ''), topK(3)(%s)))", expr)
	}

	sb.SelectMore(
		fmt.Sprintf("count() AS %s", qbtypes.PatternsColumnSampledCount),
		fmt.Sprintf("(SELECT rate FROM %s) AS %s", patternsSampleCTE, qbtypes.PatternsColumnSampleRate),
		fmt.Sprintf("(SELECT total FROM %s) AS %s", patternsSampleCTE, qbtypes.PatternsColumnTotal),
		fmt.Sprintf("min(timestamp) AS %s", qbtypes.PatternsColumnFirstSeen),
		fmt.Sprintf("max(timestamp) AS %s", qbtypes.PatternsColumnLastSeen),
		fmt.Sprintf("groupArraySample(3, 1)(leftUTF8(%s, 2048)) AS %s", logstelemetryschema.PatternMessageExpr, qbtypes.PatternsColumnSamples),
		fmt.Sprintf("%s AS %s", topStrings(logstelemetryschema.LogsV2SeverityTextColumn), qbtypes.PatternsColumnSeverities),
		fmt.Sprintf("tupleElement(sumMap([toInt64(intDiv(timestamp, %d) * %d)], [toInt64(1)]) AS __trend, 1) AS %s", stepNs, stepNs, qbtypes.PatternsColumnTrendTs),
		fmt.Sprintf("tupleElement(__trend, 2) AS %s", qbtypes.PatternsColumnTrendCounts),
	)
	sb.From(fmt.Sprintf("%s.%s", logstelemetryschema.DBName, logstelemetryschema.LogsV2TableName))

	preparedWhereClause, err := b.addFilterCondition(ctx, orgID, sb, start, end, query, keys, variables, skipResourceFilter)
	if err != nil {
		return nil, err
	}
	sb.Where(fmt.Sprintf("cityHash64(%s) %% (SELECT rate FROM %s) = 0", logstelemetryschema.LogsV2IDColumn, patternsSampleCTE))

	sb.GroupBy(append([]string{qbtypes.PatternsColumnPattern}, groupByAliases...)...)
	sb.OrderBy(fmt.Sprintf("%s DESC", qbtypes.PatternsColumnSampledCount), fmt.Sprintf("%s ASC", qbtypes.PatternsColumnPattern))

	limit := query.Limit
	if limit <= 0 {
		limit = patternsDefaultLimit
	}
	if limit > qbtypes.PatternsMaxLimit {
		return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "pattern requests return at most %d patterns, got limit %d", qbtypes.PatternsMaxLimit, limit)
	}
	sb.Limit(limit)
	if query.Offset > 0 {
		sb.Offset(query.Offset)
	}

	mainSQL, mainArgs := sb.BuildWithFlavor(sqlbuilder.ClickHouse)

	return &qbtypes.Statement{
		Query:          querybuilder.CombineCTEs(cteFragments) + mainSQL,
		Args:           querybuilder.PrependArgs(cteArgs, mainArgs),
		Warnings:       append(preparedWhereClause.Warnings, warnings...),
		WarningsDocURL: preparedWhereClause.WarningsDocURL,
		CostGuard:      b.costGuardFor(ctx, orgID, preparedWhereClause.RequiresCostGuard),
	}, nil
}

// patternsKeySelectors adds the keys a patterns statement reads besides the
// query's own.
func patternsKeySelectors(selectors []*telemetrytypes.FieldKeySelector) []*telemetrytypes.FieldKeySelector {
	for _, selector := range selectors {
		if strings.EqualFold(selector.Name, patternsServiceKey.Name) {
			return selectors
		}
	}
	return append(selectors, &telemetrytypes.FieldKeySelector{
		Name:          patternsServiceKey.Name,
		Signal:        telemetrytypes.SignalLogs,
		FieldContext:  patternsServiceKey.FieldContext,
		FieldDataType: patternsServiceKey.FieldDataType,
	})
}
