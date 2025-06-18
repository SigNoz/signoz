package querybuilder

import (
	"fmt"
	"regexp"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

// HavingExpressionRewriter rewrites having expressions to use the correct SQL column names
type HavingExpressionRewriter struct {
	// Map of user-friendly names to SQL column names
	columnMap map[string]string
}

// NewHavingExpressionRewriter creates a new having expression rewriter
func NewHavingExpressionRewriter() *HavingExpressionRewriter {
	return &HavingExpressionRewriter{
		columnMap: make(map[string]string),
	}
}

// RewriteForTraces rewrites having expression for trace queries
func (r *HavingExpressionRewriter) RewriteForTraces(expression string, aggregations []qbtypes.TraceAggregation) string {
	r.buildTraceColumnMap(aggregations)
	return r.rewriteExpression(expression)
}

// RewriteForLogs rewrites having expression for log queries
func (r *HavingExpressionRewriter) RewriteForLogs(expression string, aggregations []qbtypes.LogAggregation) string {
	r.buildLogColumnMap(aggregations)
	return r.rewriteExpression(expression)
}

// RewriteForMetrics rewrites having expression for metric queries
func (r *HavingExpressionRewriter) RewriteForMetrics(expression string, aggregations []qbtypes.MetricAggregation) string {
	r.buildMetricColumnMap(aggregations)
	return r.rewriteExpression(expression)
}

// buildTraceColumnMap builds the column mapping for trace aggregations
func (r *HavingExpressionRewriter) buildTraceColumnMap(aggregations []qbtypes.TraceAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		// Map alias if present
		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		// Map expression
		r.columnMap[agg.Expression] = sqlColumn

		// Map __result{number} format
		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn

		// For single aggregation, also map __result
		if len(aggregations) == 1 {
			r.columnMap["__result"] = sqlColumn
		}
	}
}

// buildLogColumnMap builds the column mapping for log aggregations
func (r *HavingExpressionRewriter) buildLogColumnMap(aggregations []qbtypes.LogAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		// Map alias if present
		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		// Map expression
		r.columnMap[agg.Expression] = sqlColumn

		// Map __result{number} format
		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn

		// For single aggregation, also map __result
		if len(aggregations) == 1 {
			r.columnMap["__result"] = sqlColumn
		}
	}
}

// buildMetricColumnMap builds the column mapping for metric aggregations
func (r *HavingExpressionRewriter) buildMetricColumnMap(aggregations []qbtypes.MetricAggregation) {
	r.columnMap = make(map[string]string)

	// For metrics, we typically have a single aggregation that results in "value" column
	// But we still need to handle the mapping for consistency

	for idx, agg := range aggregations {
		// For metrics, the column is usually "value" in the final select
		sqlColumn := "value"

		// Map different metric formats
		metricName := agg.MetricName

		// Don't map the plain metric name - it's ambiguous
		// r.columnMap[metricName] = sqlColumn

		// Map with space aggregation
		if agg.SpaceAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s)", agg.SpaceAggregation.StringValue(), metricName)] = sqlColumn
		}

		// Map with time aggregation
		if agg.TimeAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s)", agg.TimeAggregation.StringValue(), metricName)] = sqlColumn
		}

		// Map with both aggregations
		if agg.TimeAggregation.StringValue() != "" && agg.SpaceAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s(%s))", agg.SpaceAggregation.StringValue(), agg.TimeAggregation.StringValue(), metricName)] = sqlColumn
		}

		// If no aggregations specified, map the plain metric name
		if agg.TimeAggregation.StringValue() == "" && agg.SpaceAggregation.StringValue() == "" {
			r.columnMap[metricName] = sqlColumn
		}

		// Map __result format
		r.columnMap["__result"] = sqlColumn
		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn
	}
}

// rewriteExpression rewrites the having expression using the column map
func (r *HavingExpressionRewriter) rewriteExpression(expression string) string {
	// First, handle quoted strings to avoid replacing within them
	quotedStrings := make(map[string]string)
	quotePattern := regexp.MustCompile(`'[^']*'|"[^"]*"`)
	quotedIdx := 0

	expression = quotePattern.ReplaceAllStringFunc(expression, func(match string) string {
		placeholder := fmt.Sprintf("__QUOTED_%d__", quotedIdx)
		quotedStrings[placeholder] = match
		quotedIdx++
		return placeholder
	})

	// Sort column mappings by length (descending) to handle longer names first
	// This prevents partial replacements (e.g., "count" being replaced in "count_distinct")
	type mapping struct {
		from string
		to   string
	}

	mappings := make([]mapping, 0, len(r.columnMap))
	for from, to := range r.columnMap {
		mappings = append(mappings, mapping{from: from, to: to})
	}

	// Sort by length descending
	for i := 0; i < len(mappings); i++ {
		for j := i + 1; j < len(mappings); j++ {
			if len(mappings[j].from) > len(mappings[i].from) {
				mappings[i], mappings[j] = mappings[j], mappings[i]
			}
		}
	}

	// Apply replacements
	for _, m := range mappings {
		// For function expressions (containing parentheses), we need special handling
		if strings.Contains(m.from, "(") {
			// Escape special regex characters in the function name
			escapedFrom := regexp.QuoteMeta(m.from)
			pattern := regexp.MustCompile(`\b` + escapedFrom)
			expression = pattern.ReplaceAllString(expression, m.to)
		} else {
			// Use word boundaries to ensure we're replacing complete identifiers
			pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(m.from) + `\b`)
			expression = pattern.ReplaceAllString(expression, m.to)
		}
	}

	// Restore quoted strings
	for placeholder, original := range quotedStrings {
		expression = strings.Replace(expression, placeholder, original, 1)
	}

	return expression
}
