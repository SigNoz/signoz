package querybuilder

import (
	"fmt"
	"regexp"
	"strings"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
)

type HavingExpressionRewriter struct {
	columnMap map[string]string
}

// NewHavingExpressionRewriter creates a new having expression rewriter
func NewHavingExpressionRewriter() *HavingExpressionRewriter {
	return &HavingExpressionRewriter{
		columnMap: make(map[string]string),
	}
}

func (r *HavingExpressionRewriter) RewriteForTraces(expression string, aggregations []qbtypes.TraceAggregation) string {
	r.buildTraceColumnMap(aggregations)
	return r.rewriteExpression(expression)
}

func (r *HavingExpressionRewriter) RewriteForLogs(expression string, aggregations []qbtypes.LogAggregation) string {
	r.buildLogColumnMap(aggregations)
	return r.rewriteExpression(expression)
}

func (r *HavingExpressionRewriter) RewriteForMetrics(expression string, aggregations []qbtypes.MetricAggregation) string {
	r.buildMetricColumnMap(aggregations)
	return r.rewriteExpression(expression)
}

func (r *HavingExpressionRewriter) buildTraceColumnMap(aggregations []qbtypes.TraceAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		r.columnMap[agg.Expression] = sqlColumn

		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn

		if len(aggregations) == 1 {
			r.columnMap["__result"] = sqlColumn
		}
	}
}

func (r *HavingExpressionRewriter) buildLogColumnMap(aggregations []qbtypes.LogAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := fmt.Sprintf("__result_%d", idx)

		if agg.Alias != "" {
			r.columnMap[agg.Alias] = sqlColumn
		}

		r.columnMap[agg.Expression] = sqlColumn

		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn

		if len(aggregations) == 1 {
			r.columnMap["__result"] = sqlColumn
		}
	}
}

func (r *HavingExpressionRewriter) buildMetricColumnMap(aggregations []qbtypes.MetricAggregation) {
	r.columnMap = make(map[string]string)

	for idx, agg := range aggregations {
		sqlColumn := "value"

		metricName := agg.MetricName

		if agg.SpaceAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s)", agg.SpaceAggregation.StringValue(), metricName)] = sqlColumn
		}

		if agg.TimeAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s)", agg.TimeAggregation.StringValue(), metricName)] = sqlColumn
		}

		if agg.TimeAggregation.StringValue() != "" && agg.SpaceAggregation.StringValue() != "" {
			r.columnMap[fmt.Sprintf("%s(%s(%s))", agg.SpaceAggregation.StringValue(), agg.TimeAggregation.StringValue(), metricName)] = sqlColumn
		}

		if agg.TimeAggregation.StringValue() == "" && agg.SpaceAggregation.StringValue() == "" {
			r.columnMap[metricName] = sqlColumn
		}

		r.columnMap["__result"] = sqlColumn
		r.columnMap[fmt.Sprintf("__result%d", idx)] = sqlColumn
	}
}

func (r *HavingExpressionRewriter) rewriteExpression(expression string) string {
	quotedStrings := make(map[string]string)
	quotePattern := regexp.MustCompile(`'[^']*'|"[^"]*"`)
	quotedIdx := 0

	expression = quotePattern.ReplaceAllStringFunc(expression, func(match string) string {
		placeholder := fmt.Sprintf("__QUOTED_%d__", quotedIdx)
		quotedStrings[placeholder] = match
		quotedIdx++
		return placeholder
	})

	type mapping struct {
		from string
		to   string
	}

	mappings := make([]mapping, 0, len(r.columnMap))
	for from, to := range r.columnMap {
		mappings = append(mappings, mapping{from: from, to: to})
	}

	for i := 0; i < len(mappings); i++ {
		for j := i + 1; j < len(mappings); j++ {
			if len(mappings[j].from) > len(mappings[i].from) {
				mappings[i], mappings[j] = mappings[j], mappings[i]
			}
		}
	}

	for _, m := range mappings {
		if strings.Contains(m.from, "(") {
			// escape special regex characters in the function name
			escapedFrom := regexp.QuoteMeta(m.from)
			pattern := regexp.MustCompile(`\b` + escapedFrom)
			expression = pattern.ReplaceAllString(expression, m.to)
		} else {
			pattern := regexp.MustCompile(`\b` + regexp.QuoteMeta(m.from) + `\b`)
			expression = pattern.ReplaceAllString(expression, m.to)
		}
	}

	for placeholder, original := range quotedStrings {
		expression = strings.Replace(expression, placeholder, original, 1)
	}

	return expression
}
